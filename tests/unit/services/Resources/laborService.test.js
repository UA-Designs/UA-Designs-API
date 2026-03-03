const { sequelize } = require('../../../../src/models');

let laborService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  laborService = require('../../../../src/services/Resources/laborService');
});

afterAll(async () => {
  await sequelize.close();
});

const FAKE_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

describe('LaborService', () => {
  describe('create', () => {
    it('should create a labor resource with valid data', async () => {
      const data = {
        name: 'John Smith',
        role: 'Carpenter',
        trade: 'CARPENTRY',
        dailyRate: 200.00,
        projectId: FAKE_PROJECT_ID
      };

      const labor = await laborService.create(data);

      expect(labor).toHaveProperty('id');
      expect(labor.name).toBe('John Smith');
      expect(parseFloat(labor.dailyRate)).toBeCloseTo(200, 1);
      expect(labor.status).toBe('AVAILABLE');
    });

    it('should auto-calculate totalCost when hoursWorked is set', async () => {
      const labor = await laborService.create({
        name: 'Jane Worker',
        role: 'Electrician',
        dailyRate: 240.00,
        hoursWorked: 16,
        projectId: FAKE_PROJECT_ID
      });

      // 16 hours / 8 hours per day * 240/day = 480
      expect(parseFloat(labor.totalCost)).toBeCloseTo(480, 1);
    });

    it('should default status to AVAILABLE', async () => {
      const labor = await laborService.create({
        name: 'Default Status Worker',
        role: 'Plumber',
        dailyRate: 180.00,
        projectId: FAKE_PROJECT_ID
      });

      expect(labor.status).toBe('AVAILABLE');
    });
  });

  describe('getAll', () => {
    it('should return paginated items', async () => {
      const result = await laborService.getAll({ page: 1, limit: 5 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const result = await laborService.getAll({ projectId: FAKE_PROJECT_ID });

      result.items.forEach(item => {
        expect(item.projectId).toBe(FAKE_PROJECT_ID);
      });
    });

    it('should filter by status', async () => {
      await laborService.create({
        name: 'Leave Worker',
        role: 'Welder',
        dailyRate: 220.00,
        status: 'ON_LEAVE',
        projectId: FAKE_PROJECT_ID
      });

      const result = await laborService.getAll({ status: 'ON_LEAVE' });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.items.forEach(item => {
        expect(item.status).toBe('ON_LEAVE');
      });
    });

    it('should filter by trade', async () => {
      await laborService.create({
        name: 'Mason Joe',
        role: 'Mason',
        trade: 'MASONRY',
        dailyRate: 190.00,
        projectId: FAKE_PROJECT_ID
      });

      const result = await laborService.getAll({ trade: 'MASONRY' });

      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getById', () => {
    it('should return a labor record by ID', async () => {
      const created = await laborService.create({
        name: 'GetById Worker',
        role: 'Inspector',
        dailyRate: 250.00,
        projectId: FAKE_PROJECT_ID
      });

      const found = await laborService.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const result = await laborService.getById('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update labor fields', async () => {
      const labor = await laborService.create({
        name: 'Update Worker',
        role: 'Assistant',
        dailyRate: 150.00,
        projectId: FAKE_PROJECT_ID
      });

      const updated = await laborService.update(labor.id, { status: 'ASSIGNED', role: 'Senior Assistant' });

      expect(updated.status).toBe('ASSIGNED');
      expect(updated.role).toBe('Senior Assistant');
    });

    it('should recalculate totalCost when hoursWorked changes', async () => {
      const labor = await laborService.create({
        name: 'Recalc Labor',
        role: 'Driver',
        dailyRate: 160.00,
        hoursWorked: 8,
        projectId: FAKE_PROJECT_ID
      });

      const updated = await laborService.update(labor.id, { hoursWorked: 24 });

      // 24 / 8 * 160 = 480
      expect(parseFloat(updated.totalCost)).toBeCloseTo(480, 1);
    });

    it('should return null for non-existent ID', async () => {
      const result = await laborService.update('00000000-0000-0000-0000-999999999999', { role: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft-delete a labor record', async () => {
      const labor = await laborService.create({
        name: 'Delete Labor',
        role: 'Temp',
        dailyRate: 100.00,
        projectId: FAKE_PROJECT_ID
      });

      const result = await laborService.delete(labor.id);

      expect(result).toBe(true);

      const found = await laborService.getById(labor.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const result = await laborService.delete('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });
});

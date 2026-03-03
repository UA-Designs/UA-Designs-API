const { sequelize } = require('../../../../src/models');

let materialService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  materialService = require('../../../../src/services/Resources/materialService');
});

afterAll(async () => {
  await sequelize.close();
});

const FAKE_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

describe('MaterialService', () => {
  describe('create', () => {
    it('should create a material with valid data', async () => {
      const data = {
        name: 'Concrete Mix',
        unit: 'm3',
        unitCost: 80.00,
        quantity: 50,
        projectId: FAKE_PROJECT_ID
      };

      const material = await materialService.create(data);

      expect(material).toHaveProperty('id');
      expect(material.name).toBe('Concrete Mix');
      expect(material.unit).toBe('m3');
      expect(parseFloat(material.totalCost)).toBeCloseTo(4000, 1);
    });

    it('should auto-calculate totalCost from quantity * unitCost', async () => {
      const material = await materialService.create({
        name: 'Steel Rods',
        unit: 'kg',
        unitCost: 2.50,
        quantity: 1000,
        projectId: FAKE_PROJECT_ID
      });

      expect(parseFloat(material.totalCost)).toBeCloseTo(2500, 1);
    });

    it('should default status to ORDERED', async () => {
      const material = await materialService.create({
        name: 'Paint',
        unit: 'L',
        unitCost: 15.00,
        quantity: 20,
        projectId: FAKE_PROJECT_ID
      });

      expect(material.status).toBe('ORDERED');
    });
  });

  describe('getAll', () => {
    it('should return paginated items', async () => {
      const result = await materialService.getAll({ page: 1, limit: 5 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const result = await materialService.getAll({ projectId: FAKE_PROJECT_ID });

      result.items.forEach(item => {
        expect(item.projectId).toBe(FAKE_PROJECT_ID);
      });
    });

    it('should filter by status', async () => {
      await materialService.create({
        name: 'Delivered Sand',
        unit: 'kg',
        unitCost: 1.00,
        quantity: 500,
        status: 'DELIVERED',
        projectId: FAKE_PROJECT_ID
      });

      const result = await materialService.getAll({ status: 'DELIVERED' });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.items.forEach(item => {
        expect(item.status).toBe('DELIVERED');
      });
    });

    it('should search by name', async () => {
      await materialService.create({
        name: 'UniqueSearchableCement',
        unit: 'bag',
        unitCost: 10.00,
        quantity: 100,
        projectId: FAKE_PROJECT_ID
      });

      const result = await materialService.getAll({ search: 'UniqueSearchableCement' });

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.items[0].name).toContain('UniqueSearchableCement');
    });
  });

  describe('getById', () => {
    it('should return a material by ID', async () => {
      const created = await materialService.create({
        name: 'Getby Material',
        unit: 'pcs',
        unitCost: 5.00,
        quantity: 10,
        projectId: FAKE_PROJECT_ID
      });

      const found = await materialService.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const result = await materialService.getById('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update material fields', async () => {
      const material = await materialService.create({
        name: 'Update Test',
        unit: 'unit',
        unitCost: 10.00,
        quantity: 5,
        projectId: FAKE_PROJECT_ID
      });

      const updated = await materialService.update(material.id, { name: 'Updated Name', status: 'IN_USE' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('IN_USE');
    });

    it('should recalculate totalCost when quantity or unitCost changes', async () => {
      const material = await materialService.create({
        name: 'Recalc Material',
        unit: 'unit',
        unitCost: 10.00,
        quantity: 5,
        projectId: FAKE_PROJECT_ID
      });

      const updated = await materialService.update(material.id, { quantity: 20 });

      expect(parseFloat(updated.totalCost)).toBeCloseTo(200, 1);
    });

    it('should return null for non-existent ID', async () => {
      const result = await materialService.update('00000000-0000-0000-0000-999999999999', { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft-delete a material', async () => {
      const material = await materialService.create({
        name: 'Delete Me',
        unit: 'unit',
        unitCost: 1.00,
        quantity: 1,
        projectId: FAKE_PROJECT_ID
      });

      const result = await materialService.delete(material.id);

      expect(result).toBe(true);

      const found = await materialService.getById(material.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const result = await materialService.delete('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });
});

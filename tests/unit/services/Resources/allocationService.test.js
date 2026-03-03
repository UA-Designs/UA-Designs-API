const { sequelize } = require('../../../../src/models');

let allocationService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  allocationService = require('../../../../src/services/Resources/allocationService');
});

afterAll(async () => {
  await sequelize.close();
});

const FAKE_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_RESOURCE_ID = '00000000-0000-0000-0000-000000000010';
const FAKE_RESOURCE_ID_2 = '00000000-0000-0000-0000-000000000011';

describe('AllocationService', () => {
  describe('create', () => {
    it('should create an allocation with valid data', async () => {
      const allocation = await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'MATERIAL',
        resourceId: FAKE_RESOURCE_ID,
        quantity: 50,
        status: 'PLANNED'
      });

      expect(allocation).toHaveProperty('id');
      expect(allocation.resourceType).toBe('MATERIAL');
      expect(allocation.status).toBe('PLANNED');
    });

    it('should default status to PLANNED', async () => {
      const allocation = await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'LABOR',
        resourceId: FAKE_RESOURCE_ID
      });

      expect(allocation.status).toBe('PLANNED');
    });
  });

  describe('getAll', () => {
    it('should return paginated items', async () => {
      const result = await allocationService.getAll({ page: 1, limit: 5 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const result = await allocationService.getAll({ projectId: FAKE_PROJECT_ID });

      result.items.forEach(item => {
        expect(item.projectId).toBe(FAKE_PROJECT_ID);
      });
    });

    it('should filter by resourceType', async () => {
      await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'EQUIPMENT',
        resourceId: FAKE_RESOURCE_ID
      });

      const result = await allocationService.getAll({ resourceType: 'EQUIPMENT' });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.items.forEach(item => {
        expect(item.resourceType).toBe('EQUIPMENT');
      });
    });
  });

  describe('update', () => {
    it('should update allocation fields', async () => {
      const allocation = await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'MATERIAL',
        resourceId: FAKE_RESOURCE_ID,
        quantity: 10
      });

      const updated = await allocationService.update(allocation.id, {
        status: 'ALLOCATED',
        quantity: 20
      });

      expect(updated.status).toBe('ALLOCATED');
      expect(parseFloat(updated.quantity)).toBeCloseTo(20, 1);
    });

    it('should return null for non-existent ID', async () => {
      const result = await allocationService.update('00000000-0000-0000-0000-999999999999', { status: 'IN_USE' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft-delete an allocation', async () => {
      const allocation = await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'LABOR',
        resourceId: FAKE_RESOURCE_ID
      });

      const result = await allocationService.delete(allocation.id);

      expect(result).toBe(true);
    });

    it('should return null for non-existent ID', async () => {
      const result = await allocationService.delete('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('detectConflicts', () => {
    it('should detect date overlap for same resource', async () => {
      const startA = new Date('2026-06-01');
      const endA = new Date('2026-06-30');
      const startB = new Date('2026-06-15');
      const endB = new Date('2026-07-15');

      await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'EQUIPMENT',
        resourceId: FAKE_RESOURCE_ID_2,
        startDate: startA,
        endDate: endA,
        status: 'ALLOCATED'
      });

      await allocationService.create({
        projectId: FAKE_PROJECT_ID,
        resourceType: 'EQUIPMENT',
        resourceId: FAKE_RESOURCE_ID_2,
        startDate: startB,
        endDate: endB,
        status: 'PLANNED'
      });

      const conflicts = await allocationService.detectConflicts(FAKE_PROJECT_ID);

      expect(Array.isArray(conflicts)).toBe(true);
      const equipmentConflict = conflicts.find(
        c => c.resourceType === 'EQUIPMENT' && c.resourceId === FAKE_RESOURCE_ID_2
      );
      expect(equipmentConflict).toBeDefined();
      expect(equipmentConflict.conflict).toBe('DATE_OVERLAP');
    });

    it('should return empty array when no conflicts exist', async () => {
      const UNIQUE_PROJECT = '00000000-0000-0000-0000-000000000099';
      const conflicts = await allocationService.detectConflicts(UNIQUE_PROJECT);
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return resource counts for a project', async () => {
      const summary = await allocationService.getSummary(FAKE_PROJECT_ID);

      expect(summary).toHaveProperty('projectId', FAKE_PROJECT_ID);
      expect(summary).toHaveProperty('totals');
      expect(summary.totals).toHaveProperty('materials');
      expect(summary.totals).toHaveProperty('labor');
      expect(summary.totals).toHaveProperty('equipment');
      expect(summary.totals).toHaveProperty('teamMembers');
    });
  });

  describe('getUtilization', () => {
    it('should return utilization metrics for a project', async () => {
      const utilization = await allocationService.getUtilization(FAKE_PROJECT_ID);

      expect(utilization).toHaveProperty('projectId', FAKE_PROJECT_ID);
      expect(utilization).toHaveProperty('materials');
      expect(utilization).toHaveProperty('labor');
      expect(utilization).toHaveProperty('equipment');
      expect(utilization.equipment).toHaveProperty('utilizationRate');
    });
  });
});

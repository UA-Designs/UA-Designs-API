const { sequelize } = require('../../../../src/models');

let equipmentService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  equipmentService = require('../../../../src/services/Resources/equipmentService');
});

afterAll(async () => {
  await sequelize.close();
});

const FAKE_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_EQUIPMENT_ID = '00000000-0000-0000-0000-000000000002';

describe('EquipmentService', () => {
  describe('create', () => {
    it('should create equipment with valid data', async () => {
      const equipment = await equipmentService.create({
        name: 'Tower Crane',
        type: 'crane',
        status: 'AVAILABLE',
        condition: 'EXCELLENT',
        projectId: FAKE_PROJECT_ID
      });

      expect(equipment).toHaveProperty('id');
      expect(equipment.name).toBe('Tower Crane');
      expect(equipment.status).toBe('AVAILABLE');
      expect(equipment.condition).toBe('EXCELLENT');
    });

    it('should default status to AVAILABLE and condition to GOOD', async () => {
      const equipment = await equipmentService.create({
        name: 'Forklift',
        type: 'forklift'
      });

      expect(equipment.status).toBe('AVAILABLE');
      expect(equipment.condition).toBe('GOOD');
    });
  });

  describe('getAll', () => {
    it('should return paginated items', async () => {
      const result = await equipmentService.getAll({ page: 1, limit: 5 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by status', async () => {
      await equipmentService.create({
        name: 'Retired Mixer',
        type: 'mixer',
        status: 'RETIRED'
      });

      const result = await equipmentService.getAll({ status: 'RETIRED' });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.items.forEach(item => {
        expect(item.status).toBe('RETIRED');
      });
    });

    it('should filter by condition', async () => {
      await equipmentService.create({
        name: 'Poor Condition Excavator',
        type: 'excavator',
        condition: 'POOR'
      });

      const result = await equipmentService.getAll({ condition: 'POOR' });

      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getById', () => {
    it('should return equipment with maintenance records', async () => {
      const created = await equipmentService.create({
        name: 'Compact Loader',
        type: 'loader'
      });

      const found = await equipmentService.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found).toHaveProperty('maintenanceRecords');
      expect(Array.isArray(found.maintenanceRecords)).toBe(true);
    });

    it('should return null for non-existent ID', async () => {
      const result = await equipmentService.getById('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update equipment fields', async () => {
      const equipment = await equipmentService.create({
        name: 'Update Equipment',
        type: 'pump'
      });

      const updated = await equipmentService.update(equipment.id, {
        status: 'IN_USE',
        condition: 'FAIR',
        operator: 'Jane Doe'
      });

      expect(updated.status).toBe('IN_USE');
      expect(updated.condition).toBe('FAIR');
      expect(updated.operator).toBe('Jane Doe');
    });

    it('should return null for non-existent ID', async () => {
      const result = await equipmentService.update('00000000-0000-0000-0000-999999999999', { status: 'IN_USE' });
      expect(result).toBeNull();
    });
  });

  describe('addMaintenanceRecord', () => {
    it('should add a maintenance record to equipment', async () => {
      const equipment = await equipmentService.create({
        name: 'Maintenance Equipment',
        type: 'generator'
      });

      const record = await equipmentService.addMaintenanceRecord(equipment.id, {
        maintenanceType: 'PREVENTIVE',
        description: 'Annual service check',
        scheduledDate: new Date(),
        status: 'SCHEDULED'
      });

      expect(record).toHaveProperty('id');
      expect(record.maintenanceType).toBe('PREVENTIVE');
      expect(record.equipmentId).toBe(equipment.id);
    });

    it('should return null for non-existent equipment ID', async () => {
      const result = await equipmentService.addMaintenanceRecord(
        '00000000-0000-0000-0000-999999999999',
        { maintenanceType: 'PREVENTIVE', status: 'SCHEDULED' }
      );
      expect(result).toBeNull();
    });
  });

  describe('getMaintenanceHistory', () => {
    it('should return maintenance records for equipment', async () => {
      const equipment = await equipmentService.create({
        name: 'History Equipment',
        type: 'compressor'
      });

      await equipmentService.addMaintenanceRecord(equipment.id, {
        maintenanceType: 'CORRECTIVE',
        status: 'COMPLETED',
        completedDate: new Date()
      });

      const history = await equipmentService.getMaintenanceHistory(equipment.id);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent equipment', async () => {
      const result = await equipmentService.getMaintenanceHistory('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft-delete equipment', async () => {
      const equipment = await equipmentService.create({
        name: 'Delete Equipment',
        type: 'cart'
      });

      const result = await equipmentService.delete(equipment.id);

      expect(result).toBe(true);

      const found = await equipmentService.getById(equipment.id);
      expect(found).toBeNull();
    });
  });
});

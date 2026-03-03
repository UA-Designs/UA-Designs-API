const { sequelize } = require('../../../../src/models');

let riskService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  // Disable FK constraints for unit test isolation (fake UUIDs used for FKs)
  await sequelize.query('PRAGMA foreign_keys = OFF');
  riskService = require('../../../../src/services/Risk/riskService');
});

afterAll(async () => {
  await sequelize.close();
});

// --- Score and severity helpers ---

describe('RiskService', () => {
  describe('calculateRiskScore', () => {
    it('should return probability multiplied by impact', () => {
      expect(riskService.calculateRiskScore(0.5, 0.8)).toBe(0.4);
    });

    it('should return 0 when probability is 0', () => {
      expect(riskService.calculateRiskScore(0, 0.8)).toBe(0);
    });

    it('should clamp probability above 1 to 1', () => {
      expect(riskService.calculateRiskScore(1.5, 0.5)).toBe(0.5);
    });

    it('should clamp impact above 1 to 1', () => {
      expect(riskService.calculateRiskScore(0.5, 1.5)).toBe(0.5);
    });

    it('should return 0 for negative values', () => {
      expect(riskService.calculateRiskScore(-0.5, 0.5)).toBe(0);
    });
  });

  describe('assignSeverity', () => {
    it('should return LOW for score <= 0.10', () => {
      expect(riskService.assignSeverity(0.05)).toBe('LOW');
      expect(riskService.assignSeverity(0.10)).toBe('LOW');
    });

    it('should return MEDIUM for score 0.11-0.30', () => {
      expect(riskService.assignSeverity(0.11)).toBe('MEDIUM');
      expect(riskService.assignSeverity(0.30)).toBe('MEDIUM');
    });

    it('should return HIGH for score 0.31-0.60', () => {
      expect(riskService.assignSeverity(0.31)).toBe('HIGH');
      expect(riskService.assignSeverity(0.60)).toBe('HIGH');
    });

    it('should return CRITICAL for score > 0.60', () => {
      expect(riskService.assignSeverity(0.61)).toBe('CRITICAL');
      expect(riskService.assignSeverity(1.0)).toBe('CRITICAL');
    });
  });

  // --- CRUD ---

  describe('create', () => {
    it('should create a risk and auto-calculate riskScore and severity', async () => {
      const data = {
        title: 'Weather Delay Risk',
        description: 'Risk of delays due to weather',
        probability: 0.5,
        impact: 0.6,
        projectId: '00000000-0000-0000-0000-000000000001'
      };

      const risk = await riskService.create(data);

      expect(risk).toHaveProperty('id');
      expect(risk.title).toBe(data.title);
      expect(parseFloat(risk.riskScore)).toBeCloseTo(0.3, 4);
      expect(risk.severity).toBe('MEDIUM');
      expect(risk.status).toBe('IDENTIFIED');
    });

    it('should create a CRITICAL risk for high probability and impact', async () => {
      const risk = await riskService.create({
        title: 'Critical Safety Risk',
        probability: 0.9,
        impact: 0.9,
        projectId: '00000000-0000-0000-0000-000000000001'
      });

      expect(risk.severity).toBe('CRITICAL');
      expect(parseFloat(risk.riskScore)).toBeCloseTo(0.81, 4);
    });

    it('should set identifiedDate to now if not provided', async () => {
      const risk = await riskService.create({
        title: 'Date Test Risk',
        probability: 0.1,
        impact: 0.1,
        projectId: '00000000-0000-0000-0000-000000000001'
      });

      expect(risk.identifiedDate).toBeTruthy();
    });
  });

  describe('getAll', () => {
    it('should return paginated risks', async () => {
      const result = await riskService.getAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const projectId = '00000000-0000-0000-0000-000000000001';
      const result = await riskService.getAll({ projectId });

      result.items.forEach(item => {
        expect(item.projectId).toBe(projectId);
      });
    });

    it('should filter by status', async () => {
      const result = await riskService.getAll({ status: 'IDENTIFIED' });
      result.items.forEach(item => {
        expect(item.status).toBe('IDENTIFIED');
      });
    });

    it('should return empty items for non-matching filter', async () => {
      const result = await riskService.getAll({ projectId: '00000000-0000-0000-0000-999999999999' });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should support search by title', async () => {
      const result = await riskService.getAll({ search: 'Weather' });
      result.items.forEach(item => {
        const titleMatch = item.title.toLowerCase().includes('weather');
        const descMatch = item.description ? item.description.toLowerCase().includes('weather') : false;
        expect(titleMatch || descMatch).toBe(true);
      });
    });
  });

  describe('getById', () => {
    let riskId;

    beforeAll(async () => {
      const risk = await riskService.create({
        title: 'GetById Test Risk',
        probability: 0.3,
        impact: 0.4,
        projectId: '00000000-0000-0000-0000-000000000002'
      });
      riskId = risk.id;
    });

    it('should return a risk with mitigations included', async () => {
      const risk = await riskService.getById(riskId);

      expect(risk).toBeTruthy();
      expect(risk.id).toBe(riskId);
      expect(risk).toHaveProperty('mitigations');
      expect(Array.isArray(risk.mitigations)).toBe(true);
    });

    it('should return null for non-existent id', async () => {
      const risk = await riskService.getById('00000000-0000-0000-0000-000000000000');
      expect(risk).toBeNull();
    });
  });

  describe('update', () => {
    let riskId;

    beforeAll(async () => {
      const risk = await riskService.create({
        title: 'Update Test Risk',
        probability: 0.3,
        impact: 0.4,
        projectId: '00000000-0000-0000-0000-000000000003'
      });
      riskId = risk.id;
    });

    it('should update the title', async () => {
      const updated = await riskService.update(riskId, { title: 'Updated Title' });
      expect(updated.title).toBe('Updated Title');
    });

    it('should recalculate riskScore and severity when probability changes', async () => {
      const updated = await riskService.update(riskId, { probability: 0.9, impact: 0.9 });
      expect(parseFloat(updated.riskScore)).toBeCloseTo(0.81, 2);
      expect(updated.severity).toBe('CRITICAL');
    });

    it('should return null for non-existent id', async () => {
      const result = await riskService.update('00000000-0000-0000-0000-000000000000', { title: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete a risk', async () => {
      const risk = await riskService.create({
        title: 'Delete Test Risk',
        probability: 0.1,
        impact: 0.1,
        projectId: '00000000-0000-0000-0000-000000000004'
      });

      const result = await riskService.delete(risk.id);
      expect(result).toBe(true);

      const found = await riskService.getById(risk.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent id', async () => {
      const result = await riskService.delete('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    let riskId;

    beforeAll(async () => {
      const risk = await riskService.create({
        title: 'Status Test Risk',
        probability: 0.2,
        impact: 0.3,
        projectId: '00000000-0000-0000-0000-000000000005'
      });
      riskId = risk.id;
    });

    it('should update status to ANALYZED', async () => {
      const updated = await riskService.updateStatus(riskId, 'ANALYZED');
      expect(updated.status).toBe('ANALYZED');
    });

    it('should set closedDate when status is CLOSED', async () => {
      const updated = await riskService.updateStatus(riskId, 'CLOSED');
      expect(updated.status).toBe('CLOSED');
      expect(updated.closedDate).toBeTruthy();
    });
  });

  describe('assess', () => {
    let riskId;

    beforeAll(async () => {
      const risk = await riskService.create({
        title: 'Assess Test Risk',
        probability: 0.1,
        impact: 0.1,
        projectId: '00000000-0000-0000-0000-000000000006'
      });
      riskId = risk.id;
    });

    it('should update probability, impact, riskScore, severity and set status to ANALYZED', async () => {
      const updated = await riskService.assess(riskId, { probability: 0.8, impact: 0.9 });
      expect(parseFloat(updated.probability)).toBeCloseTo(0.8, 2);
      expect(parseFloat(updated.impact)).toBeCloseTo(0.9, 2);
      expect(parseFloat(updated.riskScore)).toBeCloseTo(0.72, 2);
      expect(updated.severity).toBe('CRITICAL');
      expect(updated.status).toBe('ANALYZED');
    });
  });

  describe('escalate', () => {
    let riskId;

    beforeAll(async () => {
      const risk = await riskService.create({
        title: 'Escalate Test Risk',
        probability: 0.7,
        impact: 0.8,
        projectId: '00000000-0000-0000-0000-000000000007'
      });
      riskId = risk.id;
    });

    it('should set status to ESCALATED and set escalatedTo and escalatedDate', async () => {
      const escalatedToId = '00000000-0000-0000-0000-000000000099';
      const updated = await riskService.escalate(riskId, {
        escalatedTo: escalatedToId,
        notes: 'Requires PM attention'
      });

      expect(updated.status).toBe('ESCALATED');
      expect(updated.escalatedTo).toBe(escalatedToId);
      expect(updated.escalatedDate).toBeTruthy();
    });
  });

  describe('getRiskMatrix', () => {
    it('should return a 5x5 matrix with counts', async () => {
      const result = await riskService.getRiskMatrix('00000000-0000-0000-0000-000000000001');

      expect(result).toHaveProperty('matrix');
      expect(result).toHaveProperty('totalRisks');
      expect(result).toHaveProperty('probabilityBands');
      expect(result).toHaveProperty('impactBands');
      expect(result.matrix).toHaveLength(5);
      result.matrix.forEach(row => {
        expect(row).toHaveLength(5);
      });
    });
  });

  describe('getMonitoringData', () => {
    it('should return monitoring summary for a project', async () => {
      const result = await riskService.getMonitoringData('00000000-0000-0000-0000-000000000001');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('bySeverity');
      expect(result).toHaveProperty('topRisks');
      expect(result).toHaveProperty('nearingDueMitigations');
      expect(result).toHaveProperty('recentlyEscalated');
      expect(typeof result.summary.total).toBe('number');
    });
  });
});

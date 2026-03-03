const { sequelize } = require('../../../../src/models');

const FAKE_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_USER_ID = '00000000-0000-0000-0000-000000000002';

let stakeholderService;
let communicationService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  stakeholderService = require('../../../../src/services/Stakeholders/stakeholderService');
  communicationService = require('../../../../src/services/Stakeholders/communicationService');
});

afterAll(async () => {
  await sequelize.close();
});

describe('StakeholderService', () => {
  describe('create', () => {
    it('should create a stakeholder with required fields', async () => {
      const stakeholder = await stakeholderService.create({
        name: 'Jane Smith',
        projectId: FAKE_PROJECT_ID
      });

      expect(stakeholder).toHaveProperty('id');
      expect(stakeholder.name).toBe('Jane Smith');
      expect(stakeholder.type).toBe('EXTERNAL');
      expect(stakeholder.influence).toBe('MEDIUM');
      expect(stakeholder.interest).toBe('MEDIUM');
      expect(stakeholder.engagementLevel).toBe('NEUTRAL');
      expect(stakeholder.status).toBe('ACTIVE');
    });

    it('should create a stakeholder with all optional fields', async () => {
      const stakeholder = await stakeholderService.create({
        name: 'John Internal',
        email: 'john@company.com',
        organization: 'UA Designs',
        role: 'Project Sponsor',
        type: 'INTERNAL',
        influence: 'HIGH',
        interest: 'HIGH',
        engagementLevel: 'LEADING',
        communicationPreference: 'IN_PERSON',
        projectId: FAKE_PROJECT_ID
      });

      expect(stakeholder.type).toBe('INTERNAL');
      expect(stakeholder.influence).toBe('HIGH');
      expect(stakeholder.interest).toBe('HIGH');
      expect(stakeholder.engagementLevel).toBe('LEADING');
      expect(stakeholder.communicationPreference).toBe('IN_PERSON');
    });
  });

  describe('getAll', () => {
    it('should return paginated stakeholders', async () => {
      const result = await stakeholderService.getAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const result = await stakeholderService.getAll({ projectId: FAKE_PROJECT_ID });

      expect(Array.isArray(result.items)).toBe(true);
      result.items.forEach(s => {
        expect(s.projectId).toBe(FAKE_PROJECT_ID);
      });
    });

    it('should filter by type', async () => {
      const result = await stakeholderService.getAll({ type: 'INTERNAL' });

      expect(Array.isArray(result.items)).toBe(true);
      result.items.forEach(s => {
        expect(s.type).toBe('INTERNAL');
      });
    });

    it('should search by name', async () => {
      const result = await stakeholderService.getAll({ search: 'Jane' });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.some(s => s.name.includes('Jane'))).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return a stakeholder by id', async () => {
      const created = await stakeholderService.create({
        name: 'Get By ID Test',
        projectId: FAKE_PROJECT_ID
      });

      const found = await stakeholderService.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Get By ID Test');
    });

    it('should return null for non-existent id', async () => {
      const found = await stakeholderService.getById('00000000-0000-0000-0000-999999999999');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a stakeholder and return the updated record', async () => {
      const created = await stakeholderService.create({
        name: 'Before Update',
        projectId: FAKE_PROJECT_ID
      });

      const updated = await stakeholderService.update(created.id, {
        name: 'After Update',
        influence: 'HIGH',
        engagementLevel: 'SUPPORTIVE'
      });

      expect(updated.name).toBe('After Update');
      expect(updated.influence).toBe('HIGH');
      expect(updated.engagementLevel).toBe('SUPPORTIVE');
    });

    it('should return null for non-existent id', async () => {
      const result = await stakeholderService.update('00000000-0000-0000-0000-000000000999', { name: 'Ghost' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft-delete a stakeholder', async () => {
      const created = await stakeholderService.create({
        name: 'To Be Deleted',
        projectId: FAKE_PROJECT_ID
      });

      const result = await stakeholderService.delete(created.id);
      expect(result).toBe(true);

      const found = await stakeholderService.getById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('getInfluenceMatrix', () => {
    it('should return a matrix keyed by influence_interest combinations', async () => {
      const result = await stakeholderService.getInfluenceMatrix(FAKE_PROJECT_ID);

      expect(result).toHaveProperty('projectId', FAKE_PROJECT_ID);
      expect(result).toHaveProperty('matrix');
      expect(result.matrix).toHaveProperty('HIGH_HIGH');
      expect(result.matrix).toHaveProperty('MEDIUM_MEDIUM');
      expect(result.matrix).toHaveProperty('LOW_LOW');
      expect(result.matrix.HIGH_HIGH).toHaveProperty('strategy');
      expect(result.matrix.HIGH_HIGH).toHaveProperty('stakeholders');
    });
  });

  describe('getSummary', () => {
    it('should return summary counts for a project', async () => {
      const result = await stakeholderService.getSummary(FAKE_PROJECT_ID);

      expect(result).toHaveProperty('projectId', FAKE_PROJECT_ID);
      expect(result).toHaveProperty('totalStakeholders');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('byInfluence');
      expect(result).toHaveProperty('byEngagementLevel');
      expect(result).toHaveProperty('recentCommunications');
      expect(result).toHaveProperty('stakeholdersWithNoRecentComms');
      expect(typeof result.totalStakeholders).toBe('number');
    });
  });
});

describe('CommunicationService', () => {
  let testStakeholderId;

  beforeAll(async () => {
    const stakeholder = await stakeholderService.create({
      name: 'Comm Test Stakeholder',
      projectId: FAKE_PROJECT_ID
    });
    testStakeholderId = stakeholder.id;
  });

  describe('create', () => {
    it('should create a communication for a stakeholder', async () => {
      const comm = await communicationService.create(testStakeholderId, {
        type: 'EMAIL',
        subject: 'Project Kickoff',
        message: 'Welcome to the project.',
        direction: 'OUTBOUND',
        status: 'SENT',
        sentDate: new Date()
      });

      expect(comm).toHaveProperty('id');
      expect(comm.type).toBe('EMAIL');
      expect(comm.subject).toBe('Project Kickoff');
      expect(comm.stakeholderId).toBe(testStakeholderId);
    });

    it('should return null for non-existent stakeholder', async () => {
      const result = await communicationService.create('00000000-0000-0000-0000-999999999999', {
        type: 'EMAIL',
        subject: 'Test'
      });

      expect(result).toBeNull();
    });
  });

  describe('getCommunicationsByStakeholder', () => {
    it('should return all communications for a stakeholder', async () => {
      const comms = await communicationService.getCommunicationsByStakeholder(testStakeholderId);

      expect(Array.isArray(comms)).toBe(true);
      expect(comms.length).toBeGreaterThanOrEqual(1);
      comms.forEach(c => {
        expect(c.stakeholderId).toBe(testStakeholderId);
      });
    });
  });

  describe('recordEngagement', () => {
    it('should record an engagement and update stakeholder engagementLevel', async () => {
      const engagement = await communicationService.recordEngagement(testStakeholderId, {
        engagementLevel: 'SUPPORTIVE',
        satisfaction: 8,
        notes: 'Good progress'
      });

      expect(engagement).toHaveProperty('id');
      expect(engagement.engagementLevel).toBe('SUPPORTIVE');
      expect(engagement.satisfaction).toBe(8);

      // Verify stakeholder engagementLevel was synced
      const stakeholder = await stakeholderService.getById(testStakeholderId);
      expect(stakeholder.engagementLevel).toBe('SUPPORTIVE');
    });
  });

  describe('submitFeedback', () => {
    it('should record feedback as a stakeholder engagement entry', async () => {
      const engagement = await communicationService.submitFeedback(testStakeholderId, {
        feedback: 'Very happy with project progress.',
        satisfaction: 9
      });

      expect(engagement).toHaveProperty('id');
      expect(engagement.feedback).toBe('Very happy with project progress.');
      expect(engagement.satisfaction).toBe(9);
    });
  });

  describe('getEngagementHistory', () => {
    it('should return all engagement records for a stakeholder', async () => {
      const history = await communicationService.getEngagementHistory(testStakeholderId);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
      history.forEach(e => {
        expect(e.stakeholderId).toBe(testStakeholderId);
      });
    });
  });
});

const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

let authToken;
let adminToken;
let testUser;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  const adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'admin@uadesigns.com' }));

  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: testUser.id
  });

  authToken = generateAuthToken(testUser);
  adminToken = generateAuthToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Risk API', () => {
  let createdRiskId;
  let createdMitigationId;

  // --- Health check ---
  describe('GET /api/risk/health', () => {
    it('should return 200 with OK status', async () => {
      const response = await request(app).get('/api/risk/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });

  // --- Create risk ---
  describe('POST /api/risk/risks', () => {
    it('should create a risk with valid data', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Weather Delay Risk',
          description: 'Risk of construction delays due to severe weather',
          probability: 0.4,
          impact: 0.7,
          projectId: testProject.id,
          responseStrategy: 'MITIGATE'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Weather Delay Risk');
      expect(response.body.data).toHaveProperty('riskScore');
      expect(response.body.data).toHaveProperty('severity');
      createdRiskId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing title and probability' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for probability out of range', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Risk',
          probability: 1.5,
          impact: 0.5,
          projectId: testProject.id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .send({ title: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  // --- Get all risks ---
  describe('GET /api/risk/risks', () => {
    it('should return paginated risks', async () => {
      const response = await request(app)
        .get('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalItems');
    });

    it('should filter risks by projectId', async () => {
      const response = await request(app)
        .get(`/api/risk/risks?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(risk => {
        expect(risk.projectId).toBe(testProject.id);
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/risk/risks');
      expect(response.status).toBe(401);
    });
  });

  // --- Get risk by ID ---
  describe('GET /api/risk/risks/:id', () => {
    it('should return a risk with mitigations', async () => {
      const response = await request(app)
        .get(`/api/risk/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdRiskId);
      expect(response.body.data).toHaveProperty('mitigations');
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await request(app)
        .get('/api/risk/risks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // --- Update risk ---
  describe('PUT /api/risk/risks/:id', () => {
    it('should update a risk', async () => {
      const response = await request(app)
        .put(`/api/risk/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Weather Risk', probability: 0.6 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Weather Risk');
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await request(app)
        .put('/api/risk/risks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'X' });

      expect(response.status).toBe(404);
    });
  });

  // --- Update status ---
  describe('PATCH /api/risk/risks/:id/status', () => {
    it('should update risk status', async () => {
      const response = await request(app)
        .patch(`/api/risk/risks/${createdRiskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'ANALYZED' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ANALYZED');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch(`/api/risk/risks/${createdRiskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });

  // --- Assess risk ---
  describe('POST /api/risk/risks/:id/assess', () => {
    it('should assess a risk and update score', async () => {
      const response = await request(app)
        .post(`/api/risk/risks/${createdRiskId}/assess`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ probability: 0.7, impact: 0.8 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ANALYZED');
      expect(parseFloat(response.body.data.riskScore)).toBeCloseTo(0.56, 2);
    });

    it('should return 400 for invalid probability', async () => {
      const response = await request(app)
        .post(`/api/risk/risks/${createdRiskId}/assess`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ probability: 2.0, impact: 0.5 });

      expect(response.status).toBe(400);
    });
  });

  // --- Create mitigation ---
  describe('POST /api/risk/mitigations', () => {
    it('should create a mitigation for a risk', async () => {
      const response = await request(app)
        .post('/api/risk/mitigations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          riskId: createdRiskId,
          strategy: 'Install weather monitoring system',
          action: 'Set up automated weather alerts and develop contingency schedule',
          status: 'PLANNED',
          cost: 5000,
          effectiveness: 'HIGH'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.riskId).toBe(createdRiskId);
      createdMitigationId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/risk/mitigations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ riskId: createdRiskId });

      expect(response.status).toBe(400);
    });
  });

  // --- Get mitigations ---
  describe('GET /api/risk/mitigations', () => {
    it('should return paginated mitigations', async () => {
      const response = await request(app)
        .get('/api/risk/mitigations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by riskId', async () => {
      const response = await request(app)
        .get(`/api/risk/mitigations?riskId=${createdRiskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(m => {
        expect(m.riskId).toBe(createdRiskId);
      });
    });
  });

  // --- Get mitigation by ID ---
  describe('GET /api/risk/mitigations/:id', () => {
    it('should return a mitigation by ID', async () => {
      const response = await request(app)
        .get(`/api/risk/mitigations/${createdMitigationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(createdMitigationId);
    });

    it('should return 404 for non-existent mitigation', async () => {
      const response = await request(app)
        .get('/api/risk/mitigations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // --- Update mitigation ---
  describe('PUT /api/risk/mitigations/:id', () => {
    it('should update a mitigation', async () => {
      const response = await request(app)
        .put(`/api/risk/mitigations/${createdMitigationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('IN_PROGRESS');
    });

    it('should auto-set completedDate when status becomes COMPLETED', async () => {
      const response = await request(app)
        .put(`/api/risk/mitigations/${createdMitigationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.data.completedDate).toBeTruthy();
    });
  });

  // --- Risk matrix ---
  describe('GET /api/risk/matrix/:projectId', () => {
    it('should return a risk matrix for a project', async () => {
      const response = await request(app)
        .get(`/api/risk/matrix/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('matrix');
      expect(response.body.data.matrix).toHaveLength(5);
    });
  });

  // --- Monitoring ---
  describe('GET /api/risk/monitoring/:projectId', () => {
    it('should return monitoring data for a project', async () => {
      const response = await request(app)
        .get(`/api/risk/monitoring/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('topRisks');
    });
  });

  // --- Report ---
  describe('GET /api/risk/report/:projectId', () => {
    it('should return a risk report for a project', async () => {
      const response = await request(app)
        .get(`/api/risk/report/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('generatedAt');
    });
  });

  // --- Escalate risk ---
  describe('POST /api/risk/risks/:id/escalate', () => {
    it('should escalate a risk (PM role)', async () => {
      const response = await request(app)
        .post(`/api/risk/risks/${createdRiskId}/escalate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ escalatedTo: testUser.id, notes: 'Requires immediate attention' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ESCALATED');
    });

    it('should return 400 when escalatedTo is missing', async () => {
      const response = await request(app)
        .post(`/api/risk/risks/${createdRiskId}/escalate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Missing escalatedTo' });

      expect(response.status).toBe(400);
    });
  });

  // --- Delete ---
  describe('DELETE /api/risk/risks/:id', () => {
    it('should delete a risk (PM role)', async () => {
      const createResponse = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Risk to Delete',
          probability: 0.1,
          impact: 0.1,
          projectId: testProject.id
        });

      const riskToDeleteId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/risk/risks/${riskToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      const getResponse = await request(app)
        .get(`/api/risk/risks/${riskToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  // --- Delete mitigation ---
  describe('DELETE /api/risk/mitigations/:id', () => {
    it('should delete a mitigation (PM role)', async () => {
      const createResponse = await request(app)
        .post('/api/risk/mitigations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          riskId: createdRiskId,
          strategy: 'Temporary strategy',
          action: 'Temporary action'
        });

      const mitigationToDeleteId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/risk/mitigations/${mitigationToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });
  });
});

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
  const adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'stakeholder-admin@uadesigns.com' }));

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

describe('Stakeholder API', () => {
  let createdStakeholderId;
  let createdCommId;

  // --- Health check ---
  describe('GET /api/stakeholders/health', () => {
    it('should return 200 with OK status', async () => {
      const response = await request(app).get('/api/stakeholders/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });

  // --- Create stakeholder ---
  describe('POST /api/stakeholders', () => {
    it('should create a stakeholder with valid data', async () => {
      const response = await request(app)
        .post('/api/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'City Planning Department',
          email: 'planning@city.gov',
          organization: 'City Council',
          role: 'Regulatory Body',
          type: 'EXTERNAL',
          influence: 'HIGH',
          interest: 'MEDIUM',
          projectId: testProject.id
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('City Planning Department');
      expect(response.body.data.type).toBe('EXTERNAL');
      createdStakeholderId = response.body.data.id;
    });

    it('should return 400 for missing required name', async () => {
      const response = await request(app)
        .post('/api/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectId: testProject.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for missing projectId', async () => {
      const response = await request(app)
        .post('/api/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'No Project Stakeholder' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid type enum', async () => {
      const response = await request(app)
        .post('/api/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Type',
          projectId: testProject.id,
          type: 'INVALID_TYPE'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/stakeholders')
        .send({ name: 'Test', projectId: testProject.id });

      expect(response.status).toBe(401);
    });
  });

  // --- Get all stakeholders ---
  describe('GET /api/stakeholders', () => {
    it('should return paginated stakeholders', async () => {
      const response = await request(app)
        .get('/api/stakeholders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalItems');
    });

    it('should filter by projectId', async () => {
      const response = await request(app)
        .get(`/api/stakeholders?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(s => {
        expect(s.projectId).toBe(testProject.id);
      });
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/stakeholders?type=EXTERNAL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(s => {
        expect(s.type).toBe('EXTERNAL');
      });
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/stakeholders');
      expect(response.status).toBe(401);
    });
  });

  // --- Get stakeholder by id ---
  describe('GET /api/stakeholders/:id', () => {
    it('should return a stakeholder by id', async () => {
      const response = await request(app)
        .get(`/api/stakeholders/${createdStakeholderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdStakeholderId);
      expect(response.body.data).toHaveProperty('communications');
      expect(response.body.data).toHaveProperty('engagements');
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .get('/api/stakeholders/00000000-0000-0000-0000-999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // --- Update stakeholder ---
  describe('PUT /api/stakeholders/:id', () => {
    it('should update a stakeholder', async () => {
      const response = await request(app)
        .put(`/api/stakeholders/${createdStakeholderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          influence: 'HIGH',
          engagementLevel: 'SUPPORTIVE',
          notes: 'Very cooperative with the project team.'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.influence).toBe('HIGH');
      expect(response.body.data.engagementLevel).toBe('SUPPORTIVE');
    });

    it('should return 400 for invalid influence value', async () => {
      const response = await request(app)
        .put(`/api/stakeholders/${createdStakeholderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ influence: 'VERY_HIGH' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .put('/api/stakeholders/00000000-0000-0000-0000-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost Update' });

      expect(response.status).toBe(404);
    });
  });

  // --- Communications ---
  describe('POST /api/stakeholders/:id/communications', () => {
    it('should log a communication for a stakeholder', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/communications`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EMAIL',
          subject: 'Construction Schedule Update',
          message: 'Please review the updated schedule attached.',
          direction: 'OUTBOUND',
          status: 'SENT',
          sentDate: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('EMAIL');
      expect(response.body.data.stakeholderId).toBe(createdStakeholderId);
      createdCommId = response.body.data.id;
    });

    it('should return 400 for missing type', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/communications`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: 'Missing type' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing subject', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/communications`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'EMAIL' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/stakeholders/:id/communications', () => {
    it('should return all communications for a stakeholder', async () => {
      const response = await request(app)
        .get(`/api/stakeholders/${createdStakeholderId}/communications`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Engagement ---
  describe('POST /api/stakeholders/:id/engagement', () => {
    it('should record an engagement assessment', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/engagement`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          engagementLevel: 'LEADING',
          satisfaction: 9,
          notes: 'Champion of the project'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.engagementLevel).toBe('LEADING');
      expect(response.body.data.satisfaction).toBe(9);
    });

    it('should return 400 for missing engagementLevel', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/engagement`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ satisfaction: 7 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid satisfaction range', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/engagement`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ engagementLevel: 'NEUTRAL', satisfaction: 11 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/stakeholders/:id/engagement', () => {
    it('should return engagement history for a stakeholder', async () => {
      const response = await request(app)
        .get(`/api/stakeholders/${createdStakeholderId}/engagement`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Feedback ---
  describe('POST /api/stakeholders/:id/feedback', () => {
    it('should submit feedback from a stakeholder', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          feedback: 'The communication process has been excellent.',
          satisfaction: 9
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback).toBe('The communication process has been excellent.');
    });

    it('should return 400 for missing feedback text', async () => {
      const response = await request(app)
        .post(`/api/stakeholders/${createdStakeholderId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ satisfaction: 7 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // --- Analytics ---
  describe('GET /api/stakeholders/influence-matrix/:projectId', () => {
    it('should return the influence/interest matrix for a project', async () => {
      const response = await request(app)
        .get(`/api/stakeholders/influence-matrix/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('matrix');
      expect(response.body.data.matrix).toHaveProperty('HIGH_HIGH');
      expect(response.body.data.matrix.HIGH_HIGH).toHaveProperty('strategy');
    });
  });

  describe('GET /api/stakeholders/summary/:projectId', () => {
    it('should return stakeholder summary for a project', async () => {
      const response = await request(app)
        .get(`/api/stakeholders/summary/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalStakeholders');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('byInfluence');
      expect(response.body.data).toHaveProperty('byEngagementLevel');
    });
  });

  // --- Delete ---
  describe('DELETE /api/stakeholders/:id', () => {
    it('should delete a stakeholder', async () => {
      const createResponse = await request(app)
        .post('/api/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Be Deleted',
          projectId: testProject.id
        });

      const deleteId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/stakeholders/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const getResponse = await request(app)
        .get(`/api/stakeholders/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent stakeholder', async () => {
      const response = await request(app)
        .delete('/api/stakeholders/00000000-0000-0000-0000-999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});

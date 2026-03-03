const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User } = require('../../../src/models');
const { generateAuthToken, createTestUser } = require('../../helpers/testHelpers');

let authToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  authToken = generateAuthToken(testUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Dashboard API', () => {
  // --- Stats ---

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalProjects');
      expect(res.body.data).toHaveProperty('totalTasks');
      expect(res.body.data).toHaveProperty('totalBudget');
      expect(res.body.data).toHaveProperty('teamMembers');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/stats');

      expect(res.status).toBe(401);
    });
  });

  // --- Project progress ---

  describe('GET /api/dashboard/project-progress', () => {
    it('should return project progress list', async () => {
      const res = await request(app)
        .get('/api/dashboard/project-progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('progress');
      expect(res.body.data[0]).toHaveProperty('status');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/project-progress');

      expect(res.status).toBe(401);
    });
  });

  // --- Task progress ---

  describe('GET /api/dashboard/task-progress', () => {
    it('should return task progress list', async () => {
      const res = await request(app)
        .get('/api/dashboard/task-progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/task-progress');

      expect(res.status).toBe(401);
    });
  });

  // --- Cost variance ---

  describe('GET /api/dashboard/cost-variance', () => {
    it('should return cost variance data', async () => {
      const res = await request(app)
        .get('/api/dashboard/cost-variance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('budgetedCost');
      expect(res.body.data[0]).toHaveProperty('actualCost');
      expect(res.body.data[0]).toHaveProperty('variance');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/cost-variance');

      expect(res.status).toBe(401);
    });
  });

  // --- Recent activities ---

  describe('GET /api/dashboard/recent-activities', () => {
    it('should return recent activities', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('message');
      expect(res.body.data[0]).toHaveProperty('userName');
      expect(res.body.data[0]).toHaveProperty('timestamp');
    });

    it('should respect the limit query param', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-activities?limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/recent-activities');

      expect(res.status).toBe(401);
    });
  });

  // --- Risk matrix ---

  describe('GET /api/dashboard/risk-matrix', () => {
    it('should return risk matrix data', async () => {
      const res = await request(app)
        .get('/api/dashboard/risk-matrix')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('probability');
      expect(res.body.data[0]).toHaveProperty('impact');
      expect(res.body.data[0]).toHaveProperty('severity');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/risk-matrix');

      expect(res.status).toBe(401);
    });
  });
});

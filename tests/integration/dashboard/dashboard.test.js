const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Task, Budget, Expense, Risk } = require('../../../src/models');
const { generateAuthToken, createTestUser } = require('../../helpers/testHelpers');

let authToken;
let testUser;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  authToken = generateAuthToken(testUser);

  // Create a test project
  testProject = await Project.create({
    name: 'Dashboard Test Project',
    projectType: 'residential',
    status: 'active',
    clientName: 'Test Client',
    budget: 500000,
    projectManagerId: testUser.id
  });

  // Create a task assigned to the test user
  await Task.create({
    name: 'Dashboard Test Task',
    projectId: testProject.id,
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    assignedTo: testUser.id,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-02-01')
  });

  // Create a budget for cost-variance endpoint
  await Budget.create({
    name: 'Dashboard Test Budget',
    amount: 500000,
    projectId: testProject.id,
    status: 'APPROVED',
    createdBy: testUser.id
  });

  // Create a paid expense for cost-variance endpoint
  await Expense.create({
    name: 'Dashboard Test Expense',
    amount: 100000,
    category: 'LABOR',
    date: new Date(),
    projectId: testProject.id,
    status: 'PAID',
    submittedBy: testUser.id
  });

  // Create a risk for risk-matrix endpoint
  await Risk.create({
    title: 'Dashboard Test Risk',
    description: 'A test risk for dashboard testing',
    probability: 0.5,
    impact: 0.7,
    severity: 'HIGH',
    status: 'IDENTIFIED',
    projectId: testProject.id,
    identifiedBy: testUser.id,
    owner: testUser.id
  });
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

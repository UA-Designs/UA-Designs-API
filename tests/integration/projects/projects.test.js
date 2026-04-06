const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Budget, Expense } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

let adminUser;
let pmUser;
let memberUser;
let adminToken;
let pmToken;
let memberToken;
let testProject;
let unrelatedPmUser;
let unrelatedPmToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  adminUser = await User.create(createTestUser({
    role: 'ADMIN',
    email: 'admin@uadesigns.com'
  }));
  pmUser = await User.create(createTestUser({
    role: 'PROJECT_MANAGER',
    email: 'pm@uadesigns.com'
  }));
  memberUser = await User.create(createTestUser({
    role: 'ENGINEER',
    email: 'member@uadesigns.com'
  }));
  unrelatedPmUser = await User.create(createTestUser({
    role: 'PROJECT_MANAGER',
    email: 'pm2@uadesigns.com'
  }));

  adminToken = generateAuthToken(adminUser);
  pmToken = generateAuthToken(pmUser);
  memberToken = generateAuthToken(memberUser);
  unrelatedPmToken = generateAuthToken(unrelatedPmUser);

  testProject = await Project.create({
    ...createTestProject({ status: 'PLANNING', projectType: 'RESIDENTIAL' }),
    projectManagerId: pmUser.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Projects API', () => {
  // --- Health check ---

  describe('GET /api/projects/health', () => {
    it('should return 200 with OK status', async () => {
      const res = await request(app).get('/api/projects/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  // --- List projects ---

  describe('GET /api/projects/', () => {
    it('should return paginated projects for any authenticated user', async () => {
      const res = await request(app)
        .get('/api/projects/')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
      expect(res.body.data).toHaveProperty('pagination');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/projects/');

      expect(res.status).toBe(401);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/projects/?status=PLANNING')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      res.body.data.projects.forEach(p => expect(p.status).toBe('PLANNING'));
    });

    it('should filter by projectType', async () => {
      const res = await request(app)
        .get('/api/projects/?projectType=RESIDENTIAL')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/projects/?page=1&limit=5')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.currentPage).toBe(1);
    });

    it('should include project manager relation', async () => {
      const res = await request(app)
        .get('/api/projects/')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const projectWithManager = res.body.data.projects.find(p => p.projectManager);
      expect(projectWithManager).toBeDefined();
    });

    it('should expose normalized numeric budget alert fields', async () => {
      await Budget.create({
        name: 'Projects Route Approved Budget',
        amount: 100,
        status: 'APPROVED',
        projectId: testProject.id
      });
      await Expense.create({
        name: 'Projects Route Paid Expense',
        amount: 80,
        category: 'OTHER',
        date: new Date(),
        status: 'PAID',
        projectId: testProject.id,
        submittedBy: pmUser.id
      });

      const res = await request(app)
        .get('/api/projects/')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const project = res.body.data.projects.find(p => p.id === testProject.id);
      expect(project).toBeTruthy();
      expect(typeof project.budget).toBe('number');
      expect(typeof project.actualCost).toBe('number');
      expect(typeof project.budgetUsedPct).toBe('number');
      expect(typeof project.budgetAlertLevel).toBe('string');
      expect(project.budget).toBe(100);
      expect(project.actualCost).toBe(80);
      expect(project.budgetUsedPct).toBe(80);
      expect(project.budgetAlertLevel).toBe('warning_80');
      expect(project.hasBudget).toBe(true);
    });

    it('should resolve budgets correctly for one budget, revisions, status mixes, and fallbacks', async () => {
      const oneBudgetProject = await Project.create({
        ...createTestProject({ name: 'Budget Case One' }),
        budget: 0,
        projectManagerId: pmUser.id
      });
      await Budget.create({
        name: 'One Budget',
        amount: 120,
        status: 'PLANNED',
        projectId: oneBudgetProject.id
      });

      const revisedProject = await Project.create({
        ...createTestProject({ name: 'Budget Case Revised' }),
        budget: 0,
        projectManagerId: pmUser.id
      });
      await Budget.create({
        name: 'Older Revised',
        amount: 500,
        status: 'REVISED',
        projectId: revisedProject.id,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });
      await Budget.create({
        name: 'Current Planned',
        amount: 300,
        status: 'PLANNED',
        projectId: revisedProject.id,
        createdAt: new Date('2024-06-01'),
        updatedAt: new Date('2024-06-01')
      });

      const mixedStatusProject = await Project.create({
        ...createTestProject({ name: 'Budget Case Approved Wins' }),
        budget: 0,
        projectManagerId: pmUser.id
      });
      await Budget.create({
        name: 'Draft Budget',
        amount: 200,
        status: 'PLANNED',
        projectId: mixedStatusProject.id
      });
      await Budget.create({
        name: 'Approved Budget',
        amount: 400,
        status: 'APPROVED',
        projectId: mixedStatusProject.id
      });

      const noBudgetProject = await Project.create({
        ...createTestProject({ name: 'Budget Case None' }),
        budget: 0,
        projectManagerId: pmUser.id
      });

      const legacyFieldProject = await Project.create({
        ...createTestProject({ name: 'Budget Case Legacy Field' }),
        budget: 275,
        projectManagerId: pmUser.id
      });

      const res = await request(app)
        .get('/api/projects/?limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const rows = res.body.data.projects;
      const byName = (name) => rows.find(p => p.name === name);

      expect(byName('Budget Case One').budget).toBe(120);
      expect(byName('Budget Case One').budgetSource).toBe('budget_records');

      expect(byName('Budget Case Revised').budget).toBe(300);
      expect(byName('Budget Case Revised').budgetSource).toBe('budget_records');

      expect(byName('Budget Case Approved Wins').budget).toBe(400);
      expect(byName('Budget Case Approved Wins').budgetSource).toBe('budget_records');

      expect(byName('Budget Case None').budget).toBe(0);
      expect(byName('Budget Case None').hasBudget).toBe(false);
      expect(byName('Budget Case None').budgetSource).toBe('none');

      expect(byName('Budget Case Legacy Field').budget).toBe(275);
      expect(byName('Budget Case Legacy Field').budgetSource).toBe('project_field');
    });
  });

  describe('GET /api/projects/:id/budget-overview', () => {
    it('should return normalized budget overview fields', async () => {
      const project = await Project.create({
        ...createTestProject({ name: 'Budget Overview Project' }),
        projectManagerId: pmUser.id
      });
      await Budget.create({
        name: 'Overview Approved Budget',
        amount: 100,
        status: 'APPROVED',
        projectId: project.id
      });
      await Expense.create({
        name: 'Overview Expense',
        amount: 49.99,
        category: 'OTHER',
        date: new Date(),
        status: 'APPROVED',
        projectId: project.id,
        submittedBy: pmUser.id
      });

      const res = await request(app)
        .get(`/api/projects/${project.id}/budget-overview`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.budget).toBe('number');
      expect(typeof res.body.data.actualCost).toBe('number');
      expect(typeof res.body.data.budgetUsedPct).toBe('number');
      expect(typeof res.body.data.budgetAlertLevel).toBe('string');
      expect(res.body.data.budget).toBe(100);
      expect(res.body.data.actualCost).toBe(49.99);
      expect(res.body.data.budgetUsedPct).toBe(49.99);
      expect(res.body.data.budgetAlertLevel).toBe('on_track');
      expect(res.body.data.hasBudget).toBe(true);
    });

    it('should return budget 0 and hasBudget false when approved budget is missing', async () => {
      const project = await Project.create({
        ...createTestProject({ name: 'Budget Missing Project' }),
        projectManagerId: pmUser.id
      });
      await Expense.create({
        name: 'No Budget Expense',
        amount: 10,
        category: 'OTHER',
        date: new Date(),
        status: 'PAID',
        projectId: project.id,
        submittedBy: pmUser.id
      });

      const res = await request(app)
        .get(`/api/projects/${project.id}/budget-overview`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.budget).toBe(0);
      expect(res.body.data.hasBudget).toBe(false);
      expect(res.body.data.budgetUsedPct).toBe(0);
    });
  });

  // --- Project stats ---

  describe('GET /api/projects/stats/overview', () => {
    it('should return project statistics for any authenticated user', async () => {
      const res = await request(app)
        .get('/api/projects/stats/overview')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalProjects');
      expect(res.body.data).toHaveProperty('typeStats');
      expect(res.body.data).toHaveProperty('statusStats');
      expect(res.body.data).toHaveProperty('budgetStats');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/projects/stats/overview');

      expect(res.status).toBe(401);
    });
  });

  // --- Projects by status ---

  describe('GET /api/projects/status/:status', () => {
    it('should return projects filtered by status', async () => {
      const res = await request(app)
        .get('/api/projects/status/PLANNING')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/projects/status/PLANNING');

      expect(res.status).toBe(401);
    });
  });

  // --- Projects by type ---

  describe('GET /api/projects/type/:type', () => {
    it('should return projects filtered by type', async () => {
      const res = await request(app)
        .get('/api/projects/type/RESIDENTIAL')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });
  });

  // --- Projects by user ---

  describe('GET /api/projects/user/:userId', () => {
    it('should return own projects', async () => {
      const res = await request(app)
        .get(`/api/projects/user/${pmUser.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });

    it('should allow ADMIN to view any user projects', async () => {
      const res = await request(app)
        .get(`/api/projects/user/${pmUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 when viewing other user projects as non-ADMIN', async () => {
      const res = await request(app)
        .get(`/api/projects/user/${pmUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });

  // --- Get project by ID ---

  describe('GET /api/projects/:id', () => {
    it('should return project by ID for any authenticated user', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.id).toBe(testProject.id);
    });

    it('should include project manager and tasks', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.project).toHaveProperty('projectManager');
      expect(res.body.data.project).toHaveProperty('tasks');
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get(`/api/projects/${testProject.id}`);

      expect(res.status).toBe(401);
    });
  });

  // --- Project dashboard ---

  describe('GET /api/projects/:id/dashboard', () => {
    it('should return PMBOK dashboard data for any authenticated user', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('pmbokCoreAreas');
      expect(res.body.data.pmbokCoreAreas).toHaveProperty('schedule');
      expect(res.body.data.pmbokCoreAreas).toHaveProperty('risk');
      expect(res.body.data.pmbokCoreAreas).toHaveProperty('stakeholders');
      expect(res.body.data.pmbokCoreAreas).toHaveProperty('resources');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000/dashboard')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(404);
    });
  });

  // --- Create project ---

  describe('POST /api/projects/', () => {
    let createdProjectId;

    it('should create project as ADMIN', async () => {
      const res = await request(app)
        .post('/api/projects/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Construction Project',
          clientName: 'Test Client',
          projectType: 'COMMERCIAL',
          startDate: new Date().toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Construction Project');

      createdProjectId = res.body.data.id;
    });

    it('should create project as PROJECT_MANAGER', async () => {
      const res = await request(app)
        .post('/api/projects/')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'PM Created Project',
          clientName: 'Another Client'
        });

      expect(res.status).toBe(201);
    });

    it('should return 403 for ENGINEER', async () => {
      const res = await request(app)
        .post('/api/projects/')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Project', clientName: 'Client' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for missing required fields (name, clientName)', async () => {
      const res = await request(app)
        .post('/api/projects/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectType: 'RESIDENTIAL' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('missingFields');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/projects/')
        .send({ name: 'No Auth', clientName: 'Client' });

      expect(res.status).toBe(401);
    });
  });

  // --- Update project ---

  describe('PUT /api/projects/:id', () => {
    it('should update project as assigned PM', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update project as ADMIN', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Admin updated description' });

      expect(res.status).toBe(200);
    });

    it('should return 403 for unrelated project manager', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${unrelatedPmToken}`)
        .send({ description: 'Unauthorized update' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .put('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Ghost project' });

      expect(res.status).toBe(404);
    });
  });

  // --- Update project status ---

  describe('PATCH /api/projects/:id/status', () => {
    it('should update status as assigned PM', async () => {
      const res = await request(app)
        .patch(`/api/projects/${testProject.id}/status`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for unrelated project manager', async () => {
      const res = await request(app)
        .patch(`/api/projects/${testProject.id}/status`)
        .set('Authorization', `Bearer ${unrelatedPmToken}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .patch('/api/projects/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(404);
    });
  });

  // --- Assign manager ---

  describe('PATCH /api/projects/:id/assign-manager', () => {
    it('should assign a new project manager as ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/projects/${testProject.id}/assign-manager`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectManagerId: unrelatedPmUser.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Restore original manager
      await testProject.update({ projectManagerId: pmUser.id });
    });

    it('should return 404 for non-existent manager', async () => {
      const res = await request(app)
        .patch(`/api/projects/${testProject.id}/assign-manager`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectManagerId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .patch('/api/projects/00000000-0000-0000-0000-000000000000/assign-manager')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectManagerId: adminUser.id });

      expect(res.status).toBe(404);
    });
  });

  // --- Delete project ---

  describe('DELETE /api/projects/:id', () => {
    let deleteTarget;

    beforeAll(async () => {
      deleteTarget = await Project.create({
        ...createTestProject({ name: 'To Be Deleted' }),
        projectManagerId: adminUser.id
      });
    });

    it('should delete project as ADMIN', async () => {
      const res = await request(app)
        .delete(`/api/projects/${deleteTarget.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const anotherProject = await Project.create({
        ...createTestProject({ name: 'Pm Cannot Delete' }),
        projectManagerId: pmUser.id
      });

      const res = await request(app)
        .delete(`/api/projects/${anotherProject.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .delete('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});

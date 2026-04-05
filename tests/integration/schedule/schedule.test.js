const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

let authToken;
let adminToken;
let testUser;
let adminUser;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'admin@uadesigns.com' }));

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

describe('Schedule API', () => {
  let createdTaskId;
  let createdDependencyId;
  let secondTaskId;

  // --- Health check ---

  describe('GET /api/schedule/health', () => {
    it('should return 200 with OK status', async () => {
      const res = await request(app).get('/api/schedule/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  // --- Create task (via project route) ---

  describe('POST /api/schedule/projects/:projectId/tasks', () => {
    it('should create a task as project manager', async () => {
      const res = await request(app)
        .post(`/api/schedule/projects/${testProject.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Foundation Work',
          description: 'Dig and pour foundation',
          priority: 'HIGH',
          duration: 7
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.name).toBe('Foundation Work');
      expect(res.body.data.task.projectId).toBe(testProject.id);

      createdTaskId = res.body.data.task.id;
    });

    it('should create a second task for dependency tests', async () => {
      const res = await request(app)
        .post(`/api/schedule/projects/${testProject.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Framing', duration: 5, priority: 'MEDIUM' });

      expect(res.status).toBe(201);
      secondTaskId = res.body.data.task.id;
    });

    it('should return 400 when task name is missing', async () => {
      const res = await request(app)
        .post(`/api/schedule/projects/${testProject.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'HIGH' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post(`/api/schedule/projects/${testProject.id}/tasks`)
        .send({ name: 'No Auth Task' });

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .post('/api/schedule/projects/00000000-0000-0000-0000-000000000000/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost Task' });

      expect(res.status).toBe(404);
    });
  });

  // --- Create task (via general POST /tasks) ---

  describe('POST /api/schedule/tasks', () => {
    it('should create a task when projectId is in body', async () => {
      const res = await request(app)
        .post('/api/schedule/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Plumbing', projectId: testProject.id, duration: 3 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when projectId is missing', async () => {
      const res = await request(app)
        .post('/api/schedule/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'No Project' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // --- Get tasks for project ---

  describe('GET /api/schedule/projects/:projectId/tasks', () => {
    it('should return tasks for a project', async () => {
      const res = await request(app)
        .get(`/api/schedule/projects/${testProject.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tasks');
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get(`/api/schedule/projects/${testProject.id}/tasks`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/schedule/projects/00000000-0000-0000-0000-000000000000/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // --- Get tasks (general endpoint) ---

  describe('GET /api/schedule/tasks', () => {
    it('should return tasks when projectId query param provided', async () => {
      const res = await request(app)
        .get(`/api/schedule/tasks?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 400 when projectId query param is missing', async () => {
      const res = await request(app)
        .get('/api/schedule/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  // --- Get task by ID ---

  describe('GET /api/schedule/tasks/:id', () => {
    it('should return task by ID for project manager', async () => {
      const res = await request(app)
        .get(`/api/schedule/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.id).toBe(createdTaskId);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/api/schedule/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // --- Update task ---

  describe('PUT /api/schedule/tasks/:id', () => {
    it('should update a task', async () => {
      const res = await request(app)
        .put(`/api/schedule/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Foundation Work Updated', priority: 'CRITICAL' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.name).toBe('Foundation Work Updated');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/api/schedule/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost Update' });

      expect(res.status).toBe(404);
    });
  });

  // --- Update task status ---

  describe('PUT /api/schedule/tasks/:id/status', () => {
    it('should update task status and progress', async () => {
      const res = await request(app)
        .put(`/api/schedule/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS', progress: 50 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should expose completedAt when task is completed', async () => {
      const res = await request(app)
        .put(`/api/schedule/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.data.task.actualEndDate).toBeTruthy();
      expect(res.body.data.task.completedAt).toBeTruthy();
      expect(res.body.data.task.completed_at).toBeTruthy();
    });

    it('should accept snake_case completed_at alias on status update', async () => {
      const completedAt = '2030-01-20T00:00:00.000Z';
      const res = await request(app)
        .put(`/api/schedule/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED', completed_at: completedAt });

      expect(res.status).toBe(200);
      expect(res.body.data.task.actualEndDate).toContain('2030-01-20');
      expect(res.body.data.task.completedAt).toContain('2030-01-20');
    });
  });

  // --- Create task dependency ---

  describe('POST /api/schedule/dependencies', () => {
    it('should create a task dependency', async () => {
      const res = await request(app)
        .post('/api/schedule/dependencies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          predecessorTaskId: createdTaskId,
          successorTaskId: secondTaskId,
          dependencyType: 'FINISH_TO_START',
          lag: 0
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      createdDependencyId = res.body.data.dependency.id;
    });

    it('should return error for duplicate dependency', async () => {
      const res = await request(app)
        .post('/api/schedule/dependencies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          predecessorTaskId: createdTaskId,
          successorTaskId: secondTaskId,
          dependencyType: 'FINISH_TO_START'
        });

      expect([400, 500]).toContain(res.status);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/schedule/dependencies')
        .send({
          predecessorTaskId: createdTaskId,
          successorTaskId: secondTaskId
        });

      expect(res.status).toBe(401);
    });
  });

  // --- Get task dependencies ---

  describe('GET /api/schedule/tasks/:id/dependencies', () => {
    it('should return dependencies for a task', async () => {
      const res = await request(app)
        .get(`/api/schedule/tasks/${createdTaskId}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // --- Get project dependencies ---

  describe('GET /api/schedule/projects/:projectId/dependencies', () => {
    it('should return all task dependencies for a project', async () => {
      const res = await request(app)
        .get(`/api/schedule/projects/${testProject.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // --- Get critical path ---

  describe('GET /api/schedule/projects/:projectId/critical-path', () => {
    it('should return critical path for a project', async () => {
      const res = await request(app)
        .get(`/api/schedule/projects/${testProject.id}/critical-path`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('criticalPath');
    });
  });

  // --- Get schedule/Gantt ---

  describe('GET /api/schedule/projects/:projectId/schedule', () => {
    it('should return Gantt chart data for a project', async () => {
      const res = await request(app)
        .get(`/api/schedule/projects/${testProject.id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(res.body.data.tasks[0]).toHaveProperty('completedAt');
      expect(res.body.data.tasks[0]).toHaveProperty('completionDelayDays');
    });
  });

  describe('Risk-linked schedule adjustments', () => {
    it('should shift adjusted end date, accumulate delays, and update forecast when risks change', async () => {
      const isolatedProject = await Project.create({
        ...createTestProject({ name: `Risk Linked Schedule ${Date.now()}` }),
        projectManagerId: testUser.id
      });

      const createTaskResponse = await request(app)
        .post(`/api/schedule/projects/${isolatedProject.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Foundation Works',
          startDate: '2030-01-01T00:00:00.000Z',
          endDate: '2030-01-10T00:00:00.000Z',
          duration: 9
        });
      expect(createTaskResponse.status).toBe(201);
      const isolatedTaskId = createTaskResponse.body.data.task.id;

      const riskOneResponse = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Permit release delay',
          probability: 0.4,
          impact: 0.4,
          projectId: isolatedProject.id,
          linkedTaskIds: [isolatedTaskId],
          scheduleImpactDays: 3,
          impactType: 'DELAY'
        });
      expect(riskOneResponse.status).toBe(201);

      const firstAdjustedResponse = await request(app)
        .get(`/api/schedule/projects/${isolatedProject.id}/risk-adjusted-tasks`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(firstAdjustedResponse.status).toBe(200);
      const firstTask = firstAdjustedResponse.body.data.tasks.find(task => task.id === isolatedTaskId);
      expect(firstTask.riskDelayDays).toBe(3);
      expect(firstTask.adjustedEndDate).toContain('2030-01-13');
      expect(firstTask.hasScheduleRisk).toBe(true);
      expect(firstTask.linkedRiskIds).toContain(riskOneResponse.body.data.id);

      const riskTwoResponse = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Inspector delay',
          probability: 0.5,
          impact: 0.5,
          projectId: isolatedProject.id,
          linkedTaskIds: [isolatedTaskId],
          scheduleImpactDays: 2,
          impactType: 'DELAY'
        });
      expect(riskTwoResponse.status).toBe(201);

      const accumulatedResponse = await request(app)
        .get(`/api/schedule/projects/${isolatedProject.id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(accumulatedResponse.status).toBe(200);
      const accumulatedTask = accumulatedResponse.body.data.tasks.find(task => task.id === isolatedTaskId);
      expect(accumulatedTask.riskDelayDays).toBe(5);
      expect(accumulatedTask.adjustedEndDate).toContain('2030-01-15');
      expect(accumulatedResponse.body.data.forecast.riskAdjustedFinishDate).toContain('2030-01-15');

      const closedResponse = await request(app)
        .patch(`/api/risk/risks/${riskTwoResponse.body.data.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CLOSED' });
      expect(closedResponse.status).toBe(200);

      const afterCloseResponse = await request(app)
        .get(`/api/schedule/projects/${isolatedProject.id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(afterCloseResponse.status).toBe(200);
      const afterCloseTask = afterCloseResponse.body.data.tasks.find(task => task.id === isolatedTaskId);
      expect(afterCloseTask.riskDelayDays).toBe(3);
      expect(afterCloseTask.adjustedEndDate).toContain('2030-01-13');
      expect(afterCloseResponse.body.data.forecast.riskAdjustedFinishDate).toContain('2030-01-13');
    });
  });

  // --- Delete dependency ---

  describe('DELETE /api/schedule/dependencies/:id', () => {
    it('should delete a task dependency', async () => {
      const res = await request(app)
        .delete(`/api/schedule/dependencies/${createdDependencyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent dependency', async () => {
      const res = await request(app)
        .delete('/api/schedule/dependencies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // --- Delete task ---

  describe('DELETE /api/schedule/tasks/:id', () => {
    it('should delete a task', async () => {
      const res = await request(app)
        .delete(`/api/schedule/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .delete('/api/schedule/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});

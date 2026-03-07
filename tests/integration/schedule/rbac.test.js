/**
 * RBAC Integration Tests — Schedule Management
 *
 * Access matrix under test:
 *   GET  tasks/dependencies/schedule → ALL_ROLES
 *   POST tasks / POST dependencies   → MANAGER_AND_ABOVE
 *   PUT  tasks (update/status)        → ENGINEER_AND_ABOVE
 *   DELETE tasks / DELETE dependencies → MANAGER_AND_ABOVE
 */

const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

let adminUser, pmUser, engineerUser, staffUser;
let adminToken, pmToken, engineerToken, staffToken;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',           email: 'sched-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'sched-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',         email: 'sched-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',            email: 'sched-rbac-staff@test.com' }));

  adminToken    = generateAuthToken(adminUser);
  pmToken       = generateAuthToken(pmUser);
  engineerToken = generateAuthToken(engineerUser);
  staffToken    = generateAuthToken(staffUser);

  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: pmUser.id,
  });
});

afterAll(async () => {
  await sequelize.close();
});

const taskPayload = () => ({
  name: `Task ${Date.now()}`,
  projectId: testProject.id,
  plannedStartDate: new Date().toISOString(),
  plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString(),
});

// ── GET tasks — ALL_ROLES ─────────────────────────────────────────────────────

describe('GET /api/schedule/tasks — ALL_ROLES', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(`/api/schedule/tasks?projectId=${testProject.id}`);
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',           () => adminToken],
    ['PROJECT_MANAGER', () => pmToken],
    ['CIVIL_ENGINEER',  () => engineerToken],
    ['BOOKKEEPER',      () => staffToken],
  ])('allows %s (not 401/403)', async (label, tokenFn) => {
    const res = await request(app)
      .get(`/api/schedule/tasks?projectId=${testProject.id}`)
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect([200, 400]).toContain(res.status);
  });
});

// ── POST tasks — MANAGER_AND_ABOVE ────────────────────────────────────────────

describe('POST /api/schedule/tasks — MANAGER_AND_ABOVE', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/schedule/tasks').send(taskPayload());
    expect(res.status).toBe(401);
  });

  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .post('/api/schedule/tasks')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(taskPayload());
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER (staff) with 403', async () => {
    const res = await request(app)
      .post('/api/schedule/tasks')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(taskPayload());
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/schedule/tasks')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(taskPayload());
    expect(res.status).not.toBe(403);
  });

  it('allows ADMIN (not 403)', async () => {
    const res = await request(app)
      .post('/api/schedule/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(taskPayload());
    expect(res.status).not.toBe(403);
  });
});

// ── PUT tasks/:id — ENGINEER_AND_ABOVE ────────────────────────────────────────

describe('PUT /api/schedule/tasks/:id — ENGINEER_AND_ABOVE', () => {
  it('blocks BOOKKEEPER (staff) with 403', async () => {
    const res = await request(app)
      .put('/api/schedule/tasks/non-existent-id')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  // Engineers should get through the auth layer (may get 404 for non-existent task)
  it('allows CIVIL_ENGINEER (not 403)', async () => {
    const res = await request(app)
      .put('/api/schedule/tasks/non-existent-id')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ name: 'Updated' });
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE tasks/:id — MANAGER_AND_ABOVE ──────────────────────────────────────

describe('DELETE /api/schedule/tasks/:id — MANAGER_AND_ABOVE', () => {
  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .delete('/api/schedule/tasks/non-existent-id')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .delete('/api/schedule/tasks/non-existent-id')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .delete('/api/schedule/tasks/non-existent-id')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── POST /dependencies — MANAGER_AND_ABOVE ────────────────────────────────────

describe('POST /api/schedule/dependencies — MANAGER_AND_ABOVE', () => {
  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .post('/api/schedule/dependencies')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ predecessorId: 'a', successorId: 'b', dependencyType: 'FS' });
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/schedule/dependencies')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ predecessorId: 'a', successorId: 'b', dependencyType: 'FS' });
    expect(res.status).not.toBe(403);
  });
});

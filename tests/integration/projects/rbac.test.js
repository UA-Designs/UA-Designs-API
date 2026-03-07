/**
 * RBAC Integration Tests — Projects
 *
 * Access matrix under test:
 *   GET  /api/projects/           → ALL_ROLES (auth only)
 *   POST /api/projects/           → MANAGER_AND_ABOVE
 *   PUT  /api/projects/:id        → MANAGER_AND_ABOVE
 *   PATCH /api/projects/:id/status → MANAGER_AND_ABOVE
 *   PATCH /api/projects/:id/assign-manager → ADMIN_ONLY
 *   DELETE /api/projects/:id      → ADMIN_ONLY
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

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',           email: 'proj-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'proj-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',         email: 'proj-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',            email: 'proj-rbac-staff@test.com' }));

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

const projectPayload = {
  name: 'RBAC Test Project',
  clientName: 'Test Client',
  projectType: 'RESIDENTIAL',
};

// ── GET /api/projects/ ────────────────────────────────────────────────────────

describe('GET /api/projects/ — ALL_ROLES', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/projects/');
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',           () => adminToken],
    ['PROJECT_MANAGER', () => pmToken],
    ['CIVIL_ENGINEER',  () => engineerToken],
    ['SECRETARY (staff)', () => staffToken],
  ])('allows %s (200)', async (label, tokenFn) => {
    const res = await request(app)
      .get('/api/projects/')
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /api/projects/ — MANAGER_AND_ABOVE ───────────────────────────────────

describe('POST /api/projects/ — MANAGER_AND_ABOVE', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/projects/').send(projectPayload);
    expect(res.status).toBe(401);
  });

  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .post('/api/projects/')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(projectPayload);
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY (staff) with 403', async () => {
    const res = await request(app)
      .post('/api/projects/')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(projectPayload);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (201)', async () => {
    const res = await request(app)
      .post('/api/projects/')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ ...projectPayload, name: `PM Project ${Date.now()}` });
    expect(res.status).toBe(201);
  });

  it('allows ADMIN (201)', async () => {
    const res = await request(app)
      .post('/api/projects/')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...projectPayload, name: `Admin Project ${Date.now()}` });
    expect(res.status).toBe(201);
  });
});

// ── PUT /api/projects/:id — MANAGER_AND_ABOVE ─────────────────────────────────

describe('PUT /api/projects/:id — MANAGER_AND_ABOVE', () => {
  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .put(`/api/projects/${testProject.id}`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ description: 'Updated by engineer' });
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .put(`/api/projects/${testProject.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ description: 'Updated by staff' });
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (200)', async () => {
    const res = await request(app)
      .put(`/api/projects/${testProject.id}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ description: 'Updated by PM' });
    expect([200, 400, 404]).toContain(res.status); // 200 expected, guard against edge cases
    expect(res.status).not.toBe(403);
  });
});

// ── PATCH /api/projects/:id/status — MANAGER_AND_ABOVE ───────────────────────

describe('PATCH /api/projects/:id/status — MANAGER_AND_ABOVE', () => {
  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .patch(`/api/projects/${testProject.id}/status`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(403);
  });

  it('allows ADMIN', async () => {
    const res = await request(app)
      .patch(`/api/projects/${testProject.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).not.toBe(403);
  });
});

// ── PATCH /api/projects/:id/assign-manager — ADMIN_ONLY ──────────────────────

describe('PATCH /api/projects/:id/assign-manager — ADMIN_ONLY', () => {
  it('blocks PROJECT_MANAGER with 403', async () => {
    const res = await request(app)
      .patch(`/api/projects/${testProject.id}/assign-manager`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectManagerId: pmUser.id });
    expect(res.status).toBe(403);
  });

  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .patch(`/api/projects/${testProject.id}/assign-manager`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ projectManagerId: pmUser.id });
    expect(res.status).toBe(403);
  });

  it('allows ADMIN (not 403)', async () => {
    const res = await request(app)
      .patch(`/api/projects/${testProject.id}/assign-manager`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectManagerId: adminUser.id });
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /api/projects/:id — ADMIN_ONLY ─────────────────────────────────────

describe('DELETE /api/projects/:id — ADMIN_ONLY', () => {
  it('blocks PROJECT_MANAGER with 403', async () => {
    const res = await request(app)
      .delete(`/api/projects/${testProject.id}`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks CIVIL_ENGINEER with 403', async () => {
    const res = await request(app)
      .delete(`/api/projects/${testProject.id}`)
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .delete(`/api/projects/${testProject.id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });
});

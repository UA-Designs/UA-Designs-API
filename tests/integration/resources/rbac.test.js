/**
 * RBAC Integration Tests — Resource Management
 *
 * Key access rules under test:
 *   GET  materials/labor/equipment/team/allocations → ALL_ROLES
 *   POST/PUT materials/labor/equipment              → ENGINEER_AND_ABOVE
 *   DELETE materials/labor/equipment                → MANAGER_AND_ABOVE
 *   POST equipment/:id/maintenance                  → ENGINEER_AND_ABOVE
 *   POST/PUT/DELETE team & allocations              → MANAGER_AND_ABOVE
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

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',               email: 'res-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER',     email: 'res-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',             email: 'res-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',               email: 'res-rbac-staff@test.com' }));

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

// ── GET materials — ALL_ROLES ─────────────────────────────────────────────────

describe('GET /api/resources/materials — ALL_ROLES', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/resources/materials');
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',                () => adminToken],
    ['PROJECT_MANAGER',      () => pmToken],
    ['APPRENTICE_ARCHITECT', () => engineerToken],
    ['BOOKKEEPER',           () => staffToken],
  ])('allows %s (200)', async (label, tokenFn) => {
    const res = await request(app)
      .get('/api/resources/materials')
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /materials — ENGINEER_AND_ABOVE ─────────────────────────────────────

describe('POST /api/resources/materials — ENGINEER_AND_ABOVE', () => {
  const payload = () => ({
    projectId: testProject.id,
    name: `Material ${Date.now()}`,
    unit: 'm3',
    unitCost: 50,
    quantity: 100,
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .post('/api/resources/materials')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(payload());
    expect(res.status).toBe(403);
  });

  it('allows APPRENTICE_ARCHITECT (not 403)', async () => {
    const res = await request(app)
      .post('/api/resources/materials')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(payload());
    expect(res.status).not.toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/resources/materials')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(payload());
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /materials/:id — MANAGER_AND_ABOVE ────────────────────────────────

describe('DELETE /api/resources/materials/:id — MANAGER_AND_ABOVE', () => {
  it('blocks APPRENTICE_ARCHITECT with 403', async () => {
    const res = await request(app)
      .delete('/api/resources/materials/non-existent')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .delete('/api/resources/materials/non-existent')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .delete('/api/resources/materials/non-existent')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── POST /team — MANAGER_AND_ABOVE ───────────────────────────────────────────

describe('POST /api/resources/team — MANAGER_AND_ABOVE', () => {
  const payload = () => ({
    projectId: testProject.id,
    name: `Team Member ${Date.now()}`,
    role: 'DEVELOPER',
    hourlyRate: 50,
  });

  it('blocks APPRENTICE_ARCHITECT with 403', async () => {
    const res = await request(app)
      .post('/api/resources/team')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(payload());
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .post('/api/resources/team')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(payload());
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/resources/team')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(payload());
    expect(res.status).not.toBe(403);
  });
});

// ── POST /allocations — MANAGER_AND_ABOVE ────────────────────────────────────

describe('POST /api/resources/allocations — MANAGER_AND_ABOVE', () => {
  it('blocks APPRENTICE_ARCHITECT with 403', async () => {
    const res = await request(app)
      .post('/api/resources/allocations')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ projectId: testProject.id, resourceType: 'LABOR', resourceId: 'test' });
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/resources/allocations')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectId: testProject.id, resourceType: 'LABOR', resourceId: 'test' });
    expect(res.status).not.toBe(403);
  });
});

// ── POST /equipment/:id/maintenance — ENGINEER_AND_ABOVE ─────────────────────

describe('POST /api/resources/equipment/:id/maintenance — ENGINEER_AND_ABOVE', () => {
  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .post('/api/resources/equipment/non-existent/maintenance')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ maintenanceType: 'PREVENTIVE', description: 'Test' });
    expect(res.status).toBe(403);
  });

  it('allows APPRENTICE_ARCHITECT (not 403)', async () => {
    const res = await request(app)
      .post('/api/resources/equipment/non-existent/maintenance')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ maintenanceType: 'PREVENTIVE', description: 'Test' });
    expect(res.status).not.toBe(403);
  });
});

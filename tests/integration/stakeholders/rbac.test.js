/**
 * RBAC Integration Tests — Stakeholder Management
 *
 * Key access rules under test:
 *   GET  stakeholders & communications → ALL_ROLES
 *   POST/PUT/DELETE stakeholders       → MANAGER_AND_ABOVE
 *   PUT  /communications/:id           → ENGINEER_AND_ABOVE
 *   DELETE /communications/:id         → MANAGER_AND_ABOVE
 *   POST /:id/communications & feedback → ALL_ROLES
 *   POST /:id/engagement               → ENGINEER_AND_ABOVE
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

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',               email: 'sh-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER',     email: 'sh-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',             email: 'sh-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',               email: 'sh-rbac-staff@test.com' }));

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

const stakeholderPayload = () => ({
  projectId: testProject.id,
  name: `Stakeholder ${Date.now()}`,
  role: 'CLIENT',
  organization: 'Test Org',
  influence: 'HIGH',
  interest: 'HIGH',
  engagementLevel: 'SUPPORTIVE',
});

// ── GET stakeholders — ALL_ROLES ──────────────────────────────────────────────

describe('GET /api/stakeholders/ — ALL_ROLES', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/stakeholders/');
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',            () => adminToken],
    ['PROJECT_MANAGER',  () => pmToken],
    ['JUNIOR_ARCHITECT', () => engineerToken],
    ['SECRETARY',        () => staffToken],
  ])('allows %s (200)', async (label, tokenFn) => {
    const res = await request(app)
      .get('/api/stakeholders/')
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /stakeholders — MANAGER_AND_ABOVE ────────────────────────────────────

describe('POST /api/stakeholders/ — MANAGER_AND_ABOVE', () => {
  it('blocks JUNIOR_ARCHITECT with 403', async () => {
    const res = await request(app)
      .post('/api/stakeholders/')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(stakeholderPayload());
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .post('/api/stakeholders/')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(stakeholderPayload());
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/stakeholders/')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(stakeholderPayload());
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /stakeholders/:id — MANAGER_AND_ABOVE ─────────────────────────────

describe('DELETE /api/stakeholders/:id — MANAGER_AND_ABOVE', () => {
  it('blocks JUNIOR_ARCHITECT with 403', async () => {
    const res = await request(app)
      .delete('/api/stakeholders/non-existent')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .delete('/api/stakeholders/non-existent')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .delete('/api/stakeholders/non-existent')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── PUT /communications/:id — ENGINEER_AND_ABOVE ─────────────────────────────

describe('PUT /api/stakeholders/communications/:id — ENGINEER_AND_ABOVE', () => {
  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .put('/api/stakeholders/communications/non-existent')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ notes: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('allows JUNIOR_ARCHITECT (not 403)', async () => {
    const res = await request(app)
      .put('/api/stakeholders/communications/non-existent')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ notes: 'Updated' });
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /communications/:id — MANAGER_AND_ABOVE ───────────────────────────

describe('DELETE /api/stakeholders/communications/:id — MANAGER_AND_ABOVE', () => {
  it('blocks JUNIOR_ARCHITECT with 403', async () => {
    const res = await request(app)
      .delete('/api/stakeholders/communications/non-existent')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .delete('/api/stakeholders/communications/non-existent')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .delete('/api/stakeholders/communications/non-existent')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── POST /:id/engagement — ENGINEER_AND_ABOVE ────────────────────────────────

describe('POST /api/stakeholders/:id/engagement — ENGINEER_AND_ABOVE', () => {
  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .post('/api/stakeholders/non-existent/engagement')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ engagementLevel: 'SUPPORTIVE', notes: 'Test' });
    expect(res.status).toBe(403);
  });

  it('allows JUNIOR_ARCHITECT (not 403)', async () => {
    const res = await request(app)
      .post('/api/stakeholders/non-existent/engagement')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ engagementLevel: 'SUPPORTIVE', notes: 'Test' });
    expect(res.status).not.toBe(403);
  });
});

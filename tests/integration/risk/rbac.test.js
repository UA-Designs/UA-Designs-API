/**
 * RBAC Integration Tests — Risk Management
 *
 * Key access rules under test:
 *   GET  risks/mitigations/analytics → ALL_ROLES
 *   POST/PUT risks, PATCH status     → ENGINEER_AND_ABOVE
 *   DELETE risks                     → MANAGER_AND_ABOVE
 *   POST assess/escalate             → MANAGER_AND_ABOVE
 *   POST/PUT/DELETE mitigations      → MANAGER_AND_ABOVE
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

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',           email: 'risk-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'risk-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',         email: 'risk-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',            email: 'risk-rbac-staff@test.com' }));

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

const riskPayload = () => ({
  projectId: testProject.id,
  title: `Risk ${Date.now()}`,
  description: 'A test risk',
  probability: 0.5,
  impact: 0.5,
  category: 'TECHNICAL',
  responseStrategy: 'MITIGATE',
});

// ── GET risks — ALL_ROLES ─────────────────────────────────────────────────────

describe('GET /api/risk/risks — ALL_ROLES', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/risk/risks');
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',           () => adminToken],
    ['PROJECT_MANAGER', () => pmToken],
    ['SITE_ENGINEER',   () => engineerToken],
    ['SECRETARY',       () => staffToken],
  ])('allows %s (200)', async (label, tokenFn) => {
    const res = await request(app)
      .get('/api/risk/risks')
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /risks — ENGINEER_AND_ABOVE ─────────────────────────────────────────

describe('POST /api/risk/risks — ENGINEER_AND_ABOVE', () => {
  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .post('/api/risk/risks')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(riskPayload());
    expect(res.status).toBe(403);
  });

  it('allows SITE_ENGINEER (not 403)', async () => {
    const res = await request(app)
      .post('/api/risk/risks')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(riskPayload());
    expect(res.status).not.toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/risk/risks')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(riskPayload());
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /risks/:id — MANAGER_AND_ABOVE ────────────────────────────────────

describe('DELETE /api/risk/risks/:id — MANAGER_AND_ABOVE', () => {
  it('blocks SITE_ENGINEER with 403', async () => {
    const res = await request(app)
      .delete('/api/risk/risks/non-existent')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .delete('/api/risk/risks/non-existent')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .delete('/api/risk/risks/non-existent')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── POST /risks/:id/escalate — MANAGER_AND_ABOVE ─────────────────────────────

describe('POST /api/risk/risks/:id/escalate — MANAGER_AND_ABOVE', () => {
  it('blocks SITE_ENGINEER with 403', async () => {
    const res = await request(app)
      .post('/api/risk/risks/non-existent/escalate')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ reason: 'High impact identified' });
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/risk/risks/non-existent/escalate')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ reason: 'High impact identified' });
    expect(res.status).not.toBe(403);
  });
});

// ── POST /mitigations — MANAGER_AND_ABOVE ────────────────────────────────────

describe('POST /api/risk/mitigations — MANAGER_AND_ABOVE', () => {
  it('blocks SITE_ENGINEER with 403', async () => {
    const res = await request(app)
      .post('/api/risk/mitigations')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ riskId: 'test', strategy: 'MITIGATE', action: 'Test action' });
    expect(res.status).toBe(403);
  });

  it('blocks SECRETARY with 403', async () => {
    const res = await request(app)
      .post('/api/risk/mitigations')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ riskId: 'test', strategy: 'MITIGATE', action: 'Test action' });
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/risk/mitigations')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ riskId: 'test', strategy: 'MITIGATE', action: 'Test action' });
    expect(res.status).not.toBe(403);
  });
});

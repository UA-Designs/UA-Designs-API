/**
 * RBAC Integration Tests — Cost Management
 *
 * Key access rules under test:
 *   GET  costs/budgets/expenses/analysis → ALL_ROLES
 *   POST/PUT costs & expenses            → ENGINEER_AND_ABOVE
 *   DELETE costs & expenses              → MANAGER_AND_ABOVE
 *   POST budgets / PUT budgets / DELETE  → MANAGER_AND_ABOVE
 *   PATCH budgets/approve & /close       → ADMIN_ONLY
 *   PATCH expenses/approve|reject|pay    → MANAGER_AND_ABOVE
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

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',           email: 'cost-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'cost-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',         email: 'cost-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',            email: 'cost-rbac-staff@test.com' }));

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

// ── GET costs — ALL_ROLES ─────────────────────────────────────────────────────

describe('GET /api/cost/costs — ALL_ROLES', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/cost/costs');
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',           () => adminToken],
    ['PROJECT_MANAGER', () => pmToken],
    ['ARCHITECT',       () => engineerToken],
    ['BOOKKEEPER',      () => staffToken],
  ])('allows %s (200)', async (label, tokenFn) => {
    const res = await request(app)
      .get('/api/cost/costs')
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /costs — ENGINEER_AND_ABOVE ─────────────────────────────────────────

describe('POST /api/cost/costs — ENGINEER_AND_ABOVE', () => {
  const payload = { projectId: null, description: 'Test cost', amount: 100, category: 'LABOR' };

  beforeAll(() => { payload.projectId = testProject.id; });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .post('/api/cost/costs')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(payload);
    expect(res.status).toBe(403);
  });

  it('allows ARCHITECT (not 403)', async () => {
    const res = await request(app)
      .post('/api/cost/costs')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(payload);
    expect(res.status).not.toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/cost/costs')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(payload);
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /costs/:id — MANAGER_AND_ABOVE ────────────────────────────────────

describe('DELETE /api/cost/costs/:id — MANAGER_AND_ABOVE', () => {
  it('blocks ARCHITECT (engineer) with 403', async () => {
    const res = await request(app)
      .delete('/api/cost/costs/non-existent')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .delete('/api/cost/costs/non-existent')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .delete('/api/cost/costs/non-existent')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── POST /budgets — MANAGER_AND_ABOVE ────────────────────────────────────────

describe('POST /api/cost/budgets — MANAGER_AND_ABOVE', () => {
  const payload = () => ({
    projectId: testProject.id,
    name: `Budget ${Date.now()}`,
    totalAmount: 500000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
  });

  it('blocks ARCHITECT with 403', async () => {
    const res = await request(app)
      .post('/api/cost/budgets')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(payload());
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .post('/api/cost/budgets')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(payload());
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .post('/api/cost/budgets')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(payload());
    expect(res.status).not.toBe(403);
  });
});

// ── PATCH /budgets/:id/approve — ADMIN_ONLY ──────────────────────────────────

describe('PATCH /api/cost/budgets/:id/approve — ADMIN_ONLY', () => {
  it('blocks PROJECT_MANAGER with 403', async () => {
    const res = await request(app)
      .patch('/api/cost/budgets/non-existent/approve')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks ARCHITECT with 403', async () => {
    const res = await request(app)
      .patch('/api/cost/budgets/non-existent/approve')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('allows ADMIN (not 403)', async () => {
    const res = await request(app)
      .patch('/api/cost/budgets/non-existent/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).not.toBe(403);
  });
});

// ── PATCH /expenses/:id/approve — MANAGER_AND_ABOVE ──────────────────────────

describe('PATCH /api/cost/expenses/:id/approve — MANAGER_AND_ABOVE', () => {
  it('blocks ARCHITECT with 403', async () => {
    const res = await request(app)
      .patch('/api/cost/expenses/non-existent/approve')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks BOOKKEEPER with 403', async () => {
    const res = await request(app)
      .patch('/api/cost/expenses/non-existent/approve')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('allows PROJECT_MANAGER (not 403)', async () => {
    const res = await request(app)
      .patch('/api/cost/expenses/non-existent/approve')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).not.toBe(403);
  });
});

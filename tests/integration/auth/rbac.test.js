/**
 * RBAC Integration Tests — Auth Routes
 *
 * Verifies:
 *  - POST /register is protected (requires ADMIN token)
 *  - GET /me, GET /profile, POST /change-password require a valid token
 */

const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User } = require('../../../src/models');
const { generateAuthToken, createTestUser } = require('../../helpers/testHelpers');

let adminUser, pmUser, engineerUser, staffUser;
let adminToken, pmToken, engineerToken, staffToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  adminUser    = await User.create(createTestUser({ role: 'ADMIN',           email: 'auth-rbac-admin@test.com' }));
  pmUser       = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'auth-rbac-pm@test.com' }));
  engineerUser = await User.create(createTestUser({ role: 'ENGINEER',         email: 'auth-rbac-eng@test.com' }));
  staffUser    = await User.create(createTestUser({ role: 'STAFF',            email: 'auth-rbac-staff@test.com' }));

  adminToken    = generateAuthToken(adminUser);
  pmToken       = generateAuthToken(pmUser);
  engineerToken = generateAuthToken(engineerUser);
  staffToken    = generateAuthToken(staffUser);
});

afterAll(async () => {
  await sequelize.close();
});

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register — RBAC', () => {
  const newUserPayload = {
    firstName: 'New',
    lastName: 'User',
    email: `new-${Date.now()}@test.com`,
    password: 'password123',
    role: 'STAFF',
  };

  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/auth/register').send(newUserPayload);
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a Project Manager', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ ...newUserPayload, email: `new-pm-${Date.now()}@test.com` });
    expect(res.status).toBe(403);
  });

  it('returns 403 when called by an Engineer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ ...newUserPayload, email: `new-eng-${Date.now()}@test.com` });
    expect(res.status).toBe(403);
  });

  it('returns 403 when called by Staff', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ ...newUserPayload, email: `new-staff-${Date.now()}@test.com` });
    expect(res.status).toBe(403);
  });

  it('returns 201 when called by ADMIN', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newUserPayload, email: `new-admin-reg-${Date.now()}@test.com` });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me — authentication required', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it.each([
    ['ADMIN',           () => adminToken],
    ['PROJECT_MANAGER', () => pmToken],
    ['ENGINEER',        () => engineerToken],
    ['STAFF',           () => staffToken],
  ])('returns 200 for %s', async (role, tokenFn) => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenFn()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /api/auth/profile ─────────────────────────────────────────────────────

describe('GET /api/auth/profile — authentication required', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('returns 200 for any valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /api/auth/change-password ────────────────────────────────────────────

describe('POST /api/auth/change-password — authentication required', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'password', newPassword: 'newpassword123' });
    expect(res.status).toBe(401);
  });
});

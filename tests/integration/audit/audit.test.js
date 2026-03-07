const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, AuditLog } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

let adminToken;
let pmToken;
let adminUser;
let pmUser;
let testProject;

// Small helper to allow fire-and-forget async audit writes to complete
const waitForAudit = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(async () => {
  await sequelize.sync({ force: true });

  adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'audit-admin@uadesigns.com' }));
  pmUser    = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'audit-pm@uadesigns.com' }));

  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: adminUser.id
  });

  adminToken = generateAuthToken(adminUser);
  pmToken    = generateAuthToken(pmUser);
});

afterAll(async () => {
  await sequelize.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Access control
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/audit/logs — access control', () => {
  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/audit/logs');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 for a PROJECT_MANAGER token', async () => {
    const res = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 200 for an ADMIN token', async () => {
    const res = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('meta');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/audit/logs — filtering', () => {
  beforeAll(async () => {
    // Seed a few known log entries so filter tests are deterministic
    await AuditLog.bulkCreate([
      {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'PROJECT',
        entityId: testProject.id,
        description: "Created project 'Test Project Alpha'",
        ipAddress: '127.0.0.1',
        method: 'POST',
        path: '/api/projects',
        statusCode: 201
      },
      {
        userId: adminUser.id,
        action: 'UPDATE',
        entity: 'TASK',
        entityId: null,
        description: "Updated task 'Foundation Work'",
        ipAddress: '127.0.0.1',
        method: 'PUT',
        path: '/api/schedule/tasks/some-id',
        statusCode: 200
      },
      {
        userId: adminUser.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: adminUser.id,
        description: 'User logged in',
        ipAddress: '127.0.0.1',
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 200
      }
    ]);
  });

  it('should filter by action=CREATE', async () => {
    const res = await request(app)
      .get('/api/audit/logs?action=CREATE')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(log => log.action === 'CREATE')).toBe(true);
  });

  it('should filter by entity=PROJECT', async () => {
    const res = await request(app)
      .get('/api/audit/logs?entity=PROJECT')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(log => log.entity === 'PROJECT')).toBe(true);
  });

  it('should filter by userId', async () => {
    const res = await request(app)
      .get(`/api/audit/logs?userId=${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(log => log.userId === adminUser.id)).toBe(true);
  });

  it('should respect startDate and endDate filtering', async () => {
    const past   = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

    const res = await request(app)
      .get(`/api/audit/logs?startDate=${past}&endDate=${future}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // All returned entries must fall within the window
    res.body.data.forEach(log => {
      const ts = new Date(log.createdAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(new Date(past).getTime());
      expect(ts).toBeLessThanOrEqual(new Date(future).getTime());
    });
  });

  it('should default to DESC order (newest first)', async () => {
    const res = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const dates = res.body.data.map(l => new Date(l.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Single log entry
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/audit/logs/:id', () => {
  let logId;

  beforeAll(async () => {
    const log = await AuditLog.create({
      userId: adminUser.id,
      action: 'DELETE',
      entity: 'RISK',
      description: 'Deleted risk entry',
      ipAddress: '127.0.0.1',
      method: 'DELETE',
      path: '/api/risk/risks/some-uuid',
      statusCode: 200
    });
    logId = log.id;
  });

  it('should return 200 with the log entry', async () => {
    const res = await request(app)
      .get(`/api/audit/logs/${logId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(logId);
    expect(res.body.data.action).toBe('DELETE');
  });

  it('should return 404 for a non-existent log id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/audit/logs/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// User-specific audit trail
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/audit/logs/user/:userId', () => {
  it('should return audit logs for the specified user', async () => {
    const res = await request(app)
      .get(`/api/audit/logs/user/${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every(l => l.userId === adminUser.id)).toBe(true);
  });

  it('should return paginated meta', async () => {
    const res = await request(app)
      .get(`/api/audit/logs/user/${adminUser.id}?page=1&limit=5`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('limit');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('totalPages');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Entity audit trail
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/audit/logs/entity/:entity/:entityId', () => {
  it('should return the audit trail for a specific project', async () => {
    // Ensure at least one PROJECT log for testProject.id exists from the filtering beforeAll
    const res = await request(app)
      .get(`/api/audit/logs/entity/PROJECT/${testProject.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every(l => l.entity === 'PROJECT' && l.entityId === testProject.id)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Middleware integration — state-changing requests create log entries
// ─────────────────────────────────────────────────────────────────────────────
describe('Audit middleware integration', () => {
  it('POST /api/projects should create an audit log entry automatically', async () => {
    const before = await AuditLog.count({ where: { entity: 'PROJECT', action: 'CREATE' } });

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit Test Project', clientName: 'Audit Client Corp' });

    await waitForAudit();

    const after = await AuditLog.count({ where: { entity: 'PROJECT', action: 'CREATE' } });
    expect(after).toBeGreaterThan(before);
  });

  it('GET /api/projects should NOT create an audit log entry', async () => {
    const before = await AuditLog.count();

    await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`);

    await waitForAudit();

    const after = await AuditLog.count();
    expect(after).toBe(before);
  });
});

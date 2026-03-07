const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User } = require('../../../src/models');
const { generateAuthToken, createTestUser } = require('../../helpers/testHelpers');

let adminUser;
let pmUser;
let memberUser;
let adminToken;
let pmToken;
let memberToken;

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

  adminToken = generateAuthToken(adminUser);
  pmToken = generateAuthToken(pmUser);
  memberToken = generateAuthToken(memberUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Users API', () => {
  // --- Health check ---

  describe('GET /api/users/health', () => {
    it('should return 200 with OK status', async () => {
      const res = await request(app).get('/api/users/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  // --- List users ---

  describe('GET /api/users/', () => {
    it('should return paginated users as ADMIN', async () => {
      const res = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data).toHaveProperty('pagination');
    });

    it('should return paginated users as PROJECT_MANAGER', async () => {
      const res = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for ENGINEER', async () => {
      const res = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/users/');

      expect(res.status).toBe(401);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/users/?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.users.forEach(u => expect(u.role).toBe('ADMIN'));
    });

    it('should filter by isActive', async () => {
      const res = await request(app)
        .get('/api/users/?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.users.forEach(u => expect(u.isActive).toBe(true));
    });

    it('should support pagination params', async () => {
      const res = await request(app)
        .get('/api/users/?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.currentPage).toBe(1);
      expect(res.body.data.users.length).toBeLessThanOrEqual(2);
    });

    it('should not return password field', async () => {
      const res = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`);

      res.body.data.users.forEach(u => expect(u).not.toHaveProperty('password'));
    });
  });

  // --- User stats ---

  describe('GET /api/users/stats/overview', () => {
    it('should return stats as ADMIN', async () => {
      const res = await request(app)
        .get('/api/users/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('activeUsers');
      expect(res.body.data).toHaveProperty('inactiveUsers');
      expect(res.body.data).toHaveProperty('roleStats');
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const res = await request(app)
        .get('/api/users/stats/overview')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/users/stats/overview');

      expect(res.status).toBe(401);
    });
  });

  // --- Users by role ---

  describe('GET /api/users/role/:role', () => {
    it('should return users filtered by role as ADMIN', async () => {
      const res = await request(app)
        .get('/api/users/role/PROJECT_MANAGER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      res.body.data.users.forEach(u => expect(u.role).toBe('PROJECT_MANAGER'));
    });

    it('should return users filtered by role as PM', async () => {
      const res = await request(app)
        .get('/api/users/role/ENGINEER')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 for ENGINEER', async () => {
      const res = await request(app)
        .get('/api/users/role/ADMIN')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });

  // --- Get user by ID ---

  describe('GET /api/users/:id', () => {
    it('should return own profile as ENGINEER', async () => {
      const res = await request(app)
        .get(`/api/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(memberUser.id);
    });

    it('should return any user as ADMIN', async () => {
      const res = await request(app)
        .get(`/api/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(memberUser.id);
    });

    it('should return any user as PROJECT_MANAGER', async () => {
      const res = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 when ENGINEER views other user', async () => {
      const res = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should not include password field in response', async () => {
      const res = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.user).not.toHaveProperty('password');
    });
  });

  // --- Get user permissions ---

  describe('GET /api/users/:id/permissions', () => {
    it('should return own permissions for any role', async () => {
      const res = await request(app)
        .get(`/api/users/${memberUser.id}/permissions`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('userId');
    });

    it('should return other user permissions as ADMIN', async () => {
      const res = await request(app)
        .get(`/api/users/${pmUser.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 when ENGINEER views other user permissions', async () => {
      const res = await request(app)
        .get(`/api/users/${adminUser.id}/permissions`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });

  // --- Create user ---

  describe('POST /api/users/', () => {
    let createdUserId;

    it('should create user as ADMIN', async () => {
      const res = await request(app)
        .post('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'New',
          lastName: 'Employee',
          email: 'newemployee@uadesigns.com',
          password: 'password',
          role: 'ENGINEER'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newemployee@uadesigns.com');
      expect(res.body.data.user).not.toHaveProperty('password');

      createdUserId = res.body.data.user.id;
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const res = await request(app)
        .post('/api/users/')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          firstName: 'Another',
          lastName: 'User',
          email: 'another@uadesigns.com',
          password: 'password',
          role: 'ENGINEER'
        });

      expect(res.status).toBe(403);
    });

    it('should return 400 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Dup',
          lastName: 'User',
          email: 'newemployee@uadesigns.com',
          password: 'password',
          role: 'ENGINEER'
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'missingfields@uadesigns.com' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/users/')
        .send({
          firstName: 'No',
          lastName: 'Auth',
          email: 'noauth@uadesigns.com',
          password: 'password',
          role: 'ENGINEER'
        });

      expect(res.status).toBe(401);
    });
  });

  // --- Update user ---

  describe('PUT /api/users/:id', () => {
    it('should update own profile', async () => {
      const res = await request(app)
        .put(`/api/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ firstName: 'UpdatedFirst' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow ADMIN to update another user', async () => {
      const res = await request(app)
        .put(`/api/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ department: 'Engineering' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // --- Update user permissions ---

  describe('PUT /api/users/:id/permissions', () => {
    it('should update permissions as ADMIN', async () => {
      const res = await request(app)
        .put(`/api/users/${memberUser.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approvalLevel: 'SUPERVISOR' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const res = await request(app)
        .put(`/api/users/${memberUser.id}/permissions`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ approvalLevel: 'SUPERVISOR' });

      expect(res.status).toBe(403);
    });
  });

  // --- Deactivate user ---

  describe('PATCH /api/users/:id/deactivate', () => {
    let targetUser;

    beforeAll(async () => {
      targetUser = await User.create(createTestUser({ email: 'deactivate-target@uadesigns.com' }));
    });

    it('should deactivate user as ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when ADMIN tries to deactivate self', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const res = await request(app)
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .patch('/api/users/00000000-0000-0000-0000-000000000000/deactivate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // --- Activate user ---

  describe('PATCH /api/users/:id/activate', () => {
    let deactivatedUser;

    beforeAll(async () => {
      deactivatedUser = await User.create(createTestUser({
        email: 'inactive2@uadesigns.com',
        isActive: false
      }));
    });

    it('should activate user as ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/users/${deactivatedUser.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const res = await request(app)
        .patch(`/api/users/${deactivatedUser.id}/activate`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });
  });

  // --- Delete user ---

  describe('DELETE /api/users/:id', () => {
    let deleteTarget;

    beforeAll(async () => {
      deleteTarget = await User.create(createTestUser({ email: 'delete-target@uadesigns.com' }));
    });

    it('should delete user as ADMIN', async () => {
      const res = await request(app)
        .delete(`/api/users/${deleteTarget.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when ADMIN tries to delete self', async () => {
      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 403 for PROJECT_MANAGER', async () => {
      const res = await request(app)
        .delete(`/api/users/${pmUser.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});

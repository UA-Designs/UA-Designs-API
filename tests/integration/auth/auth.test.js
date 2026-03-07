const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../../src/server');
const { sequelize, User } = require('../../../src/models');
const { generateAuthToken } = require('../../helpers/testHelpers');

let registeredToken;
let testUserId;
let adminToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Create an admin user directly in the DB so we can get an admin token
  // for register endpoint (which now requires ADMIN auth)
  const hashedPw = await bcrypt.hash('adminpassword', 10);
  const adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'Bootstrap',
    email: 'admin-bootstrap@uadesigns.com',
    password: hashedPw,
    role: 'ADMIN',
    isActive: true,
  });
  adminToken = generateAuthToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Auth API', () => {
  // --- Health check ---

  describe('GET /api/auth/health', () => {
    it('should return 200 with OK status', async () => {
      const res = await request(app).get('/api/auth/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  // --- Register ---

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@uadesigns.com',
          password: 'password',
          role: 'PROJECT_MANAGER'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('alice@uadesigns.com');
      expect(res.body.data.user).not.toHaveProperty('password');

      registeredToken = res.body.data.token;
      testUserId = res.body.data.user.id;
    });

    it('should return 400 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'alice@uadesigns.com',
          password: 'password',
          role: 'PROJECT_MANAGER'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'incomplete@uadesigns.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('missingFields');
    });

    it('should return 400 when firstName is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lastName: 'Smith',
          email: 'nofirstname@uadesigns.com',
          password: 'password',
          role: 'ENGINEER'
        });

      expect(res.status).toBe(400);
      expect(res.body.missingFields).toContain('firstName');
    });

    it('should return 400 when role is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'norole@uadesigns.com',
          password: 'password'
        });

      expect(res.status).toBe(400);
      expect(res.body.missingFields).toContain('role');
    });

    it('should return a valid JWT token on successful registration', async () => {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(registeredToken, process.env.JWT_SECRET);

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('role');
      expect(decoded.role).toBe('PROJECT_MANAGER');
    });

    it('should hash the password, not store plaintext', async () => {
      const user = await User.findOne({ where: { email: 'alice@uadesigns.com' } });
      expect(user.password).not.toBe('password');
      expect(user.password.startsWith('$2')).toBe(true); // bcrypt hash
    });
  });

  // --- Login ---

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('alice@uadesigns.com');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@uadesigns.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for deactivated user', async () => {
      // Register an inactive user directly in DB
      const bcrypt = require('bcryptjs');
      const hashedPw = await bcrypt.hash('password', 10);
      await User.create({
        firstName: 'Inactive',
        lastName: 'User',
        email: 'inactive@uadesigns.com',
        password: hashedPw,
        role: 'ENGINEER',
        isActive: false
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactive@uadesigns.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should update lastLogin on successful login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com', password: 'password' });

      const user = await User.findOne({ where: { email: 'alice@uadesigns.com' } });
      expect(user.lastLogin).not.toBeNull();
    });
  });

  // --- Me ---

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('alice@uadesigns.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  // --- Profile ---

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email', 'alice@uadesigns.com');
      expect(res.body.data.user).toHaveProperty('lastLogin');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
    });
  });

  // --- Change Password ---

  describe('POST /api/auth/change-password', () => {
    it('should change password with correct current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${registeredToken}`)
        .send({ currentPassword: 'password', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow login with new password after change', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com', password: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not allow login with old password after change', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com', password: 'password' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for wrong current password', async () => {
      // Get fresh token with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@uadesigns.com', password: 'newpassword123' });
      const freshToken = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'anotherpassword' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'password', newPassword: 'newpassword123' });

      expect(res.status).toBe(401);
    });
  });

  // --- Logout ---

  describe('POST /api/auth/logout', () => {
    it('should return success message on logout', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

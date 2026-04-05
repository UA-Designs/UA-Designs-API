const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Task, Cost, Budget, Expense } = require('../../../src/models');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestTask
} = require('../../helpers/testHelpers');

let adminToken;
let pmToken;
let memberToken;
let adminUser;
let pmUser;
let memberUser;
let testProject;
let testProject2;
let testTask;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'admin-cost@uadesigns.com' }));
  pmUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'pm-cost@uadesigns.com' }));
  memberUser = await User.create(createTestUser({ role: 'ENGINEER', email: 'member-cost@uadesigns.com' }));

  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: pmUser.id
  });

  testProject2 = await Project.create({
    ...createTestProject({ name: 'Second Project', projectNumber: 'UA-TEST-002' }),
    projectManagerId: pmUser.id
  });

  testTask = await Task.create({
    ...createTestTask(),
    projectId: testProject.id,
    assignedTo: pmUser.id,
    createdBy: pmUser.id
  });

  adminToken = generateAuthToken(adminUser);
  pmToken = generateAuthToken(pmUser);
  memberToken = generateAuthToken(memberUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Cost Management API', () => {

  // =============================================
  // HEALTH CHECK
  // =============================================
  describe('GET /api/cost/health', () => {
    it('should return 200 with OK status', async () => {
      const res = await request(app).get('/api/cost/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toBe('Cost Management');
      expect(res.body.endpoints).toHaveProperty('costs');
      expect(res.body.endpoints).toHaveProperty('budgets');
      expect(res.body.endpoints).toHaveProperty('expenses');
      expect(res.body.endpoints).toHaveProperty('analysis');
    });
  });

  // =============================================
  // COST ENDPOINTS
  // =============================================
  describe('Cost endpoints', () => {
    let createdCostId;
    const validTradeCategories = [
      'Structural',
      'Architectural',
      'Mechanical',
      'Electrical',
      'Plumbing',
      'Fire Protection'
    ];

    describe('POST /api/cost/costs', () => {
      it('should create a cost with valid data', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Foundation Materials',
            type: 'MATERIAL',
            amount: 15000,
            date: new Date().toISOString(),
            description: 'Concrete and rebar for foundation',
            projectId: testProject.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Foundation Materials');
        expect(parseFloat(res.body.data.amount)).toBe(15000);
        expect(res.body.data.status).toBe('PENDING');
        createdCostId = res.body.data.id;
      });

      it('should create a cost with taskId', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Labor Cost',
            type: 'LABOR',
            amount: 8000,
            date: new Date().toISOString(),
            projectId: testProject.id,
            taskId: testTask.id
          });

        expect(res.status).toBe(201);
        expect(res.body.data.type).toBe('LABOR');
      });

      it('should create and persist BOQ unit "Lot"', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Site Mobilization',
            type: 'OTHER',
            estimatedQty: 1,
            unitCost: 25000,
            unit: 'Lot',
            date: new Date().toISOString(),
            projectId: testProject.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unit).toBe('Lot');
        expect(parseFloat(res.body.data.amount)).toBe(25000);

        const saved = await Cost.findByPk(res.body.data.id);
        expect(saved).toBeTruthy();
        expect(saved.unit).toBe('Lot');
      });

      it('should create and persist BOQ unit "Lump Sum"', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Temporary Facilities',
            type: 'OTHER',
            estimatedQty: 1,
            unitCost: 80000,
            unit: 'Lump Sum',
            date: new Date().toISOString(),
            projectId: testProject.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unit).toBe('Lump Sum');
        expect(parseFloat(res.body.data.amount)).toBe(80000);

        const getRes = await request(app)
          .get(`/api/cost/costs/${res.body.data.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.data.unit).toBe('Lump Sum');
      });

      it('should create costs with each supported tradeCategory value', async () => {
        for (const tradeCategory of validTradeCategories) {
          // eslint-disable-next-line no-await-in-loop
          const res = await request(app)
            .post('/api/cost/costs')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `${tradeCategory} BOQ Item`,
              type: 'OTHER',
              amount: 1000,
              tradeCategory,
              date: new Date().toISOString(),
              projectId: testProject.id
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data.tradeCategory).toBe(tradeCategory);

          // eslint-disable-next-line no-await-in-loop
          const byId = await request(app)
            .get(`/api/cost/costs/${res.body.data.id}`)
            .set('Authorization', `Bearer ${adminToken}`);
          expect(byId.status).toBe(200);
          expect(byId.body.data.tradeCategory).toBe(tradeCategory);
        }
      });

      it('should reject unsupported legacy tradeCategory values', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Legacy Trade Category Cost',
            type: 'OTHER',
            amount: 1000,
            tradeCategory: 'Civil',
            date: new Date().toISOString(),
            projectId: testProject.id
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(JSON.stringify(res.body)).toContain('tradeCategory');
      });

      it('should return 400 for missing required fields', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Incomplete' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('required');
      });

      it('should return 404 for invalid projectId', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Bad Project Cost',
            type: 'MATERIAL',
            amount: 1000,
            date: new Date().toISOString(),
            projectId: '00000000-0000-0000-0000-000000000000'
          });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Project not found');
      });

      it('should return 404 for invalid taskId', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Bad Task Cost',
            type: 'EQUIPMENT',
            amount: 3000,
            date: new Date().toISOString(),
            projectId: testProject.id,
            taskId: '00000000-0000-0000-0000-000000000000'
          });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Task not found');
      });

      it('should return 401 without auth token', async () => {
        const res = await request(app)
          .post('/api/cost/costs')
          .send({ name: 'No Auth' });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/cost/costs', () => {
      it('should return paginated list of costs', async () => {
        const res = await request(app)
          .get('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('costs');
        expect(res.body.data).toHaveProperty('pagination');
        expect(Array.isArray(res.body.data.costs)).toBe(true);
        expect(res.body.data.pagination).toHaveProperty('currentPage');
        expect(res.body.data.pagination).toHaveProperty('totalPages');
        expect(res.body.data.pagination).toHaveProperty('totalItems');
      });

      it('should filter costs by projectId', async () => {
        const res = await request(app)
          .get(`/api/cost/costs?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.costs.length).toBeGreaterThan(0);
        res.body.data.costs.forEach(cost => {
          expect(cost.projectId).toBe(testProject.id);
        });
      });

      it('should filter costs by type', async () => {
        const res = await request(app)
          .get('/api/cost/costs?type=MATERIAL')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        res.body.data.costs.forEach(cost => {
          expect(cost.type).toBe('MATERIAL');
        });
      });

      it('should filter costs by status', async () => {
        const res = await request(app)
          .get('/api/cost/costs?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        res.body.data.costs.forEach(cost => {
          expect(cost.status).toBe('PENDING');
        });
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get('/api/cost/costs?page=1&limit=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.costs.length).toBeLessThanOrEqual(1);
        expect(res.body.data.pagination.currentPage).toBe(1);
      });

      it('should return 401 without auth token', async () => {
        const res = await request(app).get('/api/cost/costs');
        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/cost/costs/:id', () => {
      it('should return a single cost by ID', async () => {
        const res = await request(app)
          .get(`/api/cost/costs/${createdCostId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(createdCostId);
        expect(res.body.data.name).toBe('Foundation Materials');
      });

      it('should return 404 for non-existent cost', async () => {
        const res = await request(app)
          .get('/api/cost/costs/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('PUT /api/cost/costs/:id', () => {
      it('should update a cost entry', async () => {
        const res = await request(app)
          .put(`/api/cost/costs/${createdCostId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated Foundation Materials', amount: 18000 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Updated Foundation Materials');
        expect(parseFloat(res.body.data.amount)).toBe(18000);
      });

      it('should return 404 for non-existent cost', async () => {
        const res = await request(app)
          .put('/api/cost/costs/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Ghost' });

        expect(res.status).toBe(404);
      });

      it('should update existing cost unit to "Lump Sum" and persist it', async () => {
        const createRes = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Unit Update Seed Cost',
            type: 'OTHER',
            amount: 12000,
            unit: 'Lot',
            date: new Date().toISOString(),
            projectId: testProject.id
          });
        expect(createRes.status).toBe(201);

        const costId = createRes.body.data.id;

        const res = await request(app)
          .put(`/api/cost/costs/${costId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ unit: 'Lump Sum' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unit).toBe('Lump Sum');

        const saved = await Cost.findByPk(costId);
        expect(saved.unit).toBe('Lump Sum');
      });

      it('should update cost tradeCategory using each supported value', async () => {
        const createRes = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Trade Category Update Seed',
            type: 'OTHER',
            amount: 12000,
            tradeCategory: 'Structural',
            date: new Date().toISOString(),
            projectId: testProject.id
          });
        expect(createRes.status).toBe(201);
        const costId = createRes.body.data.id;

        for (const tradeCategory of validTradeCategories) {
          // eslint-disable-next-line no-await-in-loop
          const updateRes = await request(app)
            .put(`/api/cost/costs/${costId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ tradeCategory });

          expect(updateRes.status).toBe(200);
          expect(updateRes.body.success).toBe(true);
          expect(updateRes.body.data.tradeCategory).toBe(tradeCategory);

          // eslint-disable-next-line no-await-in-loop
          const byId = await request(app)
            .get(`/api/cost/costs/${costId}`)
            .set('Authorization', `Bearer ${adminToken}`);
          expect(byId.status).toBe(200);
          expect(byId.body.data.tradeCategory).toBe(tradeCategory);
        }
      });

      it('should reject unsupported tradeCategory on update', async () => {
        const createRes = await request(app)
          .post('/api/cost/costs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Invalid Trade Category Update Seed',
            type: 'OTHER',
            amount: 12000,
            tradeCategory: 'Structural',
            date: new Date().toISOString(),
            projectId: testProject.id
          });
        expect(createRes.status).toBe(201);

        const updateRes = await request(app)
          .put(`/api/cost/costs/${createRes.body.data.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ tradeCategory: 'Finishes' });

        expect(updateRes.status).toBe(400);
        expect(JSON.stringify(updateRes.body)).toContain('tradeCategory');
      });

      it('should prevent non-admin from updating approved costs', async () => {
        // First approve the cost
        await Cost.update({ status: 'APPROVED' }, { where: { id: createdCostId } });

        const res = await request(app)
          .put(`/api/cost/costs/${createdCostId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ name: 'Should Fail' });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('admin');

        // Reset status
        await Cost.update({ status: 'PENDING' }, { where: { id: createdCostId } });
      });

      it('should allow admin to update approved costs', async () => {
        await Cost.update({ status: 'APPROVED' }, { where: { id: createdCostId } });

        const res = await request(app)
          .put(`/api/cost/costs/${createdCostId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ description: 'Admin updated' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Reset status
        await Cost.update({ status: 'PENDING' }, { where: { id: createdCostId } });
      });
    });

    describe('Cost schema checks', () => {
      it('should have a persisted unit column able to store "Lump Sum"', async () => {
        expect(Cost.rawAttributes.unit).toBeDefined();
        expect(Cost.rawAttributes.unit.allowNull).toBe(true);
        expect(Cost.rawAttributes.unit.type.toString()).toContain('VARCHAR');
        expect(Cost.rawAttributes.unit.type.toString()).toContain('255');
        expect('Lump Sum'.length).toBeLessThanOrEqual(255);
      });

      it('should have a persisted tradeCategory column', async () => {
        expect(Cost.rawAttributes.tradeCategory).toBeDefined();
        expect(Cost.rawAttributes.tradeCategory.type.toString()).toContain('VARCHAR');
      });
    });

    describe('PATCH /api/cost/costs/:id/status', () => {
      it('should update cost status (ADMIN)', async () => {
        const res = await request(app)
          .patch(`/api/cost/costs/${createdCostId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('APPROVED');
      });

      it('should update cost status (PM)', async () => {
        // Reset to pending first
        await Cost.update({ status: 'PENDING' }, { where: { id: createdCostId } });

        const res = await request(app)
          .patch(`/api/cost/costs/${createdCostId}/status`)
          .set('Authorization', `Bearer ${pmToken}`)
          .send({ status: 'APPROVED' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('APPROVED');
      });

      it('should return 400 for invalid status', async () => {
        const res = await request(app)
          .patch(`/api/cost/costs/${createdCostId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'INVALID' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Invalid status');
      });

      it('should return 404 for non-existent cost', async () => {
        const res = await request(app)
          .patch('/api/cost/costs/00000000-0000-0000-0000-000000000000/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED' });

        expect(res.status).toBe(404);
      });

      it('should return 403 for ENGINEER role', async () => {
        const res = await request(app)
          .patch(`/api/cost/costs/${createdCostId}/status`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ status: 'REJECTED' });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/cost/costs/summary', () => {
      it('should return cost summary', async () => {
        const res = await request(app)
          .get('/api/cost/costs/summary')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('byType');
        expect(res.body.data).toHaveProperty('byStatus');
        expect(res.body.data).toHaveProperty('total');
      });

      it('should filter summary by projectId', async () => {
        const res = await request(app)
          .get(`/api/cost/costs/summary?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBeGreaterThan(0);
      });
    });

    describe('DELETE /api/cost/costs/:id', () => {
      it('should prevent deleting paid costs', async () => {
        await Cost.update({ status: 'PAID' }, { where: { id: createdCostId } });

        const res = await request(app)
          .delete(`/api/cost/costs/${createdCostId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('paid');

        // Reset to pending for later delete test
        await Cost.update({ status: 'PENDING' }, { where: { id: createdCostId } });
      });

      it('should return 404 for non-existent cost', async () => {
        const res = await request(app)
          .delete('/api/cost/costs/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should delete a cost entry', async () => {
        const res = await request(app)
          .delete(`/api/cost/costs/${createdCostId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted');
      });
    });
  });

  // =============================================
  // SITE USAGE ENDPOINTS
  // =============================================
  describe('Site usage endpoints', () => {
    const createUsageCost = async (unitCost = 10) => {
      const res = await request(app)
        .post('/api/cost/costs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Usage Test Cost',
          type: 'OTHER',
          estimatedQty: 100,
          unitCost,
          unit: 'Lot',
          date: new Date().toISOString(),
          projectId: testProject.id
        });
      expect(res.status).toBe(201);
      return res.body.data;
    };

    it('should persist usage and reflect aggregates immediately in GET /api/cost/costs', async () => {
      const cost = await createUsageCost(10);

      const usageRes = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: testProject.id,
          costId: cost.id,
          quantityUsed: 5,
          date: new Date().toISOString(),
          notes: 'Daily usage log'
        });

      expect(usageRes.status).toBe(201);
      expect(usageRes.body.success).toBe(true);
      expect(usageRes.body.data.aggregates.actualQty).toBe(5);
      expect(usageRes.body.data.aggregates.amountReceived).toBe(50);

      const listRes = await request(app)
        .get(`/api/cost/costs?projectId=${testProject.id}&limit=100`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const updated = listRes.body.data.costs.find(item => item.id === cost.id);
      expect(updated).toBeTruthy();
      expect(parseFloat(updated.actualQty)).toBe(5);
      expect(parseFloat(updated.amountReceived)).toBe(50);
      expect(updated).toHaveProperty('unitCost');
      expect(updated).toHaveProperty('projectId');
    });

    it('should accumulate quantity across multiple logs for the same cost', async () => {
      const cost = await createUsageCost(12);

      const first = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: testProject.id,
          costId: cost.id,
          quantityUsed: 5,
          date: new Date().toISOString()
        });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: testProject.id,
          costId: cost.id,
          quantityUsed: 3,
          date: new Date().toISOString()
        });
      expect(second.status).toBe(201);
      expect(second.body.data.aggregates.actualQty).toBe(8);
      expect(second.body.data.aggregates.amountReceived).toBe(96);

      const byIdRes = await request(app)
        .get(`/api/cost/costs/${cost.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(byIdRes.status).toBe(200);
      expect(parseFloat(byIdRes.body.data.actualQty)).toBe(8);
      expect(parseFloat(byIdRes.body.data.amountReceived)).toBe(96);
    });

    it('should reject negative quantityUsed', async () => {
      const cost = await createUsageCost(10);
      const res = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: testProject.id,
          costId: cost.id,
          quantityUsed: -1,
          date: new Date().toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('non-negative');
    });

    it('should return 404 for invalid projectId', async () => {
      const cost = await createUsageCost(10);
      const res = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: '00000000-0000-0000-0000-000000000000',
          costId: cost.id,
          quantityUsed: 1,
          date: new Date().toISOString()
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Project not found');
    });

    it('should return 404 for invalid costId', async () => {
      const res = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: testProject.id,
          costId: '00000000-0000-0000-0000-000000000000',
          quantityUsed: 1,
          date: new Date().toISOString()
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Cost not found');
    });

    it('should expose usage audit trail by project and cost filters', async () => {
      const cost = await createUsageCost(10);
      const usageRes = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: testProject.id,
          costId: cost.id,
          quantityUsed: 2,
          date: new Date().toISOString(),
          notes: 'Audit trail entry'
        });
      expect(usageRes.status).toBe(201);

      const getRes = await request(app)
        .get(`/api/cost/site-usage?projectId=${testProject.id}&costId=${cost.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(Array.isArray(getRes.body.data)).toBe(true);
      expect(getRes.body.data.some(item => item.costId === cost.id)).toBe(true);
    });
  });

  // =============================================
  // BOQ REPORT (PER-ITEM ACTUALS)
  // =============================================
  describe('BOQ report items endpoint', () => {
    const createBoqCost = async ({ name, estimatedQty = 100, unitCost = 10, projectId = testProject.id, tradeCategory = 'Structural' }) => {
      const res = await request(app)
        .post('/api/cost/costs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name,
          type: 'OTHER',
          estimatedQty,
          unitCost,
          unit: 'Lot',
          tradeCategory,
          date: new Date().toISOString(),
          projectId
        });
      expect(res.status).toBe(201);
      return res.body.data;
    };

    const logUsage = async ({ costId, quantityUsed, projectId = testProject.id }) => {
      const res = await request(app)
        .post('/api/cost/site-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId,
          costId,
          quantityUsed,
          date: new Date().toISOString()
        });
      expect(res.status).toBe(201);
      return res.body.data;
    };

    const createAndApproveExpense = async ({ name, amount, costId, projectId = testProject.id }) => {
      const createRes = await request(app)
        .post('/api/cost/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name,
          amount,
          category: 'OTHER',
          date: new Date().toISOString(),
          projectId,
          costId
        });
      expect(createRes.status).toBe(201);

      const approveRes = await request(app)
        .patch(`/api/cost/expenses/${createRes.body.data.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved for BOQ report' });
      expect(approveRes.status).toBe(200);
      return approveRes.body.data;
    };

    it('should include per-item fields and usage-derived actuals in GET /api/cost/costs', async () => {
      const cost = await createBoqCost({ name: 'Per-Item Cost API Check', estimatedQty: 100, unitCost: 10, tradeCategory: 'Mechanical' });
      await logUsage({ costId: cost.id, quantityUsed: 5 });

      const res = await request(app)
        .get(`/api/cost/costs?projectId=${testProject.id}&limit=200`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const row = res.body.data.costs.find(item => item.id === cost.id);
      expect(row).toBeTruthy();
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('projectId');
      expect(row).toHaveProperty('name');
      expect(row).toHaveProperty('type');
      expect(row).toHaveProperty('estimatedQty');
      expect(row).toHaveProperty('unit');
      expect(row).toHaveProperty('unitCost');
      expect(row).toHaveProperty('amount');
      expect(row).toHaveProperty('actualQty');
      expect(row).toHaveProperty('amountReceived');
      expect(row).toHaveProperty('tradeCategory');
      expect(Number.isNaN(parseFloat(row.amount))).toBe(false);
      expect(Number.isNaN(parseFloat(row.actualQty))).toBe(false);
      expect(Number.isNaN(parseFloat(row.amountReceived))).toBe(false);
      expect(parseFloat(row.actualQty)).toBe(5);
      expect(parseFloat(row.amountReceived)).toBe(50);
    });

    it('should include linked approved expense amount in per-item actual and variance', async () => {
      const cost = await createBoqCost({ name: 'Expense Linked BOQ Item', estimatedQty: 100, unitCost: 10, tradeCategory: 'Electrical' });
      await logUsage({ costId: cost.id, quantityUsed: 5 }); // usage amount = 50
      await createAndApproveExpense({ name: 'Linked Expense', amount: 120, costId: cost.id });

      const res = await request(app)
        .get(`/api/cost/boq-report-items?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      const row = res.body.data.items.find(item => item.costId === cost.id);
      expect(row).toBeTruthy();
      expect(row.plannedAmount).toBe(1000);
      expect(row.actualQty).toBe(5);
      expect(row.usageDerivedAmount).toBe(50);
      expect(row.linkedExpenseAmount).toBe(120);
      expect(row.actualAmount).toBe(170);
      expect(row.varianceAmount).toBe(830);
      expect(row.variancePct).toBe(83);
    });

    it('should reflect read-after-write for usage and expense in boq report endpoint', async () => {
      const cost = await createBoqCost({ name: 'Read-After-Write BOQ', estimatedQty: 10, unitCost: 20, tradeCategory: 'Plumbing' });
      await logUsage({ costId: cost.id, quantityUsed: 2 }); // 40
      await createAndApproveExpense({ name: 'Read-After-Write Expense', amount: 30, costId: cost.id });

      const reportRes = await request(app)
        .get(`/api/cost/boq-report-items?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(reportRes.status).toBe(200);
      const row = reportRes.body.data.items.find(item => item.costId === cost.id);
      expect(row).toBeTruthy();
      expect(row.actualAmount).toBe(70);
    });

    it('should return multi-item rows where per-item actuals do not collapse into one line', async () => {
      const c1 = await createBoqCost({ name: 'Multi Item A', estimatedQty: 100, unitCost: 10, tradeCategory: 'Structural' });
      const c2 = await createBoqCost({ name: 'Multi Item B', estimatedQty: 50, unitCost: 8, tradeCategory: 'Architectural' });
      const c3 = await createBoqCost({ name: 'Multi Item C', estimatedQty: 30, unitCost: 5, tradeCategory: 'Fire Protection' });

      await logUsage({ costId: c1.id, quantityUsed: 3 }); // 30
      await logUsage({ costId: c2.id, quantityUsed: 4 }); // 32
      await createAndApproveExpense({ name: 'Expense for C', amount: 25, costId: c3.id });

      const reportRes = await request(app)
        .get(`/api/cost/boq-report-items?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(reportRes.status).toBe(200);

      const items = reportRes.body.data.items.filter(item => [c1.id, c2.id, c3.id].includes(item.costId));
      expect(items).toHaveLength(3);
      const totalActual = items.reduce((sum, item) => sum + item.actualAmount, 0);
      expect(totalActual).toBe(87);
      expect(totalActual).not.toBe(items[0].actualAmount);
    });
  });

  // =============================================
  // BUDGET ENDPOINTS
  // =============================================
  describe('Budget endpoints', () => {
    let createdBudgetId;

    describe('POST /api/cost/budgets', () => {
      it('should create a budget (ADMIN)', async () => {
        const res = await request(app)
          .post('/api/cost/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Q1 Construction Budget',
            amount: 250000,
            projectId: testProject.id,
            description: 'First quarter budget allocation'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Q1 Construction Budget');
        expect(parseFloat(res.body.data.amount)).toBe(250000);
        expect(res.body.data.status).toBe('PLANNED');
        createdBudgetId = res.body.data.id;
      });

      it('should create a budget (PM)', async () => {
        const res = await request(app)
          .post('/api/cost/budgets')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Q2 Budget',
            amount: 150000,
            projectId: testProject.id
          });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('PLANNED');
      });

      it('should return 400 for missing required fields', async () => {
        const res = await request(app)
          .post('/api/cost/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Incomplete Budget' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('required');
      });

      it('should return 404 for invalid projectId', async () => {
        const res = await request(app)
          .post('/api/cost/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Bad Project Budget',
            amount: 50000,
            projectId: '00000000-0000-0000-0000-000000000000'
          });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Project not found');
      });

      it('should return 403 for ENGINEER role', async () => {
        const res = await request(app)
          .post('/api/cost/budgets')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            name: 'Unauthorized Budget',
            amount: 50000,
            projectId: testProject.id
          });

        expect(res.status).toBe(403);
      });

      it('should return 401 without auth token', async () => {
        const res = await request(app)
          .post('/api/cost/budgets')
          .send({ name: 'No Auth' });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/cost/budgets', () => {
      it('should return paginated list of budgets', async () => {
        const res = await request(app)
          .get('/api/cost/budgets')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('budgets');
        expect(res.body.data).toHaveProperty('pagination');
        expect(Array.isArray(res.body.data.budgets)).toBe(true);
      });

      it('should filter budgets by projectId', async () => {
        const res = await request(app)
          .get(`/api/cost/budgets?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.budgets.length).toBeGreaterThan(0);
      });

      it('should filter budgets by status', async () => {
        const res = await request(app)
          .get('/api/cost/budgets?status=PLANNED')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        res.body.data.budgets.forEach(budget => {
          expect(budget.status).toBe('PLANNED');
        });
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get('/api/cost/budgets?page=1&limit=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.budgets.length).toBeLessThanOrEqual(1);
      });
    });

    describe('GET /api/cost/budgets/:id', () => {
      it('should return a budget with metrics', async () => {
        const res = await request(app)
          .get(`/api/cost/budgets/${createdBudgetId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(createdBudgetId);
        expect(res.body.data.name).toBe('Q1 Construction Budget');
        expect(res.body.data).toHaveProperty('metrics');
        expect(res.body.data.metrics).toHaveProperty('totalSpent');
        expect(res.body.data.metrics).toHaveProperty('remaining');
        expect(res.body.data.metrics).toHaveProperty('utilization');
        expect(res.body.data.metrics).toHaveProperty('isOverBudget');
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .get('/api/cost/budgets/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/cost/budgets/:id', () => {
      it('should update a budget (ADMIN)', async () => {
        const res = await request(app)
          .put(`/api/cost/budgets/${createdBudgetId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ description: 'Updated budget description' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.description).toBe('Updated budget description');
      });

      it('should update a budget (PM)', async () => {
        const res = await request(app)
          .put(`/api/cost/budgets/${createdBudgetId}`)
          .set('Authorization', `Bearer ${pmToken}`)
          .send({ name: 'Renamed Q1 Budget' });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Renamed Q1 Budget');
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .put('/api/cost/budgets/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Ghost' });

        expect(res.status).toBe(404);
      });

      it('should return 403 for ENGINEER role', async () => {
        const res = await request(app)
          .put(`/api/cost/budgets/${createdBudgetId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ name: 'Should Fail' });

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/cost/budgets/:id/approve', () => {
      it('should approve a PLANNED budget (ADMIN only)', async () => {
        const res = await request(app)
          .patch(`/api/cost/budgets/${createdBudgetId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ notes: 'Approved for Q1' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('APPROVED');
      });

      it('should return 400 when approving non-PLANNED budget', async () => {
        const res = await request(app)
          .patch(`/api/cost/budgets/${createdBudgetId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Cannot approve');
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .patch('/api/cost/budgets/00000000-0000-0000-0000-000000000000/approve')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should return 403 for PM role (ADMIN only)', async () => {
        // Create a new budget to approve
        const budget = await Budget.create({
          name: 'PM Approve Test',
          amount: 50000,
          projectId: testProject.id,
          status: 'PLANNED'
        });

        const res = await request(app)
          .patch(`/api/cost/budgets/${budget.id}/approve`)
          .set('Authorization', `Bearer ${pmToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/cost/budgets/:id/revise', () => {
      it('should revise a budget and create new version', async () => {
        // Create a budget to revise
        const budget = await Budget.create({
          name: 'Budget To Revise',
          amount: 80000,
          projectId: testProject.id,
          status: 'PLANNED'
        });

        const res = await request(app)
          .post(`/api/cost/budgets/${budget.id}/revise`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ amount: 95000, reason: 'Scope change' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('previousBudget');
        expect(res.body.data).toHaveProperty('newBudget');
        expect(res.body.data.previousBudget.status).toBe('REVISED');
        expect(parseFloat(res.body.data.newBudget.amount)).toBe(95000);
        expect(res.body.data.newBudget.status).toBe('PLANNED');
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .post('/api/cost/budgets/00000000-0000-0000-0000-000000000000/revise')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ amount: 50000 });

        expect(res.status).toBe(404);
      });

      it('should return 403 for ENGINEER', async () => {
        const res = await request(app)
          .post(`/api/cost/budgets/${createdBudgetId}/revise`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount: 300000 });

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/cost/budgets/:id/close', () => {
      it('should close a budget (ADMIN only)', async () => {
        const budget = await Budget.create({
          name: 'Budget To Close',
          amount: 60000,
          projectId: testProject.id,
          status: 'APPROVED'
        });

        const res = await request(app)
          .patch(`/api/cost/budgets/${budget.id}/close`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ notes: 'Project phase completed' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('CLOSED');
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .patch('/api/cost/budgets/00000000-0000-0000-0000-000000000000/close')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should return 403 for PM role (ADMIN only)', async () => {
        const budget = await Budget.create({
          name: 'PM Close Test',
          amount: 40000,
          projectId: testProject.id,
          status: 'APPROVED'
        });

        const res = await request(app)
          .patch(`/api/cost/budgets/${budget.id}/close`)
          .set('Authorization', `Bearer ${pmToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/cost/budgets/:id/utilization', () => {
      it('should return budget utilization report', async () => {
        // Create a budget with expenses
        const budget = await Budget.create({
          name: 'Utilization Test Budget',
          amount: 100000,
          projectId: testProject.id,
          status: 'APPROVED'
        });

        // Create some expenses against this budget
        await Expense.create({
          name: 'Expense A',
          amount: 15000,
          category: 'MATERIAL',
          date: new Date(),
          projectId: testProject.id,
          budgetId: budget.id,
          status: 'APPROVED',
          submittedBy: pmUser.id
        });
        await Expense.create({
          name: 'Expense B',
          amount: 5000,
          category: 'LABOR',
          date: new Date(),
          projectId: testProject.id,
          budgetId: budget.id,
          status: 'PAID',
          submittedBy: pmUser.id
        });
        await Expense.create({
          name: 'Expense C',
          amount: 8000,
          category: 'MATERIAL',
          date: new Date(),
          projectId: testProject.id,
          budgetId: budget.id,
          status: 'PENDING',
          submittedBy: pmUser.id
        });

        const res = await request(app)
          .get(`/api/cost/budgets/${budget.id}/utilization`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('budgetId');
        expect(res.body.data).toHaveProperty('budgetName');
        expect(res.body.data).toHaveProperty('budgetAmount');
        expect(res.body.data).toHaveProperty('summary');
        expect(res.body.data.summary).toHaveProperty('totalCommitted');
        expect(res.body.data.summary).toHaveProperty('totalApproved');
        expect(res.body.data.summary).toHaveProperty('totalPending');
        expect(res.body.data.summary).toHaveProperty('totalPaid');
        expect(res.body.data.summary).toHaveProperty('remaining');
        expect(res.body.data.summary).toHaveProperty('utilizationPercent');
        expect(res.body.data.summary).toHaveProperty('isOverBudget');
        expect(res.body.data).toHaveProperty('byCategory');
        expect(res.body.data).toHaveProperty('expenseCount');
        expect(res.body.data.expenseCount).toBe(3);
        // totalCommitted = approved(15000) + paid(5000) = 20000
        expect(res.body.data.summary.totalCommitted).toBe(20000);
        expect(res.body.data.summary.isOverBudget).toBe(false);
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .get('/api/cost/budgets/00000000-0000-0000-0000-000000000000/utilization')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/cost/budgets/:id', () => {
      it('should prevent deleting budgets with expenses', async () => {
        // Find budget with expenses (the utilization test budget)
        const budgets = await Budget.findAll({
          include: [{ model: Expense, as: 'expenses' }],
          where: { name: 'Utilization Test Budget' }
        });
        const budgetWithExpenses = budgets[0];

        const res = await request(app)
          .delete(`/api/cost/budgets/${budgetWithExpenses.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('expenses');
      });

      it('should return 404 for non-existent budget', async () => {
        const res = await request(app)
          .delete('/api/cost/budgets/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should delete a budget without expenses', async () => {
        const budget = await Budget.create({
          name: 'Delete Me Budget',
          amount: 10000,
          projectId: testProject.id,
          status: 'PLANNED'
        });

        const res = await request(app)
          .delete(`/api/cost/budgets/${budget.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted');
      });

      it('should return 403 for ENGINEER role', async () => {
        const budget = await Budget.create({
          name: 'Member Delete Test',
          amount: 5000,
          projectId: testProject.id,
          status: 'PLANNED'
        });

        const res = await request(app)
          .delete(`/api/cost/budgets/${budget.id}`)
          .set('Authorization', `Bearer ${memberToken}`);

        expect(res.status).toBe(403);
      });
    });
  });

  // =============================================
  // EXPENSE ENDPOINTS
  // =============================================
  describe('Expense endpoints', () => {
    let createdExpenseId;
    let testBudgetForExpenses;

    beforeAll(async () => {
      testBudgetForExpenses = await Budget.create({
        name: 'Expense Test Budget',
        amount: 200000,
        projectId: testProject.id,
        status: 'APPROVED'
      });
    });

    describe('POST /api/cost/expenses', () => {
      it('should create an expense with valid data', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Cement Purchase',
            amount: 5000,
            category: 'MATERIAL',
            date: new Date().toISOString(),
            projectId: testProject.id,
            budgetId: testBudgetForExpenses.id,
            vendor: 'ConcreteSupplier Inc',
            description: 'Bulk cement order'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Cement Purchase');
        expect(parseFloat(res.body.data.amount)).toBe(5000);
        expect(res.body.data.status).toBe('PENDING');
        expect(res.body.data.category).toBe('MATERIAL');
        createdExpenseId = res.body.data.id;
      });

      it('should create an expense with taskId', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Task-related Expense',
            amount: 2000,
            category: 'LABOR',
            date: new Date().toISOString(),
            projectId: testProject.id,
            taskId: testTask.id
          });

        expect(res.status).toBe(201);
        expect(res.body.data.category).toBe('LABOR');
      });

      it('should return 400 for missing required fields', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({ name: 'Incomplete' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('required');
      });

      it('should return 404 for invalid projectId', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Bad Project',
            amount: 1000,
            category: 'OTHER',
            date: new Date().toISOString(),
            projectId: '00000000-0000-0000-0000-000000000000'
          });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Project not found');
      });

      it('should return 404 for invalid budgetId', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Bad Budget',
            amount: 1000,
            category: 'OTHER',
            date: new Date().toISOString(),
            projectId: testProject.id,
            budgetId: '00000000-0000-0000-0000-000000000000'
          });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Budget not found');
      });

      it('should return 404 for invalid taskId', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .set('Authorization', `Bearer ${pmToken}`)
          .send({
            name: 'Bad Task',
            amount: 1000,
            category: 'OTHER',
            date: new Date().toISOString(),
            projectId: testProject.id,
            taskId: '00000000-0000-0000-0000-000000000000'
          });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Task not found');
      });

      it('should return 401 without auth token', async () => {
        const res = await request(app)
          .post('/api/cost/expenses')
          .send({ name: 'No Auth' });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/cost/expenses', () => {
      it('should return paginated list of expenses', async () => {
        const res = await request(app)
          .get('/api/cost/expenses')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('expenses');
        expect(res.body.data).toHaveProperty('pagination');
        expect(Array.isArray(res.body.data.expenses)).toBe(true);
      });

      it('should filter expenses by projectId', async () => {
        const res = await request(app)
          .get(`/api/cost/expenses?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.expenses.length).toBeGreaterThan(0);
      });

      it('should filter expenses by category', async () => {
        const res = await request(app)
          .get('/api/cost/expenses?category=MATERIAL')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        res.body.data.expenses.forEach(expense => {
          expect(expense.category).toBe('MATERIAL');
        });
      });

      it('should filter expenses by status', async () => {
        const res = await request(app)
          .get('/api/cost/expenses?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        res.body.data.expenses.forEach(expense => {
          expect(expense.status).toBe('PENDING');
        });
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get('/api/cost/expenses?page=1&limit=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.expenses.length).toBeLessThanOrEqual(1);
      });
    });

    describe('GET /api/cost/expenses/:id', () => {
      it('should return a single expense by ID', async () => {
        const res = await request(app)
          .get(`/api/cost/expenses/${createdExpenseId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(createdExpenseId);
        expect(res.body.data.name).toBe('Cement Purchase');
      });

      it('should return 404 for non-existent expense', async () => {
        const res = await request(app)
          .get('/api/cost/expenses/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/cost/expenses/:id', () => {
      it('should update a pending expense', async () => {
        const res = await request(app)
          .put(`/api/cost/expenses/${createdExpenseId}`)
          .set('Authorization', `Bearer ${pmToken}`)
          .send({ name: 'Updated Cement Purchase', amount: 5500 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Updated Cement Purchase');
        expect(parseFloat(res.body.data.amount)).toBe(5500);
      });

      it('should prevent non-admin from updating approved expenses', async () => {
        await Expense.update({ status: 'APPROVED' }, { where: { id: createdExpenseId } });

        const res = await request(app)
          .put(`/api/cost/expenses/${createdExpenseId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ name: 'Should Fail' });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('pending');

        // Reset status
        await Expense.update({ status: 'PENDING' }, { where: { id: createdExpenseId } });
      });

      it('should allow admin to update non-pending expenses', async () => {
        await Expense.update({ status: 'APPROVED' }, { where: { id: createdExpenseId } });

        const res = await request(app)
          .put(`/api/cost/expenses/${createdExpenseId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ description: 'Admin override' });

        expect(res.status).toBe(200);

        // Reset status
        await Expense.update({ status: 'PENDING' }, { where: { id: createdExpenseId } });
      });

      it('should return 404 for non-existent expense', async () => {
        const res = await request(app)
          .put('/api/cost/expenses/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Ghost' });

        expect(res.status).toBe(404);
      });
    });

    describe('PATCH /api/cost/expenses/:id/approve', () => {
      it('should approve a pending expense', async () => {
        const res = await request(app)
          .patch(`/api/cost/expenses/${createdExpenseId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ notes: 'Looks good' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('APPROVED');
      });

      it('should return 400 when approving non-pending expense', async () => {
        const res = await request(app)
          .patch(`/api/cost/expenses/${createdExpenseId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Cannot approve');
      });

      it('should return 404 for non-existent expense', async () => {
        const res = await request(app)
          .patch('/api/cost/expenses/00000000-0000-0000-0000-000000000000/approve')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should return 403 for ENGINEER role', async () => {
        const expense = await Expense.create({
          name: 'Member Approve Test',
          amount: 500,
          category: 'OTHER',
          date: new Date(),
          projectId: testProject.id,
          status: 'PENDING',
          submittedBy: memberUser.id
        });

        const res = await request(app)
          .patch(`/api/cost/expenses/${expense.id}/approve`)
          .set('Authorization', `Bearer ${memberToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/cost/expenses/:id/reject', () => {
      it('should reject a pending expense with reason', async () => {
        const expense = await Expense.create({
          name: 'Reject Test',
          amount: 1000,
          category: 'OTHER',
          date: new Date(),
          projectId: testProject.id,
          status: 'PENDING',
          submittedBy: pmUser.id
        });

        const res = await request(app)
          .patch(`/api/cost/expenses/${expense.id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Exceeds budget allocation' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('REJECTED');
      });

      it('should return 400 when rejecting without reason', async () => {
        const expense = await Expense.create({
          name: 'No Reason Test',
          amount: 1000,
          category: 'OTHER',
          date: new Date(),
          projectId: testProject.id,
          status: 'PENDING',
          submittedBy: pmUser.id
        });

        const res = await request(app)
          .patch(`/api/cost/expenses/${expense.id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('reason');
      });

      it('should return 400 when rejecting non-pending expense', async () => {
        // createdExpenseId is now APPROVED
        const res = await request(app)
          .patch(`/api/cost/expenses/${createdExpenseId}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Too late' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Cannot reject');
      });

      it('should return 403 for ENGINEER role', async () => {
        const expense = await Expense.create({
          name: 'Member Reject Test',
          amount: 500,
          category: 'OTHER',
          date: new Date(),
          projectId: testProject.id,
          status: 'PENDING',
          submittedBy: memberUser.id
        });

        const res = await request(app)
          .patch(`/api/cost/expenses/${expense.id}/reject`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ reason: 'No' });

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/cost/expenses/:id/pay', () => {
      it('should mark approved expense as paid', async () => {
        // createdExpenseId is APPROVED
        const res = await request(app)
          .patch(`/api/cost/expenses/${createdExpenseId}/pay`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            paymentDate: new Date().toISOString(),
            paymentReference: 'CHK-001',
            paymentMethod: 'CHECK'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('PAID');
      });

      it('should return 400 when paying non-approved expense', async () => {
        const expense = await Expense.create({
          name: 'Pay Pending Test',
          amount: 500,
          category: 'OTHER',
          date: new Date(),
          projectId: testProject.id,
          status: 'PENDING',
          submittedBy: pmUser.id
        });

        const res = await request(app)
          .patch(`/api/cost/expenses/${expense.id}/pay`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('approved');
      });

      it('should return 404 for non-existent expense', async () => {
        const res = await request(app)
          .patch('/api/cost/expenses/00000000-0000-0000-0000-000000000000/pay')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('POST /api/cost/expenses/bulk-approve', () => {
      it('should bulk approve pending expenses', async () => {
        const e1 = await Expense.create({
          name: 'Bulk A', amount: 100, category: 'OTHER',
          date: new Date(), projectId: testProject.id,
          status: 'PENDING', submittedBy: pmUser.id
        });
        const e2 = await Expense.create({
          name: 'Bulk B', amount: 200, category: 'OTHER',
          date: new Date(), projectId: testProject.id,
          status: 'PENDING', submittedBy: pmUser.id
        });

        const res = await request(app)
          .post('/api/cost/expenses/bulk-approve')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ expenseIds: [e1.id, e2.id], notes: 'Batch approved' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.approved).toHaveLength(2);
        expect(res.body.data.failed).toHaveLength(0);
      });

      it('should handle mixed valid/invalid expenses', async () => {
        const e1 = await Expense.create({
          name: 'Bulk Valid', amount: 100, category: 'OTHER',
          date: new Date(), projectId: testProject.id,
          status: 'PENDING', submittedBy: pmUser.id
        });

        const res = await request(app)
          .post('/api/cost/expenses/bulk-approve')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            expenseIds: [e1.id, '00000000-0000-0000-0000-000000000000']
          });

        expect(res.status).toBe(200);
        expect(res.body.data.approved).toHaveLength(1);
        expect(res.body.data.failed).toHaveLength(1);
      });

      it('should return 400 for empty/missing expenseIds', async () => {
        const res = await request(app)
          .post('/api/cost/expenses/bulk-approve')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Expense IDs');
      });

      it('should return 403 for ENGINEER role', async () => {
        const res = await request(app)
          .post('/api/cost/expenses/bulk-approve')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ expenseIds: ['some-id'] });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/cost/expenses/summary/:projectId', () => {
      it('should return expense summary for a project', async () => {
        const res = await request(app)
          .get(`/api/cost/expenses/summary/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('byCategory');
        expect(res.body.data).toHaveProperty('byStatus');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('count');
        expect(res.body.data.total).toBeGreaterThan(0);
      });

      it('should return empty summary for project with no expenses', async () => {
        const res = await request(app)
          .get(`/api/cost/expenses/summary/${testProject2.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBe(0);
        expect(res.body.data.count).toBe(0);
      });
    });

    describe('DELETE /api/cost/expenses/:id', () => {
      it('should prevent deleting paid expenses', async () => {
        // createdExpenseId is now PAID
        const res = await request(app)
          .delete(`/api/cost/expenses/${createdExpenseId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('paid');
      });

      it('should return 404 for non-existent expense', async () => {
        const res = await request(app)
          .delete('/api/cost/expenses/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should delete a pending expense', async () => {
        const expense = await Expense.create({
          name: 'Delete Me',
          amount: 100,
          category: 'OTHER',
          date: new Date(),
          projectId: testProject.id,
          status: 'PENDING',
          submittedBy: pmUser.id
        });

        const res = await request(app)
          .delete(`/api/cost/expenses/${expense.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted');
      });
    });
  });

  // =============================================
  // COST ANALYSIS ENDPOINTS
  // =============================================
  describe('Analysis endpoints', () => {

    describe('GET /api/cost/analysis/overview/:projectId', () => {
      it('should return cost overview for a project', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/overview/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('projectId');
        expect(res.body.data).toHaveProperty('projectName');
        expect(res.body.data).toHaveProperty('overview');
        expect(res.body.data.overview).toHaveProperty('totalBudget');
        expect(res.body.data.overview).toHaveProperty('totalApproved');
        expect(res.body.data.overview).toHaveProperty('totalPending');
        expect(res.body.data.overview).toHaveProperty('totalPaid');
        expect(res.body.data.overview).toHaveProperty('remaining');
        expect(res.body.data.overview).toHaveProperty('budgetUtilization');
        expect(res.body.data.overview).toHaveProperty('isOverBudget');
        expect(res.body.data).toHaveProperty('budgetCount');
        expect(res.body.data).toHaveProperty('expenseCount');
      });

      it('should return 404 for non-existent project', async () => {
        const res = await request(app)
          .get('/api/cost/analysis/overview/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Project not found');
      });
    });

    describe('GET /api/cost/analysis/evm/:projectId', () => {
      it('should return EVM metrics for a project', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/evm/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('projectId');
        expect(res.body.data).toHaveProperty('baseMetrics');
        expect(res.body.data.baseMetrics).toHaveProperty('BAC');
        expect(res.body.data.baseMetrics).toHaveProperty('PV');
        expect(res.body.data.baseMetrics).toHaveProperty('EV');
        expect(res.body.data.baseMetrics).toHaveProperty('AC');
        expect(res.body.data).toHaveProperty('variances');
        expect(res.body.data.variances).toHaveProperty('CV');
        expect(res.body.data.variances).toHaveProperty('SV');
        expect(res.body.data).toHaveProperty('indices');
        expect(res.body.data.indices).toHaveProperty('CPI');
        expect(res.body.data.indices).toHaveProperty('SPI');
        expect(res.body.data).toHaveProperty('forecasts');
        expect(res.body.data).toHaveProperty('progress');
        expect(res.body.data).toHaveProperty('health');
      });

      it('should return 404 for non-existent project', async () => {
        const res = await request(app)
          .get('/api/cost/analysis/evm/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/cost/analysis/breakdown/:projectId', () => {
      it('should return cost breakdown by category', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/breakdown/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('projectId');
        expect(res.body.data).toHaveProperty('groupedBy');
        expect(res.body.data).toHaveProperty('totalAmount');
        expect(res.body.data).toHaveProperty('breakdown');
        expect(Array.isArray(res.body.data.breakdown)).toBe(true);
      });

      it('should return 404 for non-existent project', async () => {
        const res = await request(app)
          .get('/api/cost/analysis/breakdown/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/cost/analysis/trend/:projectId', () => {
      it('should return cost trend data', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/trend/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('projectId');
        expect(res.body.data).toHaveProperty('interval');
        expect(res.body.data).toHaveProperty('totalAmount');
        expect(res.body.data).toHaveProperty('trend');
        expect(Array.isArray(res.body.data.trend)).toBe(true);
      });

      it('should return 404 for non-existent project', async () => {
        const res = await request(app)
          .get('/api/cost/analysis/trend/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/cost/analysis/compare', () => {
      it('should compare costs across projects', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/compare?projectIds=${testProject.id},${testProject2.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('projectCount');
        expect(res.body.data).toHaveProperty('comparison');
        expect(Array.isArray(res.body.data.comparison)).toBe(true);
        expect(res.body.data.projectCount).toBe(2);
      });

      it('should return 400 when projectIds missing', async () => {
        const res = await request(app)
          .get('/api/cost/analysis/compare')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('projectIds');
      });
    });

    describe('GET /api/cost/analysis/forecast/:projectId', () => {
      it('should return cost forecast for a project', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/forecast/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('projectId');
        expect(res.body.data).toHaveProperty('projectName');
      });

      it('should handle project with no expenses gracefully', async () => {
        const res = await request(app)
          .get(`/api/cost/analysis/forecast/${testProject2.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('message');
        expect(res.body.data.forecast).toBeNull();
      });

      it('should return 404 for non-existent project', async () => {
        const res = await request(app)
          .get('/api/cost/analysis/forecast/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });
  });
});

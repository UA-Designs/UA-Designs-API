const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Material } = require('../../../src/models');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestMaterial,
  createTestLabor,
  createTestEquipment,
  createTestTeamMember,
  createTestAllocation
} = require('../../helpers/testHelpers');

let authToken;
let adminToken;
let testUser;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  const adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'admin-resource@uadesigns.com' }));

  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: testUser.id
  });

  authToken = generateAuthToken(testUser);
  adminToken = generateAuthToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Resource Management API', () => {

  // =====================
  // Health
  // =====================
  describe('GET /api/resources/health', () => {
    it('should return 200 with OK status', async () => {
      const response = await request(app).get('/api/resources/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });

  // =====================
  // Materials
  // =====================
  describe('Material endpoints', () => {
    let createdMaterialId;

    describe('POST /api/resources/materials', () => {
      it('should create a material with valid data', async () => {
        const response = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Portland Cement',
            unit: 'bag',
            unitCost: 12.50,
            quantity: 200,
            category: 'CONCRETE',
            supplier: 'Cement Corp',
            projectId: testProject.id
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe('Portland Cement');
        expect(parseFloat(response.body.data.totalCost)).toBeCloseTo(2500, 1);
        createdMaterialId = response.body.data.id;
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Incomplete Material' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('errors');
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post('/api/resources/materials')
          .send({ name: 'Test' });

        expect(response.status).toBe(401);
      });

      it('should create a material with unit "Lot"', async () => {
        const response = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Mobilization Package',
            unit: 'Lot',
            unitCost: 50000,
            quantity: 1,
            projectId: testProject.id
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.unit).toBe('Lot');
      });

      it('should create a material with unit "Lump Sum"', async () => {
        const response = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Temporary Works Package',
            unit: 'Lump Sum',
            unitCost: 80000,
            quantity: 1,
            projectId: testProject.id
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.unit).toBe('Lump Sum');
      });

      it('should create a catalog material without quantity', async () => {
        const response = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Catalog Rebar Type A',
            unit: 'kg',
            unitCost: 2.35,
            category: 'REBAR',
            description: 'Catalog definition only',
            projectId: testProject.id
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Catalog Rebar Type A');
        expect(response.body.data.quantity).toBeNull();
        expect(response.body.data.totalCost).toBeNull();
      });
    });

    describe('GET /api/resources/materials', () => {
      it('should return list of materials', async () => {
        const response = await request(app)
          .get('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('pagination');
      });

      it('should filter materials by projectId', async () => {
        const response = await request(app)
          .get(`/api/resources/materials?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.data.forEach(item => {
          expect(item.projectId).toBe(testProject.id);
        });
      });

      it('should include createdAt for each material', async () => {
        const seedRes = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'CreatedAt Seed Material',
            unit: 'bag',
            unitCost: 10,
            quantity: 1,
            projectId: testProject.id
          });
        expect(seedRes.status).toBe(201);

        const response = await request(app)
          .get(`/api/resources/materials?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
        response.body.data.forEach(item => {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('createdAt');
          expect(new Date(item.createdAt).toString()).not.toBe('Invalid Date');
        });
      });

      it('should sort materials by name asc (A-Z)', async () => {
        const sortProject = await Project.create({
          ...createTestProject({ name: 'Material Sort Name Project', projectNumber: 'UA-SORT-NAME-001' }),
          projectManagerId: testUser.id
        });

        const nameCases = ['Zulu Gravel', 'Alpha Cement', 'Beta Sand'];
        for (const name of nameCases) {
          // eslint-disable-next-line no-await-in-loop
          await request(app)
            .post('/api/resources/materials')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name,
              unit: 'bag',
              unitCost: 10,
              quantity: 1,
              projectId: sortProject.id
            });
        }

        const response = await request(app)
          .get(`/api/resources/materials?projectId=${sortProject.id}&sortBy=name&sortOrder=asc&limit=20`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const names = response.body.data.map(item => item.name);
        expect(names).toEqual(['Alpha Cement', 'Beta Sand', 'Zulu Gravel']);
      });

      it('should sort materials by createdAt desc (newest first)', async () => {
        const sortProject = await Project.create({
          ...createTestProject({ name: 'Material Sort Date Project', projectNumber: 'UA-SORT-DATE-001' }),
          projectManagerId: testUser.id
        });

        const first = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Oldest Material',
            unit: 'bag',
            unitCost: 10,
            quantity: 1,
            projectId: sortProject.id
          });
        const second = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Middle Material',
            unit: 'bag',
            unitCost: 10,
            quantity: 1,
            projectId: sortProject.id
          });
        const third = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Newest Material',
            unit: 'bag',
            unitCost: 10,
            quantity: 1,
            projectId: sortProject.id
          });

        await Material.update(
          { createdAt: new Date('2024-01-01T00:00:00.000Z') },
          { where: { id: first.body.data.id }, silent: true }
        );
        await Material.update(
          { createdAt: new Date('2024-01-02T00:00:00.000Z') },
          { where: { id: second.body.data.id }, silent: true }
        );
        await Material.update(
          { createdAt: new Date('2024-01-03T00:00:00.000Z') },
          { where: { id: third.body.data.id }, silent: true }
        );

        const response = await request(app)
          .get(`/api/resources/materials?projectId=${sortProject.id}&sortBy=createdAt&sortOrder=desc&limit=20`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const names = response.body.data.map(item => item.name);
        expect(names).toEqual(['Newest Material', 'Middle Material', 'Oldest Material']);
      });

      it('should safely fallback to createdAt desc for invalid sort params', async () => {
        const sortProject = await Project.create({
          ...createTestProject({ name: 'Material Sort Invalid Project', projectNumber: 'UA-SORT-INVALID-001' }),
          projectManagerId: testUser.id
        });

        const first = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'First Material',
            unit: 'bag',
            unitCost: 10,
            quantity: 1,
            projectId: sortProject.id
          });
        const second = await request(app)
          .post('/api/resources/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Second Material',
            unit: 'bag',
            unitCost: 10,
            quantity: 1,
            projectId: sortProject.id
          });

        await Material.update(
          { createdAt: new Date('2024-02-01T00:00:00.000Z') },
          { where: { id: first.body.data.id }, silent: true }
        );
        await Material.update(
          { createdAt: new Date('2024-02-02T00:00:00.000Z') },
          { where: { id: second.body.data.id }, silent: true }
        );

        const response = await request(app)
          .get(`/api/resources/materials?projectId=${sortProject.id}&sortBy=drop table materials&sortOrder=sideways&limit=20`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const names = response.body.data.map(item => item.name);
        expect(names).toEqual(['Second Material', 'First Material']);
      });

      it('should return 401 without auth', async () => {
        const response = await request(app).get('/api/resources/materials');
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/resources/materials/:id', () => {
      it('should return a material by ID', async () => {
        const response = await request(app)
          .get(`/api/resources/materials/${createdMaterialId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(createdMaterialId);
      });

      it('should return 404 for non-existent material', async () => {
        const response = await request(app)
          .get('/api/resources/materials/00000000-0000-0000-0000-999999999999')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/resources/materials/:id', () => {
      it('should update a material', async () => {
        const response = await request(app)
          .put(`/api/resources/materials/${createdMaterialId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'DELIVERED', quantity: 150 });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('DELIVERED');
      });

      it('should update material unit to "Lot"', async () => {
        const response = await request(app)
          .put(`/api/resources/materials/${createdMaterialId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ unit: 'Lot' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.unit).toBe('Lot');
      });

      it('should update material unit to "Lump Sum"', async () => {
        const response = await request(app)
          .put(`/api/resources/materials/${createdMaterialId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ unit: 'Lump Sum' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.unit).toBe('Lump Sum');
      });
    });

    describe('DELETE /api/resources/materials/:id', () => {
      it('should delete a material (PM role)', async () => {
        const response = await request(app)
          .delete(`/api/resources/materials/${createdMaterialId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  // =====================
  // Labor
  // =====================
  describe('Labor endpoints', () => {
    let createdLaborId;

    describe('POST /api/resources/labor', () => {
      it('should create a labor resource', async () => {
        const response = await request(app)
          .post('/api/resources/labor')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Bob Mason',
            role: 'Mason',
            trade: 'MASONRY',
            dailyRate: 220.00,
            projectId: testProject.id
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Bob Mason');
        createdLaborId = response.body.data.id;
      });

      it('should return 400 for missing dailyRate', async () => {
        const response = await request(app)
          .post('/api/resources/labor')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Worker', role: 'Helper', projectId: testProject.id });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/resources/labor', () => {
      it('should return list of labor resources', async () => {
        const response = await request(app)
          .get('/api/resources/labor')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('PUT /api/resources/labor/:id', () => {
      it('should update labor status', async () => {
        const response = await request(app)
          .put(`/api/resources/labor/${createdLaborId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'ASSIGNED', hoursWorked: 40 });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('ASSIGNED');
      });
    });

    describe('DELETE /api/resources/labor/:id', () => {
      it('should delete a labor resource', async () => {
        const response = await request(app)
          .delete(`/api/resources/labor/${createdLaborId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      });
    });
  });

  // =====================
  // Equipment
  // =====================
  describe('Equipment endpoints', () => {
    let createdEquipmentId;

    describe('POST /api/resources/equipment', () => {
      it('should create equipment', async () => {
        const response = await request(app)
          .post('/api/resources/equipment')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Tower Crane TC-200',
            type: 'crane',
            status: 'AVAILABLE',
            condition: 'EXCELLENT',
            dailyRate: 1500.00,
            projectId: testProject.id
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Tower Crane TC-200');
        createdEquipmentId = response.body.data.id;
      });

      it('should return 400 for missing required type', async () => {
        const response = await request(app)
          .post('/api/resources/equipment')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'No Type Equipment' });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/resources/equipment', () => {
      it('should list equipment', async () => {
        const response = await request(app)
          .get('/api/resources/equipment')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/resources/equipment/:id', () => {
      it('should return equipment with maintenance records', async () => {
        const response = await request(app)
          .get(`/api/resources/equipment/${createdEquipmentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('maintenanceRecords');
      });
    });

    describe('POST /api/resources/equipment/:id/maintenance', () => {
      it('should add a maintenance record', async () => {
        const response = await request(app)
          .post(`/api/resources/equipment/${createdEquipmentId}/maintenance`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            maintenanceType: 'PREVENTIVE',
            description: 'Monthly inspection',
            scheduledDate: '2026-04-01',
            status: 'SCHEDULED'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.maintenanceType).toBe('PREVENTIVE');
      });

      it('should return 400 for invalid maintenance type', async () => {
        const response = await request(app)
          .post(`/api/resources/equipment/${createdEquipmentId}/maintenance`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ maintenanceType: 'INVALID' });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/resources/equipment/:id/maintenance', () => {
      it('should return maintenance history', async () => {
        const response = await request(app)
          .get(`/api/resources/equipment/${createdEquipmentId}/maintenance`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('PUT /api/resources/equipment/:id', () => {
      it('should update equipment', async () => {
        const response = await request(app)
          .put(`/api/resources/equipment/${createdEquipmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'IN_USE', operator: 'Mike Operator' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('IN_USE');
      });
    });
  });

  // =====================
  // Team Members
  // =====================
  describe('Team endpoints', () => {
    let createdTeamMemberId;

    describe('POST /api/resources/team', () => {
      it('should assign a team member to project (PM role)', async () => {
        const response = await request(app)
          .post('/api/resources/team')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            projectId: testProject.id,
            userId: testUser.id,
            role: 'Lead Engineer',
            allocation: 80,
            status: 'ACTIVE'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.role).toBe('Lead Engineer');
        createdTeamMemberId = response.body.data.id;
      });

      it('should return 400 for missing userId', async () => {
        const response = await request(app)
          .post('/api/resources/team')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ projectId: testProject.id });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/resources/team', () => {
      it('should list team members', async () => {
        const response = await request(app)
          .get('/api/resources/team')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/resources/team/:id', () => {
      it('should return team member with skills', async () => {
        const response = await request(app)
          .get(`/api/resources/team/${createdTeamMemberId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('skills');
      });
    });

    describe('POST /api/resources/team/:id/skills', () => {
      it('should add a skill to team member (PM role)', async () => {
        const response = await request(app)
          .post(`/api/resources/team/${createdTeamMemberId}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            skillName: 'AutoCAD',
            proficiencyLevel: 'ADVANCED'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.skillName).toBe('AutoCAD');
      });

      it('should return 400 for missing skillName', async () => {
        const response = await request(app)
          .post(`/api/resources/team/${createdTeamMemberId}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ proficiencyLevel: 'BEGINNER' });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/resources/team/:id/skills', () => {
      it('should return skills for team member', async () => {
        const response = await request(app)
          .get(`/api/resources/team/${createdTeamMemberId}/skills`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('PUT /api/resources/team/:id', () => {
      it('should update team member assignment', async () => {
        const response = await request(app)
          .put(`/api/resources/team/${createdTeamMemberId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ allocation: 100, status: 'ACTIVE' });

        expect(response.status).toBe(200);
        expect(response.body.data.allocation).toBe(100);
      });
    });

    describe('DELETE /api/resources/team/:id', () => {
      it('should remove a team member', async () => {
        const response = await request(app)
          .delete(`/api/resources/team/${createdTeamMemberId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      });
    });
  });

  // =====================
  // Allocations
  // =====================
  describe('Allocation endpoints', () => {
    let createdAllocationId;
    let materialId;

    beforeAll(async () => {
      // Create a material to use as resource
      const mat = await request(app)
        .post('/api/resources/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Allocation Test Material',
          unit: 'pcs',
          unitCost: 10,
          quantity: 100,
          projectId: testProject.id
        });
      materialId = mat.body.data.id;
    });

    describe('POST /api/resources/allocations', () => {
      it('should create an allocation (PM role)', async () => {
        const response = await request(app)
          .post('/api/resources/allocations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            projectId: testProject.id,
            resourceType: 'MATERIAL',
            resourceId: materialId,
            quantity: 20,
            startDate: '2026-04-01',
            endDate: '2026-04-30'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.resourceType).toBe('MATERIAL');
        createdAllocationId = response.body.data.id;
      });

      it('should return 400 for missing resourceType', async () => {
        const response = await request(app)
          .post('/api/resources/allocations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ projectId: testProject.id, resourceId: materialId });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/resources/allocations', () => {
      it('should list allocations', async () => {
        const response = await request(app)
          .get('/api/resources/allocations')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/resources/conflicts', () => {
      it('should return conflict detection results', async () => {
        const response = await request(app)
          .get(`/api/resources/conflicts?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('conflictCount');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return 400 when projectId is missing', async () => {
        const response = await request(app)
          .get('/api/resources/conflicts')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/resources/allocations/:id', () => {
      it('should update an allocation', async () => {
        const response = await request(app)
          .put(`/api/resources/allocations/${createdAllocationId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'ALLOCATED' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('ALLOCATED');
      });
    });

    describe('DELETE /api/resources/allocations/:id', () => {
      it('should delete an allocation', async () => {
        const response = await request(app)
          .delete(`/api/resources/allocations/${createdAllocationId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      });
    });
  });

  // =====================
  // Reporting
  // =====================
  describe('Reporting endpoints', () => {
    describe('GET /api/resources/summary/:projectId', () => {
      it('should return resource summary for project', async () => {
        const response = await request(app)
          .get(`/api/resources/summary/${testProject.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('projectId', testProject.id);
        expect(response.body.data).toHaveProperty('totals');
      });
    });

    describe('GET /api/resources/utilization/:projectId', () => {
      it('should return resource utilization for project', async () => {
        const response = await request(app)
          .get(`/api/resources/utilization/${testProject.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('materials');
        expect(response.body.data).toHaveProperty('labor');
        expect(response.body.data).toHaveProperty('equipment');
      });
    });
  });
});

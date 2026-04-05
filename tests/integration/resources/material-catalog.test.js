const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

describe('Material Catalog API', () => {
  let authToken;
  let testProject;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
    testProject = await Project.create({
      ...createTestProject(),
      projectManagerId: testUser.id
    });
    authToken = generateAuthToken(testUser);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates catalog material without quantity', async () => {
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

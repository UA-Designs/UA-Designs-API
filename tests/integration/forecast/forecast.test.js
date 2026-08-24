const request = require('supertest');
const app = require('../../../src/server');
const {
  sequelize,
  User,
  Project,
  Task,
  Budget,
  Expense,
  Labor,
  TeamMember,
  ResourceAllocation,
  Cost,
  ForecastSnapshot
} = require('../../../src/models');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestTask,
  createTestBudget,
  createTestExpense,
  createTestLabor,
  createTestTeamMember,
  createTestAllocation
} = require('../../helpers/testHelpers');

let adminToken;
let pmToken;
let staffToken;
let pmUser;
let project;
let delayedTask;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const admin = await User.create(createTestUser({ role: 'ADMIN', email: 'forecast-admin@uadesigns.com' }));
  pmUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'forecast-pm@uadesigns.com' }));
  const staff = await User.create(createTestUser({ role: 'STAFF', email: 'forecast-staff@uadesigns.com' }));

  adminToken = generateAuthToken(admin);
  pmToken = generateAuthToken(pmUser);
  staffToken = generateAuthToken(staff);

  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-04-11T00:00:00.000Z');

  project = await Project.create({
    ...createTestProject({
      name: 'Seaside Warehouse',
      status: 'active',
      projectType: 'commercial'
    }),
    projectManagerId: pmUser.id,
    startDate: start,
    endDate: end,
    budget: 10000000,
    progress: 40
  });

  await Budget.create({
    ...createTestBudget({ name: 'Approved baseline', amount: 10000000, status: 'APPROVED' }),
    projectId: project.id
  });

  await Expense.create({
    ...createTestExpense({
      name: 'Labor draw 1',
      amount: 4500000,
      status: 'APPROVED',
      category: 'LABOR',
      date: new Date('2026-02-01T00:00:00.000Z')
    }),
    projectId: project.id,
    submittedBy: pmUser.id
  });

  await Task.create({
    ...createTestTask({ name: 'Site works' }),
    projectId: project.id,
    status: 'COMPLETED',
    progress: 100,
    duration: 20,
    assignedTo: pmUser.id,
    actualEndDate: new Date('2026-01-21T00:00:00.000Z')
  });

  delayedTask = await Task.create({
    ...createTestTask({ name: 'Superstructure' }),
    projectId: project.id,
    status: 'IN_PROGRESS',
    progress: 35,
    duration: 45,
    isCritical: true,
    assignedTo: pmUser.id,
    startDate: new Date('2026-01-22T00:00:00.000Z'),
    endDate: new Date('2026-03-08T00:00:00.000Z')
  });

  await Task.create({
    ...createTestTask({ name: 'Finishes' }),
    projectId: project.id,
    status: 'NOT_STARTED',
    progress: 0,
    duration: 25,
    assignedTo: pmUser.id,
    startDate: new Date('2026-03-09T00:00:00.000Z'),
    endDate: end
  });

  await Labor.create({
    ...createTestLabor({ name: 'Foreman crew', status: 'ASSIGNED' }),
    projectId: project.id
  });
  await TeamMember.create({
    ...createTestTeamMember({ hoursPerWeek: 40, allocation: 100, status: 'ACTIVE' }),
    projectId: project.id,
    userId: pmUser.id
  });
  await ResourceAllocation.create({
    ...createTestAllocation({ resourceType: 'LABOR', quantity: 3, status: 'IN_USE' }),
    projectId: project.id,
    taskId: delayedTask.id,
    resourceId: pmUser.id
  });
  await Cost.create({
    name: 'Rebar',
    type: 'MATERIAL',
    amount: 1500000,
    actualAmount: 400000,
    date: new Date('2026-01-15T00:00:00.000Z'),
    status: 'APPROVED',
    projectId: project.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Forecast API', () => {
  it('returns health without auth', async () => {
    const res = await request(app).get('/api/forecast/health');
    expect(res.status).toBe(200);
    expect(res.body.calculations).toBe('DETERMINISTIC');
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`/api/forecast/projects/${project.id}`);
    expect(res.status).toBe(401);
  });

  it('validates project IDs', async () => {
    const res = await request(app)
      .get('/api/forecast/projects/not-a-uuid')
      .set(auth(pmToken));
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown project', async () => {
    const res = await request(app)
      .get('/api/forecast/projects/00000000-0000-4000-8000-000000000099')
      .set(auth(pmToken));
    expect(res.status).toBe(404);
  });

  it('returns a structured project forecast for authorized users', async () => {
    const res = await request(app)
      .get(`/api/forecast/projects/${project.id}`)
      .set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.costForecast).toHaveProperty('costPerformanceIndex');
    expect(res.body.data.scheduleForecast).toHaveProperty('schedulePerformanceIndex');
    expect(res.body.data.progressForecast).toHaveProperty('trend');
    expect(res.body.data.resourceForecast).toHaveProperty('methodology');
    expect(res.body.data.dataQuality).toHaveProperty('sufficientData');
    expect(res.body.data.charts).toHaveProperty('cost');
    expect(Number.isFinite(res.body.data.costForecast.estimateAtCompletion) || res.body.data.costForecast.estimateAtCompletion === null).toBe(true);
    expect(res.body.data.costForecast.costPerformanceIndex).not.toBe(Infinity);
  });

  it('returns type-specific forecast endpoints', async () => {
    const cost = await request(app).get(`/api/forecast/projects/${project.id}/cost`).set(auth(pmToken));
    const schedule = await request(app).get(`/api/forecast/projects/${project.id}/schedule`).set(auth(pmToken));
    const progress = await request(app).get(`/api/forecast/projects/${project.id}/progress`).set(auth(pmToken));
    const resources = await request(app).get(`/api/forecast/projects/${project.id}/resources`).set(auth(pmToken));
    expect(cost.status).toBe(200);
    expect(schedule.status).toBe(200);
    expect(progress.status).toBe(200);
    expect(resources.status).toBe(200);
  });

  it('saves forecast history on generate', async () => {
    const created = await request(app)
      .post(`/api/forecast/projects/${project.id}/generate`)
      .set(auth(pmToken));
    expect(created.status).toBe(201);
    expect(created.body.data.snapshotId).toBeTruthy();

    const history = await request(app)
      .get(`/api/forecast/projects/${project.id}/history`)
      .set(auth(pmToken));
    expect(history.status).toBe(200);
    expect(history.body.data.count).toBeGreaterThanOrEqual(1);
    const saved = await ForecastSnapshot.findByPk(created.body.data.snapshotId);
    expect(saved).toBeTruthy();
    expect(saved.projectId).toBe(project.id);
  });

  it('forbids staff from generating snapshots', async () => {
    const res = await request(app)
      .post(`/api/forecast/projects/${project.id}/generate`)
      .set(auth(staffToken));
    expect(res.status).toBe(403);
  });

  it('runs a what-if scenario without persisting project changes', async () => {
    const before = await Task.findByPk(delayedTask.id);
    const res = await request(app)
      .post(`/api/forecast/projects/${project.id}/scenarios`)
      .set(auth(pmToken))
      .send({ scenarioType: 'DELAY_TASK', taskId: delayedTask.id, delayDays: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.resultKind).toBe('SCENARIO / WHAT-IF');
    expect(res.body.data.officialRecordsUnchanged).toBe(true);
    const after = await Task.findByPk(delayedTask.id);
    expect(Number(after.duration)).toBe(Number(before.duration));
  });

  it('includes forecasting on the existing project dashboard', async () => {
    const res = await request(app)
      .get(`/api/projects/${project.id}/dashboard`)
      .set(auth(pmToken));
    expect(res.status).toBe(200);
    expect(res.body.data.forecasting).toBeDefined();
    expect(res.body.data.forecasting.cost).toHaveProperty('cpi');
    expect(res.body.data.forecasting.schedule).toHaveProperty('spi');
  });

  it('allows admins to list at-risk projects', async () => {
    const res = await request(app)
      .get('/api/forecast/at-risk')
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
  });
});

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../../src/server');
const { sequelize, User, Project, Task, TaskDependency } = require('../../../src/models');
const aiChatService = require('../../../src/services/AI/aiChatService');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestTask
} = require('../../helpers/testHelpers');
const { createScriptedLlmProvider, textReply, toolCall } = require('../../helpers/mockLlmProvider');

let pmToken;
let engineerToken;
let staffToken;
let testUser;
let testProject;
let taskA;
let taskB;
let originalA;
let originalB;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  const engineer = await User.create(createTestUser({ role: 'ENGINEER', email: 'sched-eng@uadesigns.com' }));
  const staff = await User.create(createTestUser({ role: 'STAFF', email: 'sched-staff@uadesigns.com' }));

  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: testUser.id,
    startDate: new Date('2026-01-01T00:00:00.000Z')
  });

  pmToken = generateAuthToken(testUser);
  engineerToken = generateAuthToken(engineer);
  staffToken = generateAuthToken(staff);

  taskA = await Task.create({
    ...createTestTask({ name: 'Foundation' }),
    projectId: testProject.id,
    duration: 5,
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-10T00:00:00.000Z'),
    plannedStartDate: new Date('2026-03-01T00:00:00.000Z'),
    plannedEndDate: new Date('2026-03-10T00:00:00.000Z'),
    baselineStartDate: new Date('2026-03-01T00:00:00.000Z'),
    baselineEndDate: new Date('2026-03-10T00:00:00.000Z'),
    status: 'NOT_STARTED'
  });
  taskB = await Task.create({
    ...createTestTask({ name: 'Framing' }),
    projectId: testProject.id,
    duration: 3,
    startDate: new Date('2026-03-02T00:00:00.000Z'),
    endDate: new Date('2026-03-04T00:00:00.000Z'),
    plannedStartDate: new Date('2026-03-02T00:00:00.000Z'),
    plannedEndDate: new Date('2026-03-04T00:00:00.000Z'),
    baselineStartDate: new Date('2026-03-02T00:00:00.000Z'),
    baselineEndDate: new Date('2026-03-04T00:00:00.000Z'),
    status: 'NOT_STARTED'
  });

  await TaskDependency.create({
    id: uuidv4(),
    predecessorTaskId: taskA.id,
    successorTaskId: taskB.id,
    dependencyType: 'FINISH_TO_START',
    lag: 0,
    isHardDependency: true,
    createdBy: testUser.id
  });

  originalA = {
    startDate: taskA.startDate.toISOString(),
    endDate: taskA.endDate.toISOString(),
    baselineStartDate: taskA.baselineStartDate.toISOString(),
    baselineEndDate: taskA.baselineEndDate.toISOString()
  };
  originalB = {
    startDate: taskB.startDate.toISOString(),
    endDate: taskB.endDate.toISOString(),
    baselineStartDate: taskB.baselineStartDate.toISOString(),
    baselineEndDate: taskB.baselineEndDate.toISOString()
  };
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/ai/schedule/propose', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post('/api/ai/schedule/propose')
      .send({ projectId: testProject.id });
    expect(response.status).toBe(401);
  });

  it('returns 403 for STAFF', async () => {
    const response = await request(app)
      .post('/api/ai/schedule/propose')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ projectId: testProject.id });
    expect(response.status).toBe(403);
  });

  it('stores CPM suggestions without changing official or baseline dates', async () => {
    const response = await request(app)
      .post('/api/ai/schedule/propose')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ projectId: testProject.id, startDate: '2026-01-01' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.officialDatesUnchanged).toBe(true);
    expect(response.body.data.taskCount).toBe(2);

    const suggestedA = response.body.data.tasks.find((item) => item.taskId === taskA.id);
    const suggestedB = response.body.data.tasks.find((item) => item.taskId === taskB.id);
    expect(suggestedA.suggestedStartDate).toBe('2026-01-01');
    expect(suggestedA.suggestedEndDate).toBe('2026-01-05');
    expect(suggestedB.suggestedStartDate).toBe('2026-01-06');
    expect(suggestedB.suggestedEndDate).toBe('2026-01-08');

    await taskA.reload();
    await taskB.reload();
    expect(taskA.startDate.toISOString()).toBe(originalA.startDate);
    expect(taskA.endDate.toISOString()).toBe(originalA.endDate);
    expect(taskA.baselineStartDate.toISOString()).toBe(originalA.baselineStartDate);
    expect(taskA.baselineEndDate.toISOString()).toBe(originalA.baselineEndDate);
    expect(taskA.suggestedStartDate).toBeTruthy();
    expect(taskB.startDate.toISOString()).toBe(originalB.startDate);
    expect(taskB.baselineEndDate.toISOString()).toBe(originalB.baselineEndDate);
  });
});

describe('POST /api/ai/schedule/apply', () => {
  it('returns 403 for ENGINEER', async () => {
    const response = await request(app)
      .post('/api/ai/schedule/apply')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ projectId: testProject.id });
    expect(response.status).toBe(403);
  });

  it('copies suggestions into official dates and leaves baseline unchanged', async () => {
    const response = await request(app)
      .post('/api/ai/schedule/apply')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectId: testProject.id });

    expect(response.status).toBe(200);
    expect(response.body.data.appliedCount).toBe(2);

    await taskA.reload();
    await taskB.reload();
    expect(taskA.startDate.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(taskA.endDate.toISOString().slice(0, 10)).toBe('2026-01-05');
    expect(taskB.startDate.toISOString().slice(0, 10)).toBe('2026-01-06');
    expect(taskB.endDate.toISOString().slice(0, 10)).toBe('2026-01-08');
    expect(taskA.baselineStartDate.toISOString()).toBe(originalA.baselineStartDate);
    expect(taskA.baselineEndDate.toISOString()).toBe(originalA.baselineEndDate);
    expect(taskB.baselineStartDate.toISOString()).toBe(originalB.baselineStartDate);
    expect(taskB.baselineEndDate.toISOString()).toBe(originalB.baselineEndDate);
  });
});

describe('POST /api/ai/chat/respond schedule propose/apply', () => {
  afterEach(() => {
    aiChatService.resetLlmProvider();
  });

  it('proposes dates from chat without requiring a separate client call', async () => {
    aiChatService.setLlmProvider(createScriptedLlmProvider([
      toolCall('propose_schedule', {}),
      textReply('Suggested dates were computed from CPM. Official dates were not changed.')
    ]));

    const response = await request(app)
      .post('/api/ai/chat/respond')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectId: testProject.id, message: 'Propose a schedule' });

    expect(response.status).toBe(200);
    expect(response.body.payload.intent).toBe('schedule_propose');
    expect(response.body.payload.keyResults.propose_schedule.proposed).toBe(true);
    expect(response.body.payload.keyResults.propose_schedule.officialDatesUnchanged).toBe(true);
  });

  it('blocks STAFF from applying suggested dates via chat', async () => {
    aiChatService.setLlmProvider(createScriptedLlmProvider([
      toolCall('apply_suggested_schedule', {}),
      textReply('Applying suggested dates requires Manager or above.')
    ]));

    const response = await request(app)
      .post('/api/ai/chat/respond')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ projectId: testProject.id, message: 'Apply suggested schedule' });

    expect(response.status).toBe(200);
    expect(response.body.payload.keyResults.toolStatus[0].status).toBe('error');
  });
});

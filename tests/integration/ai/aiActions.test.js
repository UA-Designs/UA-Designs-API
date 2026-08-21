const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Task, AIConversation } = require('../../../src/models');
const actionProposalService = require('../../../src/services/AI/actionProposalService');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestTask
} = require('../../helpers/testHelpers');

let authToken;
let staffToken;
let manager;
let project;
let task;
let conversation;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  manager = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  const staff = await User.create(createTestUser({ role: 'STAFF', email: 'ai-action-staff@uadesigns.com' }));
  project = await Project.create({
    ...createTestProject(),
    projectManagerId: manager.id
  });
  task = await Task.create({
    ...createTestTask({ name: 'Electrical installation' }),
    projectId: project.id,
    endDate: new Date('2026-08-25T00:00:00.000Z'),
    plannedEndDate: new Date('2026-08-25T00:00:00.000Z')
  });
  conversation = await AIConversation.create({
    userId: manager.id,
    projectId: project.id
  });
  authToken = generateAuthToken(manager);
  staffToken = generateAuthToken(staff);
});

afterAll(async () => {
  await sequelize.close();
});

async function createPending() {
  const [proposal] = await actionProposalService.createFromToolResults({
    conversationId: conversation.id,
    projectId: project.id,
    userId: manager.id,
    toolInvocations: [{
      name: 'reschedule_task',
      result: {
        ok: true,
        data: {
          proposal: true,
          type: 'RESCHEDULE_TASK',
          parameters: { taskId: task.id, endDate: '2026-08-28' },
          reason: 'Predecessor delayed'
        }
      }
    }]
  });
  return proposal;
}

describe('AI action approval', () => {
  it('executes an approved proposal through the task service path', async () => {
    const proposal = await createPending();
    const response = await request(app)
      .post(`/api/ai/actions/${proposal.id}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('EXECUTED');
    await task.reload();
    expect(new Date(task.endDate).toISOString().slice(0, 10)).toBe('2026-08-28');
  });

  it('rejects a proposal without changing records', async () => {
    const proposal = await createPending();
    const nameBefore = task.name;
    const response = await request(app)
      .post(`/api/ai/actions/${proposal.id}/reject`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('REJECTED');
    await task.reload();
    expect(task.name).toBe(nameBefore);
  });

  it('forbids staff from approving another user\'s proposal', async () => {
    const proposal = await createPending();
    const response = await request(app)
      .post(`/api/ai/actions/${proposal.id}/approve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send();
    expect(response.status).toBe(403);
  });
});

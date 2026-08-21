const { sequelize, User, Project, Task, AIConversation } = require('../../../../src/models');
const actionProposalService = require('../../../../src/services/AI/actionProposalService');
const { createTestUser, createTestProject, createTestTask } = require('../../../helpers/testHelpers');

let manager;
let staff;
let project;
let task;
let conversation;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  manager = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  staff = await User.create(createTestUser({ role: 'STAFF', email: 'staff-actions@uadesigns.com' }));
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
});

afterAll(async () => {
  await sequelize.close();
});

describe('actionProposalService', () => {
  it('stores pending proposals from write-tool results', async () => {
    const created = await actionProposalService.createFromToolResults({
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
            status: 'PENDING_APPROVAL',
            parameters: { taskId: task.id, endDate: '2026-08-28' },
            reason: 'Predecessor delayed'
          }
        }
      }]
    });

    expect(created).toHaveLength(1);
    expect(created[0].status).toBe('PENDING_APPROVAL');
    expect(created[0].type).toBe('RESCHEDULE_TASK');
  });

  it('executes an approved reschedule through TaskService/task records', async () => {
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

    const executed = await actionProposalService.approve({
      id: proposal.id,
      user: manager,
      project
    });

    expect(executed.status).toBe('EXECUTED');
    await task.reload();
    expect(new Date(task.endDate).toISOString().slice(0, 10)).toBe('2026-08-28');
  });

  it('rejects a proposal without changing the task', async () => {
    const before = task.name;
    const [proposal] = await actionProposalService.createFromToolResults({
      conversationId: conversation.id,
      projectId: project.id,
      userId: manager.id,
      toolInvocations: [{
        name: 'update_task',
        result: {
          ok: true,
          data: {
            proposal: true,
            type: 'UPDATE_TASK',
            parameters: { taskId: task.id, name: 'Should not apply' }
          }
        }
      }]
    });

    const rejected = await actionProposalService.reject({
      id: proposal.id,
      user: manager,
      project
    });
    expect(rejected.status).toBe('REJECTED');
    await task.reload();
    expect(task.name).toBe(before);
  });

  it('does not let staff approve another user\'s proposal', async () => {
    const [proposal] = await actionProposalService.createFromToolResults({
      conversationId: conversation.id,
      projectId: project.id,
      userId: manager.id,
      toolInvocations: [{
        name: 'update_task',
        result: {
          ok: true,
          data: {
            proposal: true,
            type: 'UPDATE_TASK',
            parameters: { taskId: task.id, name: 'Blocked' }
          }
        }
      }]
    });

    await expect(actionProposalService.approve({
      id: proposal.id,
      user: staff,
      project
    })).rejects.toMatchObject({ statusCode: 403 });
  });
});

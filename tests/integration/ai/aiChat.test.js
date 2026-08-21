const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Task, AIMessage } = require('../../../src/models');
const aiChatService = require('../../../src/services/AI/aiChatService');
const { AiAppError } = require('../../../src/services/AI/aiErrors');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestTask
} = require('../../helpers/testHelpers');
const { createScriptedLlmProvider, textReply, toolCall } = require('../../helpers/mockLlmProvider');

let authToken;
let staffToken;
let testUser;
let testProject;
let overdueTask;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  const staffUser = await User.create(createTestUser({ role: 'STAFF', email: 'chat-staff@uadesigns.com' }));
  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: testUser.id,
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  });
  overdueTask = await Task.create({
    ...createTestTask({ name: 'Electrical installation' }),
    projectId: testProject.id,
    status: 'IN_PROGRESS',
    plannedEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  });

  authToken = generateAuthToken(testUser);
  staffToken = generateAuthToken(staffUser);
});

afterEach(() => {
  aiChatService.resetLlmProvider();
});

afterAll(async () => {
  await sequelize.close();
});

const chat = (token, body) => request(app)
  .post('/api/ai/chat/respond')
  .set('Authorization', `Bearer ${token}`)
  .send(body);

describe('POST /api/ai/chat/respond', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post('/api/ai/chat/respond')
      .send({ projectId: testProject.id, message: 'hello' });
    expect(response.status).toBe(401);
  });

  it('returns 400 when message is missing', async () => {
    const response = await chat(authToken, { projectId: testProject.id });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 404 for an unknown project before calling the LLM', async () => {
    const provider = createScriptedLlmProvider([textReply('should not run')]);
    aiChatService.setLlmProvider(provider);

    const response = await chat(authToken, {
      projectId: '00000000-0000-0000-0000-000000000099',
      message: 'hello'
    });
    expect(response.status).toBe(404);
    expect(provider.calls).toHaveLength(0);
  });

  it('returns a dynamically generated LLM reply for a greeting', async () => {
    aiChatService.setLlmProvider(createScriptedLlmProvider([
      textReply('Hello. I can help with this construction project.')
    ]));

    const response = await chat(authToken, {
      projectId: testProject.id,
      message: 'Hello'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.replyText).toBe('Hello. I can help with this construction project.');
    expect(response.body.conversationId).toEqual(expect.any(String));
    expect(response.body.payload.intent).toBe('assistant');
  });

  it('uses overdue-task tools and real project data', async () => {
    const provider = createScriptedLlmProvider([
      toolCall('get_overdue_tasks', { projectId: 'ignored-by-backend' }),
      (input) => {
        const toolMessage = input.messages.find((item) => item.role === 'tool');
        expect(toolMessage.content).toContain(overdueTask.name);
        return textReply('Electrical installation is overdue.');
      }
    ]);
    aiChatService.setLlmProvider(provider);

    const response = await chat(authToken, {
      projectId: testProject.id,
      message: 'What tasks are overdue?'
    });

    expect(response.status).toBe(200);
    expect(response.body.replyText).toMatch(/Electrical installation/i);
    expect(response.body.payload.intent).toBe('schedule_estimate');
    expect(response.body.payload.keyResults.toolsUsed).toContain('get_overdue_tasks');
    expect(response.body.payload.keyResults.get_overdue_tasks.count).toBeGreaterThanOrEqual(1);
  });

  it('keeps conversation history for follow-up questions', async () => {
    const provider = createScriptedLlmProvider([
      textReply('There are 4 overdue tasks.'),
      (input) => {
        const contents = input.messages.map((item) => item.content).join('\n');
        expect(contents).toContain('What tasks are overdue?');
        expect(contents).toContain('There are 4 overdue tasks.');
        expect(contents).toContain('Which one is affecting the completion date the most?');
        return textReply('Electrical installation is on the critical path.');
      }
    ]);
    aiChatService.setLlmProvider(provider);

    const first = await chat(authToken, {
      projectId: testProject.id,
      message: 'What tasks are overdue?'
    });
    expect(first.status).toBe(200);

    const second = await chat(authToken, {
      projectId: testProject.id,
      conversationId: first.body.conversationId,
      message: 'Which one is affecting the completion date the most?'
    });
    expect(second.status).toBe(200);
    expect(second.body.replyText).toMatch(/Electrical installation/);

    const stored = await AIMessage.count({ where: { conversationId: first.body.conversationId } });
    expect(stored).toBeGreaterThanOrEqual(4);
  });

  it('returns pending action proposals without writing the task', async () => {
    const originalEnd = overdueTask.endDate;
    const provider = createScriptedLlmProvider([
      toolCall('reschedule_task', {
        taskId: overdueTask.id,
        endDate: '2026-08-28',
        reason: 'Predecessor delayed'
      }),
      textReply('I recommend moving Electrical Installation to August 28.')
    ]);
    aiChatService.setLlmProvider(provider);

    const response = await chat(authToken, {
      projectId: testProject.id,
      message: 'Move the electrical installation task to next Friday.'
    });

    expect(response.status).toBe(200);
    expect(response.body.payload.actionProposals).toHaveLength(1);
    expect(response.body.payload.actionProposals[0]).toEqual(expect.objectContaining({
      type: 'RESCHEDULE_TASK',
      status: 'PENDING_APPROVAL'
    }));

    await overdueTask.reload();
    expect(new Date(overdueTask.endDate).toISOString()).toBe(new Date(originalEnd).toISOString());
  });

  it('maps provider failures to an API error without leaking credentials', async () => {
    aiChatService.setLlmProvider({
      complete: async () => {
        throw new AiAppError('The AI provider failed to generate a response.', 'AI_PROVIDER_ERROR', 502);
      }
    });

    const response = await chat(authToken, {
      projectId: testProject.id,
      message: 'hello'
    });
    expect(response.status).toBe(502);
    expect(JSON.stringify(response.body)).not.toMatch(/sk-|api[_-]?key/i);
    expect(response.body.message).not.toMatch(/stack/i);
  });

  it('returns 503 when the LLM is not configured and no mock is injected', async () => {
    const response = await chat(staffToken, {
      projectId: testProject.id,
      message: 'hello'
    });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('AI_NOT_CONFIGURED');
  });

  it('rejects an unknown tool name without executing it', async () => {
    const provider = createScriptedLlmProvider([
      toolCall('run_sql', { sql: 'DROP TABLE tasks' }),
      textReply('I cannot run that.')
    ]);
    aiChatService.setLlmProvider(provider);

    const response = await chat(authToken, {
      projectId: testProject.id,
      message: 'delete everything'
    });
    expect(response.status).toBe(200);
    expect(response.body.payload.keyResults.toolStatus[0].status).toBe('error');
    const toolMessage = provider.calls[1].messages.find((item) => item.role === 'tool');
    expect(toolMessage.content).toContain('UNKNOWN_TOOL');
  });
});

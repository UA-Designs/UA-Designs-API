const { AiService } = require('../../../../src/services/AI/AiService');
const { textReply, toolCall, createScriptedLlmProvider } = require('../../../helpers/mockLlmProvider');

describe('AiService', () => {
  it('sends system instructions, project context, history, and the user message', async () => {
    const provider = createScriptedLlmProvider([textReply('Hello from the model')]);
    const service = new AiService(provider, { model: 'mock', maxToolRounds: 3 });

    const result = await service.complete({
      systemInstructions: 'You are a PM assistant.',
      projectContext: { name: 'Tower A' },
      conversationHistory: [{ role: 'user', content: 'Earlier question' }, { role: 'assistant', content: 'Earlier answer' }],
      userMessage: 'Hello',
      tools: []
    });

    expect(result.text).toBe('Hello from the model');
    const messages = provider.calls[0].messages;
    expect(messages[0]).toEqual({ role: 'system', content: 'You are a PM assistant.' });
    expect(messages[1].content).toContain('BEGIN_UNTRUSTED_PROJECT_CONTEXT');
    expect(messages[1].content).toContain('Tower A');
    expect(messages[2]).toEqual({ role: 'user', content: 'Earlier question' });
    expect(messages[3]).toEqual({ role: 'assistant', content: 'Earlier answer' });
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'Hello' });
  });

  it('executes tool calls until the model returns a final reply', async () => {
    const provider = createScriptedLlmProvider([
      toolCall('get_overdue_tasks', {}),
      textReply('There are 2 overdue tasks.')
    ]);
    const service = new AiService(provider, { model: 'mock', maxToolRounds: 3 });
    const executeTool = jest.fn().mockResolvedValue({ ok: true, data: { count: 2 } });

    const result = await service.complete({
      systemInstructions: 'Use tools.',
      userMessage: 'What is overdue?',
      tools: [{ type: 'function', function: { name: 'get_overdue_tasks' } }],
      executeTool
    });

    expect(executeTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'get_overdue_tasks' }));
    expect(result.text).toBe('There are 2 overdue tasks.');
    expect(result.toolInvocations).toHaveLength(1);
    expect(result.toolInvocations[0].status).toBe('ok');
    const toolMessage = provider.calls[1].messages.find((item) => item.role === 'tool');
    expect(toolMessage.content).toContain('BEGIN_UNTRUSTED_TOOL_RESULT_get_overdue_tasks');
  });

  it('returns a tool error payload to the model instead of throwing', async () => {
    const provider = createScriptedLlmProvider([
      toolCall('get_task', { taskId: 'bad' }),
      textReply('That task id is invalid.')
    ]);
    const service = new AiService(provider, { model: 'mock', maxToolRounds: 3 });
    const err = new Error('taskId must be a valid UUID');
    err.code = 'INVALID_TOOL_PARAMS';
    const executeTool = jest.fn().mockRejectedValue(err);

    const result = await service.complete({
      systemInstructions: 'Use tools.',
      userMessage: 'Get that task',
      tools: [{ type: 'function', function: { name: 'get_task' } }],
      executeTool
    });

    expect(result.text).toBe('That task id is invalid.');
    expect(result.toolInvocations[0].status).toBe('error');
    expect(result.toolInvocations[0].result.code).toBe('INVALID_TOOL_PARAMS');
  });
});

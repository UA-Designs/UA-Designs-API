const { wrapUntrusted } = require('./aiUtils');
const { assertAiService } = require('./IAiService');
const { getLlmConfig } = require('./llm/llmConfig');

/**
 * Provider-agnostic LLM service. The rest of the app talks to this class
 * instead of the OpenAI SDK.
 */
class AiService {
  constructor(provider, config = getLlmConfig()) {
    if (!provider || typeof provider.complete !== 'function') {
      throw new Error('AiService requires an LLM provider with complete()');
    }
    this.provider = provider;
    this.config = config;
  }

  buildMessages({ systemInstructions, projectContext, conversationHistory, userMessage }) {
    const messages = [
      { role: 'system', content: systemInstructions }
    ];

    if (projectContext) {
      messages.push({
        role: 'system',
        content: wrapUntrusted('PROJECT_CONTEXT', projectContext)
      });
    }

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    history.forEach((item) => {
      if (!item || !item.role) return;
      if (item.role === 'tool') {
        messages.push({
          role: 'tool',
          tool_call_id: item.toolCallId || item.tool_call_id,
          content: item.content || ''
        });
        return;
      }
      messages.push({
        role: item.role,
        content: item.content || ''
      });
    });

    messages.push({ role: 'user', content: String(userMessage || '') });
    return messages;
  }

  /**
   * Send a user turn to the LLM, executing backend tools until a final reply.
   */
  async complete({
    systemInstructions,
    projectContext = null,
    conversationHistory = [],
    userMessage,
    tools = [],
    executeTool,
    maxRounds,
    onTool
  }) {
    const messages = this.buildMessages({
      systemInstructions,
      projectContext,
      conversationHistory,
      userMessage
    });

    const rounds = maxRounds || this.config.maxToolRounds || 6;
    const toolInvocations = [];
    let lastUsage = null;
    let lastModel = this.config.model;

    for (let round = 0; round < rounds; round += 1) {
      const result = await this.provider.complete({
        messages,
        tools: tools.length > 0 ? tools : undefined
      });

      lastUsage = result.usage;
      lastModel = result.model || lastModel;

      if (!result.toolCalls || result.toolCalls.length === 0) {
        return {
          text: result.text || '',
          toolInvocations,
          model: lastModel,
          usage: lastUsage
        };
      }

      if (typeof executeTool !== 'function') {
        return {
          text: result.text || 'I need project tools to answer that, but they are unavailable.',
          toolInvocations,
          model: lastModel,
          usage: lastUsage
        };
      }

      messages.push({
        role: 'assistant',
        content: result.text || null,
        tool_calls: result.rawToolCalls
      });

      for (const call of result.toolCalls) {
        const started = Date.now();
        let toolResult;
        let status = 'ok';
        try {
          toolResult = await executeTool(call);
          if (toolResult && toolResult.error) status = 'error';
        } catch (err) {
          status = 'error';
          toolResult = {
            error: true,
            code: err.code || 'TOOL_ERROR',
            message: err.message || 'Tool execution failed'
          };
        }
        const durationMs = Date.now() - started;
        toolInvocations.push({
          name: call.name,
          arguments: call.arguments || {},
          result: toolResult,
          durationMs,
          status
        });
        if (typeof onTool === 'function') {
          onTool({
            name: call.name,
            status,
            durationMs
          });
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: wrapUntrusted(`TOOL_RESULT_${call.name || 'unknown'}`, toolResult)
        });
      }
    }

    return {
      text: 'I reached the tool-call limit before finishing. Please ask a more specific question.',
      toolInvocations,
      model: lastModel,
      usage: lastUsage
    };
  }
}

function createAiService(provider, config) {
  return assertAiService(new AiService(provider, config));
}

module.exports = {
  AiService,
  createAiService
};

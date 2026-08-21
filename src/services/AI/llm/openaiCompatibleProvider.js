const { AiAppError } = require('../aiErrors');
const { parseJsonSafe } = require('../aiUtils');

function mapProviderError(err) {
  const status = err && (err.status || err.statusCode);
  const code = err && err.code;

  if (err instanceof AiAppError) return err;

  if (status === 401 || code === 'invalid_api_key') {
    return new AiAppError('The AI provider rejected the configured API key.', 'AI_AUTH', 502);
  }
  if (status === 429 || code === 'rate_limit_exceeded') {
    return new AiAppError('The AI provider rate limit was reached. Try again shortly.', 'AI_RATE_LIMIT', 429);
  }
  if (err && (err.name === 'APIUserAbortError' || code === 'ETIMEDOUT' || code === 'timeout')) {
    return new AiAppError('The AI provider timed out.', 'AI_TIMEOUT', 504);
  }
  if (err && (err.name === 'APIConnectionError' || code === 'ENOTFOUND' || code === 'ECONNRESET')) {
    return new AiAppError('Could not reach the AI provider.', 'AI_NETWORK', 502);
  }

  return new AiAppError('The AI provider failed to generate a response.', 'AI_PROVIDER_ERROR', 502);
}

class OpenAiCompatibleProvider {
  constructor(config) {
    const OpenAI = require('openai');
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
      timeout: config.timeoutMs,
      maxRetries: 1
    });
  }

  async complete({ messages, tools, toolChoice }) {
    try {
      const params = {
        model: this.config.model,
        messages,
        temperature: this.config.temperature
      };

      if (Array.isArray(tools) && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = toolChoice || 'auto';
      }

      const completion = await this.client.chat.completions.create(params);
      const choice = completion.choices && completion.choices[0];
      const message = (choice && choice.message) || {};
      const rawToolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

      return {
        text: message.content || '',
        toolCalls: rawToolCalls.map((call) => ({
          id: call.id,
          name: call.function && call.function.name,
          arguments: parseJsonSafe(call.function && call.function.arguments, {})
        })),
        rawToolCalls,
        finishReason: choice ? choice.finish_reason : null,
        usage: completion.usage || null,
        model: completion.model || this.config.model
      };
    } catch (err) {
      throw mapProviderError(err);
    }
  }
}

module.exports = {
  OpenAiCompatibleProvider,
  mapProviderError
};

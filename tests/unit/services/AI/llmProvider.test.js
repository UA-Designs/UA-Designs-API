const { mapProviderError } = require('../../../../src/services/AI/llm/openaiCompatibleProvider');
const { assertLlmConfigured } = require('../../../../src/services/AI/llm/llmConfig');
const { AiAppError } = require('../../../../src/services/AI/aiErrors');

describe('LLM provider error mapping', () => {
  it('maps an invalid API key to AI_AUTH', () => {
    const err = mapProviderError({ status: 401, code: 'invalid_api_key' });
    expect(err).toBeInstanceOf(AiAppError);
    expect(err.code).toBe('AI_AUTH');
    expect(err.statusCode).toBe(502);
    expect(err.message).not.toMatch(/sk-/);
  });

  it('maps rate limits', () => {
    const err = mapProviderError({ status: 429, code: 'rate_limit_exceeded' });
    expect(err.code).toBe('AI_RATE_LIMIT');
    expect(err.statusCode).toBe(429);
  });

  it('maps timeouts', () => {
    const err = mapProviderError({ name: 'APIUserAbortError', code: 'timeout' });
    expect(err.code).toBe('AI_TIMEOUT');
    expect(err.statusCode).toBe(504);
  });

  it('maps network failures', () => {
    const err = mapProviderError({ name: 'APIConnectionError', code: 'ENOTFOUND' });
    expect(err.code).toBe('AI_NETWORK');
  });

  it('requires AI_API_KEY', () => {
    expect(() => assertLlmConfigured({ apiKey: '' })).toThrow(/AI_API_KEY/);
  });
});

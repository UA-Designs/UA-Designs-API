const { assertLlmConfigured, getLlmConfig } = require('./llmConfig');
const { OpenAiCompatibleProvider } = require('./openaiCompatibleProvider');
const { configError } = require('../aiErrors');

function createLlmProvider(overrides = {}) {
  const config = { ...getLlmConfig(), ...overrides };
  assertLlmConfigured(config);

  const provider = config.provider || 'openai';
  if (provider === 'openai' || provider === 'compatible' || provider === 'openai_compatible') {
    return new OpenAiCompatibleProvider(config);
  }

  throw configError(
    `Unsupported AI_PROVIDER "${provider}". Use "openai" or "compatible".`,
    'AI_CONFIG'
  );
}

module.exports = {
  createLlmProvider
};

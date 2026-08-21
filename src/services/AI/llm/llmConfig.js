const { configError } = require('../aiErrors');

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOOL_ROUNDS = 6;
const DEFAULT_HISTORY_LIMIT = 20;

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLlmConfig() {
  const apiKey = String(process.env.AI_API_KEY || '').trim();
  const model = String(process.env.AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const baseUrl = String(process.env.AI_BASE_URL || '').trim() || null;
  const provider = String(process.env.AI_PROVIDER || 'openai').trim().toLowerCase() || 'openai';

  return {
    apiKey,
    model,
    baseUrl,
    provider,
    timeoutMs: parsePositiveInt(process.env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    temperature: parseNumber(process.env.AI_TEMPERATURE, DEFAULT_TEMPERATURE),
    maxToolRounds: parsePositiveInt(process.env.AI_MAX_TOOL_ROUNDS, DEFAULT_MAX_TOOL_ROUNDS),
    historyLimit: parsePositiveInt(process.env.AI_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT)
  };
}

function assertLlmConfigured(config = getLlmConfig()) {
  if (!config.apiKey) {
    throw configError(
      'AI assistant is not configured. Set AI_API_KEY on the server.',
      'AI_NOT_CONFIGURED'
    );
  }
  return config;
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOOL_ROUNDS,
  DEFAULT_HISTORY_LIMIT,
  getLlmConfig,
  assertLlmConfigured
};

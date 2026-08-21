// Global test environment setup
// Runs before each test file via jest "setupFiles" config

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-unit-and-integration-tests';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.PORT = '0';
process.env.AI_RISK_MODE = 'stub';
process.env.AI_API_KEY = '';
process.env.AI_MODEL = 'gpt-4o-mini';
process.env.AI_PROVIDER = 'openai';

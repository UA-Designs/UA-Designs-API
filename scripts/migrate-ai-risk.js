/**
 * Additive migration: AI risk suggestion columns on risks.
 * Works for SQLite (dev/test) and Postgres (production).
 *
 * Usage:
 *   node scripts/migrate-ai-risk.js
 *   DATABASE_URL="postgresql://..." node scripts/migrate-ai-risk.js
 */
require('dotenv').config();
const { sequelize } = require('../src/models');
const { ensureAiRiskSuggestionColumns } = require('../src/database/ensureAiRiskColumns');

async function run() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Running AI risk suggestion column migration...');
    await ensureAiRiskSuggestionColumns(sequelize);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

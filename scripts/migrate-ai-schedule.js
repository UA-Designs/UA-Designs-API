/**
 * Additive migration: CPM schedule suggestion columns on tasks.
 * Works for SQLite (dev/test) and Postgres (production).
 *
 * Usage:
 *   node scripts/migrate-ai-schedule.js
 */
require('dotenv').config();
const { sequelize } = require('../src/models');
const { ensureScheduleSuggestionColumns } = require('../src/database/ensureScheduleSuggestionColumns');

async function run() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Running schedule suggestion column migration...');
    await ensureScheduleSuggestionColumns(sequelize);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

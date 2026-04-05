/**
 * One-time migration: add task baseline vs actual schedule tracking fields.
 * Run with: DATABASE_URL="postgresql://..." node scripts/migrate-schedule-baseline.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Set it and run again.');
  process.exit(1);
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

const migrations = [
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "baselineStartDate" TIMESTAMP WITH TIME ZONE',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "baselineEndDate" TIMESTAMP WITH TIME ZONE',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "scheduleRevision" INTEGER DEFAULT 1',
  'UPDATE tasks SET "baselineStartDate" = COALESCE("baselineStartDate", "startDate") WHERE "baselineStartDate" IS NULL',
  'UPDATE tasks SET "baselineEndDate" = COALESCE("baselineEndDate", "endDate") WHERE "baselineEndDate" IS NULL',
  'UPDATE tasks SET "scheduleRevision" = 1 WHERE "scheduleRevision" IS NULL'
];

async function run() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Running schedule baseline migration...');
    for (const sql of migrations) {
      await sequelize.query(sql);
      console.log('OK:', `${sql.substring(0, 70)}...`);
    }
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

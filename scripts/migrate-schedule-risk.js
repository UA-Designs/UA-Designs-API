/**
 * One-time migration: add risk-to-schedule link support.
 * Run against your Render DB with: DATABASE_URL="postgresql://..." node scripts/migrate-schedule-risk.js
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
  'ALTER TABLE risks ADD COLUMN IF NOT EXISTS "delayDays" INTEGER DEFAULT 0',
  'ALTER TABLE risks ADD COLUMN IF NOT EXISTS "scheduleImpactDays" INTEGER DEFAULT 0',
  'ALTER TABLE risks ADD COLUMN IF NOT EXISTS "impactType" VARCHAR(16) DEFAULT \'NONE\'',
  'UPDATE risks SET "delayDays" = 0 WHERE "delayDays" IS NULL',
  'UPDATE risks SET "scheduleImpactDays" = COALESCE("scheduleImpactDays", "delayDays", 0)',
  'UPDATE risks SET "impactType" = CASE WHEN COALESCE("scheduleImpactDays", 0) > 0 THEN \'DELAY\' ELSE \'NONE\' END WHERE "impactType" IS NULL',
  `CREATE TABLE IF NOT EXISTS risk_task_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "riskId" UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    "delayDays" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE ("riskId", "taskId")
  )`,
  'CREATE INDEX IF NOT EXISTS idx_risk_task_links_risk_id ON risk_task_links ("riskId")',
  'CREATE INDEX IF NOT EXISTS idx_risk_task_links_task_id ON risk_task_links ("taskId")'
];

async function run() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Running schedule-risk migration...');
    for (const sql of migrations) {
      await sequelize.query(sql);
      console.log('OK:', `${sql.substring(0, 60)}...`);
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

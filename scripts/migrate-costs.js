/**
 * One-time migration: add BOQ columns to costs and create site_usage table.
 * Run against your Render DB with: DATABASE_URL="postgresql://..." node scripts/migrate-costs.js
 * Or set DATABASE_URL in .env and: node scripts/migrate-costs.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Set it to your Render Postgres URL and run again.');
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
  // Costs: add BOQ columns if missing (idempotent)
  `ALTER TABLE costs ADD COLUMN IF NOT EXISTS "estimatedQty" NUMERIC(10,2) DEFAULT 0`,
  `ALTER TABLE costs ADD COLUMN IF NOT EXISTS "unitCost" NUMERIC(10,2)`,
  `ALTER TABLE costs ADD COLUMN IF NOT EXISTS "unit" VARCHAR(255)`,
  `ALTER TABLE costs ADD COLUMN IF NOT EXISTS "actualQty" NUMERIC(10,2) DEFAULT 0`,
  `ALTER TABLE costs ADD COLUMN IF NOT EXISTS "actualAmount" NUMERIC(10,2) DEFAULT 0`,
  `ALTER TABLE costs ADD COLUMN IF NOT EXISTS "amountReceived" NUMERIC(10,2) DEFAULT 0`,
  // Site usage table (Postgres: CREATE TABLE IF NOT EXISTS)
  `CREATE TABLE IF NOT EXISTS site_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL REFERENCES projects(id),
    "costId" UUID NOT NULL REFERENCES costs(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    "quantityUsed" NUMERIC(10,2) NOT NULL,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP WITH TIME ZONE
  )`
];

async function run() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Running cost/site_usage migrations...');
    for (const sql of migrations) {
      await sequelize.query(sql);
      console.log('OK:', sql.substring(0, 60) + '...');
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

/**
 * One-time migration: add schedule-risk delay column.
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
  'UPDATE risks SET "delayDays" = 0 WHERE "delayDays" IS NULL'
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

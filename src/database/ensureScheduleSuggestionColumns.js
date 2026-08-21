/**
 * Additive, idempotent migration for CPM schedule suggestion columns on tasks.
 * Works on existing Postgres (production) and SQLite (dev/test) databases.
 */

const SCHEDULE_SUGGESTION_COLUMNS = [
  { name: 'suggestedStartDate', postgres: 'TIMESTAMP WITH TIME ZONE', sqlite: 'DATETIME' },
  { name: 'suggestedEndDate', postgres: 'TIMESTAMP WITH TIME ZONE', sqlite: 'DATETIME' },
  { name: 'suggestedDurationDays', postgres: 'INTEGER', sqlite: 'INTEGER' },
  { name: 'suggestedIsCritical', postgres: 'BOOLEAN', sqlite: 'INTEGER' },
  { name: 'suggestedTotalFloat', postgres: 'INTEGER', sqlite: 'INTEGER' },
  { name: 'suggestedFreeFloat', postgres: 'INTEGER', sqlite: 'INTEGER' },
  { name: 'suggestedModelVersion', postgres: 'VARCHAR(128)', sqlite: 'VARCHAR(128)' },
  { name: 'suggestedGeneratedAt', postgres: 'TIMESTAMP WITH TIME ZONE', sqlite: 'DATETIME' }
];

async function sqliteHasColumn(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(`PRAGMA table_info(${tableName})`);
  return (rows || []).some((row) => row.name === columnName);
}

async function sqliteTableExists(sequelize, tableName) {
  const [rows] = await sequelize.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    { replacements: [tableName] }
  );
  return (rows || []).length > 0;
}

async function ensureScheduleSuggestionColumns(sequelize) {
  const dialect = sequelize.getDialect();

  if (dialect === 'postgres') {
    for (const col of SCHEDULE_SUGGESTION_COLUMNS) {
      try {
        await sequelize.query(
          `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "${col.name}" ${col.postgres};`
        );
      } catch (err) {
        if (!/already exists|does not exist/i.test(err.message)) {
          console.warn(`⚠️  tasks.${col.name} (non-fatal):`, err.message);
        }
      }
    }
    console.log('✅ Schedule suggestion columns ensured');
    return;
  }

  if (dialect === 'sqlite') {
    const tableExists = await sqliteTableExists(sequelize, 'tasks');
    if (!tableExists) return;

    for (const col of SCHEDULE_SUGGESTION_COLUMNS) {
      const exists = await sqliteHasColumn(sequelize, 'tasks', col.name);
      if (exists) continue;
      try {
        await sequelize.query(
          `ALTER TABLE tasks ADD COLUMN "${col.name}" ${col.sqlite}`
        );
      } catch (err) {
        if (!/duplicate column|already exists/i.test(err.message)) {
          console.warn(`⚠️  tasks.${col.name} (non-fatal):`, err.message);
        }
      }
    }
    console.log('✅ Schedule suggestion columns ensured');
  }
}

module.exports = {
  SCHEDULE_SUGGESTION_COLUMNS,
  ensureScheduleSuggestionColumns
};

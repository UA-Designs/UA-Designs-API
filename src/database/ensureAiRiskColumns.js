/**
 * Additive, idempotent migration for AI risk suggestion columns.
 * Works on existing Postgres (production) and SQLite (dev/test) databases.
 * Fresh environments pick these up from the Risk model via sequelize.sync().
 */

const AI_RISK_COLUMNS = [
  { name: 'aiProbability', postgres: 'DOUBLE PRECISION', sqlite: 'REAL' },
  { name: 'aiImpact', postgres: 'DOUBLE PRECISION', sqlite: 'REAL' },
  { name: 'aiSeverity', postgres: 'VARCHAR(16)', sqlite: 'VARCHAR(16)' },
  { name: 'aiRiskScore', postgres: 'DOUBLE PRECISION', sqlite: 'REAL' },
  { name: 'aiConfidence', postgres: 'DOUBLE PRECISION', sqlite: 'REAL' },
  { name: 'aiModelVersion', postgres: 'VARCHAR(128)', sqlite: 'VARCHAR(128)' },
  { name: 'aiReasons', postgres: 'JSON', sqlite: 'TEXT' },
  { name: 'aiGeneratedAt', postgres: 'TIMESTAMP WITH TIME ZONE', sqlite: 'DATETIME' }
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

async function ensureAiRiskSuggestionColumns(sequelize) {
  const dialect = sequelize.getDialect();

  if (dialect === 'postgres') {
    for (const col of AI_RISK_COLUMNS) {
      try {
        await sequelize.query(
          `ALTER TABLE risks ADD COLUMN IF NOT EXISTS "${col.name}" ${col.postgres};`
        );
      } catch (err) {
        if (!/already exists|does not exist/i.test(err.message)) {
          console.warn(`⚠️  risks.${col.name} (non-fatal):`, err.message);
        }
      }
    }
    console.log('✅ AI risk suggestion columns ensured');
    return;
  }

  if (dialect === 'sqlite') {
    const tableExists = await sqliteTableExists(sequelize, 'risks');
    if (!tableExists) return;

    for (const col of AI_RISK_COLUMNS) {
      const exists = await sqliteHasColumn(sequelize, 'risks', col.name);
      if (exists) continue;
      try {
        await sequelize.query(
          `ALTER TABLE risks ADD COLUMN "${col.name}" ${col.sqlite}`
        );
      } catch (err) {
        if (!/duplicate column|already exists/i.test(err.message)) {
          console.warn(`⚠️  risks.${col.name} (non-fatal):`, err.message);
        }
      }
    }
    console.log('✅ AI risk suggestion columns ensured');
  }
}

module.exports = {
  AI_RISK_COLUMNS,
  ensureAiRiskSuggestionColumns
};

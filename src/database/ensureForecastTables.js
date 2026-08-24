/**
 * Creates forecasting tables if they are missing.
 * Fresh environments pick these up from sequelize.sync(); this covers
 * existing production databases that are not force-synced.
 */

async function ensureForecastTables() {
  const { ForecastSnapshot } = require('../models');
  await ForecastSnapshot.sync();
}

module.exports = {
  ensureForecastTables
};

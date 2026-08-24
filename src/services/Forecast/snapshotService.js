const { ForecastSnapshot } = require('../../models');
const { toFiniteNumber, round } = require('./forecastMath');

function snapshotRecord(projectId, result, userId) {
  const cost = result.costForecast || {};
  const schedule = result.scheduleForecast || {};
  const progress = result.progressForecast || {};
  const resource = result.resourceForecast || {};

  return {
    projectId,
    generatedBy: userId || null,
    forecastDate: result.generatedAt || new Date(),
    forecastType: 'COMPOSITE',
    baselineValue: cost.budgetAtCompletion,
    actualValue: cost.actualCost,
    forecastValue: cost.estimateAtCompletion,
    variance: cost.varianceAtCompletion,
    variancePercentage: cost.variancePercentage,
    confidenceLevel: result.confidenceLevel || cost.confidenceLevel || 'MEDIUM',
    methodology: result.methodology || cost.methodology,
    status: result.overallStatus,
    costForecastValue: cost.estimateAtCompletion,
    scheduleForecastDate: schedule.forecastCompletionDate,
    progressForecastValue: progress.forecastProgress,
    resourceShortageHours: resource.additionalHoursNeeded,
    payload: result
  };
}

async function saveSnapshot({ projectId, result, userId }) {
  return ForecastSnapshot.create(snapshotRecord(projectId, result, userId));
}

async function listHistory(projectId) {
  const rows = await ForecastSnapshot.findAll({
    where: { projectId, forecastType: 'COMPOSITE' },
    order: [['forecastDate', 'ASC']]
  });

  const points = rows.map((row) => {
    const json = row.toJSON();
    return {
      id: json.id,
      forecastDate: json.forecastDate,
      costForecastValue: json.costForecastValue != null ? toFiniteNumber(json.costForecastValue) : null,
      scheduleForecastDate: json.scheduleForecastDate,
      progressForecastValue: json.progressForecastValue != null ? toFiniteNumber(json.progressForecastValue) : null,
      resourceShortageHours: json.resourceShortageHours != null ? toFiniteNumber(json.resourceShortageHours) : null,
      status: json.status,
      methodology: json.methodology,
      confidenceLevel: json.confidenceLevel,
      payload: json.payload
    };
  });

  const costTrend = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1].costForecastValue;
    const curr = points[i].costForecastValue;
    costTrend.push({
      from: points[i - 1].forecastDate,
      to: points[i].forecastDate,
      previous: prev,
      current: curr,
      change: prev != null && curr != null ? round(curr - prev, 2) : null
    });
  }

  return {
    projectId,
    count: points.length,
    snapshots: points,
    costTrend
  };
}

module.exports = {
  saveSnapshot,
  listHistory,
  snapshotRecord
};

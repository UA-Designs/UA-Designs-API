const { forecastThresholds } = require('../../config/forecastThresholds');
const {
  toFiniteNumber,
  isFiniteNumber,
  round,
  clamp,
  daysBetween,
  addDays,
  toIsoDate,
  linearRegression,
  predictLinear,
  movingAverage,
  classifyTrend,
  taskWeight
} = require('./forecastMath');
const { resolveActualProgressPct, resolvePlannedProgressPct } = require('./costForecastService');

function progressPointKey(date) {
  return toIsoDate(date);
}

function buildProgressHistory(inputs) {
  const points = [];
  const project = inputs.project || {};
  const start = project.startDate;

  if (start) {
    points.push({ date: toIsoDate(start), progress: 0, source: 'project_start' });
  }

  const tasks = (inputs.tasks || []).filter((task) => task.status === 'COMPLETED');
  const totalWeight = (inputs.tasks || [])
    .filter((task) => task.status !== 'CANCELLED')
    .reduce((sum, task) => sum + taskWeight(task), 0);

  if (totalWeight > 0 && tasks.length > 0) {
    const dated = tasks
      .map((task) => ({
        date: toIsoDate(task.actualEndDate || task.endDate || task.updatedAt),
        weight: taskWeight(task)
      }))
      .filter((item) => item.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulative = 0;
    dated.forEach((item) => {
      cumulative += item.weight;
      points.push({
        date: item.date,
        progress: round((cumulative / totalWeight) * 100, 2),
        source: 'completed_tasks'
      });
    });
  }

  (inputs.snapshots || []).forEach((snapshot) => {
    const payload = snapshot.payload || {};
    const progress = payload.progressForecast && payload.progressForecast.currentProgress;
    const date = toIsoDate(snapshot.forecastDate || snapshot.createdAt);
    if (date && isFiniteNumber(toFiniteNumber(progress, NaN))) {
      points.push({
        date,
        progress: round(toFiniteNumber(progress), 2),
        source: 'forecast_snapshot'
      });
    }
  });

  const current = resolveActualProgressPct(inputs);
  points.push({
    date: toIsoDate(inputs.asOfDate),
    progress: round(current, 2),
    source: 'current'
  });

  const byDate = new Map();
  const duplicateDates = [];
  points.forEach((point) => {
    if (!point.date || !isFiniteNumber(point.progress)) return;
    if (byDate.has(point.date)) duplicateDates.push(point.date);
    byDate.set(point.date, point);
  });

  const history = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { history, duplicateDates: [...new Set(duplicateDates)] };
}

function forecastProgress(inputs, scheduleForecast = {}) {
  const currentProgress = resolveActualProgressPct(inputs);
  const plannedProgress = isFiniteNumber(scheduleForecast.plannedProgress)
    ? scheduleForecast.plannedProgress
    : resolvePlannedProgressPct(inputs);
  const { history, duplicateDates } = buildProgressHistory(inputs);

  const origin = history.length > 0 ? new Date(history[0].date) : inputs.asOfDate;
  const series = history
    .filter((point) => isFiniteNumber(point.progress))
    .map((point) => ({
      x: daysBetween(origin, point.date) || 0,
      y: point.progress,
      date: point.date
    }));

  const model = linearRegression(series);
  const velocities = [];
  for (let i = 1; i < series.length; i += 1) {
    const dx = series[i].x - series[i - 1].x;
    const dy = series[i].y - series[i - 1].y;
    if (dx > 0) velocities.push(dy / dx);
  }

  const overallVelocity = velocities.length > 0
    ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
    : (model ? model.slope : null);
  const recentVelocity = movingAverage(velocities, forecastThresholds.progressVelocityWindow);
  const trend = classifyTrend(
    isFiniteNumber(recentVelocity) ? recentVelocity : overallVelocity,
    overallVelocity
  );

  const plannedEnd = inputs.project && inputs.project.endDate;
  const plannedRemainingDays = plannedEnd ? Math.max(0, daysBetween(inputs.asOfDate, plannedEnd) || 0) : null;
  const horizonDays = plannedRemainingDays != null ? plannedRemainingDays : 30;
  const currentX = daysBetween(origin, inputs.asOfDate) || 0;
  const forecastProgressPct = model
    ? clamp(predictLinear(model, currentX + horizonDays), 0, 100)
    : null;

  let projectedCompletionDate = null;
  if (model && model.slope > 0) {
    const daysToComplete = (100 - model.intercept) / model.slope;
    if (isFiniteNumber(daysToComplete)) {
      projectedCompletionDate = toIsoDate(addDays(origin, daysToComplete));
    }
  } else if (isFiniteNumber(overallVelocity) && overallVelocity > 0 && isFiniteNumber(currentProgress)) {
    const remaining = Math.max(0, 100 - currentProgress);
    projectedCompletionDate = toIsoDate(addDays(inputs.asOfDate, remaining / overallVelocity));
  }

  const sufficient = series.length >= 2 && isFiniteNumber(forecastProgressPct);
  const methodology = sufficient
    ? (model ? 'LINEAR_TREND_REGRESSION' : 'MOVING_AVERAGE_VELOCITY')
    : 'INSUFFICIENT_DATA';

  return {
    currentProgress: round(currentProgress, 2),
    plannedProgress: round(plannedProgress, 2),
    progressVelocity: round(overallVelocity, 4),
    recentVelocity: round(recentVelocity, 4),
    trend: sufficient ? trend : 'UNKNOWN',
    forecastProgress: round(forecastProgressPct, 2),
    projectedCompletionDate,
    history,
    duplicateProgressDates: duplicateDates,
    status: sufficient ? 'FORECAST_AVAILABLE' : 'INSUFFICIENT_DATA',
    methodology,
    confidenceLevel: sufficient ? (history.length >= 4 ? 'HIGH' : 'MEDIUM') : 'LOW',
    horizonDays
  };
}

module.exports = {
  forecastProgress,
  buildProgressHistory
};

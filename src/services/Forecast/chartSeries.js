const { toFiniteNumber, isFiniteNumber, round, toIsoDate, daysBetween } = require('./forecastMath');

function cumulativeActuals(expenses, asOfDate) {
  const byDate = new Map();
  (expenses || [])
    .filter((expense) => ['APPROVED', 'PAID'].includes(expense.status) && toFiniteNumber(expense.amount, 0) > 0)
    .forEach((expense) => {
      const date = toIsoDate(expense.date);
      if (!date) return;
      if (asOfDate && new Date(date) > asOfDate) return;
      byDate.set(date, (byDate.get(date) || 0) + toFiniteNumber(expense.amount, 0));
    });

  const dates = [...byDate.keys()].sort();
  let running = 0;
  return dates.map((date) => {
    running += byDate.get(date);
    return { date, actual: round(running, 2) };
  });
}

function plannedProgressSeries(project, asOfDate) {
  if (!project || !project.startDate || !project.endDate) return [];
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  const total = end.getTime() - start.getTime();
  if (!(total > 0)) return [];

  const points = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end && cursor <= asOfDate) {
    const planned = Math.min(100, Math.max(0, ((cursor.getTime() - start.getTime()) / total) * 100));
    points.push({ date: toIsoDate(cursor), planned: round(planned, 2) });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  const asOfPlanned = Math.min(100, Math.max(0, ((asOfDate.getTime() - start.getTime()) / total) * 100));
  points.push({ date: toIsoDate(asOfDate), planned: round(asOfPlanned, 2) });
  return points;
}

function buildChartSeries({ inputs, costForecast, scheduleForecast, progressForecast }) {
  const asOf = inputs.asOfDate instanceof Date ? inputs.asOfDate : new Date(inputs.asOfDate);
  const bac = costForecast.budgetAtCompletion;
  const eac = costForecast.estimateAtCompletion;
  const actuals = cumulativeActuals(inputs.expenses, asOf);
  const cost = actuals.map((point) => ({
    date: point.date,
    actual: point.actual,
    forecast: eac,
    budget: bac
  }));
  if (cost.length === 0 && inputs.project && inputs.project.startDate) {
    cost.push({
      date: toIsoDate(inputs.project.startDate),
      actual: 0,
      forecast: eac,
      budget: bac
    });
  }
  cost.push({
    date: toIsoDate(asOf),
    actual: costForecast.actualCost,
    forecast: eac,
    budget: bac
  });

  const planned = plannedProgressSeries(inputs.project, asOf);
  const historyByDate = new Map((progressForecast.history || []).map((p) => [p.date, p.progress]));
  const progress = planned.map((point) => ({
    date: point.date,
    planned: point.planned,
    actual: historyByDate.has(point.date) ? historyByDate.get(point.date) : null,
    forecast: progressForecast.forecastProgress
  }));
  (progressForecast.history || []).forEach((point) => {
    if (!progress.some((row) => row.date === point.date)) {
      progress.push({
        date: point.date,
        planned: null,
        actual: point.progress,
        forecast: progressForecast.forecastProgress
      });
    }
  });
  progress.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const trend = (inputs.snapshots || []).map((snapshot) => ({
    date: toIsoDate(snapshot.forecastDate || snapshot.createdAt),
    forecastCost: snapshot.costForecastValue != null ? toFiniteNumber(snapshot.costForecastValue) : null,
    forecastCompletion: snapshot.scheduleForecastDate || null
  }));

  return {
    cost,
    schedule: {
      baselineCompletion: scheduleForecast.baselineCompletionDate,
      currentProjectedCompletion: scheduleForecast.forecastCompletionDate,
      forecastCompletion: scheduleForecast.forecastCompletionDate,
      delayDays: scheduleForecast.delayDays
    },
    progress,
    trend
  };
}

function daysFromStart(project, date) {
  if (!project || !project.startDate || !date) return null;
  return daysBetween(project.startDate, date);
}

module.exports = {
  buildChartSeries,
  daysFromStart
};

const taskService = require('../Schedule/taskService');
const { forecastThresholds } = require('../../config/forecastThresholds');
const {
  toFiniteNumber,
  isFiniteNumber,
  round,
  daysBetween,
  addDays,
  toIsoDate,
  calculateSPI,
  scheduleStatusFromSpi,
  safeDivide
} = require('./forecastMath');
const { resolveActualProgressPct, resolvePlannedProgressPct } = require('./costForecastService');

function resolvePlannedDuration(inputs) {
  const project = inputs.project || {};
  const fromProject = daysBetween(project.startDate, project.endDate);
  if (isFiniteNumber(fromProject) && fromProject > 0) {
    return { plannedDuration: fromProject, source: 'project_dates' };
  }

  const taskSpans = (inputs.tasks || []).map((task) => {
    const start = task.baselineStartDate || task.plannedStartDate || task.startDate || project.startDate;
    const end = task.baselineEndDate || task.plannedEndDate || task.endDate;
    const span = daysBetween(start, end);
    if (isFiniteNumber(span) && span > 0) return span;
    return toFiniteNumber(task.duration, 0);
  }).filter((value) => value > 0);

  if (taskSpans.length > 0) {
    return { plannedDuration: Math.max(...taskSpans), source: 'task_dates' };
  }

  return { plannedDuration: null, source: 'none' };
}

function resolveElapsedDuration(inputs) {
  const start = inputs.project && inputs.project.startDate;
  if (!start) return 0;
  const elapsed = daysBetween(start, inputs.asOfDate);
  return elapsed == null ? 0 : Math.max(0, elapsed);
}

function forecastDurationFromCompletionRate(inputs, plannedDuration, elapsedDuration) {
  const tasks = (inputs.tasks || []).filter((task) => task.status !== 'CANCELLED');
  if (tasks.length === 0 || elapsedDuration <= 0) return null;
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const rate = safeDivide(completed, elapsedDuration, null);
  if (!isFiniteNumber(rate) || rate <= 0) return null;
  const remaining = tasks.length - completed;
  const remainingDays = remaining / rate;
  const forecastDuration = elapsedDuration + remainingDays;
  if (!isFiniteNumber(forecastDuration) || forecastDuration <= 0) return null;
  if (isFiniteNumber(plannedDuration) && plannedDuration > 0 && forecastDuration > plannedDuration * 20) {
    return null;
  }
  return forecastDuration;
}

function forecastSchedule(inputs, costForecast = {}) {
  const { plannedDuration, source: durationSource } = resolvePlannedDuration(inputs);
  const elapsedDuration = resolveElapsedDuration(inputs);
  const plannedProgress = isFiniteNumber(costForecast.plannedProgressPct)
    ? costForecast.plannedProgressPct
    : resolvePlannedProgressPct(inputs);
  const actualProgress = isFiniteNumber(costForecast.actualProgressPct)
    ? costForecast.actualProgressPct
    : resolveActualProgressPct(inputs);

  const ev = toFiniteNumber(costForecast.earnedValue, NaN);
  const pv = toFiniteNumber(costForecast.plannedValue, NaN);
  let spi = isFiniteNumber(ev) && isFiniteNumber(pv) ? calculateSPI(ev, pv) : null;
  let methodology = 'EVM_SPI';

  if (!isFiniteNumber(spi) && isFiniteNumber(actualProgress) && isFiniteNumber(plannedProgress) && plannedProgress > 0) {
    spi = safeDivide(actualProgress, plannedProgress, null);
    methodology = 'PROGRESS_RATIO_FALLBACK';
  }

  let forecastDuration = isFiniteNumber(plannedDuration) && isFiniteNumber(spi) && spi > 0
    ? plannedDuration / spi
    : null;

  if (!isFiniteNumber(forecastDuration)) {
    const fallbackDuration = forecastDurationFromCompletionRate(inputs, plannedDuration, elapsedDuration);
    if (isFiniteNumber(fallbackDuration)) {
      forecastDuration = fallbackDuration;
      methodology = 'TASK_COMPLETION_RATE_FALLBACK';
      if (!isFiniteNumber(spi) && isFiniteNumber(plannedDuration) && plannedDuration > 0) {
        spi = safeDivide(plannedDuration, forecastDuration, null);
      }
    }
  }

  const start = inputs.project && inputs.project.startDate;
  const baselineEnd = inputs.project && inputs.project.endDate;
  const forecastCompletionDate = isFiniteNumber(forecastDuration) && start
    ? addDays(start, forecastDuration)
    : null;
  const delayDays = forecastCompletionDate && baselineEnd
    ? daysBetween(baselineEnd, forecastCompletionDate)
    : (isFiniteNumber(forecastDuration) && isFiniteNumber(plannedDuration)
      ? Math.round(forecastDuration - plannedDuration)
      : null);

  const status = scheduleStatusFromSpi(spi, forecastThresholds.spi);
  const sufficient = isFiniteNumber(plannedDuration) && (isFiniteNumber(spi) || isFiniteNumber(forecastDuration));

  return {
    plannedDuration: round(plannedDuration, 1),
    elapsedDuration: round(elapsedDuration, 1),
    plannedProgress: round(plannedProgress, 2),
    actualProgress: round(actualProgress, 2),
    schedulePerformanceIndex: round(spi, 3),
    forecastDuration: round(forecastDuration, 1),
    forecastCompletionDate: toIsoDate(forecastCompletionDate),
    baselineCompletionDate: toIsoDate(baselineEnd),
    delayDays: isFiniteNumber(delayDays) ? Math.round(delayDays) : null,
    expectedDelay: isFiniteNumber(delayDays) ? Math.round(delayDays) : null,
    status: sufficient ? status : 'INSUFFICIENT_DATA',
    methodology: sufficient ? methodology : 'INSUFFICIENT_DATA',
    confidenceLevel: methodology === 'EVM_SPI' ? 'HIGH' : (sufficient ? 'MEDIUM' : 'LOW'),
    durationSource,
    dateBasis: 'taskService.addUtcDays (calendar days; same helper as the existing scheduler)'
  };
}

function addUtcDays(anchor, days) {
  return taskService.addUtcDays(anchor, days);
}

module.exports = {
  forecastSchedule,
  resolvePlannedDuration,
  resolveElapsedDuration,
  addUtcDays
};

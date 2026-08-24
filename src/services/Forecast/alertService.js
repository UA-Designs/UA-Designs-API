const { forecastThresholds } = require('../../config/forecastThresholds');
const { isFiniteNumber, toFiniteNumber } = require('./forecastMath');

function alert({ type, severity, title, message, metric, value, threshold, recommendedAction }) {
  return {
    type,
    severity,
    title,
    message,
    metric,
    value,
    threshold,
    recommendedAction
  };
}

function buildForecastAlerts({ costForecast, scheduleForecast, progressForecast, resourceForecast }) {
  const alerts = [];
  const cpi = costForecast && costForecast.costPerformanceIndex;
  const spi = scheduleForecast && scheduleForecast.schedulePerformanceIndex;
  const delayDays = scheduleForecast && scheduleForecast.delayDays;
  const expectedOverrun = costForecast && costForecast.expectedOverrun;
  const currentProgress = progressForecast && progressForecast.currentProgress;
  const plannedProgress = progressForecast && progressForecast.plannedProgress;

  if (costForecast && costForecast.status === 'OVER_BUDGET') {
    alerts.push(alert({
      type: 'COST_OVERRUN',
      severity: isFiniteNumber(cpi) && cpi < forecastThresholds.cpi.atRisk ? 'HIGH' : 'MEDIUM',
      title: 'Cost overrun forecast',
      message: isFiniteNumber(expectedOverrun) && expectedOverrun > 0
        ? `The project is forecasted to exceed the budget by ${expectedOverrun.toLocaleString()}.`
        : 'Cost performance indicates the project is forecasted to exceed budget.',
      metric: 'CPI',
      value: cpi,
      threshold: forecastThresholds.cpi.atRisk,
      recommendedAction: 'Review labor, procurement, and change-order costs contributing to current cost performance.'
    }));
  }

  if (isFiniteNumber(cpi) && cpi < forecastThresholds.cpi.onTrack) {
    alerts.push(alert({
      type: 'LOW_CPI',
      severity: cpi < forecastThresholds.cpi.atRisk ? 'HIGH' : 'MEDIUM',
      title: 'Low cost performance index',
      message: `CPI is ${cpi}. Values below ${forecastThresholds.cpi.onTrack} indicate less earned value than actual cost.`,
      metric: 'CPI',
      value: cpi,
      threshold: forecastThresholds.cpi.onTrack,
      recommendedAction: 'Investigate cost drivers on in-progress activities and tighten remaining-work estimates.'
    }));
  }

  if (scheduleForecast && (scheduleForecast.status === 'DELAYED' || (isFiniteNumber(delayDays) && delayDays >= forecastThresholds.delayDays.atRisk))) {
    alerts.push(alert({
      type: 'SCHEDULE_DELAY',
      severity: isFiniteNumber(delayDays) && delayDays >= forecastThresholds.delayDays.high ? 'HIGH' : 'MEDIUM',
      title: 'Schedule delay forecast',
      message: isFiniteNumber(delayDays)
        ? `The project is forecasted to finish ${delayDays} day(s) later than the baseline.`
        : 'Schedule performance indicates the project is forecasted to finish late.',
      metric: 'SPI',
      value: spi,
      threshold: forecastThresholds.spi.atRisk,
      recommendedAction: 'Review delayed activities, critical-path tasks, and resource allocation.'
    }));
  }

  if (isFiniteNumber(spi) && spi < forecastThresholds.spi.onTrack) {
    alerts.push(alert({
      type: 'LOW_SPI',
      severity: spi < forecastThresholds.spi.atRisk ? 'HIGH' : 'MEDIUM',
      title: 'Low schedule performance index',
      message: `SPI is ${spi}. Values below ${forecastThresholds.spi.onTrack} indicate earned value is behind planned value.`,
      metric: 'SPI',
      value: spi,
      threshold: forecastThresholds.spi.onTrack,
      recommendedAction: 'Recover schedule on critical-path tasks before adding non-critical scope.'
    }));
  }

  if (isFiniteNumber(currentProgress) && isFiniteNumber(plannedProgress)) {
    const gap = plannedProgress - currentProgress;
    if (gap >= forecastThresholds.progressBehindPlanPct) {
      alerts.push(alert({
        type: 'PROGRESS_BEHIND_PLAN',
        severity: gap >= forecastThresholds.progressBehindPlanPct * 2 ? 'HIGH' : 'MEDIUM',
        title: 'Progress behind plan',
        message: `Actual progress is ${currentProgress}% versus planned progress of ${plannedProgress}%.`,
        metric: 'progressGapPct',
        value: roundSafe(gap),
        threshold: forecastThresholds.progressBehindPlanPct,
        recommendedAction: 'Identify incomplete activities that should already have started and re-sequence remaining work.'
      }));
    }
  }

  if (resourceForecast && resourceForecast.status === 'SHORTAGE') {
    alerts.push(alert({
      type: 'RESOURCE_SHORTAGE',
      severity: toFiniteNumber(resourceForecast.additionalWorkersNeeded, 0) >= 3 ? 'HIGH' : 'MEDIUM',
      title: 'Resource shortage forecast',
      message: `Remaining work requires approximately ${resourceForecast.additionalHoursNeeded} additional labor hours (${resourceForecast.additionalWorkersNeeded} extra worker(s) at current remaining duration).`,
      metric: 'utilization',
      value: resourceForecast.utilization,
      threshold: forecastThresholds.resourceUtilization.shortage,
      recommendedAction: 'Increase crew size on the affected tasks or reduce remaining duration through re-sequencing.'
    }));
  }

  return alerts;
}

function roundSafe(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

module.exports = {
  buildForecastAlerts
};

/**
 * Centralized, configurable forecasting thresholds.
 * Override via environment variables without changing formula code.
 */

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const forecastThresholds = {
  cpi: {
    onTrack: envNumber('FORECAST_CPI_ON_TRACK', 1.0),
    atRisk: envNumber('FORECAST_CPI_AT_RISK', 0.90)
  },
  spi: {
    onTrack: envNumber('FORECAST_SPI_ON_TRACK', 1.0),
    atRisk: envNumber('FORECAST_SPI_AT_RISK', 0.90)
  },
  progressBehindPlanPct: envNumber('FORECAST_PROGRESS_BEHIND_PCT', 5),
  delayDays: {
    atRisk: envNumber('FORECAST_DELAY_AT_RISK_DAYS', 1),
    high: envNumber('FORECAST_DELAY_HIGH_DAYS', 14)
  },
  costOverrunPct: {
    atRisk: envNumber('FORECAST_COST_OVERRUN_AT_RISK_PCT', 0),
    high: envNumber('FORECAST_COST_OVERRUN_HIGH_PCT', 10)
  },
  resourceUtilization: {
    shortage: envNumber('FORECAST_RESOURCE_SHORTAGE', 1.0),
    surplus: envNumber('FORECAST_RESOURCE_SURPLUS', 0.8)
  },
  hoursPerDay: envNumber('FORECAST_HOURS_PER_DAY', 8),
  workDaysPerWeek: envNumber('FORECAST_WORK_DAYS_PER_WEEK', 5),
  progressVelocityWindow: envNumber('FORECAST_PROGRESS_VELOCITY_WINDOW', 3),
  trendSensitivity: envNumber('FORECAST_TREND_SENSITIVITY', 0.05)
};

module.exports = {
  forecastThresholds
};

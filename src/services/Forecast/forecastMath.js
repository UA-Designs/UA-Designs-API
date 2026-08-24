const { forecastThresholds } = require('../../config/forecastThresholds');

function toFiniteNumber(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function round(value, decimals = 2) {
  if (!isFiniteNumber(value) && value != null) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return null;
    const factor = 10 ** decimals;
    return Math.round(parsed * factor) / factor;
  }
  if (!isFiniteNumber(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  if (!isFiniteNumber(value)) return null;
  return Math.min(max, Math.max(min, value));
}

function safeDivide(numerator, denominator, fallback = null) {
  const n = toFiniteNumber(numerator, NaN);
  const d = toFiniteNumber(denominator, NaN);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return fallback;
  const result = n / d;
  return Number.isFinite(result) ? result : fallback;
}

function daysBetween(start, end) {
  if (!start || !end) return null;
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(anchor, days) {
  if (!anchor) return null;
  const date = anchor instanceof Date ? new Date(anchor.getTime()) : new Date(anchor);
  if (Number.isNaN(date.getTime()) || !isFiniteNumber(days)) return null;
  date.setUTCDate(date.getUTCDate() + Math.round(days));
  return date;
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function calculateCV(ev, ac) {
  if (!isFiniteNumber(ev) || !isFiniteNumber(ac)) return null;
  return ev - ac;
}

function calculateCPI(ev, ac) {
  return safeDivide(ev, ac, null);
}

function calculateSPI(ev, pv) {
  return safeDivide(ev, pv, null);
}

function calculateEAC(bac, cpi) {
  if (!isFiniteNumber(bac) || !isFiniteNumber(cpi) || cpi <= 0) return null;
  return safeDivide(bac, cpi, null);
}

function calculateETC(eac, ac) {
  if (!isFiniteNumber(eac) || !isFiniteNumber(ac)) return null;
  return eac - ac;
}

function calculateVAC(bac, eac) {
  if (!isFiniteNumber(bac) || !isFiniteNumber(eac)) return null;
  return bac - eac;
}

function variancePercentage(baseline, forecast) {
  return safeDivide((forecast - baseline) * 100, baseline, null);
}

function costStatusFromCpi(cpi, thresholds = forecastThresholds.cpi) {
  if (!isFiniteNumber(cpi)) return 'INSUFFICIENT_DATA';
  if (cpi >= thresholds.onTrack) return 'ON_TRACK';
  if (cpi >= thresholds.atRisk) return 'AT_RISK';
  return 'OVER_BUDGET';
}

function scheduleStatusFromSpi(spi, thresholds = forecastThresholds.spi) {
  if (!isFiniteNumber(spi)) return 'INSUFFICIENT_DATA';
  if (spi >= thresholds.onTrack) return 'ON_TRACK';
  if (spi >= thresholds.atRisk) return 'AT_RISK';
  return 'DELAYED';
}

function linearRegression(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const usable = points.filter((p) => isFiniteNumber(p.x) && isFiniteNumber(p.y));
  if (usable.length < 2) return null;

  const n = usable.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  usable.forEach((p) => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  });

  const denom = (n * sumXX) - (sumX * sumX);
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = ((n * sumXY) - (sumX * sumY)) / denom;
  const intercept = (sumY - (slope * sumX)) / n;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  return { slope, intercept };
}

function predictLinear(model, x) {
  if (!model || !isFiniteNumber(x)) return null;
  const y = (model.slope * x) + model.intercept;
  return Number.isFinite(y) ? y : null;
}

function movingAverage(values, windowSize) {
  const nums = (values || []).map((v) => toFiniteNumber(v, NaN)).filter(Number.isFinite);
  if (nums.length === 0) return null;
  const size = Math.max(1, Math.min(windowSize || nums.length, nums.length));
  const slice = nums.slice(nums.length - size);
  const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
  return Number.isFinite(avg) ? avg : null;
}

function classifyTrend(recentVelocity, overallVelocity, sensitivity = forecastThresholds.trendSensitivity) {
  if (!isFiniteNumber(recentVelocity) || !isFiniteNumber(overallVelocity)) return 'UNKNOWN';
  if (recentVelocity > overallVelocity * (1 + sensitivity)) return 'INCREASING';
  if (recentVelocity < overallVelocity * (1 - sensitivity)) return 'DECREASING';
  return 'STABLE';
}

function taskWeight(task) {
  const plannedCost = toFiniteNumber(task && task.plannedCost, 0);
  if (plannedCost > 0) return plannedCost;
  const duration = toFiniteNumber(task && task.duration, 0);
  if (duration > 0) return duration;
  return 1;
}

function weightedProgressPct(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  let weighted = 0;
  let totalWeight = 0;
  tasks.forEach((task) => {
    if (!task || task.status === 'CANCELLED') return;
    const weight = taskWeight(task);
    const progress = clamp(toFiniteNumber(task.progress, 0), 0, 100);
    weighted += weight * (progress || 0);
    totalWeight += weight;
  });
  if (totalWeight <= 0) return null;
  return weighted / totalWeight;
}

module.exports = {
  toFiniteNumber,
  isFiniteNumber,
  round,
  clamp,
  safeDivide,
  daysBetween,
  addDays,
  toIsoDate,
  calculateCV,
  calculateCPI,
  calculateSPI,
  calculateEAC,
  calculateETC,
  calculateVAC,
  variancePercentage,
  costStatusFromCpi,
  scheduleStatusFromSpi,
  linearRegression,
  predictLinear,
  movingAverage,
  classifyTrend,
  taskWeight,
  weightedProgressPct
};

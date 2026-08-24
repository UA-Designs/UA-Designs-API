const { loadForecastInputs } = require('./inputLoader');
const { assessDataQuality } = require('./dataQualityService');
const { forecastCost } = require('./costForecastService');
const { forecastSchedule } = require('./scheduleForecastService');
const { forecastProgress } = require('./progressForecastService');
const { forecastResource } = require('./resourceForecastService');
const { buildForecastAlerts } = require('./alertService');
const { buildChartSeries } = require('./chartSeries');
const { saveSnapshot, listHistory } = require('./snapshotService');
const { applyScenario, SCENARIO_TYPES } = require('./scenarioService');

function overallStatus({ costForecast, scheduleForecast, resourceForecast, dataQuality }) {
  const statuses = [costForecast.status, scheduleForecast.status, resourceForecast.status];
  if (!dataQuality.sufficientData && statuses.every((s) => s === 'INSUFFICIENT_DATA')) {
    return 'INSUFFICIENT_DATA';
  }
  if (statuses.includes('OVER_BUDGET') || statuses.includes('DELAYED') || statuses.includes('SHORTAGE')) {
    return 'AT_RISK';
  }
  if (statuses.includes('AT_RISK')) return 'AT_RISK';
  if (statuses.includes('ON_TRACK')) return 'ON_TRACK';
  return 'INSUFFICIENT_DATA';
}

function overallConfidence(parts) {
  const levels = parts.map((p) => p && p.confidenceLevel).filter(Boolean);
  if (levels.includes('LOW')) return 'LOW';
  if (levels.includes('MEDIUM')) return 'MEDIUM';
  if (levels.includes('HIGH')) return 'HIGH';
  return 'LOW';
}

function computeFromInputs(inputs, { label = 'BASELINE' } = {}) {
  const dataQuality = assessDataQuality(inputs);
  const costForecast = forecastCost(inputs);
  const scheduleForecast = forecastSchedule(inputs, costForecast);
  const progressForecast = forecastProgress(inputs, scheduleForecast);
  const resourceForecast = forecastResource(inputs, scheduleForecast);
  const alerts = buildForecastAlerts({
    costForecast,
    scheduleForecast,
    progressForecast,
    resourceForecast
  });
  const charts = buildChartSeries({
    inputs,
    costForecast,
    scheduleForecast,
    progressForecast
  });

  const result = {
    project: {
      id: inputs.project.id,
      name: inputs.project.name,
      status: inputs.project.status,
      startDate: inputs.project.startDate,
      endDate: inputs.project.endDate,
      progress: inputs.project.progress
    },
    generatedAt: inputs.asOfDate,
    resultKind: label,
    costForecast,
    scheduleForecast,
    progressForecast,
    resourceForecast,
    alerts,
    dataQuality,
    charts,
    overallStatus: overallStatus({ costForecast, scheduleForecast, resourceForecast, dataQuality }),
    confidenceLevel: overallConfidence([costForecast, scheduleForecast, progressForecast, resourceForecast]),
    methodology: 'DETERMINISTIC_FORECAST_ENGINE'
  };

  return result;
}

class ForecastService {
  async generate(projectId, { asOfDate, persist = false, userId } = {}) {
    const inputs = await loadForecastInputs(projectId, asOfDate || new Date());
    if (!inputs) return null;
    const result = computeFromInputs(inputs, { label: 'BASELINE' });
    if (persist) {
      const snapshot = await saveSnapshot({ projectId, result, userId });
      result.snapshotId = snapshot.id;
    }
    return result;
  }

  async getCostForecast(projectId, options) {
    const result = await this.generate(projectId, options);
    return result ? result.costForecast : null;
  }

  async getScheduleForecast(projectId, options) {
    const result = await this.generate(projectId, options);
    return result ? result.scheduleForecast : null;
  }

  async getProgressForecast(projectId, options) {
    const result = await this.generate(projectId, options);
    return result ? result.progressForecast : null;
  }

  async getResourceForecast(projectId, options) {
    const result = await this.generate(projectId, options);
    return result ? result.resourceForecast : null;
  }

  async getAlerts(projectId, options) {
    const result = await this.generate(projectId, options);
    return result ? result.alerts : null;
  }

  async getHistory(projectId) {
    return listHistory(projectId);
  }

  async getCompactSummary(projectId) {
    const result = await this.generate(projectId, { persist: false });
    if (!result) return null;
    return {
      source: 'ForecastService (deterministic; do not recalculate these numbers)',
      overallStatus: result.overallStatus,
      confidenceLevel: result.confidenceLevel,
      dataQuality: result.dataQuality,
      costForecast: result.costForecast,
      scheduleForecast: result.scheduleForecast,
      progressForecast: result.progressForecast,
      resourceForecast: result.resourceForecast,
      alerts: result.alerts,
      distinction: {
        FACT: 'actualCost, currentProgress, elapsedDuration, currentResources',
        FORECAST: 'estimateAtCompletion, forecastCompletionDate, forecastProgress, requiredResources',
        RECOMMENDATION: 'alerts[].recommendedAction — advisory only'
      }
    };
  }

  async runScenario(projectId, scenario, { asOfDate } = {}) {
    const inputs = await loadForecastInputs(projectId, asOfDate || new Date());
    if (!inputs) return null;
    const baseline = computeFromInputs(inputs, { label: 'BASELINE' });
    const applied = applyScenario(inputs, scenario);
    if (applied.error) {
      return {
        resultKind: 'SCENARIO / WHAT-IF',
        officialRecordsUnchanged: true,
        error: applied.error,
        message: applied.message,
        allowedScenarioTypes: SCENARIO_TYPES,
        baseline
      };
    }
    const scenarioForecast = computeFromInputs(applied.inputs, { label: 'SCENARIO / WHAT-IF' });
    return {
      resultKind: 'SCENARIO / WHAT-IF',
      officialRecordsUnchanged: true,
      scenarioType: applied.scenarioType,
      applied: applied.applied,
      baseline,
      scenario: scenarioForecast
    };
  }
}

module.exports = new ForecastService();
module.exports.computeFromInputs = computeFromInputs;
module.exports.SCENARIO_TYPES = SCENARIO_TYPES;

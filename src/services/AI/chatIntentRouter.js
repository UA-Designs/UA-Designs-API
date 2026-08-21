/**
 * Rule-based chat intent router.
 * Deterministic keyword matching — no LLM classification.
 */

const INTENTS = {
  SCHEDULE_ESTIMATE: 'schedule_estimate',
  SCHEDULE_PROPOSE: 'schedule_propose',
  SCHEDULE_APPLY: 'schedule_apply',
  COST_FORECAST: 'cost_forecast',
  RISK_SUMMARY: 'risk_summary',
  FALLBACK: 'fallback'
};

function normalizeMessage(message) {
  return String(message || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasWord(text, word) {
  return new RegExp(`\\b${word}\\b`, 'i').test(text);
}

function wantsScheduleApply(message) {
  const text = normalizeMessage(message);
  if (!text) return false;
  return (
    text.includes('apply suggested schedule')
    || text.includes('apply the suggested schedule')
    || text.includes('apply schedule suggestion')
    || text.includes('apply suggested dates')
    || text.includes('apply the suggested dates')
  );
}

function wantsSchedulePropose(message) {
  const text = normalizeMessage(message);
  if (!text) return false;
  if (text.includes('estimated schedule')) return false;
  return (
    text.includes('propose schedule')
    || text.includes('propose a schedule')
    || (text.includes('propose') && hasWord(text, 'schedule'))
    || text.includes('auto schedule')
    || text.includes('autoschedule')
    || text.includes('auto date')
    || text.includes('generate schedule dates')
    || text.includes('suggest schedule')
    || text.includes('suggest a schedule')
    || (text.includes('suggest') && hasWord(text, 'schedule'))
    || text.includes('suggest dates')
  );
}

function detectIntent(message) {
  const text = normalizeMessage(message);
  if (!text) return INTENTS.FALLBACK;

  const hasTopRisks = text.includes('top risks');
  const hasRiskImpact = text.includes('risk impact');
  const hasRisk = hasTopRisks || hasRiskImpact || hasWord(text, 'risk') || hasWord(text, 'risks');
  const hasEstimatedSchedule = text.includes('estimated schedule');
  const hasSchedule = hasEstimatedSchedule || hasWord(text, 'schedule');
  const hasCost = hasWord(text, 'cost') || hasWord(text, 'costs');
  const hasEvm = hasWord(text, 'evm');
  const hasForecast = hasWord(text, 'forecast');

  if (wantsScheduleApply(message)) return INTENTS.SCHEDULE_APPLY;
  if (wantsSchedulePropose(message)) return INTENTS.SCHEDULE_PROPOSE;

  // Specific risk phrases beat a generic "schedule" overlap ("risk impact on schedule")
  if (hasTopRisks || hasRiskImpact) {
    return INTENTS.RISK_SUMMARY;
  }

  // Requested order: schedule → cost/EVM/forecast → risk → fallback
  if (hasEstimatedSchedule || (hasSchedule && !hasCost && !hasEvm && !hasRisk)) {
    return INTENTS.SCHEDULE_ESTIMATE;
  }

  if (hasCost || hasEvm || (hasForecast && !hasSchedule)) {
    return INTENTS.COST_FORECAST;
  }

  if (hasSchedule) return INTENTS.SCHEDULE_ESTIMATE;
  if (hasRisk) return INTENTS.RISK_SUMMARY;
  return INTENTS.FALLBACK;
}

function wantsAiRiskScoring(message) {
  const text = normalizeMessage(message);
  if (!text) return false;
  return (
    hasWord(text, 'ai')
    || text.includes('suggest')
    || text.includes('suggestion')
    || text.includes('predict')
    || text.includes('prediction')
    || text.includes('score the risk')
    || text.includes('score risks')
    || text.includes('run ai')
  );
}

module.exports = {
  INTENTS,
  normalizeMessage,
  detectIntent,
  wantsAiRiskScoring,
  wantsSchedulePropose,
  wantsScheduleApply
};

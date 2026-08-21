/**
 * AI risk predictor layer.
 *
 * Modes (AI_RISK_MODE):
 *   stub      — default. Derives suggestions from stored rule-based fields. No network.
 *   inference — POST feature payloads to AI_RISK_INFERENCE_URL (placeholder for a real model).
 *
 * Official probability / impact / severity / riskScore are never modified here.
 */

const STUB_MODEL_VERSION = 'stub-v1';
const DEFAULT_TIMEOUT_MS = 8000;
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

class PredictorError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'PredictorError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function toNumber(value, fallback = 0) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function round4(value) {
  return parseFloat(toNumber(value).toFixed(4));
}

function assignSeverity(score) {
  if (score <= 0.10) return 'LOW';
  if (score <= 0.30) return 'MEDIUM';
  if (score <= 0.60) return 'HIGH';
  return 'CRITICAL';
}

function getMode() {
  return String(process.env.AI_RISK_MODE || 'stub').trim().toLowerCase();
}

function getTimeoutMs() {
  const parsed = parseInt(process.env.AI_RISK_TIMEOUT_MS, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function getInferenceUrl() {
  const url = String(process.env.AI_RISK_INFERENCE_URL || '').trim();
  return url || null;
}

function buildFeatures(risk) {
  const mitigations = Array.isArray(risk.mitigations) ? risk.mitigations : [];
  const linkedTasks = Array.isArray(risk.linkedTasks) ? risk.linkedTasks : [];

  return {
    id: risk.id,
    title: risk.title,
    description: risk.description || null,
    probability: toNumber(risk.probability),
    impact: toNumber(risk.impact),
    riskScore: toNumber(
      risk.riskScore,
      toNumber(risk.probability) * toNumber(risk.impact)
    ),
    severity: risk.severity || null,
    status: risk.status || null,
    responseStrategy: risk.responseStrategy || null,
    delayDays: toNumber(risk.delayDays, 0),
    scheduleImpactDays: toNumber(risk.scheduleImpactDays, 0),
    impactType: risk.impactType || 'NONE',
    category: risk.riskCategory
      ? { id: risk.riskCategory.id, name: risk.riskCategory.name }
      : null,
    notes: risk.notes || null,
    identifiedDate: risk.identifiedDate || null,
    mitigationCount: mitigations.length,
    mitigations: mitigations.map((item) => ({
      status: item.status || null,
      effectiveness: item.effectiveness || null,
      strategy: item.strategy || null
    })),
    linkedTaskCount: linkedTasks.length
  };
}

function stubPredict(features) {
  const reasons = [];
  let aiProbability = features.probability;
  let aiImpact = features.impact;

  reasons.push('Initialized from official rule-based probability and impact');

  const activeMitigations = features.mitigations.filter(
    (item) => item.status && item.status !== 'CANCELLED'
  );
  const completedHigh = activeMitigations.filter(
    (item) => item.status === 'COMPLETED' && item.effectiveness === 'HIGH'
  ).length;

  if (completedHigh > 0) {
    const reduction = Math.min(0.15, completedHigh * 0.05);
    aiProbability = clamp01(aiProbability * (1 - reduction));
    reasons.push(
      `Reduced probability by ${(reduction * 100).toFixed(0)}% due to completed high-effectiveness mitigations`
    );
  } else if (activeMitigations.length > 0) {
    const reduction = Math.min(0.08, activeMitigations.length * 0.02);
    aiProbability = clamp01(aiProbability * (1 - reduction));
    reasons.push(
      `Slight probability reduction from ${activeMitigations.length} planned/active mitigation(s)`
    );
  }

  if (features.status === 'CLOSED') {
    aiProbability = clamp01(aiProbability * 0.5);
    reasons.push('Closed risks have reduced residual probability');
  } else if (features.status === 'ESCALATED') {
    aiImpact = clamp01(aiImpact + 0.05);
    reasons.push('Escalated status increased suggested impact');
  }

  if (features.scheduleImpactDays >= 14) {
    aiImpact = clamp01(aiImpact + 0.08);
    reasons.push('Large schedule impact (>=14 days) increased suggested impact');
  } else if (features.scheduleImpactDays >= 7) {
    aiImpact = clamp01(aiImpact + 0.04);
    reasons.push('Moderate schedule impact (>=7 days) increased suggested impact');
  }

  if (features.responseStrategy === 'ACCEPT') {
    aiImpact = clamp01(aiImpact + 0.03);
    reasons.push('Accepted risks retain residual impact');
  }

  const aiRiskScore = round4(aiProbability * aiImpact);
  const aiSeverity = assignSeverity(aiRiskScore);

  let aiConfidence = 0.55;
  if (features.category) aiConfidence += 0.08;
  if (features.mitigationCount > 0) aiConfidence += 0.10;
  if (features.scheduleImpactDays > 0 || features.impactType === 'DELAY') aiConfidence += 0.08;
  if (features.description) aiConfidence += 0.05;
  if (features.linkedTaskCount > 0) aiConfidence += 0.06;
  aiConfidence = round4(Math.min(0.92, aiConfidence));

  return {
    aiProbability: round4(aiProbability),
    aiImpact: round4(aiImpact),
    aiSeverity,
    aiRiskScore,
    aiConfidence,
    aiReasons: reasons,
    aiModelVersion: STUB_MODEL_VERSION
  };
}

function normalizePrediction(raw, features) {
  const aiProbability = round4(clamp01(toNumber(raw.aiProbability, features.probability)));
  const aiImpact = round4(clamp01(toNumber(raw.aiImpact, features.impact)));
  const aiRiskScore = round4(
    toNumber(raw.aiRiskScore, aiProbability * aiImpact)
  );
  const severityCandidate = String(raw.aiSeverity || assignSeverity(aiRiskScore)).toUpperCase();
  const aiSeverity = VALID_SEVERITIES.includes(severityCandidate)
    ? severityCandidate
    : assignSeverity(aiRiskScore);

  return {
    aiProbability,
    aiImpact,
    aiSeverity,
    aiRiskScore,
    aiConfidence: round4(clamp01(toNumber(raw.aiConfidence, 0.5))),
    aiReasons: Array.isArray(raw.aiReasons)
      ? raw.aiReasons
      : Array.isArray(raw.reasons)
        ? raw.reasons
        : ['Returned by remote inference service'],
    aiModelVersion: raw.aiModelVersion || raw.modelVersion || 'inference'
  };
}

async function inferencePredict(featureList, { url, timeoutMs, projectId }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectId || null,
        risks: featureList
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new PredictorError(
        `Inference service returned ${response.status}`,
        'AI_INFERENCE_ERROR',
        502
      );
    }

    const payload = await response.json();
    const predictions = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.predictions)
        ? payload.predictions
        : Array.isArray(payload.risks)
          ? payload.risks
          : null;

    if (!predictions) {
      throw new PredictorError(
        'Inference service returned an unexpected payload',
        'AI_INFERENCE_ERROR',
        502
      );
    }

    const byId = new Map(
      predictions
        .filter((item) => item && (item.riskId || item.id))
        .map((item) => [String(item.riskId || item.id), item])
    );

    return featureList.map((features, index) => {
      const match = byId.get(String(features.id)) || predictions[index] || {};
      return normalizePrediction(match, features);
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new PredictorError(
        `AI inference timed out after ${timeoutMs}ms`,
        'AI_TIMEOUT',
        504
      );
    }
    if (err instanceof PredictorError) throw err;
    throw new PredictorError(
      err.message || 'AI inference request failed',
      'AI_INFERENCE_ERROR',
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

async function predictRisks(risks, { projectId } = {}) {
  const featuresList = risks.map(buildFeatures);
  const mode = getMode();
  const generatedAt = new Date();

  if (mode === 'stub' || mode === '') {
    return featuresList.map((features) => ({
      riskId: features.id,
      features,
      prediction: {
        ...stubPredict(features),
        aiGeneratedAt: generatedAt
      }
    }));
  }

  if (mode === 'inference') {
    const url = getInferenceUrl();
    if (!url) {
      throw new PredictorError(
        'AI_RISK_INFERENCE_URL is required when AI_RISK_MODE=inference',
        'AI_CONFIG',
        500
      );
    }

    if (featuresList.length === 0) {
      return [];
    }

    const predictions = await inferencePredict(featuresList, {
      url,
      timeoutMs: getTimeoutMs(),
      projectId
    });

    return featuresList.map((features, index) => ({
      riskId: features.id,
      features,
      prediction: {
        ...predictions[index],
        aiGeneratedAt: generatedAt
      }
    }));
  }

  throw new PredictorError(
    `Unknown AI_RISK_MODE "${mode}". Use "stub" or "inference".`,
    'AI_CONFIG',
    500
  );
}

module.exports = {
  STUB_MODEL_VERSION,
  PredictorError,
  buildFeatures,
  stubPredict,
  assignSeverity,
  predictRisks,
  getMode,
  getInferenceUrl
};

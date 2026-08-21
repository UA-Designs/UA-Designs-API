const {
  stubPredict,
  buildFeatures,
  assignSeverity,
  predictRisks,
  PredictorError,
  STUB_MODEL_VERSION
} = require('../../../../src/services/AI/riskPredictor');

describe('riskPredictor', () => {
  const baseRisk = {
    id: 'risk-1',
    title: 'Weather delay',
    description: 'Seasonal storms',
    probability: 0.5,
    impact: 0.6,
    riskScore: 0.3,
    severity: 'MEDIUM',
    status: 'IDENTIFIED',
    responseStrategy: 'MITIGATE',
    delayDays: 3,
    scheduleImpactDays: 3,
    impactType: 'DELAY',
    notes: null,
    identifiedDate: new Date(),
    riskCategory: { id: 'cat-1', name: 'Schedule' },
    mitigations: [],
    linkedTasks: [{ id: 'task-1' }]
  };

  describe('assignSeverity', () => {
    it('matches the rule-based thresholds', () => {
      expect(assignSeverity(0.10)).toBe('LOW');
      expect(assignSeverity(0.30)).toBe('MEDIUM');
      expect(assignSeverity(0.60)).toBe('HIGH');
      expect(assignSeverity(0.61)).toBe('CRITICAL');
    });
  });

  describe('buildFeatures', () => {
    it('uses only stored risk fields', () => {
      const features = buildFeatures(baseRisk);
      expect(features).toMatchObject({
        id: 'risk-1',
        probability: 0.5,
        impact: 0.6,
        riskScore: 0.3,
        scheduleImpactDays: 3,
        mitigationCount: 0,
        linkedTaskCount: 1
      });
      expect(features.category).toEqual({ id: 'cat-1', name: 'Schedule' });
    });
  });

  describe('stubPredict', () => {
    it('derives suggestions from rule-based probability and impact', () => {
      const prediction = stubPredict(buildFeatures(baseRisk));
      expect(prediction.aiProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.aiProbability).toBeLessThanOrEqual(1);
      expect(prediction.aiImpact).toBeGreaterThanOrEqual(0);
      expect(prediction.aiImpact).toBeLessThanOrEqual(1);
      expect(prediction.aiRiskScore).toBeCloseTo(
        prediction.aiProbability * prediction.aiImpact,
        4
      );
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(prediction.aiSeverity);
      expect(prediction.aiConfidence).toBeGreaterThan(0);
      expect(prediction.aiConfidence).toBeLessThanOrEqual(0.92);
      expect(prediction.aiModelVersion).toBe(STUB_MODEL_VERSION);
      expect(Array.isArray(prediction.aiReasons)).toBe(true);
    });

    it('reduces suggested probability for closed risks', () => {
      const open = stubPredict(buildFeatures(baseRisk));
      const closed = stubPredict(buildFeatures({ ...baseRisk, status: 'CLOSED' }));
      expect(closed.aiProbability).toBeLessThan(open.aiProbability);
    });
  });

  describe('predictRisks', () => {
    const originalMode = process.env.AI_RISK_MODE;
    const originalUrl = process.env.AI_RISK_INFERENCE_URL;

    afterEach(() => {
      process.env.AI_RISK_MODE = originalMode;
      process.env.AI_RISK_INFERENCE_URL = originalUrl;
    });

    it('returns stub predictions by default without calling fetch', async () => {
      process.env.AI_RISK_MODE = 'stub';
      const results = await predictRisks([baseRisk]);
      expect(results).toHaveLength(1);
      expect(results[0].riskId).toBe('risk-1');
      expect(results[0].prediction.aiModelVersion).toBe(STUB_MODEL_VERSION);
      expect(results[0].prediction.aiGeneratedAt).toBeInstanceOf(Date);
    });

    it('throws a config error when inference mode has no URL', async () => {
      process.env.AI_RISK_MODE = 'inference';
      delete process.env.AI_RISK_INFERENCE_URL;
      await expect(predictRisks([baseRisk])).rejects.toMatchObject({
        code: 'AI_CONFIG',
        statusCode: 500
      });
    });

    it('does not call the inference URL for an empty risk list', async () => {
      process.env.AI_RISK_MODE = 'inference';
      process.env.AI_RISK_INFERENCE_URL = 'https://example.test/score';
      const fetchMock = jest.fn();
      global.fetch = fetchMock;
      const results = await predictRisks([]);
      expect(results).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('PredictorError', () => {
    it('carries a code and status', () => {
      const err = new PredictorError('timeout', 'AI_TIMEOUT', 504);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('AI_TIMEOUT');
      expect(err.statusCode).toBe(504);
    });
  });
});

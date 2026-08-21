const { detectIntent, wantsAiRiskScoring, INTENTS } = require('../../../../src/services/AI/chatIntentRouter');

describe('chatIntentRouter', () => {
  describe('detectIntent', () => {
    it('maps estimated schedule to schedule_estimate', () => {
      expect(detectIntent('What is the estimated schedule?')).toBe(INTENTS.SCHEDULE_ESTIMATE);
    });

    it('maps a generic schedule question to schedule_estimate', () => {
      expect(detectIntent('Show me the project schedule')).toBe(INTENTS.SCHEDULE_ESTIMATE);
    });

    it('maps cost / EVM / forecast to cost_forecast', () => {
      expect(detectIntent('What is the cost variance?')).toBe(INTENTS.COST_FORECAST);
      expect(detectIntent('Give me the EVM metrics')).toBe(INTENTS.COST_FORECAST);
      expect(detectIntent('What is the forecast?')).toBe(INTENTS.COST_FORECAST);
    });

    it('maps risk phrases to risk_summary', () => {
      expect(detectIntent('What are the top risks?')).toBe(INTENTS.RISK_SUMMARY);
      expect(detectIntent('What is the risk impact?')).toBe(INTENTS.RISK_SUMMARY);
      expect(detectIntent('Summarize project risk')).toBe(INTENTS.RISK_SUMMARY);
    });

    it('prefers risk_summary when risk impact mentions schedule', () => {
      expect(detectIntent('What is the risk impact on the schedule?')).toBe(INTENTS.RISK_SUMMARY);
    });

    it('maps propose/auto-date phrases to schedule_propose', () => {
      expect(detectIntent('Propose a schedule')).toBe(INTENTS.SCHEDULE_PROPOSE);
      expect(detectIntent('Auto-date the existing tasks')).toBe(INTENTS.SCHEDULE_PROPOSE);
      expect(detectIntent('Suggest a schedule')).toBe(INTENTS.SCHEDULE_PROPOSE);
    });

    it('maps apply suggested schedule to schedule_apply', () => {
      expect(detectIntent('Apply suggested schedule')).toBe(INTENTS.SCHEDULE_APPLY);
    });

    it('still treats estimated schedule as a read-only estimate', () => {
      expect(detectIntent('What is the estimated schedule?')).toBe(INTENTS.SCHEDULE_ESTIMATE);
    });

    it('falls back when the topic is unclear', () => {
      expect(detectIntent('hello')).toBe(INTENTS.FALLBACK);
      expect(detectIntent('')).toBe(INTENTS.FALLBACK);
    });
  });

  describe('wantsAiRiskScoring', () => {
    it('detects an explicit AI scoring request', () => {
      expect(wantsAiRiskScoring('Suggest AI risk scores')).toBe(true);
      expect(wantsAiRiskScoring('Predict the risks')).toBe(true);
    });

    it('does not treat a normal risk summary as a scoring request', () => {
      expect(wantsAiRiskScoring('What are the top risks?')).toBe(false);
    });
  });
});

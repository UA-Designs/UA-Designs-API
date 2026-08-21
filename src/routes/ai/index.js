const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const {
  validateAiRiskScore,
  validateAiChatRespond,
  validateAiSchedulePropose,
  validateAiScheduleApply,
  validateAiActionDecision
} = require('../../middleware/aiValidation');
const aiRiskController = require('../../controllers/AI/aiRiskController');
const aiChatController = require('../../controllers/AI/aiChatController');
const aiScheduleController = require('../../controllers/AI/aiScheduleController');
const aiActionController = require('../../controllers/AI/aiActionController');
const { getLlmConfig } = require('../../services/AI/llm/llmConfig');

router.get('/health', (req, res) => {
  const llm = getLlmConfig();
  res.json({
    status: 'OK',
    service: 'UA Designs AI Assist',
    timestamp: new Date().toISOString(),
    mode: process.env.AI_RISK_MODE || 'stub',
    llm: {
      configured: Boolean(llm.apiKey),
      model: llm.model,
      provider: llm.provider
    }
  });
});

router.post(
  '/risk/score',
  authenticateToken,
  authorize('ENGINEER_AND_ABOVE'),
  validateAiRiskScore,
  (req, res) => aiRiskController.scoreProjectRisks(req, res)
);

router.post(
  '/chat/respond',
  authenticateToken,
  validateAiChatRespond,
  (req, res) => aiChatController.respond(req, res)
);

router.post(
  '/actions/:id/approve',
  authenticateToken,
  validateAiActionDecision,
  (req, res) => aiActionController.approve(req, res)
);

router.post(
  '/actions/:id/reject',
  authenticateToken,
  validateAiActionDecision,
  (req, res) => aiActionController.reject(req, res)
);

router.post(
  '/schedule/propose',
  authenticateToken,
  authorize('ENGINEER_AND_ABOVE'),
  validateAiSchedulePropose,
  (req, res) => aiScheduleController.propose(req, res)
);

router.post(
  '/schedule/apply',
  authenticateToken,
  authorize('MANAGER_AND_ABOVE'),
  validateAiScheduleApply,
  (req, res) => aiScheduleController.apply(req, res)
);

module.exports = router;

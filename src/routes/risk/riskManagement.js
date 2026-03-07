const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const riskController = require('../../controllers/Risk/riskController');
const mitigationController = require('../../controllers/Risk/mitigationController');
const {
  validateCreateRisk,
  validateUpdateRisk,
  validateUpdateStatus,
  validateAssessRisk,
  validateEscalateRisk,
  validateCreateMitigation,
  validateUpdateMitigation
} = require('../../middleware/riskValidation');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'UA Designs Risk Management',
    timestamp: new Date().toISOString()
  });
});

// --- Risk CRUD ---
router.get('/risks', authenticateToken, riskController.getAll);
router.get('/risks/:id', authenticateToken, riskController.getById);
router.post('/risks', authenticateToken, authorize('ENGINEER_AND_ABOVE'), validateCreateRisk, riskController.create);
router.put('/risks/:id', authenticateToken, authorize('ENGINEER_AND_ABOVE'), validateUpdateRisk, riskController.update);
router.delete('/risks/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), riskController.delete);

// --- Risk actions ---
router.patch('/risks/:id/status', authenticateToken, authorize('ENGINEER_AND_ABOVE'), validateUpdateStatus, riskController.updateStatus);
router.post('/risks/:id/assess', authenticateToken, authorize('MANAGER_AND_ABOVE'), validateAssessRisk, riskController.assess);
router.post('/risks/:id/escalate', authenticateToken, authorize('MANAGER_AND_ABOVE'), validateEscalateRisk, riskController.escalate);

// --- Mitigation CRUD ---
router.get('/mitigations', authenticateToken, mitigationController.getAll);
router.get('/mitigations/:id', authenticateToken, mitigationController.getById);
router.post('/mitigations', authenticateToken, authorize('MANAGER_AND_ABOVE'), validateCreateMitigation, mitigationController.create);
router.put('/mitigations/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), validateUpdateMitigation, mitigationController.update);
router.delete('/mitigations/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), mitigationController.delete);

// --- Analytics and reporting ---
router.get('/matrix/:projectId', authenticateToken, riskController.getRiskMatrix);
router.get('/monitoring/:projectId', authenticateToken, riskController.getMonitoringData);
router.get('/report/:projectId', authenticateToken, riskController.getRiskReport);

module.exports = router;

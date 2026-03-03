const express = require('express');
const router = express.Router();

const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
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
router.post('/risks', authenticateToken, validateCreateRisk, riskController.create);
router.put('/risks/:id', authenticateToken, validateUpdateRisk, riskController.update);
router.delete('/risks/:id', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER', 'SENIOR_ENGINEER'), riskController.delete);

// --- Risk actions ---
router.patch('/risks/:id/status', authenticateToken, validateUpdateStatus, riskController.updateStatus);
router.post('/risks/:id/assess', authenticateToken, validateAssessRisk, riskController.assess);
router.post('/risks/:id/escalate', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER', 'SENIOR_ENGINEER'), validateEscalateRisk, riskController.escalate);

// --- Mitigation CRUD ---
router.get('/mitigations', authenticateToken, mitigationController.getAll);
router.get('/mitigations/:id', authenticateToken, mitigationController.getById);
router.post('/mitigations', authenticateToken, validateCreateMitigation, mitigationController.create);
router.put('/mitigations/:id', authenticateToken, validateUpdateMitigation, mitigationController.update);
router.delete('/mitigations/:id', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER', 'SENIOR_ENGINEER'), mitigationController.delete);

// --- Analytics and reporting ---
router.get('/matrix/:projectId', authenticateToken, riskController.getRiskMatrix);
router.get('/monitoring/:projectId', authenticateToken, riskController.getMonitoringData);
router.get('/report/:projectId', authenticateToken, riskController.getRiskReport);

module.exports = router;

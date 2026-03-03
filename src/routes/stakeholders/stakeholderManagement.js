const express = require('express');
const router = express.Router();

const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const stakeholderController = require('../../controllers/Stakeholders/stakeholderController');
const communicationController = require('../../controllers/Stakeholders/communicationController');
const {
  validateCreateStakeholder,
  validateUpdateStakeholder,
  validateCreateCommunication,
  validateUpdateCommunication,
  validateRecordEngagement,
  validateSubmitFeedback
} = require('../../middleware/stakeholderValidation');

const PM_ADMIN = ['ADMIN', 'PROJECT_MANAGER'];

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'UA Designs Stakeholder Management',
    timestamp: new Date().toISOString()
  });
});

// --- Analytics (must be before /:id to avoid param conflicts) ---
router.get('/influence-matrix/:projectId', authenticateToken, stakeholderController.getInfluenceMatrix);
router.get('/summary/:projectId', authenticateToken, stakeholderController.getSummary);

// --- Communication management stand-alone (must be before /:id) ---
router.get('/communications/all', authenticateToken, communicationController.getAll);
router.put('/communications/:commId', authenticateToken, validateUpdateCommunication, communicationController.update);
router.delete('/communications/:commId', authenticateToken, authorizeRoles(...PM_ADMIN), communicationController.delete);

// --- Stakeholder CRUD ---
router.get('/', authenticateToken, stakeholderController.getAll);
router.post('/', authenticateToken, authorizeRoles(...PM_ADMIN), validateCreateStakeholder, stakeholderController.create);
router.get('/:id', authenticateToken, stakeholderController.getById);
router.put('/:id', authenticateToken, authorizeRoles(...PM_ADMIN), validateUpdateStakeholder, stakeholderController.update);
router.delete('/:id', authenticateToken, authorizeRoles(...PM_ADMIN), stakeholderController.delete);

// --- Communications (scoped to stakeholder) ---
router.get('/:id/communications', authenticateToken, communicationController.getCommunicationsByStakeholder);
router.post('/:id/communications', authenticateToken, validateCreateCommunication, communicationController.create);

// --- Engagement & Feedback (scoped to stakeholder) ---
router.get('/:id/engagement', authenticateToken, communicationController.getEngagementHistory);
router.post('/:id/engagement', authenticateToken, validateRecordEngagement, communicationController.recordEngagement);
router.post('/:id/feedback', authenticateToken, validateSubmitFeedback, communicationController.submitFeedback);

module.exports = router;


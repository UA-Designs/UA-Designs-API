const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const stakeholderController = require('../../controllers/Stakeholders/stakeholderController');
const communicationController = require('../../controllers/Stakeholders/communicationController');
const conversationController = require('../../controllers/Stakeholders/conversationController');
const {
  validateCreateStakeholder,
  validateUpdateStakeholder,
  validateCreateCommunication,
  validateUpdateCommunication,
  validateRecordEngagement,
  validateSubmitFeedback,
  validateListConversations,
  validateConversationId,
  validateListMessages,
  validateSendMessage,
  validateStakeholderConversation
} = require('../../middleware/stakeholderValidation');

const PM_ADMIN = 'MANAGER_AND_ABOVE';

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

// --- Stakeholder chat (must be before /:id) ---
router.get('/conversations/realtime-config', authenticateToken, (req, res) => conversationController.getRealtimeConfig(req, res));
router.post('/conversations/pusher/auth', authenticateToken, (req, res) => conversationController.authorizePusher(req, res));
router.get('/conversations', authenticateToken, validateListConversations, (req, res) => conversationController.list(req, res));
router.get('/conversations/:conversationId/messages', authenticateToken, validateListMessages, (req, res) => conversationController.listMessages(req, res));
router.post('/conversations/:conversationId/messages', authenticateToken, validateSendMessage, (req, res) => conversationController.send(req, res));
router.post('/conversations/:conversationId/delivered', authenticateToken, validateConversationId, (req, res) => conversationController.markDelivered(req, res));
router.post('/conversations/:conversationId/read', authenticateToken, validateConversationId, (req, res) => conversationController.markRead(req, res));

// --- Communication management stand-alone (must be before /:id) ---
router.get('/communications/all', authenticateToken, communicationController.getAll);
router.put('/communications/:commId', authenticateToken, authorize('ENGINEER_AND_ABOVE'), validateUpdateCommunication, communicationController.update);
router.delete('/communications/:commId', authenticateToken, authorize(PM_ADMIN), communicationController.delete);

// --- Stakeholder CRUD ---
router.get('/', authenticateToken, stakeholderController.getAll);
router.post('/', authenticateToken, authorize(PM_ADMIN), validateCreateStakeholder, stakeholderController.create);
router.get('/:id/conversation', authenticateToken, validateStakeholderConversation, (req, res) => conversationController.getOrCreate(req, res));
router.get('/:id', authenticateToken, stakeholderController.getById);
router.put('/:id', authenticateToken, authorize(PM_ADMIN), validateUpdateStakeholder, stakeholderController.update);
router.delete('/:id', authenticateToken, authorize(PM_ADMIN), stakeholderController.delete);

// --- Communications (scoped to stakeholder) ---
router.get('/:id/communications', authenticateToken, communicationController.getCommunicationsByStakeholder);
router.post('/:id/communications', authenticateToken, validateCreateCommunication, communicationController.create);

// --- Engagement & Feedback (scoped to stakeholder) ---
router.get('/:id/engagement', authenticateToken, communicationController.getEngagementHistory);
router.post('/:id/engagement', authenticateToken, authorize('ENGINEER_AND_ABOVE'), validateRecordEngagement, communicationController.recordEngagement);
router.post('/:id/feedback', authenticateToken, validateSubmitFeedback, communicationController.submitFeedback);

module.exports = router;


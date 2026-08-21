const aiChatService = require('../../services/AI/aiChatService');
const { AiAppError } = require('../../services/AI/aiErrors');
const { createRequestId, logAiEvent } = require('../../services/AI/aiLogger');

function sendError(res, error, fallbackMessage) {
  if (error instanceof AiAppError || error.statusCode) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
}

class AiChatController {
  async respond(req, res) {
    const requestId = createRequestId();
    try {
      const { projectId, message, conversationId } = req.body;
      const result = await aiChatService.respond({
        projectId,
        message,
        conversationId,
        user: req.user,
        requestId
      });

      return res.json({
        success: true,
        replyText: result.replyText,
        conversationId: result.conversationId,
        payload: result.payload
      });
    } catch (error) {
      logAiEvent({
        requestId,
        userId: req.user && req.user.id,
        projectId: req.body && req.body.projectId,
        status: 'error',
        error: error.code || 'UNHANDLED'
      });
      return sendError(res, error, 'Failed to generate chat response');
    }
  }
}

module.exports = new AiChatController();

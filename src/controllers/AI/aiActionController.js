const actionProposalService = require('../../services/AI/actionProposalService');
const { assertProjectAccess } = require('../../services/AI/projectAccess');
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

class AiActionController {
  async approve(req, res) {
    const requestId = createRequestId();
    try {
      const proposal = await actionProposalService.getById(req.params.id);
      const project = await assertProjectAccess(req.user, proposal.projectId);
      const result = await actionProposalService.approve({
        id: proposal.id,
        user: req.user,
        project
      });
      logAiEvent({
        requestId,
        userId: req.user.id,
        projectId: project.id,
        tool: 'approve_action',
        status: result.status
      });
      return res.json({
        success: true,
        message: result.status === 'EXECUTED' ? 'Action approved and executed' : 'Action updated',
        data: result
      });
    } catch (error) {
      logAiEvent({
        requestId,
        userId: req.user && req.user.id,
        tool: 'approve_action',
        status: 'error',
        error: error.code || 'UNHANDLED'
      });
      return sendError(res, error, 'Failed to approve action');
    }
  }

  async reject(req, res) {
    const requestId = createRequestId();
    try {
      const proposal = await actionProposalService.getById(req.params.id);
      const project = await assertProjectAccess(req.user, proposal.projectId);
      const result = await actionProposalService.reject({
        id: proposal.id,
        user: req.user,
        project
      });
      logAiEvent({
        requestId,
        userId: req.user.id,
        projectId: project.id,
        tool: 'reject_action',
        status: result.status
      });
      return res.json({
        success: true,
        message: 'Action rejected. Official records were not changed.',
        data: result
      });
    } catch (error) {
      logAiEvent({
        requestId,
        userId: req.user && req.user.id,
        tool: 'reject_action',
        status: 'error',
        error: error.code || 'UNHANDLED'
      });
      return sendError(res, error, 'Failed to reject action');
    }
  }
}

module.exports = new AiActionController();

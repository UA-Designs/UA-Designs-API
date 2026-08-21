const aiScheduleService = require('../../services/AI/aiScheduleService');

function handleError(res, error, fallbackMessage) {
  if (error.code === 'PROJECT_NOT_FOUND' || error.statusCode === 404) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  if (error.statusCode === 403) {
    return res.status(403).json({
      success: false,
      message: error.message
    });
  }
  if (error.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

class AiScheduleController {
  async propose(req, res) {
    try {
      const result = await aiScheduleService.propose({
        projectId: req.body.projectId,
        startDate: req.body.startDate,
        user: req.user
      });
      return res.json({
        success: true,
        message: 'Schedule date suggestions generated. Official task dates were not changed.',
        data: result
      });
    } catch (error) {
      return handleError(res, error, 'Failed to propose schedule dates');
    }
  }

  async apply(req, res) {
    try {
      const result = await aiScheduleService.apply({
        projectId: req.body.projectId,
        taskIds: req.body.taskIds,
        user: req.user
      });
      return res.json({
        success: true,
        message: 'Suggested schedule dates applied to official start/end fields. Baseline dates were not changed.',
        data: result
      });
    } catch (error) {
      return handleError(res, error, 'Failed to apply suggested schedule dates');
    }
  }
}

module.exports = new AiScheduleController();

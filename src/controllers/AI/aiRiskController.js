const aiRiskScoreService = require('../../services/AI/aiRiskScoreService');
const { PredictorError } = require('../../services/AI/riskPredictor');

class AiRiskController {
  async scoreProjectRisks(req, res) {
    try {
      const { projectId } = req.body;
      const result = await aiRiskScoreService.scoreProjectRisks(projectId);

      return res.json({
        success: true,
        data: {
          projectId: result.projectId,
          risks: result.risks
        }
      });
    } catch (error) {
      if (error.code === 'PROJECT_NOT_FOUND' || error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      console.error('AiRiskController.scoreProjectRisks error:', error);

      if (error instanceof PredictorError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message: 'Failed to generate AI risk scores',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AiRiskController();

'use strict';

const analyticsService = require('../../services/Analytics/analyticsService');

class AnalyticsController {
  async getOverview(req, res) {
    try {
      const data = await analyticsService.getOverview();
      res.json({
        success: true,
        data,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('AnalyticsController.getOverview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics overview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getProjectAnalytics(req, res) {
    try {
      const { projectId } = req.params;
      const data = await analyticsService.getProjectAnalytics(projectId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      res.json({
        success: true,
        data,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('AnalyticsController.getProjectAnalytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AnalyticsController();

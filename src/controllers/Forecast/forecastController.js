const { Project } = require('../../models');
const forecastService = require('../../services/Forecast/forecastService');
const { Op } = require('sequelize');

function notFound(res, message = 'Project not found') {
  return res.status(404).json({ success: false, message });
}

async function requireProject(projectId) {
  return Project.findByPk(projectId);
}

class ForecastController {
  static async getHealth(req, res) {
    return res.json({
      status: 'OK',
      service: 'Project Forecasting',
      calculations: 'DETERMINISTIC',
      ai: 'explanation only — does not calculate CPI/SPI/EAC/ETC/VAC'
    });
  }

  static async getProjectForecast(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const result = await forecastService.generate(project.id, { persist: false });
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get project forecast error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate forecast', error: error.message });
    }
  }

  static async getCostForecast(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.getCostForecast(project.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Get cost forecast error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate cost forecast', error: error.message });
    }
  }

  static async getScheduleForecast(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.getScheduleForecast(project.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Get schedule forecast error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate schedule forecast', error: error.message });
    }
  }

  static async getProgressForecast(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.getProgressForecast(project.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Get progress forecast error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate progress forecast', error: error.message });
    }
  }

  static async getResourceForecast(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.getResourceForecast(project.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Get resource forecast error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate resource forecast', error: error.message });
    }
  }

  static async getAlerts(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.getAlerts(project.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Get forecast alerts error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate forecast alerts', error: error.message });
    }
  }

  static async getHistory(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.getHistory(project.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Get forecast history error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch forecast history', error: error.message });
    }
  }

  static async generateSnapshot(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const result = await forecastService.generate(project.id, {
        persist: true,
        userId: req.user.id
      });
      return res.status(201).json({
        success: true,
        message: 'Forecast snapshot saved',
        data: result
      });
    } catch (error) {
      console.error('Generate forecast snapshot error:', error);
      return res.status(500).json({ success: false, message: 'Failed to save forecast snapshot', error: error.message });
    }
  }

  static async runScenario(req, res) {
    try {
      const project = await requireProject(req.params.projectId);
      if (!project) return notFound(res);
      const data = await forecastService.runScenario(project.id, req.body);
      if (data && data.error === 'UNKNOWN_SCENARIO') {
        return res.status(400).json({ success: false, ...data });
      }
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Run forecast scenario error:', error);
      return res.status(500).json({ success: false, message: 'Failed to run forecast scenario', error: error.message });
    }
  }

  static async getAtRiskProjects(req, res) {
    try {
      const projects = await Project.findAll({
        where: { status: { [Op.in]: ['planning', 'active', 'on_hold'] } },
        attributes: ['id', 'name', 'status', 'progress', 'startDate', 'endDate'],
        limit: 50,
        order: [['updatedAt', 'DESC']]
      });

      const results = [];
      for (const project of projects) {
        const forecast = await forecastService.generate(project.id, { persist: false });
        if (!forecast) continue;
        const atRisk = forecast.overallStatus === 'AT_RISK'
          || (forecast.alerts || []).some((item) => item.severity === 'HIGH');
        if (!atRisk) continue;
        results.push({
          projectId: project.id,
          name: project.name,
          status: project.status,
          overallStatus: forecast.overallStatus,
          alerts: forecast.alerts,
          costStatus: forecast.costForecast.status,
          scheduleStatus: forecast.scheduleForecast.status,
          estimateAtCompletion: forecast.costForecast.estimateAtCompletion,
          forecastCompletionDate: forecast.scheduleForecast.forecastCompletionDate
        });
      }

      return res.json({
        success: true,
        data: {
          count: results.length,
          projects: results
        }
      });
    } catch (error) {
      console.error('Get at-risk forecast projects error:', error);
      return res.status(500).json({ success: false, message: 'Failed to list at-risk projects', error: error.message });
    }
  }
}

module.exports = ForecastController;

const riskService = require('../../services/Risk/riskService');

class RiskController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        status: req.query.status,
        severity: req.query.severity,
        categoryId: req.query.categoryId,
        owner: req.query.owner,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC',
        search: req.query.search
      };

      const result = await riskService.getAll(filters);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1
        }
      });
    } catch (error) {
      console.error('RiskController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risks',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const risk = await riskService.getById(req.params.id);

      if (!risk) {
        return res.status(404).json({
          success: false,
          message: 'Risk not found'
        });
      }

      res.json({ success: true, data: risk });
    } catch (error) {
      console.error('RiskController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risk',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const data = {
        ...req.body,
        identifiedBy: req.body.identifiedBy || req.user.id
      };

      const risk = await riskService.create(data);

      res.status(201).json({
        success: true,
        message: 'Risk created successfully',
        data: risk
      });
    } catch (error) {
      console.error('RiskController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create risk',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const risk = await riskService.update(req.params.id, req.body);

      if (!risk) {
        return res.status(404).json({
          success: false,
          message: 'Risk not found'
        });
      }

      res.json({
        success: true,
        message: 'Risk updated successfully',
        data: risk
      });
    } catch (error) {
      console.error('RiskController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update risk',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await riskService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Risk not found'
        });
      }

      res.json({
        success: true,
        message: 'Risk deleted successfully'
      });
    } catch (error) {
      console.error('RiskController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete risk',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const risk = await riskService.updateStatus(req.params.id, status, req.user.id);

      if (!risk) {
        return res.status(404).json({
          success: false,
          message: 'Risk not found'
        });
      }

      res.json({
        success: true,
        message: 'Risk status updated successfully',
        data: risk
      });
    } catch (error) {
      console.error('RiskController.updateStatus error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update risk status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async assess(req, res) {
    try {
      const { probability, impact } = req.body;
      const risk = await riskService.assess(req.params.id, { probability, impact });

      if (!risk) {
        return res.status(404).json({
          success: false,
          message: 'Risk not found'
        });
      }

      res.json({
        success: true,
        message: 'Risk assessed successfully',
        data: risk
      });
    } catch (error) {
      console.error('RiskController.assess error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assess risk',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async escalate(req, res) {
    try {
      const { escalatedTo, notes } = req.body;
      const risk = await riskService.escalate(req.params.id, { escalatedTo, notes });

      if (!risk) {
        return res.status(404).json({
          success: false,
          message: 'Risk not found'
        });
      }

      res.json({
        success: true,
        message: 'Risk escalated successfully',
        data: risk
      });
    } catch (error) {
      console.error('RiskController.escalate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to escalate risk',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getRiskMatrix(req, res) {
    try {
      const { projectId } = req.params;
      const matrix = await riskService.getRiskMatrix(projectId);

      res.json({
        success: true,
        data: matrix
      });
    } catch (error) {
      console.error('RiskController.getRiskMatrix error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risk matrix',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMonitoringData(req, res) {
    try {
      const { projectId } = req.params;
      const data = await riskService.getMonitoringData(projectId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('RiskController.getMonitoringData error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risk monitoring data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getRiskReport(req, res) {
    try {
      const { projectId } = req.params;
      const report = await riskService.getRiskReport(projectId);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('RiskController.getRiskReport error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate risk report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new RiskController();

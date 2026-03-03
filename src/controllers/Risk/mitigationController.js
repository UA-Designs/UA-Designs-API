const mitigationService = require('../../services/Risk/mitigationService');

class MitigationController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        riskId: req.query.riskId,
        projectId: req.query.projectId,
        status: req.query.status,
        responsible: req.query.responsible,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await mitigationService.getAll(filters);

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
      console.error('MitigationController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch mitigations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const mitigation = await mitigationService.getById(req.params.id);

      if (!mitigation) {
        return res.status(404).json({
          success: false,
          message: 'Mitigation not found'
        });
      }

      res.json({ success: true, data: mitigation });
    } catch (error) {
      console.error('MitigationController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch mitigation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const data = {
        ...req.body,
        createdBy: req.body.createdBy || req.user.id
      };

      const mitigation = await mitigationService.create(data);

      res.status(201).json({
        success: true,
        message: 'Mitigation created successfully',
        data: mitigation
      });
    } catch (error) {
      console.error('MitigationController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create mitigation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const mitigation = await mitigationService.update(req.params.id, req.body);

      if (!mitigation) {
        return res.status(404).json({
          success: false,
          message: 'Mitigation not found'
        });
      }

      res.json({
        success: true,
        message: 'Mitigation updated successfully',
        data: mitigation
      });
    } catch (error) {
      console.error('MitigationController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update mitigation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await mitigationService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Mitigation not found'
        });
      }

      res.json({
        success: true,
        message: 'Mitigation deleted successfully'
      });
    } catch (error) {
      console.error('MitigationController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete mitigation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new MitigationController();

const stakeholderService = require('../../services/Stakeholders/stakeholderService');

class StakeholderController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        type: req.query.type,
        influence: req.query.influence,
        interest: req.query.interest,
        status: req.query.status,
        engagementLevel: req.query.engagementLevel,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC',
        search: req.query.search
      };

      const result = await stakeholderService.getAll(filters);

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
      console.error('StakeholderController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stakeholders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const stakeholder = await stakeholderService.getById(req.params.id);

      if (!stakeholder) {
        return res.status(404).json({
          success: false,
          message: 'Stakeholder not found'
        });
      }

      res.json({ success: true, data: stakeholder });
    } catch (error) {
      console.error('StakeholderController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stakeholder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const stakeholder = await stakeholderService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Stakeholder created successfully',
        data: stakeholder
      });
    } catch (error) {
      console.error('StakeholderController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create stakeholder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const stakeholder = await stakeholderService.update(req.params.id, req.body);

      if (!stakeholder) {
        return res.status(404).json({
          success: false,
          message: 'Stakeholder not found'
        });
      }

      res.json({
        success: true,
        message: 'Stakeholder updated successfully',
        data: stakeholder
      });
    } catch (error) {
      console.error('StakeholderController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stakeholder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await stakeholderService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Stakeholder not found'
        });
      }

      res.json({
        success: true,
        message: 'Stakeholder deleted successfully'
      });
    } catch (error) {
      console.error('StakeholderController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete stakeholder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getInfluenceMatrix(req, res) {
    try {
      const result = await stakeholderService.getInfluenceMatrix(req.params.projectId);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('StakeholderController.getInfluenceMatrix error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch influence matrix',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getSummary(req, res) {
    try {
      const result = await stakeholderService.getSummary(req.params.projectId);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('StakeholderController.getSummary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stakeholder summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new StakeholderController();

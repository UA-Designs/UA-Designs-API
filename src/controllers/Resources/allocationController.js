const allocationService = require('../../services/Resources/allocationService');

class AllocationController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        taskId: req.query.taskId,
        resourceType: req.query.resourceType,
        status: req.query.status,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await allocationService.getAll(filters);

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
      console.error('AllocationController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch allocations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const allocation = await allocationService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Resource allocation created successfully',
        data: allocation
      });
    } catch (error) {
      console.error('AllocationController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create allocation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const allocation = await allocationService.update(req.params.id, req.body);

      if (!allocation) {
        return res.status(404).json({ success: false, message: 'Allocation not found' });
      }

      res.json({
        success: true,
        message: 'Allocation updated successfully',
        data: allocation
      });
    } catch (error) {
      console.error('AllocationController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update allocation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await allocationService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Allocation not found' });
      }

      res.json({ success: true, message: 'Allocation deleted successfully' });
    } catch (error) {
      console.error('AllocationController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete allocation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async detectConflicts(req, res) {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'projectId query parameter is required'
        });
      }

      const conflicts = await allocationService.detectConflicts(projectId);

      res.json({
        success: true,
        data: conflicts,
        conflictCount: conflicts.length
      });
    } catch (error) {
      console.error('AllocationController.detectConflicts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect conflicts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  async getSummary(req, res) {
    try {
      const summary = await allocationService.getSummary(req.params.projectId);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('AllocationController.getSummary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resource summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getUtilization(req, res) {
    try {
      const utilization = await allocationService.getUtilization(req.params.projectId);
      res.json({ success: true, data: utilization });
    } catch (error) {
      console.error('AllocationController.getUtilization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resource utilization',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AllocationController();

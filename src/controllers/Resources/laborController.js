const laborService = require('../../services/Resources/laborService');

class LaborController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        status: req.query.status,
        trade: req.query.trade,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await laborService.getAll(filters);

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
      console.error('LaborController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch labor resources',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const labor = await laborService.getById(req.params.id);

      if (!labor) {
        return res.status(404).json({ success: false, message: 'Labor resource not found' });
      }

      res.json({ success: true, data: labor });
    } catch (error) {
      console.error('LaborController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch labor resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const labor = await laborService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Labor resource created successfully',
        data: labor
      });
    } catch (error) {
      console.error('LaborController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create labor resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const labor = await laborService.update(req.params.id, req.body);

      if (!labor) {
        return res.status(404).json({ success: false, message: 'Labor resource not found' });
      }

      res.json({
        success: true,
        message: 'Labor resource updated successfully',
        data: labor
      });
    } catch (error) {
      console.error('LaborController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update labor resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await laborService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Labor resource not found' });
      }

      res.json({ success: true, message: 'Labor resource deleted successfully' });
    } catch (error) {
      console.error('LaborController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete labor resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new LaborController();

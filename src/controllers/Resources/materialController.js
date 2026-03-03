const materialService = require('../../services/Resources/materialService');

class MaterialController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        status: req.query.status,
        category: req.query.category,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await materialService.getAll(filters);

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
      console.error('MaterialController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch materials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const material = await materialService.getById(req.params.id);

      if (!material) {
        return res.status(404).json({ success: false, message: 'Material not found' });
      }

      res.json({ success: true, data: material });
    } catch (error) {
      console.error('MaterialController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch material',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const material = await materialService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Material created successfully',
        data: material
      });
    } catch (error) {
      console.error('MaterialController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create material',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const material = await materialService.update(req.params.id, req.body);

      if (!material) {
        return res.status(404).json({ success: false, message: 'Material not found' });
      }

      res.json({
        success: true,
        message: 'Material updated successfully',
        data: material
      });
    } catch (error) {
      console.error('MaterialController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update material',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await materialService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Material not found' });
      }

      res.json({ success: true, message: 'Material deleted successfully' });
    } catch (error) {
      console.error('MaterialController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete material',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new MaterialController();

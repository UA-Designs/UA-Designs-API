const equipmentService = require('../../services/Resources/equipmentService');

class EquipmentController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        status: req.query.status,
        condition: req.query.condition,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await equipmentService.getAll(filters);

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
      console.error('EquipmentController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch equipment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const equipment = await equipmentService.getById(req.params.id);

      if (!equipment) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }

      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error('EquipmentController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch equipment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const equipment = await equipmentService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Equipment created successfully',
        data: equipment
      });
    } catch (error) {
      console.error('EquipmentController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create equipment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const equipment = await equipmentService.update(req.params.id, req.body);

      if (!equipment) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }

      res.json({
        success: true,
        message: 'Equipment updated successfully',
        data: equipment
      });
    } catch (error) {
      console.error('EquipmentController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update equipment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await equipmentService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }

      res.json({ success: true, message: 'Equipment deleted successfully' });
    } catch (error) {
      console.error('EquipmentController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete equipment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async addMaintenance(req, res) {
    try {
      const record = await equipmentService.addMaintenanceRecord(req.params.id, req.body);

      if (!record) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }

      res.status(201).json({
        success: true,
        message: 'Maintenance record added successfully',
        data: record
      });
    } catch (error) {
      console.error('EquipmentController.addMaintenance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add maintenance record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMaintenanceHistory(req, res) {
    try {
      const records = await equipmentService.getMaintenanceHistory(req.params.id);

      if (!records) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }

      res.json({ success: true, data: records });
    } catch (error) {
      console.error('EquipmentController.getMaintenanceHistory error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch maintenance history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new EquipmentController();

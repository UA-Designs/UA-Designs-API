const { Op } = require('sequelize');

const { Equipment, EquipmentMaintenance, Project } = require('../../models');

class EquipmentService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      status,
      condition,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { type: { [Op.like]: `%${search}%` } },
        { operator: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Equipment.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    return {
      items: result.rows,
      total: result.count,
      page: parseInt(page),
      totalPages: Math.ceil(result.count / parseInt(limit))
    };
  }

  async getById(id) {
    return Equipment.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: EquipmentMaintenance,
          as: 'maintenanceRecords',
          order: [['scheduledDate', 'DESC']]
        }
      ]
    });
  }

  async create(data) {
    return Equipment.create(data);
  }

  async update(id, data) {
    const equipment = await Equipment.findByPk(id);
    if (!equipment) return null;
    await equipment.update(data);
    return equipment.reload();
  }

  async delete(id) {
    const equipment = await Equipment.findByPk(id);
    if (!equipment) return null;
    await equipment.destroy();
    return true;
  }

  async addMaintenanceRecord(equipmentId, data) {
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) return null;

    const record = await EquipmentMaintenance.create({ ...data, equipmentId });

    if (data.status === 'COMPLETED') {
      await equipment.update({ lastMaintenance: data.completedDate || new Date() });
    }

    if (data.maintenanceType === 'PREVENTIVE' || data.status === 'SCHEDULED') {
      await equipment.update({ status: 'MAINTENANCE' });
    }

    return record;
  }

  async getMaintenanceHistory(equipmentId) {
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) return null;

    return EquipmentMaintenance.findAll({
      where: { equipmentId },
      order: [['scheduledDate', 'DESC']]
    });
  }
}

module.exports = new EquipmentService();

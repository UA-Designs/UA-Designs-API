const { Op } = require('sequelize');

const { Labor, Project } = require('../../models');

class LaborService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      status,
      trade,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (trade) where.trade = trade;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { role: { [Op.like]: `%${search}%` } },
        { trade: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Labor.findAndCountAll({
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
    return Labor.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });
  }

  async create(data) {
    if (data.hoursWorked !== undefined && data.dailyRate !== undefined) {
      // totalCost = (hoursWorked / 8) * dailyRate -- assuming 8 hour work day
      const days = parseFloat(data.hoursWorked) / 8;
      data.totalCost = parseFloat((days * parseFloat(data.dailyRate)).toFixed(2));
    }
    return Labor.create(data);
  }

  async update(id, data) {
    const labor = await Labor.findByPk(id);
    if (!labor) return null;

    if (data.hoursWorked !== undefined || data.dailyRate !== undefined) {
      const hours = data.hoursWorked !== undefined ? parseFloat(data.hoursWorked) : parseFloat(labor.hoursWorked);
      const rate = data.dailyRate !== undefined ? parseFloat(data.dailyRate) : parseFloat(labor.dailyRate);
      const days = hours / 8;
      data.totalCost = parseFloat((days * rate).toFixed(2));
    }

    await labor.update(data);
    return labor.reload();
  }

  async delete(id) {
    const labor = await Labor.findByPk(id);
    if (!labor) return null;
    await labor.destroy();
    return true;
  }
}

module.exports = new LaborService();

const { Op } = require('sequelize');

const { Material, Project } = require('../../models');

class MaterialService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Material.findAndCountAll({
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
    return Material.findByPk(id, {
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
    if (data.quantity !== undefined && data.unitCost !== undefined) {
      data.totalCost = parseFloat((parseFloat(data.quantity) * parseFloat(data.unitCost)).toFixed(2));
    }
    return Material.create(data);
  }

  async update(id, data) {
    const material = await Material.findByPk(id);
    if (!material) return null;

    if (data.quantity !== undefined || data.unitCost !== undefined) {
      const qty = data.quantity !== undefined ? parseFloat(data.quantity) : parseFloat(material.quantity);
      const rate = data.unitCost !== undefined ? parseFloat(data.unitCost) : parseFloat(material.unitCost);
      data.totalCost = parseFloat((qty * rate).toFixed(2));
    }

    await material.update(data);
    return material.reload();
  }

  async delete(id) {
    const material = await Material.findByPk(id);
    if (!material) return null;
    await material.destroy();
    return true;
  }
}

module.exports = new MaterialService();

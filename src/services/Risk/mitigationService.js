const { Op } = require('sequelize');
const { RiskMitigation, Risk, User } = require('../../models');

class MitigationService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      riskId,
      projectId,
      status,
      responsible,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (riskId) where.riskId = riskId;
    if (status) where.status = status;
    if (responsible) where.responsible = responsible;

    // Filter by projectId via join on Risk
    const includeRisk = {
      model: Risk,
      as: 'risk',
      attributes: ['id', 'title', 'projectId', 'severity', 'status']
    };
    if (projectId) {
      includeRisk.where = { projectId };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await RiskMitigation.findAndCountAll({
      where,
      include: [
        includeRisk,
        {
          model: User,
          as: 'responsibleUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
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
    const mitigation = await RiskMitigation.findByPk(id, {
      include: [
        {
          model: Risk,
          as: 'risk',
          attributes: ['id', 'title', 'projectId', 'severity', 'status']
        },
        {
          model: User,
          as: 'responsibleUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    return mitigation;
  }

  async create(data) {
    const mitigation = await RiskMitigation.create(data);
    return this.getById(mitigation.id);
  }

  async update(id, data) {
    const mitigation = await RiskMitigation.findByPk(id);
    if (!mitigation) return null;

    const updateData = { ...data };
    if (data.status === 'COMPLETED' && !mitigation.completedDate && !data.completedDate) {
      updateData.completedDate = new Date();
    }

    await mitigation.update(updateData);
    return this.getById(mitigation.id);
  }

  async delete(id) {
    const mitigation = await RiskMitigation.findByPk(id);
    if (!mitigation) return null;
    await mitigation.destroy();
    return true;
  }
}

module.exports = new MitigationService();

const { Op } = require('sequelize');
const { Communication, StakeholderEngagement, Stakeholder, User } = require('../../models');

class CommunicationService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      stakeholderId,
      projectId,
      type,
      status,
      direction,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (stakeholderId) where.stakeholderId = stakeholderId;
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (search) {
      where[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Communication.findAndCountAll({
      where,
      include: [
        { model: Stakeholder, as: 'stakeholder', attributes: ['id', 'name', 'email'] },
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
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

  async getCommunicationsByStakeholder(stakeholderId) {
    return Communication.findAll({
      where: { stakeholderId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async create(stakeholderId, data) {
    const stakeholder = await Stakeholder.findByPk(stakeholderId);
    if (!stakeholder) return null;

    const communication = await Communication.create({
      ...data,
      stakeholderId,
      projectId: data.projectId || stakeholder.projectId
    });

    return Communication.findByPk(communication.id, {
      include: [
        { model: Stakeholder, as: 'stakeholder', attributes: ['id', 'name', 'email'] },
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });
  }

  async update(id, data) {
    const comm = await Communication.findByPk(id);
    if (!comm) return null;
    await comm.update(data);
    return Communication.findByPk(id, {
      include: [
        { model: Stakeholder, as: 'stakeholder', attributes: ['id', 'name', 'email'] },
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });
  }

  async delete(id) {
    const comm = await Communication.findByPk(id);
    if (!comm) return null;
    await comm.destroy();
    return true;
  }

  async getEngagementHistory(stakeholderId) {
    return StakeholderEngagement.findAll({
      where: { stakeholderId },
      include: [
        {
          model: User,
          as: 'assessor',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['assessedDate', 'DESC']]
    });
  }

  async recordEngagement(stakeholderId, data) {
    const stakeholder = await Stakeholder.findByPk(stakeholderId);
    if (!stakeholder) return null;

    const engagement = await StakeholderEngagement.create({
      ...data,
      stakeholderId,
      projectId: data.projectId || stakeholder.projectId,
      assessedDate: data.assessedDate || new Date()
    });

    // Sync engagementLevel on the Stakeholder record if provided
    if (data.engagementLevel) {
      await stakeholder.update({ engagementLevel: data.engagementLevel });
    }

    return StakeholderEngagement.findByPk(engagement.id, {
      include: [
        {
          model: User,
          as: 'assessor',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });
  }

  async submitFeedback(stakeholderId, data) {
    const stakeholder = await Stakeholder.findByPk(stakeholderId);
    if (!stakeholder) return null;

    const engagement = await StakeholderEngagement.create({
      ...data,
      stakeholderId,
      projectId: data.projectId || stakeholder.projectId,
      assessedDate: data.assessedDate || new Date(),
      engagementLevel: data.engagementLevel || stakeholder.engagementLevel
    });

    return StakeholderEngagement.findByPk(engagement.id, {
      include: [
        {
          model: User,
          as: 'assessor',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });
  }
}

module.exports = new CommunicationService();

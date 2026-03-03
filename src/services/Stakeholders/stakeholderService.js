const { Op } = require('sequelize');
const { Stakeholder, Communication, StakeholderEngagement, Project, User } = require('../../models');

class StakeholderService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      type,
      influence,
      interest,
      status,
      engagementLevel,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (influence) where.influence = influence;
    if (interest) where.interest = interest;
    if (status) where.status = status;
    if (engagementLevel) where.engagementLevel = engagementLevel;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { organization: { [Op.like]: `%${search}%` } },
        { role: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Stakeholder.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
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

  async getById(id) {
    return Stakeholder.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: Communication,
          as: 'communications',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName', 'email'],
              required: false
            }
          ]
        },
        {
          model: StakeholderEngagement,
          as: 'engagements',
          include: [
            {
              model: User,
              as: 'assessor',
              attributes: ['id', 'firstName', 'lastName', 'email'],
              required: false
            }
          ]
        }
      ]
    });
  }

  async create(data) {
    const stakeholder = await Stakeholder.create(data);
    return this.getById(stakeholder.id);
  }

  async update(id, data) {
    const stakeholder = await Stakeholder.findByPk(id);
    if (!stakeholder) return null;
    await stakeholder.update(data);
    return this.getById(stakeholder.id);
  }

  async delete(id) {
    const stakeholder = await Stakeholder.findByPk(id);
    if (!stakeholder) return null;
    await stakeholder.destroy();
    return true;
  }

  // Influence/Interest matrix (3×3 grid: HIGH/MEDIUM/LOW × HIGH/MEDIUM/LOW)
  async getInfluenceMatrix(projectId) {
    const stakeholders = await Stakeholder.findAll({
      where: { projectId },
      attributes: ['id', 'name', 'role', 'organization', 'type', 'influence', 'interest', 'engagementLevel', 'status']
    });

    const levels = ['HIGH', 'MEDIUM', 'LOW'];
    const strategies = {
      HIGH_HIGH: 'Manage Closely — Keep fully engaged and make the greatest efforts to satisfy.',
      HIGH_MEDIUM: 'Keep Satisfied — Focus on keeping them satisfied without over-communication.',
      HIGH_LOW: 'Keep Satisfied — Address their concerns quickly.',
      MEDIUM_HIGH: 'Keep Informed — Provide regular updates and ensure no concerns emerge.',
      MEDIUM_MEDIUM: 'Monitor — Keep informed with minimal effort.',
      MEDIUM_LOW: 'Monitor — Observe, no specific actions needed.',
      LOW_HIGH: 'Keep Informed — Provide regular updates.',
      LOW_MEDIUM: 'Monitor — Low effort required.',
      LOW_LOW: 'Monitor — Minimal management needed.'
    };

    const matrix = {};
    levels.forEach(influence => {
      levels.forEach(interest => {
        const key = `${influence}_${interest}`;
        const cellStakeholders = stakeholders.filter(
          s => s.influence === influence && s.interest === interest
        );
        matrix[key] = {
          influence,
          interest,
          strategy: strategies[key],
          stakeholders: cellStakeholders,
          count: cellStakeholders.length
        };
      });
    });

    return { projectId, matrix, totalStakeholders: stakeholders.length };
  }

  // Summary analytics for a project
  async getSummary(projectId) {
    const stakeholders = await Stakeholder.findAll({
      where: { projectId },
      include: [
        { model: Communication, as: 'communications' },
        { model: StakeholderEngagement, as: 'engagements' }
      ]
    });

    const byType = {};
    const byInfluence = {};
    const byEngagementLevel = {};

    for (const s of stakeholders) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      byInfluence[s.influence] = (byInfluence[s.influence] || 0) + 1;
      byEngagementLevel[s.engagementLevel] = (byEngagementLevel[s.engagementLevel] || 0) + 1;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCommunications = await Communication.count({
      where: {
        projectId,
        sentDate: { [Op.gte]: thirtyDaysAgo }
      }
    });

    const stakeholdersWithNoRecentComms = stakeholders.filter(s => {
      const comms = s.communications || [];
      if (comms.length === 0) return true;
      const latestComm = comms.reduce((latest, c) => {
        const d = new Date(c.sentDate || c.createdAt);
        return d > latest ? d : latest;
      }, new Date(0));
      return latestComm < thirtyDaysAgo;
    });

    const allEngagements = stakeholders.flatMap(s => s.engagements || []);
    const satisfactionValues = allEngagements
      .filter(e => e.satisfaction !== null && e.satisfaction !== undefined)
      .map(e => parseFloat(e.satisfaction));
    const avgSatisfaction = satisfactionValues.length
      ? parseFloat((satisfactionValues.reduce((a, b) => a + b, 0) / satisfactionValues.length).toFixed(1))
      : null;

    return {
      projectId,
      totalStakeholders: stakeholders.length,
      byType,
      byInfluence,
      byEngagementLevel,
      recentCommunications,
      stakeholdersWithNoRecentComms: stakeholdersWithNoRecentComms.length,
      averageSatisfaction: avgSatisfaction
    };
  }
}

module.exports = new StakeholderService();

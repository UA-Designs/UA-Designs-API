const { Op } = require('sequelize');

const { TeamMember, SkillsMatrix, Project, User } = require('../../models');

class TeamService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const include = [
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }
    ];

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { '$user.firstName$': { [Op.like]: `%${search}%` } },
        { '$user.lastName$': { [Op.like]: `%${search}%` } },
        { '$user.email$': { [Op.like]: `%${search}%` } }
      ];
    }

    // LEFT JOIN — don't exclude external members who have no linked user account
    include[1].required = false;

    const result = await TeamMember.findAndCountAll({
      where,
      include,
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
    return TeamMember.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          required: false
        },
        {
          model: SkillsMatrix,
          as: 'skills'
        }
      ]
    });
  }

  async create(data) {
    return TeamMember.create(data);
  }

  async update(id, data) {
    const member = await TeamMember.findByPk(id);
    if (!member) return null;
    await member.update(data);
    return member.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'], required: false }
      ]
    });
  }

  async delete(id) {
    const member = await TeamMember.findByPk(id);
    if (!member) return null;
    await member.destroy();
    return true;
  }

  async getSkills(teamMemberId) {
    const member = await TeamMember.findByPk(teamMemberId);
    if (!member) return null;

    return SkillsMatrix.findAll({
      where: { teamMemberId },
      order: [['proficiencyLevel', 'DESC']]
    });
  }

  async addSkill(teamMemberId, data) {
    const member = await TeamMember.findByPk(teamMemberId);
    if (!member) return null;

    return SkillsMatrix.create({ ...data, teamMemberId });
  }
}

module.exports = new TeamService();

const { Op } = require('sequelize');
const { Risk, RiskMitigation, RiskCategory, Project, User, Task } = require('../../models');

class RiskService {
  // --- Scoring helpers ---

  calculateRiskScore(probability, impact) {
    const p = Math.min(Math.max(parseFloat(probability), 0), 1);
    const i = Math.min(Math.max(parseFloat(impact), 0), 1);
    return parseFloat((p * i).toFixed(4));
  }

  assignSeverity(score) {
    if (score <= 0.10) return 'LOW';
    if (score <= 0.30) return 'MEDIUM';
    if (score <= 0.60) return 'HIGH';
    return 'CRITICAL';
  }

  // --- CRUD ---

  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      status,
      severity,
      categoryId,
      owner,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (categoryId) where.categoryId = categoryId;
    if (owner) where.owner = owner;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Risk.findAndCountAll({
      where,
      include: [
        {
          model: RiskCategory,
          as: 'riskCategory',
          attributes: ['id', 'name', 'color']
        },
        {
          model: User,
          as: 'riskOwner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'identifier',
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
    const risk = await Risk.findByPk(id, {
      include: [
        {
          model: RiskMitigation,
          as: 'mitigations',
          include: [
            {
              model: User,
              as: 'responsibleUser',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: RiskCategory,
          as: 'riskCategory',
          attributes: ['id', 'name', 'color']
        },
        {
          model: User,
          as: 'riskOwner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'identifier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'escalatee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    return risk;
  }

  async create(data) {
    const riskScore = this.calculateRiskScore(data.probability, data.impact);
    const severity = data.severity || this.assignSeverity(riskScore);

    const risk = await Risk.create({
      ...data,
      riskScore,
      severity,
      identifiedDate: data.identifiedDate || new Date()
    });

    return this.getById(risk.id);
  }

  async update(id, data) {
    const risk = await Risk.findByPk(id);
    if (!risk) return null;

    const updateData = { ...data };

    // Recalculate score and severity if probability or impact changed
    const newProbability = data.probability !== undefined ? data.probability : risk.probability;
    const newImpact = data.impact !== undefined ? data.impact : risk.impact;

    if (data.probability !== undefined || data.impact !== undefined) {
      updateData.riskScore = this.calculateRiskScore(newProbability, newImpact);
      if (!data.severity) {
        updateData.severity = this.assignSeverity(updateData.riskScore);
      }
    }

    await risk.update(updateData);
    return this.getById(risk.id);
  }

  async delete(id) {
    const risk = await Risk.findByPk(id);
    if (!risk) return null;
    await risk.destroy();
    return true;
  }

  // --- Domain actions ---

  async updateStatus(id, status, userId) {
    const risk = await Risk.findByPk(id);
    if (!risk) return null;

    const updateData = { status };
    if (status === 'CLOSED') {
      updateData.closedDate = new Date();
    }

    await risk.update(updateData);
    return this.getById(risk.id);
  }

  async assess(id, { probability, impact }) {
    const risk = await Risk.findByPk(id);
    if (!risk) return null;

    const riskScore = this.calculateRiskScore(probability, impact);
    const severity = this.assignSeverity(riskScore);

    await risk.update({
      probability,
      impact,
      riskScore,
      severity,
      status: 'ANALYZED'
    });

    return this.getById(risk.id);
  }

  async escalate(id, { escalatedTo, notes }) {
    const risk = await Risk.findByPk(id);
    if (!risk) return null;

    await risk.update({
      status: 'ESCALATED',
      escalatedTo,
      escalatedDate: new Date(),
      notes: notes || risk.notes
    });

    return this.getById(risk.id);
  }

  // --- Analytics ---

  async getRiskMatrix(projectId) {
    const risks = await Risk.findAll({
      where: { projectId },
      attributes: ['id', 'title', 'probability', 'impact', 'riskScore', 'severity', 'status']
    });

    const probabilityBands = [
      { label: 'Very Low', min: 0, max: 0.2 },
      { label: 'Low', min: 0.2, max: 0.4 },
      { label: 'Medium', min: 0.4, max: 0.6 },
      { label: 'High', min: 0.6, max: 0.8 },
      { label: 'Very High', min: 0.8, max: 1.01 }
    ];

    const impactBands = [
      { label: 'Very Low', min: 0, max: 0.2 },
      { label: 'Low', min: 0.2, max: 0.4 },
      { label: 'Medium', min: 0.4, max: 0.6 },
      { label: 'High', min: 0.6, max: 0.8 },
      { label: 'Very High', min: 0.8, max: 1.01 }
    ];

    const matrix = probabilityBands.map(pBand => {
      return impactBands.map(iBand => {
        const cellRisks = risks.filter(r => {
          const p = parseFloat(r.probability);
          const i = parseFloat(r.impact);
          return p >= pBand.min && p < pBand.max && i >= iBand.min && i < iBand.max;
        });
        return {
          probabilityLabel: pBand.label,
          impactLabel: iBand.label,
          count: cellRisks.length,
          riskIds: cellRisks.map(r => r.id)
        };
      });
    });

    return {
      projectId,
      matrix,
      totalRisks: risks.length,
      probabilityBands: probabilityBands.map(b => b.label),
      impactBands: impactBands.map(b => b.label)
    };
  }

  async getMonitoringData(projectId) {
    const risks = await Risk.findAll({
      where: { projectId },
      include: [
        {
          model: RiskMitigation,
          as: 'mitigations',
          attributes: ['id', 'dueDate', 'status']
        }
      ]
    });

    const byStatus = {};
    const bySeverity = {};
    risks.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    });

    const topRisks = [...risks]
      .sort((a, b) => parseFloat(b.riskScore) - parseFloat(a.riskScore))
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        title: r.title,
        riskScore: r.riskScore,
        severity: r.severity,
        status: r.status
      }));

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nearingDueMitigations = [];
    risks.forEach(r => {
      r.mitigations.forEach(m => {
        if (m.dueDate && new Date(m.dueDate) <= thirtyDaysFromNow && m.status !== 'COMPLETED') {
          nearingDueMitigations.push({ riskId: r.id, riskTitle: r.title, mitigationId: m.id, dueDate: m.dueDate });
        }
      });
    });

    const recentlyEscalated = risks
      .filter(r => r.status === 'ESCALATED')
      .sort((a, b) => new Date(b.escalatedDate) - new Date(a.escalatedDate))
      .slice(0, 5)
      .map(r => ({ id: r.id, title: r.title, escalatedDate: r.escalatedDate }));

    const open = risks.filter(r => r.status !== 'CLOSED').length;
    const closed = risks.filter(r => r.status === 'CLOSED').length;

    return {
      projectId,
      summary: {
        total: risks.length,
        open,
        closed,
        openClosedRatio: closed > 0 ? (open / closed).toFixed(2) : null
      },
      byStatus,
      bySeverity,
      topRisks,
      nearingDueMitigations,
      recentlyEscalated
    };
  }

  async getRiskReport(projectId) {
    const risks = await Risk.findAll({
      where: { projectId },
      include: [
        {
          model: RiskMitigation,
          as: 'mitigations',
          attributes: ['id', 'strategy', 'status', 'effectiveness', 'cost']
        },
        {
          model: RiskCategory,
          as: 'riskCategory',
          attributes: ['id', 'name']
        }
      ]
    });

    const byCategory = {};
    risks.forEach(r => {
      const cat = r.riskCategory ? r.riskCategory.name : 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ id: r.id, title: r.title, riskScore: r.riskScore, severity: r.severity });
    });

    const totalMitigationCost = risks.reduce((sum, r) => {
      return sum + r.mitigations.reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
    }, 0);

    const criticalAndHigh = risks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      summary: {
        total: risks.length,
        critical: risks.filter(r => r.severity === 'CRITICAL').length,
        high: risks.filter(r => r.severity === 'HIGH').length,
        medium: risks.filter(r => r.severity === 'MEDIUM').length,
        low: risks.filter(r => r.severity === 'LOW').length,
        totalMitigationCost
      },
      byCategory,
      topPriorityRisks: criticalAndHigh
        .sort((a, b) => parseFloat(b.riskScore) - parseFloat(a.riskScore))
        .map(r => ({
          id: r.id,
          title: r.title,
          severity: r.severity,
          riskScore: r.riskScore,
          status: r.status,
          mitigationCount: r.mitigations.length
        }))
    };
  }
}

module.exports = new RiskService();

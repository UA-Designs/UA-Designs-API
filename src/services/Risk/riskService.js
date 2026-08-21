const { Op } = require('sequelize');
const { Risk, RiskMitigation, RiskCategory, Project, User, Task, sequelize } = require('../../models');

const AI_SUGGESTION_FIELDS = [
  'aiProbability',
  'aiImpact',
  'aiSeverity',
  'aiRiskScore',
  'aiConfidence',
  'aiModelVersion',
  'aiReasons',
  'aiGeneratedAt'
];

function stripAiSuggestionFields(data = {}) {
  const cleaned = { ...data };
  for (const field of AI_SUGGESTION_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

class RiskService {
  getRiskIncludes() {
    return [
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
        model: Task,
        as: 'linkedTasks',
        attributes: ['id', 'name', 'projectId', 'status', 'startDate', 'endDate', 'plannedStartDate', 'plannedEndDate'],
        through: { attributes: ['delayDays'] },
        required: false
      }
    ];
  }

  async validateLinkedTasks(projectId, linkedTaskIds, transaction) {
    if (!Array.isArray(linkedTaskIds)) return [];
    if (linkedTaskIds.length === 0) return [];

    const uniqueTaskIds = [...new Set(linkedTaskIds)];
    const tasks = await Task.findAll({
      where: {
        id: { [Op.in]: uniqueTaskIds }
      },
      attributes: ['id', 'projectId'],
      transaction
    });

    if (tasks.length !== uniqueTaskIds.length) {
      throw new Error('One or more linkedTaskIds do not exist');
    }

    const crossProjectTask = tasks.find(task => task.projectId !== projectId);
    if (crossProjectTask) {
      throw new Error('All linkedTaskIds must belong to the same project as the risk');
    }

    return tasks;
  }

  resolveDelayDays(risk) {
    const explicit = Number(risk.delayDays);
    if (Number.isFinite(explicit) && explicit >= 0) {
      return { delayDays: Math.trunc(explicit), derivedFromSeverity: false };
    }

    const severityFallback = {
      LOW: 1,
      MEDIUM: 3,
      HIGH: 7,
      CRITICAL: 14
    };
    const fallback = severityFallback[risk.severity] || 0;
    return { delayDays: fallback, derivedFromSeverity: true };
  }

  isScheduleRisk(risk) {
    const categoryName = (risk?.riskCategory?.name || '').toLowerCase();
    return categoryName.includes('schedule');
  }

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
      include: this.getRiskIncludes(),
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
          model: User,
          as: 'escalatee',
          attributes: ['id', 'firstName', 'lastName', 'email']
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
          model: Task,
          as: 'linkedTasks',
          attributes: ['id', 'name', 'projectId', 'status', 'startDate', 'endDate', 'plannedStartDate', 'plannedEndDate'],
          through: { attributes: ['delayDays'] },
          required: false
        }
      ]
    });
    return risk;
  }

  async create(data) {
    const riskScore = this.calculateRiskScore(data.probability, data.impact);
    const severity = data.severity || this.assignSeverity(riskScore);
    const linkedTaskIds = Array.isArray(data.linkedTaskIds) ? data.linkedTaskIds : undefined;
    const payload = stripAiSuggestionFields(data);
    delete payload.linkedTaskIds;

    if (payload.scheduleImpactDays === undefined) {
      payload.scheduleImpactDays = payload.delayDays !== undefined ? payload.delayDays : 0;
    }
    if (Number(payload.scheduleImpactDays) < 0) {
      throw new Error('scheduleImpactDays must be a non-negative number');
    }
    if (!payload.impactType) {
      payload.impactType = payload.scheduleImpactDays > 0 ? 'DELAY' : 'NONE';
    }

    const createdRisk = await sequelize.transaction(async (transaction) => {
      const linkedTasks = await this.validateLinkedTasks(payload.projectId, linkedTaskIds, transaction);
      const risk = await Risk.create({
        ...payload,
        riskScore,
        severity,
        identifiedDate: payload.identifiedDate || new Date()
      }, { transaction });

      if (linkedTasks.length > 0) {
        await risk.setLinkedTasks(linkedTasks, { transaction });
      }
      return risk;
    });

    return this.getById(createdRisk.id);
  }

  async update(id, data) {
    const risk = await Risk.findByPk(id);
    if (!risk) return null;

    const updateData = stripAiSuggestionFields(data);
    const linkedTaskIds = Object.prototype.hasOwnProperty.call(data, 'linkedTaskIds') ? data.linkedTaskIds : undefined;
    delete updateData.linkedTaskIds;

    // Recalculate score and severity if probability or impact changed
    const newProbability = data.probability !== undefined ? data.probability : risk.probability;
    const newImpact = data.impact !== undefined ? data.impact : risk.impact;

    if (data.probability !== undefined || data.impact !== undefined) {
      updateData.riskScore = this.calculateRiskScore(newProbability, newImpact);
      if (!data.severity) {
        updateData.severity = this.assignSeverity(updateData.riskScore);
      }
    }

    if (updateData.scheduleImpactDays === undefined && updateData.delayDays !== undefined) {
      updateData.scheduleImpactDays = updateData.delayDays;
    }
    if (updateData.scheduleImpactDays !== undefined && Number(updateData.scheduleImpactDays) < 0) {
      throw new Error('scheduleImpactDays must be a non-negative number');
    }
    if (updateData.scheduleImpactDays !== undefined && updateData.impactType === undefined) {
      updateData.impactType = updateData.scheduleImpactDays > 0 ? 'DELAY' : 'NONE';
    }

    await sequelize.transaction(async (transaction) => {
      if (linkedTaskIds !== undefined) {
        const linkedTasks = await this.validateLinkedTasks(risk.projectId, linkedTaskIds, transaction);
        await risk.setLinkedTasks(linkedTasks, { transaction });
      }
      await risk.update(updateData, { transaction });
    });
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

  async getScheduleImpact(projectId) {
    const [tasks, openRisks] = await Promise.all([
      Task.findAll({
        where: { projectId },
        attributes: ['id', 'name', 'plannedStartDate', 'plannedEndDate', 'startDate', 'endDate', 'actualEndDate'],
        include: [
          {
            model: Risk,
            as: 'linkedRisks',
            required: false,
            through: { attributes: [] },
            where: {
              projectId,
              status: { [Op.ne]: 'CLOSED' },
              impactType: 'DELAY'
            },
            attributes: ['id', 'title', 'status', 'scheduleImpactDays', 'delayDays']
          }
        ]
      }),
      Risk.findAll({
        where: {
          projectId,
          status: { [Op.ne]: 'CLOSED' }
        },
        include: [
          {
            model: RiskCategory,
            as: 'riskCategory',
            attributes: ['id', 'name']
          },
          {
            model: Task,
            as: 'linkedTasks',
            attributes: ['id'],
            through: { attributes: [] },
            required: false
          }
        ],
        attributes: ['id', 'title', 'status', 'scheduleImpactDays', 'delayDays', 'impactType']
      })
    ]);

    const includedRiskMap = new Map();
    let totalDelayDays = 0;

    let baselineFinishDate = null;
    let adjustedFinishDate = null;
    for (const task of tasks) {
      const baseEnd = task.plannedEndDate || task.endDate || task.actualEndDate;
      if (!baseEnd) continue;
      const baseDate = new Date(baseEnd);

      const taskRiskDelay = (task.linkedRisks || []).reduce((sum, risk) => {
        const delay = Number.isFinite(Number(risk.scheduleImpactDays))
          ? Number(risk.scheduleImpactDays)
          : Number(risk.delayDays) || 0;
        if (!includedRiskMap.has(risk.id)) {
          includedRiskMap.set(risk.id, {
            id: risk.id,
            title: risk.title,
            status: risk.status,
            delayDays: delay
          });
        }
        return sum + delay;
      }, 0);
      totalDelayDays += taskRiskDelay;

      const adjustedDate = new Date(baseDate);
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() + taskRiskDelay);

      const candidateDate = baseDate;
      if (!baselineFinishDate || candidateDate > baselineFinishDate) {
        baselineFinishDate = candidateDate;
      }
      if (!adjustedFinishDate || adjustedDate > adjustedFinishDate) {
        adjustedFinishDate = adjustedDate;
      }
    }

    // Backward-compatible fallback for existing schedule-category risks without task links.
    openRisks
      .filter((risk) => this.isScheduleRisk(risk) && (!risk.linkedTasks || risk.linkedTasks.length === 0))
      .forEach((risk) => {
        if (includedRiskMap.has(risk.id)) return;
        const delay = Number.isFinite(Number(risk.scheduleImpactDays))
          ? Number(risk.scheduleImpactDays)
          : Number(risk.delayDays) || 0;
        includedRiskMap.set(risk.id, {
          id: risk.id,
          title: risk.title,
          status: risk.status,
          delayDays: delay
        });
        totalDelayDays += delay;
        if (baselineFinishDate) {
          const fallbackAdjusted = new Date(baselineFinishDate);
          fallbackAdjusted.setUTCDate(fallbackAdjusted.getUTCDate() + delay);
          if (!adjustedFinishDate || fallbackAdjusted > adjustedFinishDate) {
            adjustedFinishDate = fallbackAdjusted;
          }
        }
      });

    const includedRisks = Array.from(includedRiskMap.values());
    return {
      projectId,
      baselineFinishDate: baselineFinishDate ? baselineFinishDate.toISOString() : null,
      adjustedFinishDate: adjustedFinishDate ? adjustedFinishDate.toISOString() : null,
      totalDelayDays,
      includedRiskCount: includedRisks.length,
      consideredOpenRisks: includedRisks.length,
      delayComputationStrategy: 'adjustedTaskEnd = originalEnd + sum(active linked risk scheduleImpactDays)',
      includedRisks
    };
  }
}

module.exports = new RiskService();

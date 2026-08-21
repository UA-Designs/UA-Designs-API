const { Risk, RiskMitigation, RiskCategory, Project, Task, sequelize } = require('../../models');
const { predictRisks } = require('./riskPredictor');

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

class AiRiskScoreService {
  async scoreProjectRisks(projectId) {
    const project = await Project.findByPk(projectId);
    if (!project) {
      const err = new Error('Project not found');
      err.code = 'PROJECT_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const risks = await Risk.findAll({
      where: { projectId },
      include: [
        {
          model: RiskMitigation,
          as: 'mitigations',
          required: false
        },
        {
          model: RiskCategory,
          as: 'riskCategory',
          attributes: ['id', 'name', 'color'],
          required: false
        },
        {
          model: Task,
          as: 'linkedTasks',
          attributes: ['id', 'name', 'projectId'],
          through: { attributes: ['delayDays'] },
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    const scored = await predictRisks(risks, { projectId });

    await sequelize.transaction(async (transaction) => {
      for (const item of scored) {
        const risk = risks.find((row) => row.id === item.riskId);
        if (!risk) continue;
        // Only write AI suggestion columns — official scoring fields stay untouched
        await risk.update(item.prediction, {
          transaction,
          fields: AI_SUGGESTION_FIELDS
        });
      }
    });

    return {
      projectId,
      mode: process.env.AI_RISK_MODE || 'stub',
      risks: scored.map((item) => ({
        riskId: item.riskId,
        aiProbability: item.prediction.aiProbability,
        aiImpact: item.prediction.aiImpact,
        aiSeverity: item.prediction.aiSeverity,
        aiRiskScore: item.prediction.aiRiskScore,
        aiConfidence: item.prediction.aiConfidence,
        aiModelVersion: item.prediction.aiModelVersion
      }))
    };
  }
}

module.exports = new AiRiskScoreService();
module.exports.AI_SUGGESTION_FIELDS = AI_SUGGESTION_FIELDS;

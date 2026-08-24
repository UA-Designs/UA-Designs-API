const { Op } = require('sequelize');
const {
  Project,
  Task,
  Budget,
  Expense,
  Cost,
  Labor,
  TeamMember,
  ResourceAllocation,
  ForecastSnapshot
} = require('../../models');

function plain(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
}

async function loadForecastInputs(projectId, asOfDate = new Date()) {
  const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  const project = await Project.findByPk(projectId);
  if (!project) return null;

  const [
    tasks,
    budgets,
    expenses,
    costs,
    labor,
    teamMembers,
    allocations,
    snapshots
  ] = await Promise.all([
    Task.findAll({ where: { projectId } }),
    Budget.findAll({ where: { projectId } }),
    Expense.findAll({
      where: {
        projectId,
        date: { [Op.lte]: asOf }
      },
      order: [['date', 'ASC']]
    }),
    Cost.findAll({ where: { projectId } }),
    Labor.findAll({ where: { projectId } }),
    TeamMember.findAll({ where: { projectId } }),
    ResourceAllocation.findAll({ where: { projectId } }),
    ForecastSnapshot.findAll({
      where: { projectId, forecastType: 'COMPOSITE' },
      order: [['forecastDate', 'ASC']],
      attributes: [
        'id',
        'forecastDate',
        'costForecastValue',
        'scheduleForecastDate',
        'progressForecastValue',
        'payload',
        'createdAt'
      ]
    })
  ]);

  return {
    project: plain(project),
    asOfDate: asOf,
    tasks: tasks.map(plain),
    budgets: budgets.map(plain),
    expenses: expenses.map(plain),
    costs: costs.map(plain),
    labor: labor.map(plain),
    teamMembers: teamMembers.map(plain),
    allocations: allocations.map(plain),
    snapshots: snapshots.map(plain)
  };
}

function cloneInputs(inputs) {
  const asOfDate = inputs.asOfDate instanceof Date ? new Date(inputs.asOfDate.getTime()) : new Date(inputs.asOfDate);
  return {
    ...JSON.parse(JSON.stringify({
      project: inputs.project,
      tasks: inputs.tasks,
      budgets: inputs.budgets,
      expenses: inputs.expenses,
      costs: inputs.costs,
      labor: inputs.labor,
      teamMembers: inputs.teamMembers,
      allocations: inputs.allocations,
      snapshots: inputs.snapshots
    })),
    asOfDate
  };
}

module.exports = {
  loadForecastInputs,
  cloneInputs
};

const { Task, Risk, Budget, Expense, ResourceAllocation } = require('../../models');
const { Op } = require('sequelize');
const { formatDate, jsonNumber, truncateText, startOfUtcDay } = require('./aiUtils');

const OVERVIEW_TASK_LIMIT = 8;

function serializeTaskSummary(task) {
  return {
    id: task.id,
    name: task.name,
    status: task.status,
    progress: jsonNumber(task.progress, 1),
    startDate: formatDate(task.startDate || task.plannedStartDate),
    endDate: formatDate(task.endDate || task.plannedEndDate),
    isCritical: Boolean(task.isCritical)
  };
}

class ProjectContextService {
  async getContext(project) {
    const today = startOfUtcDay();

    const [
      taskCount,
      completedCount,
      overdueCount,
      criticalCount,
      recentTasks,
      riskCount,
      openRiskCount,
      budgetAgg,
      expenseAgg,
      allocationCount
    ] = await Promise.all([
      Task.count({ where: { projectId: project.id } }),
      Task.count({ where: { projectId: project.id, status: 'COMPLETED' } }),
      Task.count({
        where: {
          projectId: project.id,
          status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
          [Op.or]: [
            { plannedEndDate: { [Op.lt]: today } },
            {
              plannedEndDate: null,
              endDate: { [Op.lt]: today }
            }
          ]
        }
      }),
      Task.count({ where: { projectId: project.id, isCritical: true } }),
      Task.findAll({
        where: { projectId: project.id },
        attributes: ['id', 'name', 'status', 'progress', 'startDate', 'endDate', 'plannedStartDate', 'plannedEndDate', 'isCritical'],
        order: [['updatedAt', 'DESC']],
        limit: OVERVIEW_TASK_LIMIT
      }),
      Risk.count({ where: { projectId: project.id } }),
      Risk.count({
        where: {
          projectId: project.id,
          status: { [Op.ne]: 'CLOSED' }
        }
      }),
      Budget.sum('amount', { where: { projectId: project.id } }),
      Expense.sum('amount', { where: { projectId: project.id } }),
      ResourceAllocation.count({ where: { projectId: project.id } })
    ]);

    const context = {
      project: {
        id: project.id,
        name: project.name,
        description: truncateText(project.description, 500),
        status: project.status,
        progress: jsonNumber(project.progress, 0) || 0,
        priority: project.priority,
        projectType: project.projectType,
        location: project.location || null,
        startDate: formatDate(project.startDate),
        targetEndDate: formatDate(project.endDate),
        clientName: project.clientName || null
      },
      today: formatDate(today),
      snapshot: {
        taskCount,
        completedTaskCount: completedCount,
        overdueTaskCount: overdueCount,
        criticalTaskCount: criticalCount,
        recentTasks: recentTasks.map(serializeTaskSummary),
        riskCount,
        openRiskCount,
        budgetTotal: jsonNumber(budgetAgg, 2),
        expenseTotal: jsonNumber(expenseAgg, 2),
        resourceAllocationCount: allocationCount
      },
      note: 'This is a compact snapshot. Call tools for authoritative task, cost, risk, resource, schedule, or forecast details. Do not assume omitted records do not exist. Do not calculate CPI, SPI, EAC, ETC, VAC, or forecast dates yourself.'
    };

    return this.attachForecast(context, project);
  }

  async attachForecast(context, project) {
    try {
      const forecastService = require('../Forecast/forecastService');
      context.forecast = await forecastService.getCompactSummary(project.id);
    } catch (error) {
      context.forecast = {
        available: false,
        message: 'Forecast engine could not produce a summary for this project.',
        error: error.message
      };
    }
    return context;
  }
}

module.exports = new ProjectContextService();

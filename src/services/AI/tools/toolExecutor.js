const { Op } = require('sequelize');
const {
  Task,
  User,
  Material,
  Labor,
  Equipment,
  Project
} = require('../../../models');
const taskService = require('../../Schedule/taskService');
const riskService = require('../../Risk/riskService');
const { EarnedValueService, CostAnalysisService } = require('../../Cost');
const teamService = require('../../Resources/teamService');
const allocationService = require('../../Resources/allocationService');
const scheduleImpactService = require('../scheduleImpactService');
const aiScheduleService = require('../aiScheduleService');
const forecastService = require('../../Forecast/forecastService');
const { ALLOWED_TOOL_NAMES } = require('./toolDefinitions');
const { formatDate, jsonNumber, truncateText, isUuid, startOfUtcDay, todayIso, addIsoDays, laterIsoDate, isoDaySpan } = require('../aiUtils');
const { badRequest, notFound } = require('../aiErrors');
const {
  canManageTasks,
  canProposeWrites,
  canScoreRisks,
  canApplySchedule
} = require('../projectAccess');

const TASK_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const RISK_STATUSES = ['IDENTIFIED', 'ANALYZED', 'MITIGATING', 'MONITORING', 'CLOSED', 'ESCALATED'];

function invalidParams(message) {
  return badRequest(message, 'INVALID_TOOL_PARAMS');
}

function requireUuid(value, field) {
  if (!isUuid(value)) throw invalidParams(`${field} must be a valid UUID`);
  return value;
}

function optionalEnum(value, allowed, field) {
  if (value == null || value === '') return undefined;
  const normalized = String(value).toUpperCase();
  if (!allowed.includes(normalized)) {
    throw invalidParams(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function serializeTask(task) {
  const json = typeof task.toJSON === 'function' ? task.toJSON() : task;
  return {
    id: json.id,
    name: json.name,
    description: truncateText(json.description, 400),
    status: json.status,
    priority: json.priority,
    progress: jsonNumber(json.progress, 1),
    startDate: formatDate(json.startDate),
    endDate: formatDate(json.endDate),
    plannedStartDate: formatDate(json.plannedStartDate),
    plannedEndDate: formatDate(json.plannedEndDate),
    baselineStartDate: formatDate(json.baselineStartDate),
    baselineEndDate: formatDate(json.baselineEndDate),
    duration: json.duration,
    isCritical: Boolean(json.isCritical),
    assignedTo: json.assignedTo || null,
    assignedUser: json.assignedUser
      ? {
        id: json.assignedUser.id,
        name: `${json.assignedUser.firstName || ''} ${json.assignedUser.lastName || ''}`.trim()
      }
      : null
  };
}

async function assertTaskInProject(taskId, projectId) {
  requireUuid(taskId, 'taskId');
  const task = await Task.findByPk(taskId, {
    include: [{
      model: User,
      as: 'assignedUser',
      attributes: ['id', 'firstName', 'lastName']
    }]
  });
  if (!task || String(task.projectId) !== String(projectId)) {
    throw notFound('Task not found in this project', 'TASK_NOT_FOUND');
  }
  return task;
}

async function getProject(ctx) {
  const project = ctx.project;
  return {
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
    clientName: project.clientName || null,
    projectManagerId: project.projectManagerId || null
  };
}

async function getProjectStatus(ctx) {
  const project = await getProject(ctx);
  return {
    status: project.status,
    progress: project.progress,
    startDate: project.startDate,
    targetEndDate: project.targetEndDate,
    isOverdue: Boolean(project.targetEndDate && project.targetEndDate < formatDate(new Date()) && project.status !== 'completed')
  };
}

async function getProjectProgress(ctx) {
  const [total, completed, inProgress] = await Promise.all([
    Task.count({ where: { projectId: ctx.project.id } }),
    Task.count({ where: { projectId: ctx.project.id, status: 'COMPLETED' } }),
    Task.count({ where: { projectId: ctx.project.id, status: 'IN_PROGRESS' } })
  ]);
  return {
    projectProgress: jsonNumber(ctx.project.progress, 0) || 0,
    totalTasks: total,
    completedTasks: completed,
    inProgressTasks: inProgress,
    percentTasksComplete: total === 0 ? 0 : jsonNumber((completed / total) * 100, 1)
  };
}

async function getTasks(ctx, args) {
  const status = optionalEnum(args.status, TASK_STATUSES, 'status');
  const limit = Math.min(50, Math.max(1, parseInt(args.limit, 10) || 25));
  const where = { projectId: ctx.project.id };
  if (status) where.status = status;
  if (typeof args.isCritical === 'boolean') where.isCritical = args.isCritical;

  const tasks = await Task.findAll({
    where,
    include: [{
      model: User,
      as: 'assignedUser',
      attributes: ['id', 'firstName', 'lastName']
    }],
    order: [['plannedStartDate', 'ASC'], ['startDate', 'ASC']],
    limit
  });

  return {
    count: tasks.length,
    limit,
    tasks: tasks.map(serializeTask)
  };
}

async function getOverdueTasks(ctx) {
  const today = startOfUtcDay();
  const tasks = await Task.findAll({
    where: {
      projectId: ctx.project.id,
      status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
      [Op.or]: [
        { plannedEndDate: { [Op.lt]: today } },
        { plannedEndDate: null, endDate: { [Op.lt]: today } }
      ]
    },
    include: [{
      model: User,
      as: 'assignedUser',
      attributes: ['id', 'firstName', 'lastName']
    }],
    order: [['plannedEndDate', 'ASC'], ['endDate', 'ASC']],
    limit: 40
  });

  return {
    asOfDate: formatDate(today),
    count: tasks.length,
    tasks: tasks.map(serializeTask)
  };
}

async function getTask(ctx, args) {
  const task = await assertTaskInProject(args.taskId, ctx.project.id);
  return serializeTask(task);
}

async function getProjectSchedule(ctx) {
  const cpm = await taskService.calculateCriticalPath(ctx.project.id);
  const analysis = cpm && typeof cpm.analysis === 'object' ? cpm.analysis : {
    totalTasks: 0,
    criticalTasksCount: 0,
    projectDuration: 0
  };
  const forecast = (cpm && cpm.forecast) || {};
  const delayedTasks = Array.isArray(cpm && cpm.delayedTasks) ? cpm.delayedTasks : [];
  const criticalPath = Array.isArray(cpm && cpm.criticalPath) ? cpm.criticalPath : [];

  return {
    source: 'taskService.calculateCriticalPath',
    totalTasks: analysis.totalTasks,
    criticalPath: {
      taskCount: analysis.criticalTasksCount || criticalPath.length,
      durationDays: jsonNumber(analysis.projectDuration || cpm.totalDuration, 0),
      tasks: criticalPath.slice(0, 12).map((task) => ({
        id: task.id,
        name: task.name,
        totalFloat: jsonNumber(task.totalFloat, 0),
        plannedEndDate: formatDate(task.plannedEndDate || task.endDate)
      }))
    },
    finishDates: {
      baselineFinishDate: formatDate(forecast.baselineFinishDate),
      riskAdjustedFinishDate: formatDate(forecast.riskAdjustedFinishDate),
      totalProjectRiskDelayDays: jsonNumber(forecast.totalProjectRiskDelayDays, 0) || 0
    },
    delayedTaskCount: delayedTasks.length,
    delayedTasks: delayedTasks.slice(0, 12).map((task) => ({
      id: task.id,
      name: task.name,
      status: task.status || null,
      plannedEndDate: formatDate(task.plannedEndDate),
      delay: jsonNumber(task.delay, 0)
    }))
  };
}

async function getTaskDependencies(ctx, args) {
  await assertTaskInProject(args.taskId, ctx.project.id);
  return taskService.getTaskDependencies(args.taskId);
}

async function getProjectResources(ctx) {
  const projectId = ctx.project.id;
  const [team, allocations, materialCount, laborCount, equipmentCount] = await Promise.all([
    teamService.getAll({ projectId, limit: 25 }),
    allocationService.getAll({ projectId, limit: 25 }),
    Material.count({ where: { projectId } }),
    Labor.count({ where: { projectId } }),
    Equipment.count({ where: { projectId } })
  ]);

  return {
    teamCount: team.total || (team.items ? team.items.length : 0),
    team: (team.items || []).slice(0, 20).map((member) => ({
      id: member.id,
      name: member.name || (member.user ? `${member.user.firstName} ${member.user.lastName}` : null),
      role: member.role,
      status: member.status,
      allocation: member.allocation
    })),
    allocationCount: allocations.total || 0,
    allocations: (allocations.items || []).slice(0, 20).map((item) => ({
      id: item.id,
      resourceType: item.resourceType,
      status: item.status,
      taskId: item.taskId,
      startDate: formatDate(item.startDate),
      endDate: formatDate(item.endDate)
    })),
    materialCount,
    laborCount,
    equipmentCount
  };
}

async function getProjectRisks(ctx) {
  const [report, scheduleImpact] = await Promise.all([
    riskService.getRiskReport(ctx.project.id),
    riskService.getScheduleImpact(ctx.project.id)
  ]);

  return {
    source: 'riskService.getRiskReport + riskService.getScheduleImpact',
    summary: report.summary,
    topPriorityRisks: (report.topPriorityRisks || []).slice(0, 10),
    scheduleImpact: {
      baselineFinishDate: formatDate(scheduleImpact.baselineFinishDate),
      adjustedFinishDate: formatDate(scheduleImpact.adjustedFinishDate),
      totalDelayDays: jsonNumber(scheduleImpact.totalDelayDays, 0) || 0,
      includedRiskCount: scheduleImpact.includedRiskCount
    }
  };
}

async function getProjectBudget(ctx) {
  const [evm, forecast] = await Promise.all([
    EarnedValueService.calculateEVM(ctx.project.id),
    CostAnalysisService.forecastCosts(ctx.project.id)
  ]);

  return {
    source: 'EarnedValueService.calculateEVM + CostAnalysisService.forecastCosts',
    asOfDate: formatDate(evm.asOfDate),
    baseMetrics: {
      BAC: jsonNumber(evm.baseMetrics.BAC, 2),
      PV: jsonNumber(evm.baseMetrics.PV, 2),
      EV: jsonNumber(evm.baseMetrics.EV, 2),
      AC: jsonNumber(evm.baseMetrics.AC, 2)
    },
    variances: {
      CV: jsonNumber(evm.variances.CV, 2),
      SV: jsonNumber(evm.variances.SV, 2)
    },
    indices: {
      CPI: jsonNumber(evm.indices.CPI, 3),
      SPI: jsonNumber(evm.indices.SPI, 3)
    },
    forecasts: {
      EAC: jsonNumber(evm.forecasts.EAC, 2),
      VAC: jsonNumber(evm.forecasts.VAC, 2)
    },
    progress: {
      percentComplete: jsonNumber(evm.progress.percentComplete, 2),
      percentSpent: jsonNumber(evm.progress.percentSpent, 2)
    },
    status: evm.status,
    burnRateForecast: {
      budget: jsonNumber(forecast.budget, 2),
      spent: jsonNumber(forecast.spent, 2),
      remaining: jsonNumber(forecast.remaining, 2),
      forecastedTotalCost: jsonNumber(forecast.forecast && forecast.forecast.forecastedTotalCost, 2),
      willExceedBudget: forecast.forecast ? forecast.forecast.willExceedBudget : null
    },
    note: 'For the official deterministic forecast used by the dashboard and AI explanations, call get_project_forecast instead of recalculating these metrics.'
  };
}

async function getProjectForecast(ctx) {
  return forecastService.getCompactSummary(ctx.project.id);
}

async function getForecastHistory(ctx) {
  const history = await forecastService.getHistory(ctx.project.id);
  return {
    source: 'ForecastService.getHistory',
    count: history.count,
    snapshots: (history.snapshots || []).map((item) => ({
      id: item.id,
      forecastDate: formatDate(item.forecastDate),
      costForecastValue: jsonNumber(item.costForecastValue, 2),
      scheduleForecastDate: item.scheduleForecastDate || null,
      progressForecastValue: jsonNumber(item.progressForecastValue, 2),
      status: item.status,
      methodology: item.methodology
    })),
    costTrend: history.costTrend
  };
}

async function getAtRiskProjects() {
  const projects = await Project.findAll({
    where: { status: { [Op.in]: ['planning', 'active', 'on_hold'] } },
    attributes: ['id', 'name', 'status'],
    limit: 50,
    order: [['updatedAt', 'DESC']]
  });
  const atRisk = [];
  for (const project of projects) {
    const forecast = await forecastService.getCompactSummary(project.id);
    if (!forecast) continue;
    if (forecast.overallStatus !== 'AT_RISK' && !(forecast.alerts || []).some((item) => item.severity === 'HIGH')) {
      continue;
    }
    atRisk.push({
      projectId: project.id,
      name: project.name,
      status: project.status,
      overallStatus: forecast.overallStatus,
      alerts: (forecast.alerts || []).map((item) => ({
        type: item.type,
        severity: item.severity,
        title: item.title
      }))
    });
  }
  return {
    source: 'ForecastService',
    count: atRisk.length,
    projects: atRisk
  };
}

async function runWhatIfForecast(ctx, args) {
  const result = await forecastService.runScenario(ctx.project.id, args);
  if (result && result.error === 'UNKNOWN_SCENARIO') {
    throw invalidParams(result.message);
  }
  return {
    source: 'ForecastService.runScenario (in-memory; official records unchanged)',
    resultKind: 'SCENARIO / WHAT-IF',
    officialRecordsUnchanged: true,
    scenarioType: result.scenarioType,
    applied: result.applied,
    error: result.error || null,
    message: result.message || null,
    baseline: result.baseline ? {
      overallStatus: result.baseline.overallStatus,
      estimateAtCompletion: jsonNumber(result.baseline.costForecast.estimateAtCompletion, 2),
      forecastCompletionDate: result.baseline.scheduleForecast.forecastCompletionDate,
      delayDays: result.baseline.scheduleForecast.delayDays
    } : null,
    scenario: result.scenario ? {
      overallStatus: result.scenario.overallStatus,
      estimateAtCompletion: jsonNumber(result.scenario.costForecast.estimateAtCompletion, 2),
      forecastCompletionDate: result.scenario.scheduleForecast.forecastCompletionDate,
      delayDays: result.scenario.scheduleForecast.delayDays,
      additionalWorkersNeeded: result.scenario.resourceForecast.additionalWorkersNeeded
    } : null
  };
}

async function analyzeScheduleImpact(ctx, args) {
  requireUuid(args.taskId, 'taskId');
  return scheduleImpactService.analyze({
    projectId: ctx.project.id,
    taskId: args.taskId,
    delayDays: args.delayDays
  });
}

async function proposeSchedule(ctx, args) {
  if (!aiScheduleService.canPropose(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Proposing a schedule requires Engineer or above. Official dates were not changed.' };
  }
  const proposed = await aiScheduleService.propose({
    projectId: ctx.project.id,
    startDate: args.startDate,
    user: ctx.user
  });
  return {
    proposed: true,
    officialDatesUnchanged: true,
    source: 'aiScheduleService.propose (CPM suggestion columns only)',
    anchorStartDate: proposed.anchorStartDate,
    suggestedFinishDate: proposed.suggestedFinishDate,
    taskCount: proposed.taskCount,
    criticalTaskCount: proposed.criticalTaskCount,
    formula: proposed.formula,
    tasks: (proposed.tasks || []).slice(0, 12)
  };
}

async function proposeApplySchedule(ctx, args) {
  if (!canApplySchedule(ctx.user)) {
    return {
      error: true,
      code: 'FORBIDDEN',
      applied: false,
      message: 'Applying suggested schedule dates requires Manager or above. Official dates were not changed.'
    };
  }
  const { reason, parameters } = stripReason(args);
  return proposalPayload('APPLY_SCHEDULE', parameters, reason || 'Apply stored CPM suggested dates to official start/end fields.');
}

function proposalPayload(type, parameters, reason) {
  return {
    proposal: true,
    type,
    status: 'PENDING_APPROVAL',
    parameters,
    reason: reason || null,
    message: 'This action was recorded as a recommendation. Official data is unchanged until a user approves it.'
  };
}

function stripReason(args) {
  const { reason, ...rest } = args || {};
  return { reason, parameters: rest };
}

function recommendedCreateTaskFields(project, args) {
  const today = todayIso();
  const startDate = laterIsoDate(args.startDate || formatDate(project && project.startDate), today);
  let duration = Number(args.duration);
  if (!Number.isFinite(duration) || duration < 1) duration = 5;
  let endDate = args.endDate ? laterIsoDate(args.endDate, today) : null;
  if (endDate && endDate <= startDate) endDate = null;
  if (!endDate) endDate = addIsoDays(startDate, duration);
  else duration = isoDaySpan(startDate, endDate);
  return {
    description: args.description || null,
    startDate,
    endDate,
    duration,
    priority: args.priority || 'MEDIUM'
  };
}

async function proposeCreateTask(ctx, args) {
  if (!canManageTasks(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Creating a task requires Manager or above.' };
  }
  const name = String(args.name || '').trim();
  if (!name) throw invalidParams('name is required');
  if (args.assignedTo) requireUuid(args.assignedTo, 'assignedTo');
  if (args.parentTaskId) await assertTaskInProject(args.parentTaskId, ctx.project.id);
  optionalEnum(args.priority, TASK_PRIORITIES, 'priority');
  const { reason, parameters } = stripReason(args);
  return proposalPayload(
    'CREATE_TASK',
    {
      ...parameters,
      ...recommendedCreateTaskFields(ctx.project, parameters),
      projectId: ctx.project.id,
      name
    },
    reason || `Recommended task for ${ctx.project.name || 'this project'}.`
  );
}

async function proposeUpdateTask(ctx, args) {
  if (!canProposeWrites(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Updating a task requires Engineer or above.' };
  }
  await assertTaskInProject(args.taskId, ctx.project.id);
  optionalEnum(args.status, TASK_STATUSES, 'status');
  optionalEnum(args.priority, TASK_PRIORITIES, 'priority');
  const { reason, parameters } = stripReason(args);
  return proposalPayload('UPDATE_TASK', parameters, reason);
}

async function proposeAssignTask(ctx, args) {
  if (!canProposeWrites(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Assigning a task requires Engineer or above.' };
  }
  await assertTaskInProject(args.taskId, ctx.project.id);
  const assignedTo = args.assignedTo || (ctx.user && ctx.user.id);
  requireUuid(assignedTo, 'assignedTo');
  const assignee = await User.findByPk(assignedTo);
  if (!assignee) throw notFound('Assigned user not found', 'USER_NOT_FOUND');
  const { reason } = stripReason(args);
  return proposalPayload(
    'ASSIGN_TASK',
    { taskId: args.taskId, assignedTo },
    reason || 'Assign to the current user.'
  );
}

async function proposeRescheduleTask(ctx, args) {
  if (!canProposeWrites(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Rescheduling a task requires Engineer or above.' };
  }
  await assertTaskInProject(args.taskId, ctx.project.id);
  if (!args.startDate && !args.endDate) {
    throw invalidParams('startDate or endDate is required');
  }
  const { reason, parameters } = stripReason(args);
  return proposalPayload('RESCHEDULE_TASK', parameters, reason);
}

async function proposeCreateRisk(ctx, args) {
  if (!canScoreRisks(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Creating a risk requires Engineer or above.' };
  }
  const title = String(args.title || '').trim();
  if (!title) throw invalidParams('title is required');
  const { reason, parameters } = stripReason(args);
  return proposalPayload('CREATE_RISK', { ...parameters, projectId: ctx.project.id, title }, reason);
}

async function proposeUpdateRisk(ctx, args) {
  if (!canScoreRisks(ctx.user)) {
    return { error: true, code: 'FORBIDDEN', message: 'Updating a risk requires Engineer or above.' };
  }
  requireUuid(args.riskId, 'riskId');
  const existing = await riskService.getById(args.riskId);
  if (!existing || String(existing.projectId) !== String(ctx.project.id)) {
    throw notFound('Risk not found in this project', 'RISK_NOT_FOUND');
  }
  optionalEnum(args.status, RISK_STATUSES, 'status');
  const { reason, parameters } = stripReason(args);
  return proposalPayload('UPDATE_RISK', parameters, reason);
}

const HANDLERS = {
  get_project: getProject,
  get_project_status: getProjectStatus,
  get_project_progress: getProjectProgress,
  get_tasks: getTasks,
  get_overdue_tasks: getOverdueTasks,
  get_task: getTask,
  get_project_schedule: getProjectSchedule,
  get_task_dependencies: getTaskDependencies,
  get_project_resources: getProjectResources,
  get_project_risks: getProjectRisks,
  get_project_budget: getProjectBudget,
  get_project_forecast: getProjectForecast,
  get_forecast_history: getForecastHistory,
  get_at_risk_projects: getAtRiskProjects,
  run_what_if_forecast: runWhatIfForecast,
  analyze_schedule_impact: analyzeScheduleImpact,
  propose_schedule: proposeSchedule,
  apply_suggested_schedule: proposeApplySchedule,
  create_task: proposeCreateTask,
  update_task: proposeUpdateTask,
  assign_task: proposeAssignTask,
  reschedule_task: proposeRescheduleTask,
  create_risk: proposeCreateRisk,
  update_risk: proposeUpdateRisk
};

async function executeTool(call, ctx) {
  const name = call && call.name;
  if (!name || !ALLOWED_TOOL_NAMES.has(name) || !HANDLERS[name]) {
    return {
      error: true,
      code: 'UNKNOWN_TOOL',
      message: `Tool "${name || 'unknown'}" is not available.`
    };
  }

  const args = (call.arguments && typeof call.arguments === 'object') ? { ...call.arguments } : {};
  delete args.projectId;

  try {
    const data = await HANDLERS[name](ctx, args);
    if (data && data.error) {
      return {
        error: true,
        code: data.code || 'TOOL_ERROR',
        message: data.message || 'Tool execution failed',
        data
      };
    }
    return { ok: true, tool: name, data };
  } catch (err) {
    return {
      error: true,
      code: err.code || 'TOOL_ERROR',
      message: err.message || 'Tool execution failed'
    };
  }
}

module.exports = {
  executeTool,
  HANDLERS
};

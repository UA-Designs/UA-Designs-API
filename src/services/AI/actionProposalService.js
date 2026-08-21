const { Task, User } = require('../../models');
const { AIActionProposal } = require('../../models');
const taskService = require('../Schedule/taskService');
const riskService = require('../Risk/riskService');
const aiScheduleService = require('./aiScheduleService');
const { forbidden, notFound, badRequest } = require('./aiErrors');
const { isUuid, formatDate } = require('./aiUtils');
const { canManageTasks, canProposeWrites, canScoreRisks, isAdmin } = require('./projectAccess');

const WRITE_TYPES = new Set([
  'CREATE_TASK',
  'UPDATE_TASK',
  'ASSIGN_TASK',
  'RESCHEDULE_TASK',
  'CREATE_RISK',
  'UPDATE_RISK',
  'APPLY_SCHEDULE'
]);

function serializeProposal(proposal) {
  return {
    id: proposal.id,
    type: proposal.type,
    status: proposal.status,
    parameters: proposal.parameters || {},
    reason: proposal.reason || null,
    result: proposal.result || null,
    conversationId: proposal.conversationId,
    projectId: proposal.projectId,
    createdAt: proposal.createdAt,
    decidedAt: proposal.decidedAt || null
  };
}

function canDecide(user, proposal) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (String(proposal.userId) === String(user.id)) return true;
  return canManageTasks(user);
}

class ActionProposalService {
  async createFromToolResults({ conversationId, projectId, userId, toolInvocations }) {
    const created = [];
    const invocations = Array.isArray(toolInvocations) ? toolInvocations : [];

    for (const invocation of invocations) {
      const data = invocation && invocation.result && invocation.result.data;
      if (!data || data.proposal !== true) continue;
      if (!WRITE_TYPES.has(data.type)) continue;

      const proposal = await AIActionProposal.create({
        conversationId,
        projectId,
        userId,
        type: data.type,
        status: 'PENDING_APPROVAL',
        parameters: data.parameters || {},
        reason: data.reason || null
      });
      created.push(serializeProposal(proposal));
    }

    return created;
  }

  async getById(id) {
    if (!isUuid(id)) throw badRequest('Invalid action id', 'INVALID_ACTION');
    const proposal = await AIActionProposal.findByPk(id);
    if (!proposal) throw notFound('Action proposal not found', 'ACTION_NOT_FOUND');
    return proposal;
  }

  async reject({ id, user, project }) {
    const proposal = await this.getById(id);
    if (String(proposal.projectId) !== String(project.id)) {
      throw notFound('Action proposal not found', 'ACTION_NOT_FOUND');
    }
    if (!canDecide(user, proposal)) {
      throw forbidden('You cannot reject this action');
    }
    if (proposal.status !== 'PENDING_APPROVAL') {
      throw badRequest('This action is no longer pending approval', 'ACTION_NOT_PENDING');
    }

    await proposal.update({
      status: 'REJECTED',
      decidedBy: user.id,
      decidedAt: new Date()
    });
    return serializeProposal(proposal);
  }

  async approve({ id, user, project }) {
    const proposal = await this.getById(id);
    if (String(proposal.projectId) !== String(project.id)) {
      throw notFound('Action proposal not found', 'ACTION_NOT_FOUND');
    }
    if (!canDecide(user, proposal)) {
      throw forbidden('You cannot approve this action');
    }
    if (proposal.status !== 'PENDING_APPROVAL') {
      throw badRequest('This action is no longer pending approval', 'ACTION_NOT_PENDING');
    }

    try {
      const result = await this.execute(proposal, user, project);
      await proposal.update({
        status: 'EXECUTED',
        result,
        decidedBy: user.id,
        decidedAt: new Date()
      });
      return serializeProposal(await proposal.reload());
    } catch (err) {
      await proposal.update({
        status: 'FAILED',
        result: { error: err.message, code: err.code || 'EXECUTE_FAILED' },
        decidedBy: user.id,
        decidedAt: new Date()
      });
      throw err;
    }
  }

  async execute(proposal, user, project) {
    const params = proposal.parameters || {};
    switch (proposal.type) {
      case 'CREATE_TASK':
        return this.executeCreateTask(params, user, project);
      case 'UPDATE_TASK':
        return this.executeUpdateTask(params, user, project);
      case 'ASSIGN_TASK':
        return this.executeAssignTask(params, user, project);
      case 'RESCHEDULE_TASK':
        return this.executeRescheduleTask(params, user, project);
      case 'CREATE_RISK':
        return this.executeCreateRisk(params, user, project);
      case 'UPDATE_RISK':
        return this.executeUpdateRisk(params, user, project);
      case 'APPLY_SCHEDULE':
        return this.executeApplySchedule(params, user, project);
      default:
        throw badRequest(`Unsupported action type ${proposal.type}`, 'UNSUPPORTED_ACTION');
    }
  }

  async executeCreateTask(params, user, project) {
    if (!canManageTasks(user)) {
      throw forbidden('Creating a task requires Manager or above.');
    }
    const name = String(params.name || '').trim();
    if (!name) throw badRequest('Task name is required');

    if (params.assignedTo) {
      const assignedUser = await User.findByPk(params.assignedTo);
      if (!assignedUser) throw badRequest('Assigned user not found');
    }

    let duration = params.duration;
    if (!duration && params.startDate && params.endDate) {
      duration = Math.ceil((new Date(params.endDate) - new Date(params.startDate)) / (1000 * 60 * 60 * 24));
    }

    const task = await Task.create({
      name,
      description: params.description || null,
      startDate: params.startDate ? new Date(params.startDate) : null,
      endDate: params.endDate ? new Date(params.endDate) : null,
      baselineStartDate: params.startDate ? new Date(params.startDate) : null,
      baselineEndDate: params.endDate ? new Date(params.endDate) : null,
      duration: duration || null,
      scheduleRevision: 1,
      priority: params.priority || 'MEDIUM',
      assignedTo: params.assignedTo || null,
      projectId: project.id,
      parentTaskId: params.parentTaskId || null,
      status: 'NOT_STARTED',
      progress: 0
    });

    await taskService.calculateCriticalPath(project.id);
    return { taskId: task.id, name: task.name };
  }

  async loadProjectTask(taskId, projectId) {
    const task = await Task.findByPk(taskId);
    if (!task || String(task.projectId) !== String(projectId)) {
      throw notFound('Task not found in this project', 'TASK_NOT_FOUND');
    }
    return task;
  }

  async executeUpdateTask(params, user, project) {
    if (!canProposeWrites(user)) {
      throw forbidden('Updating a task requires Engineer or above.');
    }
    const task = await this.loadProjectTask(params.taskId, project.id);
    const update = {};
    ['name', 'description', 'status', 'progress', 'priority'].forEach((field) => {
      if (params[field] !== undefined) update[field] = params[field];
    });
    await task.update(update);
    await taskService.calculateCriticalPath(project.id);
    return { taskId: task.id, updated: Object.keys(update) };
  }

  async executeAssignTask(params, user, project) {
    if (!canProposeWrites(user)) {
      throw forbidden('Assigning a task requires Engineer or above.');
    }
    const task = await this.loadProjectTask(params.taskId, project.id);
    const assignedUser = await User.findByPk(params.assignedTo);
    if (!assignedUser) throw badRequest('Assigned user not found');
    await task.update({ assignedTo: params.assignedTo });
    return { taskId: task.id, assignedTo: params.assignedTo };
  }

  async executeRescheduleTask(params, user, project) {
    if (!canProposeWrites(user)) {
      throw forbidden('Rescheduling a task requires Engineer or above.');
    }
    const task = await this.loadProjectTask(params.taskId, project.id);
    const update = {};
    if (params.startDate) {
      update.startDate = new Date(params.startDate);
      update.plannedStartDate = update.startDate;
    }
    if (params.endDate) {
      update.endDate = new Date(params.endDate);
      update.plannedEndDate = update.endDate;
    }
    const start = update.startDate || task.startDate;
    const end = update.endDate || task.endDate;
    if (start && end) {
      update.duration = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    }
    update.scheduleRevision = (task.scheduleRevision || 1) + 1;
    await task.update(update);
    await taskService.calculateCriticalPath(project.id);
    return {
      taskId: task.id,
      startDate: formatDate(update.startDate || task.startDate),
      endDate: formatDate(update.endDate || task.endDate)
    };
  }

  async executeApplySchedule(params, user, project) {
    if (!canManageTasks(user)) {
      throw forbidden('Applying suggested schedule dates requires Manager or above.');
    }
    return aiScheduleService.apply({
      projectId: project.id,
      taskIds: params.taskIds,
      user
    });
  }

  async executeCreateRisk(params, user, project) {
    if (!canScoreRisks(user)) {
      throw forbidden('Creating a risk requires Engineer or above.');
    }
    const risk = await riskService.create({
      ...params,
      projectId: project.id
    });
    return { riskId: risk.id, title: risk.title };
  }

  async executeUpdateRisk(params, user, project) {
    if (!canScoreRisks(user)) {
      throw forbidden('Updating a risk requires Engineer or above.');
    }
    const existing = await riskService.getById(params.riskId);
    if (!existing || String(existing.projectId) !== String(project.id)) {
      throw notFound('Risk not found in this project', 'RISK_NOT_FOUND');
    }
    const { riskId, ...data } = params;
    const updated = await riskService.update(riskId, data);
    return { riskId: updated.id };
  }
}

module.exports = new ActionProposalService();
module.exports.serializeProposal = serializeProposal;

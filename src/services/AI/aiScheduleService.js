const { Task, Project, sequelize } = require('../../models');
const { Op } = require('sequelize');
const taskService = require('../Schedule/taskService');
const { ACCESS_LEVELS } = require('../../middleware/roles');

const SUGGESTION_MODEL_VERSION = 'cpm-v1';
const SUGGESTION_FIELDS = [
  'suggestedStartDate',
  'suggestedEndDate',
  'suggestedDurationDays',
  'suggestedIsCritical',
  'suggestedTotalFloat',
  'suggestedFreeFloat',
  'suggestedModelVersion',
  'suggestedGeneratedAt'
];
const SKIP_APPLY_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

function notFound(message = 'Project not found') {
  const err = new Error(message);
  err.code = 'PROJECT_NOT_FOUND';
  err.statusCode = 404;
  return err;
}

function badRequest(message, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.code = code;
  err.statusCode = 400;
  return err;
}

function roleAllowed(user, level) {
  const role = user && user.role ? String(user.role).toUpperCase() : '';
  return ACCESS_LEVELS[level]
    .map((item) => String(item).toUpperCase())
    .includes(role);
}

function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDay(value) {
  const iso = formatDate(value);
  return iso ? iso.slice(0, 10) : null;
}

function resolveAnchorDate({ requestedStartDate, project, tasks }) {
  if (requestedStartDate) {
    const parsed = new Date(requestedStartDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (project.startDate) return new Date(project.startDate);

  let earliest = null;
  tasks.forEach((task) => {
    const candidate = task.plannedStartDate || task.startDate;
    if (!candidate) return;
    const date = new Date(candidate);
    if (Number.isNaN(date.getTime())) return;
    if (!earliest || date < earliest) earliest = date;
  });
  return earliest || new Date();
}

function toSuggestionRow(task, forward, backward, anchor, generatedAt) {
  const duration = taskService.resolveWorkingDuration(task);
  const earlyStart = forward?.earlyStart || 0;
  const earlyFinish = forward?.earlyFinish || duration;
  const start = taskService.addUtcDays(anchor, earlyStart);
  const inclusiveEndOffset = Math.max(earlyStart, earlyFinish - 1);
  const end = taskService.addUtcDays(anchor, inclusiveEndOffset);
  const totalFloat = backward?.totalFloat || 0;

  return {
    suggestedStartDate: start,
    suggestedEndDate: end,
    suggestedDurationDays: duration,
    suggestedIsCritical: totalFloat === 0,
    suggestedTotalFloat: totalFloat,
    suggestedFreeFloat: backward?.freeFloat || 0,
    suggestedModelVersion: SUGGESTION_MODEL_VERSION,
    suggestedGeneratedAt: generatedAt
  };
}

function serializeSuggestion(task) {
  return {
    taskId: task.id,
    name: task.name,
    status: task.status,
    officialStartDate: formatDay(task.startDate),
    officialEndDate: formatDay(task.endDate),
    plannedStartDate: formatDay(task.plannedStartDate),
    plannedEndDate: formatDay(task.plannedEndDate),
    baselineStartDate: formatDay(task.baselineStartDate),
    baselineEndDate: formatDay(task.baselineEndDate),
    suggestedStartDate: formatDay(task.suggestedStartDate),
    suggestedEndDate: formatDay(task.suggestedEndDate),
    suggestedDurationDays: task.suggestedDurationDays,
    suggestedIsCritical: Boolean(task.suggestedIsCritical),
    suggestedTotalFloat: task.suggestedTotalFloat,
    suggestedFreeFloat: task.suggestedFreeFloat,
    suggestedModelVersion: task.suggestedModelVersion,
    suggestedGeneratedAt: formatDate(task.suggestedGeneratedAt)
  };
}

class AiScheduleService {
  canPropose(user) {
    return roleAllowed(user, 'ENGINEER_AND_ABOVE');
  }

  canApply(user) {
    return roleAllowed(user, 'MANAGER_AND_ABOVE');
  }

  async propose({ projectId, startDate, user }) {
    if (user && !this.canPropose(user)) {
      const err = new Error('Insufficient permissions to propose a schedule');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    const project = await Project.findByPk(projectId);
    if (!project) throw notFound();

    const network = await taskService.computeScheduleNetwork(projectId);
    if (network.tasks.length === 0) {
      throw badRequest('No tasks found for this project', 'NO_TASKS');
    }

    const anchor = resolveAnchorDate({
      requestedStartDate: startDate,
      project,
      tasks: network.tasks
    });
    const generatedAt = new Date();

    await sequelize.transaction(async (transaction) => {
      for (const task of network.tasks) {
        const suggestion = toSuggestionRow(
          task,
          network.forwardPass.get(task.id),
          network.backwardPass.get(task.id),
          anchor,
          generatedAt
        );
        await Task.update(suggestion, {
          where: { id: task.id },
          transaction,
          fields: SUGGESTION_FIELDS
        });
      }
    });

    const updated = await Task.findAll({
      where: { projectId },
      order: [['suggestedStartDate', 'ASC']]
    });

    let suggestedFinishDate = null;
    updated.forEach((task) => {
      if (!task.suggestedEndDate) return;
      const end = new Date(task.suggestedEndDate);
      if (!suggestedFinishDate || end > suggestedFinishDate) suggestedFinishDate = end;
    });

    const criticalCount = updated.filter((task) => task.suggestedIsCritical).length;
    const result = {
      projectId: project.id,
      projectName: project.name,
      modelVersion: SUGGESTION_MODEL_VERSION,
      anchorStartDate: formatDay(anchor),
      suggestedFinishDate: formatDay(suggestedFinishDate),
      formula: 'suggestedStart = projectStart + CPM earlyStart; suggestedEnd = start + duration - 1 day (inclusive)',
      officialDatesUnchanged: true,
      taskCount: updated.length,
      criticalTaskCount: criticalCount,
      tasks: updated.map(serializeSuggestion)
    };

    console.log('[AI Schedule] propose', JSON.stringify({
      projectId: project.id,
      taskCount: result.taskCount,
      suggestedFinishDate: result.suggestedFinishDate
    }));

    return result;
  }

  async apply({ projectId, taskIds, user }) {
    if (user && !this.canApply(user)) {
      const err = new Error('Insufficient permissions to apply a suggested schedule');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    const project = await Project.findByPk(projectId);
    if (!project) throw notFound();

    const where = { projectId };
    if (Array.isArray(taskIds) && taskIds.length > 0) {
      where.id = { [Op.in]: taskIds };
    }

    const tasks = await Task.findAll({ where });
    if (tasks.length === 0) {
      throw badRequest('No matching tasks found for this project', 'NO_TASKS');
    }

    const applied = [];
    const skipped = [];

    await sequelize.transaction(async (transaction) => {
      for (const task of tasks) {
        if (!task.suggestedStartDate || !task.suggestedEndDate) {
          skipped.push({ taskId: task.id, name: task.name, reason: 'No stored schedule suggestion' });
          continue;
        }
        if (SKIP_APPLY_STATUSES.has(task.status)) {
          skipped.push({ taskId: task.id, name: task.name, reason: `Skipped ${task.status} task` });
          continue;
        }

        const official = {
          startDate: task.startDate,
          endDate: task.endDate,
          plannedStartDate: task.plannedStartDate,
          plannedEndDate: task.plannedEndDate,
          baselineStartDate: task.baselineStartDate,
          baselineEndDate: task.baselineEndDate,
          actualStartDate: task.actualStartDate,
          actualEndDate: task.actualEndDate
        };

        const nextStart = new Date(task.suggestedStartDate);
        const nextEnd = new Date(task.suggestedEndDate);
        const update = {
          endDate: nextEnd,
          plannedEndDate: nextEnd,
          duration: task.suggestedDurationDays || taskService.resolveWorkingDuration(task),
          isCritical: Boolean(task.suggestedIsCritical),
          totalFloat: task.suggestedTotalFloat,
          freeFloat: task.suggestedFreeFloat,
          scheduleRevision: (task.scheduleRevision || 1) + 1
        };

        if (task.status === 'IN_PROGRESS') {
          update.startDate = task.startDate;
          update.plannedStartDate = task.plannedStartDate || task.startDate;
        } else {
          update.startDate = nextStart;
          update.plannedStartDate = nextStart;
        }

        await task.update(update, {
          transaction,
          fields: [
            'startDate',
            'endDate',
            'plannedStartDate',
            'plannedEndDate',
            'duration',
            'isCritical',
            'totalFloat',
            'freeFloat',
            'scheduleRevision'
          ]
        });

        applied.push({
          taskId: task.id,
          name: task.name,
          status: task.status,
          officialBefore: {
            startDate: formatDay(official.startDate),
            endDate: formatDay(official.endDate)
          },
          applied: {
            startDate: formatDay(update.startDate),
            endDate: formatDay(update.endDate)
          },
          baselineUnchanged: {
            baselineStartDate: formatDay(official.baselineStartDate),
            baselineEndDate: formatDay(official.baselineEndDate)
          }
        });
      }
    });

    const result = {
      projectId: project.id,
      projectName: project.name,
      appliedCount: applied.length,
      skippedCount: skipped.length,
      applied,
      skipped
    };

    console.log('[AI Schedule] apply', JSON.stringify({
      projectId: project.id,
      appliedCount: result.appliedCount,
      skippedCount: result.skippedCount
    }));

    return result;
  }
}

module.exports = new AiScheduleService();
module.exports.SUGGESTION_MODEL_VERSION = SUGGESTION_MODEL_VERSION;
module.exports.SUGGESTION_FIELDS = SUGGESTION_FIELDS;

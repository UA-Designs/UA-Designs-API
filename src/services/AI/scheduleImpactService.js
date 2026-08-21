const { Task, Project } = require('../../models');
const taskService = require('../Schedule/taskService');
const { formatDate, jsonNumber } = require('./aiUtils');
const { notFound, badRequest } = require('./aiErrors');

function toDay(anchor, offset) {
  if (!anchor) return null;
  return formatDate(taskService.addUtcDays(anchor, offset));
}

function maxEarlyFinish(forwardPass) {
  let max = 0;
  forwardPass.forEach((value) => {
    if (value.earlyFinish > max) max = value.earlyFinish;
  });
  return max;
}

function isCritical(backwardPass, taskId) {
  const row = backwardPass.get(taskId);
  return Boolean(row && Number(row.totalFloat) === 0);
}

class ScheduleImpactService {
  async analyze({ projectId, taskId, delayDays }) {
    const days = Number(delayDays);
    if (!Number.isFinite(days)) {
      throw badRequest('delayDays must be a number', 'INVALID_TOOL_PARAMS');
    }

    const project = await Project.findByPk(projectId);
    if (!project) throw notFound();

    const task = await Task.findByPk(taskId);
    if (!task || String(task.projectId) !== String(projectId)) {
      throw notFound('Task not found in this project', 'TASK_NOT_FOUND');
    }

    const original = await taskService.computeScheduleNetwork(projectId);
    if (original.tasks.length === 0) {
      throw badRequest('No tasks found for this project', 'NO_TASKS');
    }

    const delayedTasks = original.tasks.map((row) => {
      if (row.id !== task.id) return row;
      const duration = Math.max(1, (row.duration || taskService.resolveWorkingDuration(row) || 1) + days);
      const copy = { ...row, duration };
      copy.predecessorDependencies = row.predecessorDependencies;
      copy.successorDependencies = row.successorDependencies;
      return copy;
    });

    const graph = taskService.buildTaskGraph(delayedTasks);
    const forwardPass = taskService.calculateForwardPass(graph, delayedTasks);
    const backwardPass = taskService.calculateBackwardPass(graph, delayedTasks, forwardPass);

    const anchor = project.startDate
      ? new Date(project.startDate)
      : (original.tasks[0].plannedStartDate || original.tasks[0].startDate || new Date());

    const affected = [];
    original.tasks.forEach((row) => {
      const before = original.forwardPass.get(row.id);
      const after = forwardPass.get(row.id);
      if (!before || !after) return;
      const shiftDays = after.earlyFinish - before.earlyFinish;
      if (shiftDays === 0 && row.id !== task.id) return;
      affected.push({
        taskId: row.id,
        name: row.name,
        status: row.status,
        shiftDays,
        originalEndDate: toDay(anchor, Math.max(0, before.earlyFinish - 1)),
        newEndDate: toDay(anchor, Math.max(0, after.earlyFinish - 1)),
        wasCritical: isCritical(original.backwardPass, row.id),
        isCritical: isCritical(backwardPass, row.id)
      });
    });

    const originalDuration = maxEarlyFinish(original.forwardPass);
    const newDuration = maxEarlyFinish(forwardPass);
    const originalCritical = original.tasks.filter((row) => isCritical(original.backwardPass, row.id)).map((row) => ({
      id: row.id,
      name: row.name
    }));
    const newCritical = delayedTasks.filter((row) => isCritical(backwardPass, row.id)).map((row) => ({
      id: row.id,
      name: row.name
    }));

    return {
      source: 'taskService.computeScheduleNetwork (in-memory delay simulation; official dates unchanged)',
      projectId,
      delayedTask: {
        id: task.id,
        name: task.name,
        delayDays: days
      },
      originalProjectedCompletionDate: toDay(anchor, Math.max(0, originalDuration - 1)),
      newProjectedCompletionDate: toDay(anchor, Math.max(0, newDuration - 1)),
      completionShiftDays: jsonNumber(newDuration - originalDuration, 0),
      originalCriticalPath: originalCritical,
      newCriticalPath: newCritical,
      criticalPathChanged: originalCritical.map((item) => item.id).join(',') !== newCritical.map((item) => item.id).join(','),
      affectedTasks: affected.sort((a, b) => Math.abs(b.shiftDays) - Math.abs(a.shiftDays)).slice(0, 40),
      officialDatesUnchanged: true
    };
  }
}

module.exports = new ScheduleImpactService();

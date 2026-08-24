const { forecastThresholds } = require('../../config/forecastThresholds');
const {
  toFiniteNumber,
  isFiniteNumber,
  round,
  safeDivide
} = require('./forecastMath');
const { resolveElapsedDuration } = require('./scheduleForecastService');

const ACTIVE_LABOR = new Set(['AVAILABLE', 'ASSIGNED']);
const ACTIVE_TEAM = new Set(['ACTIVE']);
const ACTIVE_ALLOCATION = new Set(['PLANNED', 'ALLOCATED', 'IN_USE']);

function remainingRatio(task) {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return 0;
  const progress = Math.min(100, Math.max(0, toFiniteNumber(task.progress, 0)));
  return (100 - progress) / 100;
}

function taskRemainingDays(task) {
  const duration = toFiniteNumber(task.duration, 0);
  if (duration > 0) return duration * remainingRatio(task);
  const start = task.startDate || task.plannedStartDate;
  const end = task.endDate || task.plannedEndDate;
  if (start && end) {
    const span = Math.max(0, (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    return span * remainingRatio(task);
  }
  return null;
}

function currentResourceCount(inputs) {
  const labor = (inputs.labor || []).filter((item) => ACTIVE_LABOR.has(item.status));
  const team = (inputs.teamMembers || []).filter((item) => ACTIVE_TEAM.has(item.status));
  const ids = new Set();
  labor.forEach((item) => ids.add(`labor:${item.id}`));
  team.forEach((item) => ids.add(`team:${item.userId || item.id}`));
  return {
    count: ids.size,
    laborCount: labor.length,
    teamCount: team.length
  };
}

function laborHoursOnTask(inputs, taskId) {
  const assigned = (inputs.allocations || []).filter((item) => (
    item.taskId === taskId
    && item.resourceType === 'LABOR'
    && ACTIVE_ALLOCATION.has(item.status)
  ));
  if (assigned.length === 0) return 0;
  return assigned.reduce((sum, item) => sum + Math.max(1, toFiniteNumber(item.quantity, 1)), 0);
}

function forecastResource(inputs, scheduleForecast = {}) {
  const hoursPerDay = forecastThresholds.hoursPerDay;
  const workDaysPerWeek = forecastThresholds.workDaysPerWeek;
  const current = currentResourceCount(inputs);
  const remainingCalendarDays = isFiniteNumber(scheduleForecast.plannedDuration) && isFiniteNumber(scheduleForecast.elapsedDuration)
    ? Math.max(0, scheduleForecast.plannedDuration - scheduleForecast.elapsedDuration)
    : null;
  const remainingWeeks = remainingCalendarDays != null ? remainingCalendarDays / 7 : null;

  const affectedTasks = [];
  let requiredHours = 0;
  let usedTaskLevelDemand = false;

  (inputs.tasks || []).forEach((task) => {
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return;
    const remainingDays = taskRemainingDays(task);
    const assignedWorkers = laborHoursOnTask(inputs, task.id);
    const assignedUser = task.assignedTo ? 1 : 0;
    const workers = assignedWorkers > 0 ? assignedWorkers : assignedUser;

    if (!isFiniteNumber(remainingDays) || remainingDays <= 0) return;
    if (workers <= 0) return;

    usedTaskLevelDemand = true;
    const hours = remainingDays * hoursPerDay * workers;
    requiredHours += hours;
    affectedTasks.push({
      taskId: task.id,
      name: task.name,
      status: task.status,
      remainingDays: round(remainingDays, 1),
      assignedWorkers: workers,
      remainingHours: round(hours, 1)
    });
  });

  if (!usedTaskLevelDemand) {
    return {
      currentResources: current.count,
      requiredResources: null,
      utilization: null,
      shortage: null,
      surplus: null,
      requiredHours: null,
      availableHours: null,
      additionalHoursNeeded: null,
      additionalWorkersNeeded: null,
      affectedTasks: [],
      status: 'INSUFFICIENT_DATA',
      methodology: 'INSUFFICIENT_DATA',
      confidenceLevel: 'LOW',
      assumptions: {
        hoursPerDay,
        workDaysPerWeek
      }
    };
  }

  let availableHours = 0;
  (inputs.teamMembers || []).filter((item) => ACTIVE_TEAM.has(item.status)).forEach((member) => {
    const hoursPerWeek = toFiniteNumber(member.hoursPerWeek, 0);
    if (hoursPerWeek > 0 && remainingWeeks != null) {
      const allocation = toFiniteNumber(member.allocation, 100) / 100;
      availableHours += hoursPerWeek * remainingWeeks * Math.max(0, allocation);
    }
  });

  if (availableHours <= 0 && current.count > 0 && remainingCalendarDays != null) {
    availableHours = current.count * remainingCalendarDays * hoursPerDay;
  }

  const elapsed = resolveElapsedDuration(inputs);
  if (availableHours <= 0 && current.count > 0 && elapsed > 0) {
    const remaining = remainingCalendarDays != null ? remainingCalendarDays : 0;
    availableHours = current.count * remaining * hoursPerDay;
  }

  const shortageHours = Math.max(0, requiredHours - availableHours);
  const surplusHours = Math.max(0, availableHours - requiredHours);
  const utilization = safeDivide(requiredHours, availableHours, null);
  const additionalWorkersNeeded = shortageHours > 0 && remainingCalendarDays > 0
    ? Math.ceil(shortageHours / (remainingCalendarDays * hoursPerDay))
    : 0;
  const requiredResources = remainingCalendarDays > 0
    ? Math.ceil(safeDivide(requiredHours, remainingCalendarDays * hoursPerDay, 0) || 0)
    : current.count;

  let status = 'ON_TRACK';
  if (utilization != null && utilization > forecastThresholds.resourceUtilization.shortage) status = 'SHORTAGE';
  else if (utilization != null && utilization < forecastThresholds.resourceUtilization.surplus) status = 'SURPLUS';

  return {
    currentResources: current.count,
    requiredResources,
    utilization: round(utilization, 3),
    shortage: round(shortageHours, 1),
    surplus: round(surplusHours, 1),
    requiredHours: round(requiredHours, 1),
    availableHours: round(availableHours, 1),
    additionalHoursNeeded: round(shortageHours, 1),
    additionalWorkersNeeded,
    affectedTasks: affectedTasks.sort((a, b) => b.remainingHours - a.remainingHours).slice(0, 40),
    status,
    methodology: 'REMAINING_TASK_HOURS',
    confidenceLevel: availableHours > 0 ? 'MEDIUM' : 'LOW',
    assumptions: {
      hoursPerDay,
      workDaysPerWeek,
      laborCount: current.laborCount,
      teamCount: current.teamCount
    }
  };
}

module.exports = {
  forecastResource,
  currentResourceCount
};

const { cloneInputs } = require('./inputLoader');
const { toFiniteNumber, isFiniteNumber } = require('./forecastMath');
const { currentResourceCount } = require('./resourceForecastService');

const SCENARIO_TYPES = [
  'ADD_WORKERS',
  'DELAY_TASK',
  'MATERIAL_COST_INCREASE',
  'REDUCE_REMAINING_DURATION'
];

function remainingRatio(task) {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return 0;
  const progress = Math.min(100, Math.max(0, toFiniteNumber(task.progress, 0)));
  return (100 - progress) / 100;
}

function applyAddWorkers(inputs, workersToAdd) {
  const previousWorkers = currentResourceCount(inputs).count;
  const count = Math.max(0, Math.round(toFiniteNumber(workersToAdd, 0)));
  for (let i = 0; i < count; i += 1) {
    inputs.labor.push({
      id: `scenario-worker-${i + 1}`,
      projectId: inputs.project.id,
      name: `Scenario worker ${i + 1}`,
      role: 'SCENARIO',
      trade: 'GENERAL',
      dailyRate: 0,
      hoursWorked: 0,
      status: 'ASSIGNED'
    });
  }
  const newWorkers = previousWorkers + count;
  if (previousWorkers > 0 && newWorkers > previousWorkers) {
    const factor = previousWorkers / newWorkers;
    (inputs.tasks || []).forEach((task) => {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return;
      const duration = toFiniteNumber(task.duration, 0);
      if (duration <= 0) return;
      const remaining = duration * remainingRatio(task);
      const completed = duration - remaining;
      task.duration = Math.max(1, completed + (remaining * factor));
    });
    if (inputs.project && inputs.project.endDate && inputs.asOfDate) {
      const remainingMs = Math.max(0, new Date(inputs.project.endDate) - inputs.asOfDate);
      inputs.project.endDate = new Date(inputs.asOfDate.getTime() + remainingMs * factor).toISOString();
    }
  }
  return { workersAdded: count, previousWorkers, newWorkers };
}

function applyMaterialCostIncrease(inputs, percent) {
  const pct = toFiniteNumber(percent, 0) / 100;
  if (!Number.isFinite(pct)) {
    return { error: 'INVALID_PERCENT' };
  }
  let adjusted = 0;
  (inputs.costs || []).forEach((cost) => {
    if (cost.type !== 'MATERIAL') return;
    const amount = toFiniteNumber(cost.amount, 0);
    const actual = toFiniteNumber(cost.actualAmount, 0);
    const remaining = Math.max(0, amount - actual);
    if (remaining > 0) {
      cost.amount = amount + (remaining * pct);
      adjusted += remaining * pct;
    }
  });
  if (adjusted === 0) {
    return { error: 'INSUFFICIENT_DATA', message: 'No remaining material cost records were available to apply the increase.' };
  }
  if ((inputs.budgets || []).length > 0) {
    const current = inputs.budgets.find((b) => b.status === 'APPROVED') || inputs.budgets[0];
    current.amount = toFiniteNumber(current.amount, 0) + adjusted;
  } else if (inputs.project) {
    inputs.project.budget = toFiniteNumber(inputs.project.budget, 0) + adjusted;
  }
  return { percent: toFiniteNumber(percent, 0), adjustedAmount: adjusted };
}

function applyDelayTask(inputs, taskId, delayDays) {
  const days = toFiniteNumber(delayDays, 0);
  const task = (inputs.tasks || []).find((item) => String(item.id) === String(taskId));
  if (!task) {
    return { error: 'TASK_NOT_FOUND', message: 'Task not found in this project.' };
  }
  task.duration = Math.max(1, toFiniteNumber(task.duration, 1) + days);
  if (task.endDate) {
    const end = new Date(task.endDate);
    end.setUTCDate(end.getUTCDate() + Math.round(days));
    task.endDate = end.toISOString();
  }
  if (task.plannedEndDate) {
    const end = new Date(task.plannedEndDate);
    end.setUTCDate(end.getUTCDate() + Math.round(days));
    task.plannedEndDate = end.toISOString();
  }
  if (inputs.project && inputs.project.endDate && task.isCritical) {
    const end = new Date(inputs.project.endDate);
    end.setUTCDate(end.getUTCDate() + Math.round(days));
    inputs.project.endDate = end.toISOString();
  }
  return { taskId: task.id, name: task.name, delayDays: days, isCritical: Boolean(task.isCritical) };
}

function applyReduceRemainingDuration(inputs, percent) {
  const factor = 1 - (toFiniteNumber(percent, 0) / 100);
  if (!isFiniteNumber(factor) || factor <= 0) {
    return { error: 'INVALID_PERCENT' };
  }
  let changed = 0;
  (inputs.tasks || []).forEach((task) => {
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return;
    const duration = toFiniteNumber(task.duration, 0);
    if (duration > 0) {
      const remaining = duration * ((100 - toFiniteNumber(task.progress, 0)) / 100);
      const reducedRemaining = remaining * factor;
      const completed = duration - remaining;
      task.duration = Math.max(1, completed + reducedRemaining);
      changed += 1;
    }
  });
  if (inputs.project && inputs.project.startDate && inputs.project.endDate) {
    const end = new Date(inputs.project.endDate);
    const asOf = inputs.asOfDate;
    const remaining = Math.max(0, end.getTime() - asOf.getTime());
    const newEnd = new Date(asOf.getTime() + remaining * factor);
    inputs.project.endDate = newEnd.toISOString();
  }
  return { percent: toFiniteNumber(percent, 0), tasksAdjusted: changed };
}

function applyScenario(sourceInputs, scenario = {}) {
  const inputs = cloneInputs(sourceInputs);
  const type = String(scenario.scenarioType || scenario.type || '').toUpperCase();
  let applied;

  if (type === 'ADD_WORKERS') {
    applied = applyAddWorkers(inputs, scenario.workersToAdd);
  } else if (type === 'DELAY_TASK') {
    applied = applyDelayTask(inputs, scenario.taskId, scenario.delayDays);
  } else if (type === 'MATERIAL_COST_INCREASE') {
    applied = applyMaterialCostIncrease(inputs, scenario.percent);
  } else if (type === 'REDUCE_REMAINING_DURATION') {
    applied = applyReduceRemainingDuration(inputs, scenario.percent);
  } else {
    return {
      error: 'UNKNOWN_SCENARIO',
      message: `Unknown scenario type. Use one of: ${SCENARIO_TYPES.join(', ')}`
    };
  }

  return { inputs, applied, scenarioType: type };
}

module.exports = {
  SCENARIO_TYPES,
  applyScenario
};

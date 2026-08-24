const { toFiniteNumber, clamp } = require('./forecastMath');

function assessDataQuality(inputs) {
  const missingData = [];
  const warnings = [];
  const issues = [];

  const project = inputs.project || {};
  const tasks = inputs.tasks || [];
  const budgets = inputs.budgets || [];
  const expenses = inputs.expenses || [];
  const labor = inputs.labor || [];
  const teamMembers = inputs.teamMembers || [];
  const allocations = inputs.allocations || [];

  const projectBudget = toFiniteNumber(project.budget, 0);
  const recordBudget = budgets.reduce((sum, b) => sum + toFiniteNumber(b.amount, 0), 0);
  if (projectBudget <= 0 && recordBudget <= 0) {
    missingData.push('budget');
    issues.push({ field: 'budget', severity: 'HIGH', message: 'No project budget or budget records found.' });
  }

  const approvedPaid = expenses.filter((e) => ['APPROVED', 'PAID'].includes(e.status));
  if (approvedPaid.length === 0) {
    missingData.push('actualCosts');
    issues.push({ field: 'actualCosts', severity: 'MEDIUM', message: 'No approved or paid expenses found.' });
  }

  expenses.forEach((expense) => {
    const amount = toFiniteNumber(expense.amount, NaN);
    if (!Number.isFinite(amount)) {
      issues.push({ field: 'expenses.amount', severity: 'HIGH', message: `Expense ${expense.id} has a non-numeric amount.` });
    } else if (amount < 0) {
      warnings.push('negativeCosts');
      issues.push({ field: 'expenses.amount', severity: 'HIGH', message: `Expense ${expense.id} has a negative amount and was excluded from actual cost.` });
    }
    if (!expense.date) {
      missingData.push('expenseDates');
      issues.push({ field: 'expenses.date', severity: 'MEDIUM', message: `Expense ${expense.id} is missing a date.` });
    }
  });

  if (!project.startDate || !project.endDate) {
    missingData.push('projectDates');
    issues.push({ field: 'projectDates', severity: 'MEDIUM', message: 'Project start and/or end date is missing.' });
  }

  if (tasks.length === 0) {
    missingData.push('tasks');
    issues.push({ field: 'tasks', severity: 'HIGH', message: 'No tasks found for schedule or progress forecasting.' });
  }

  const tasksMissingDuration = tasks.filter((task) => {
    const duration = toFiniteNumber(task.duration, 0);
    const start = task.startDate || task.plannedStartDate;
    const end = task.endDate || task.plannedEndDate;
    return duration <= 0 && !(start && end);
  });
  if (tasksMissingDuration.length > 0) {
    missingData.push('taskDurations');
    warnings.push('missingTaskDurations');
    issues.push({
      field: 'taskDurations',
      severity: 'MEDIUM',
      message: `${tasksMissingDuration.length} task(s) are missing duration and schedule dates.`
    });
  }

  const invalidProgress = tasks.filter((task) => {
    const progress = toFiniteNumber(task.progress, NaN);
    return !Number.isFinite(progress) || progress < 0 || progress > 100;
  });
  if (invalidProgress.length > 0) {
    warnings.push('invalidCompletionPercentages');
    issues.push({
      field: 'taskProgress',
      severity: 'HIGH',
      message: `${invalidProgress.length} task(s) have invalid completion percentages.`
    });
  }

  const projectProgress = clamp(toFiniteNumber(project.progress, NaN), 0, 100);
  const hasTaskProgress = tasks.some((task) => toFiniteNumber(task.progress, 0) > 0);
  if (projectProgress == null && !hasTaskProgress) {
    missingData.push('progress');
    issues.push({ field: 'progress', severity: 'MEDIUM', message: 'No project or task progress values found.' });
  }

  const hasResourceSignal = labor.length > 0 || teamMembers.length > 0
    || allocations.some((item) => item.resourceType === 'LABOR');
  if (!hasResourceSignal) {
    missingData.push('resources');
    issues.push({ field: 'resources', severity: 'MEDIUM', message: 'No labor, team, or labor allocation records found.' });
  }

  const uniqueMissing = [...new Set(missingData)];
  const uniqueWarnings = [...new Set(warnings)];

  return {
    sufficientData: uniqueMissing.length === 0,
    missingData: uniqueMissing,
    warnings: uniqueWarnings,
    issues
  };
}

module.exports = {
  assessDataQuality
};

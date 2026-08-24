const { summarizeProjectBudget } = require('../../utils/projectBudgetResolver');
const { forecastThresholds } = require('../../config/forecastThresholds');
const {
  toFiniteNumber,
  isFiniteNumber,
  round,
  clamp,
  safeDivide,
  calculateCV,
  calculateCPI,
  calculateEAC,
  calculateETC,
  calculateVAC,
  variancePercentage,
  costStatusFromCpi,
  weightedProgressPct
} = require('./forecastMath');

function resolveBac(inputs) {
  const summary = summarizeProjectBudget({
    projectBudgetField: inputs.project && inputs.project.budget,
    budgetRecords: inputs.budgets || []
  });
  return {
    bac: toFiniteNumber(summary.budget, 0),
    budgetSource: summary.budgetSource,
    hasBudget: Boolean(summary.hasBudget)
  };
}

function resolveActualCost(inputs) {
  const asOf = inputs.asOfDate;
  const expenses = (inputs.expenses || []).filter((expense) => {
    if (!['APPROVED', 'PAID'].includes(expense.status)) return false;
    const amount = toFiniteNumber(expense.amount, NaN);
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (expense.date && asOf) {
      return new Date(expense.date) <= asOf;
    }
    return true;
  });

  const fromExpenses = expenses.reduce((sum, expense) => sum + toFiniteNumber(expense.amount, 0), 0);
  if (fromExpenses > 0 || expenses.length > 0) {
    return { ac: fromExpenses, source: 'approved_paid_expenses', expenseCount: expenses.length };
  }

  const fromCosts = (inputs.costs || []).reduce((sum, cost) => {
    const actual = toFiniteNumber(cost.actualAmount, 0);
    return actual > 0 ? sum + actual : sum;
  }, 0);
  if (fromCosts > 0) {
    return { ac: fromCosts, source: 'cost_actual_amount_fallback', expenseCount: 0 };
  }

  return { ac: 0, source: 'none', expenseCount: 0 };
}

function resolveActualProgressPct(inputs) {
  const taskProgress = weightedProgressPct(inputs.tasks || []);
  if (isFiniteNumber(taskProgress)) return taskProgress;
  const projectProgress = clamp(toFiniteNumber(inputs.project && inputs.project.progress, NaN), 0, 100);
  return projectProgress;
}

function resolvePlannedProgressPct(inputs) {
  const start = inputs.project && inputs.project.startDate;
  const end = inputs.project && inputs.project.endDate;
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const asOf = inputs.asOfDate instanceof Date ? inputs.asOfDate : new Date(inputs.asOfDate);
  const total = endDate.getTime() - startDate.getTime();
  if (!(total > 0)) return null;
  const elapsed = asOf.getTime() - startDate.getTime();
  return clamp((elapsed / total) * 100, 0, 100);
}

function forecastCost(inputs) {
  const { bac, budgetSource, hasBudget } = resolveBac(inputs);
  const { ac, source: actualCostSource } = resolveActualCost(inputs);
  const actualProgressPct = resolveActualProgressPct(inputs);
  const plannedProgressPct = resolvePlannedProgressPct(inputs);

  const ev = hasBudget && isFiniteNumber(actualProgressPct)
    ? bac * (actualProgressPct / 100)
    : null;
  const pv = hasBudget && isFiniteNumber(plannedProgressPct)
    ? bac * (plannedProgressPct / 100)
    : null;

  const cv = isFiniteNumber(ev) ? calculateCV(ev, ac) : null;
  let cpi = isFiniteNumber(ev) ? calculateCPI(ev, ac) : null;
  let methodology = 'EVM_CPI';
  let eac = calculateEAC(bac, cpi);

  if (!isFiniteNumber(eac)) {
    if (isFiniteNumber(actualProgressPct) && actualProgressPct > 0 && ac > 0) {
      eac = safeDivide(ac, actualProgressPct / 100, null);
      methodology = 'PROGRESS_SPEND_FALLBACK';
      if (!isFiniteNumber(cpi) && isFiniteNumber(eac) && eac > 0) {
        cpi = safeDivide(bac, eac, null);
      }
    } else if (hasBudget && ac === 0) {
      eac = bac;
      methodology = 'BAC_NO_ACTUALS_FALLBACK';
    } else if (ac > 0 && !hasBudget) {
      eac = ac;
      methodology = 'ACTUALS_ONLY_FALLBACK';
    }
  }

  const etc = calculateETC(eac, ac);
  const vac = calculateVAC(bac, eac);
  const variancePct = hasBudget ? variancePercentage(bac, eac) : null;
  let status = costStatusFromCpi(cpi, forecastThresholds.cpi);
  if (!isFiniteNumber(cpi) && methodology === 'BAC_NO_ACTUALS_FALLBACK') {
    status = 'ON_TRACK';
  }
  const sufficient = hasBudget && (ac > 0 || isFiniteNumber(actualProgressPct));

  return {
    actualCost: round(ac, 2),
    budgetAtCompletion: round(bac, 2),
    plannedValue: round(pv, 2),
    earnedValue: round(ev, 2),
    costVariance: round(cv, 2),
    costPerformanceIndex: round(cpi, 3),
    estimateAtCompletion: round(eac, 2),
    estimateToComplete: round(etc, 2),
    varianceAtCompletion: round(vac, 2),
    variancePercentage: round(variancePct, 2),
    expectedOverrun: round(isFiniteNumber(vac) ? -vac : null, 2),
    status: sufficient ? status : 'INSUFFICIENT_DATA',
    methodology: sufficient ? methodology : 'INSUFFICIENT_DATA',
    confidenceLevel: methodology === 'EVM_CPI' ? 'HIGH' : (sufficient ? 'MEDIUM' : 'LOW'),
    budgetSource,
    actualCostSource,
    actualProgressPct: round(actualProgressPct, 2),
    plannedProgressPct: round(plannedProgressPct, 2)
  };
}

module.exports = {
  forecastCost,
  resolveBac,
  resolveActualCost,
  resolveActualProgressPct,
  resolvePlannedProgressPct
};

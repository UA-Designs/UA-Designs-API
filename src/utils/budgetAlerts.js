function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function getBudgetAlertLevel(budgetUsedPct) {
  const pct = toNumber(budgetUsedPct);
  if (pct < 50) return 'on_track';
  if (pct < 80) return 'warning_50';
  if (pct <= 100) return 'warning_80';
  return 'critical';
}

function buildBudgetAlertPayload({ budget, actualCost }) {
  const normalizedBudget = round2(budget);
  const normalizedActualCost = round2(actualCost);
  const hasBudget = normalizedBudget > 0;
  const budgetUsedPct = hasBudget ? round2((normalizedActualCost / normalizedBudget) * 100) : 0;
  const budgetAlertLevel = getBudgetAlertLevel(budgetUsedPct);

  return {
    budget: normalizedBudget,
    actualCost: normalizedActualCost,
    hasBudget,
    budgetUsedPct,
    budgetAlertLevel
  };
}

module.exports = {
  toNumber,
  round2,
  getBudgetAlertLevel,
  buildBudgetAlertPayload
};

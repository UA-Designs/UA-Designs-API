const { toNumber, round2 } = require('./budgetAlerts');

function byLatestRecord(a, b) {
  const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return bDate - aDate;
}

function pickCurrentBudgetRecord(records = []) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const approved = records.filter(r => r.status === 'APPROVED').sort(byLatestRecord);
  if (approved.length > 0) return approved[0];

  const planned = records.filter(r => r.status === 'PLANNED').sort(byLatestRecord);
  if (planned.length > 0) return planned[0];

  const revised = records.filter(r => r.status === 'REVISED').sort(byLatestRecord);
  if (revised.length > 0) return revised[0];

  const nonClosed = records.filter(r => r.status !== 'CLOSED').sort(byLatestRecord);
  if (nonClosed.length > 0) return nonClosed[0];

  return records.sort(byLatestRecord)[0];
}

function summarizeProjectBudget({ projectBudgetField, budgetRecords = [] }) {
  const currentBudget = pickCurrentBudgetRecord(budgetRecords);
  const totalApproved = round2(
    budgetRecords
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + toNumber(r.amount), 0)
  );

  const totalsByStatus = budgetRecords.reduce((acc, r) => {
    const key = r.status || 'UNKNOWN';
    acc[key] = round2((acc[key] || 0) + toNumber(r.amount));
    return acc;
  }, {});

  if (currentBudget) {
    return {
      budget: round2(currentBudget.amount),
      hasBudget: round2(currentBudget.amount) > 0,
      budgetSource: 'budget_records',
      currentBudgetId: currentBudget.id || null,
      currentBudgetStatus: currentBudget.status || null,
      totalApproved,
      totalsByStatus
    };
  }

  const fallback = round2(projectBudgetField);
  if (fallback > 0) {
    return {
      budget: fallback,
      hasBudget: true,
      budgetSource: 'project_field',
      currentBudgetId: null,
      currentBudgetStatus: null,
      totalApproved,
      totalsByStatus
    };
  }

  return {
    budget: 0,
    hasBudget: false,
    budgetSource: 'none',
    currentBudgetId: null,
    currentBudgetStatus: null,
    totalApproved,
    totalsByStatus
  };
}

module.exports = {
  pickCurrentBudgetRecord,
  summarizeProjectBudget
};

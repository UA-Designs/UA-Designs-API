/**
 * Audit budget->project link integrity and budget coverage.
 * Run: node scripts/audit-budget-integrity.js
 */
require('dotenv').config();
const { sequelize, Budget, Project } = require('../src/models');

async function run() {
  try {
    await sequelize.authenticate();

    const [budgets, projects] = await Promise.all([
      Budget.findAll({
        attributes: ['id', 'projectId', 'amount', 'status', 'createdAt'],
        paranoid: false,
        raw: true
      }),
      Project.findAll({
        attributes: ['id', 'name', 'budget', 'deletedAt'],
        paranoid: false,
        raw: true
      })
    ]);

    const projectIds = new Set(projects.map(p => p.id));
    const nullProjectId = budgets.filter(b => !b.projectId);
    const orphanedBudgets = budgets.filter(b => b.projectId && !projectIds.has(b.projectId));

    const budgetsByProject = budgets.reduce((acc, b) => {
      if (!b.projectId) return acc;
      if (!acc[b.projectId]) acc[b.projectId] = [];
      acc[b.projectId].push(b);
      return acc;
    }, {});

    const projectsWithoutBudgetRows = projects.filter(p => !budgetsByProject[p.id] || budgetsByProject[p.id].length === 0);

    console.log('=== Budget Integrity Audit ===');
    console.log(`Projects: ${projects.length}`);
    console.log(`Budgets: ${budgets.length}`);
    console.log(`Budgets with null/empty projectId: ${nullProjectId.length}`);
    console.log(`Budgets with orphan projectId: ${orphanedBudgets.length}`);
    console.log(`Projects without any budget rows: ${projectsWithoutBudgetRows.length}`);

    if (nullProjectId.length > 0) {
      console.log('\nSample null projectId budgets:');
      console.table(nullProjectId.slice(0, 20));
    }
    if (orphanedBudgets.length > 0) {
      console.log('\nSample orphaned budgets:');
      console.table(orphanedBudgets.slice(0, 20));
    }
    if (projectsWithoutBudgetRows.length > 0) {
      console.log('\nSample projects without budget rows:');
      console.table(projectsWithoutBudgetRows.slice(0, 20).map(p => ({ id: p.id, name: p.name, projectFieldBudget: p.budget })));
    }

    console.log('\nSuggested backfill strategy (manual review first):');
    console.log('- If a budget has null/orphan projectId, map it to the correct project then update the row.');
    console.log('- If a project only uses project.budget and has no budget rows, create a PLANNED budget row using that amount.');
  } catch (err) {
    console.error('Audit failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();

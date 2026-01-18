const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const {
  CostController,
  BudgetController,
  ExpenseController,
  CostAnalysisController
} = require('../../controllers/Cost');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Cost Management',
    endpoints: {
      costs: '/costs',
      budgets: '/budgets',
      expenses: '/expenses',
      analysis: '/analysis'
    }
  });
});

// ==========================================
// COST ROUTES
// ==========================================

// Get cost summary (must be before /:id route)
router.get('/costs/summary', authenticateToken, CostController.getCostSummary);

// Create a new cost
router.post('/costs', authenticateToken, CostController.createCost);

// Get all costs with filtering
router.get('/costs', authenticateToken, CostController.getAllCosts);

// Get a single cost by ID
router.get('/costs/:id', authenticateToken, CostController.getCostById);

// Update a cost
router.put('/costs/:id', authenticateToken, CostController.updateCost);

// Delete a cost
router.delete('/costs/:id', authenticateToken, CostController.deleteCost);

// Update cost status
router.patch('/costs/:id/status', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), CostController.updateCostStatus);

// ==========================================
// BUDGET ROUTES
// ==========================================

// Create a new budget
router.post('/budgets', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), BudgetController.createBudget);

// Get all budgets with filtering
router.get('/budgets', authenticateToken, BudgetController.getAllBudgets);

// Get a single budget by ID
router.get('/budgets/:id', authenticateToken, BudgetController.getBudgetById);

// Update a budget
router.put('/budgets/:id', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), BudgetController.updateBudget);

// Delete a budget
router.delete('/budgets/:id', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), BudgetController.deleteBudget);

// Approve a budget
router.patch('/budgets/:id/approve', authenticateToken, authorizeRoles('ADMIN'), BudgetController.approveBudget);

// Revise a budget
router.post('/budgets/:id/revise', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), BudgetController.reviseBudget);

// Close a budget
router.patch('/budgets/:id/close', authenticateToken, authorizeRoles('ADMIN'), BudgetController.closeBudget);

// Get budget utilization
router.get('/budgets/:id/utilization', authenticateToken, BudgetController.getBudgetUtilization);

// ==========================================
// EXPENSE ROUTES
// ==========================================

// Bulk approve expenses (must be before /:id routes)
router.post('/expenses/bulk-approve', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ExpenseController.bulkApproveExpenses);

// Get expense summary for a project
router.get('/expenses/summary/:projectId', authenticateToken, ExpenseController.getExpenseSummary);

// Create a new expense
router.post('/expenses', authenticateToken, ExpenseController.createExpense);

// Get all expenses with filtering
router.get('/expenses', authenticateToken, ExpenseController.getAllExpenses);

// Get a single expense by ID
router.get('/expenses/:id', authenticateToken, ExpenseController.getExpenseById);

// Update an expense
router.put('/expenses/:id', authenticateToken, ExpenseController.updateExpense);

// Delete an expense
router.delete('/expenses/:id', authenticateToken, ExpenseController.deleteExpense);

// Approve an expense
router.patch('/expenses/:id/approve', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ExpenseController.approveExpense);

// Reject an expense
router.patch('/expenses/:id/reject', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ExpenseController.rejectExpense);

// Mark expense as paid
router.patch('/expenses/:id/pay', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ExpenseController.markExpenseAsPaid);

// ==========================================
// COST ANALYSIS ROUTES
// ==========================================

// Compare costs across projects
router.get('/analysis/compare', authenticateToken, CostAnalysisController.compareCosts);

// Get cost overview for a project
router.get('/analysis/overview/:projectId', authenticateToken, CostAnalysisController.getCostOverview);

// Get EVM metrics for a project
router.get('/analysis/evm/:projectId', authenticateToken, CostAnalysisController.getEVMMetrics);

// Get cost breakdown by category
router.get('/analysis/breakdown/:projectId', authenticateToken, CostAnalysisController.getCostBreakdown);

// Get cost trend over time
router.get('/analysis/trend/:projectId', authenticateToken, CostAnalysisController.getCostTrend);

// Get cost forecast
router.get('/analysis/forecast/:projectId', authenticateToken, CostAnalysisController.getCostForecast);

module.exports = router; 
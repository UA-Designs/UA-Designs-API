const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const upload = require('../../middleware/upload');
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
router.post('/costs', authenticateToken, authorize('ENGINEER_AND_ABOVE'), CostController.createCost);

// Get all costs with filtering
router.get('/costs', authenticateToken, CostController.getAllCosts);

// Get a single cost by ID
router.get('/costs/:id', authenticateToken, CostController.getCostById);

// Update a cost
router.put('/costs/:id', authenticateToken, authorize('ENGINEER_AND_ABOVE'), CostController.updateCost);

// Delete a cost
router.delete('/costs/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), CostController.deleteCost);

// Update cost status
router.patch('/costs/:id/status', authenticateToken, authorize('MANAGER_AND_ABOVE'), CostController.updateCostStatus);

// ==========================================
// BUDGET ROUTES
// ==========================================

// Create a new budget
router.post('/budgets', authenticateToken, authorize('MANAGER_AND_ABOVE'), BudgetController.createBudget);

// Get all budgets with filtering
router.get('/budgets', authenticateToken, BudgetController.getAllBudgets);

// Get a single budget by ID
router.get('/budgets/:id', authenticateToken, BudgetController.getBudgetById);

// Update a budget
router.put('/budgets/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), BudgetController.updateBudget);

// Delete a budget
router.delete('/budgets/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), BudgetController.deleteBudget);

// Approve a budget
router.patch('/budgets/:id/approve', authenticateToken, authorize('ADMIN_ONLY'), BudgetController.approveBudget);

// Revise a budget
router.post('/budgets/:id/revise', authenticateToken, authorize('MANAGER_AND_ABOVE'), BudgetController.reviseBudget);

// Close a budget
router.patch('/budgets/:id/close', authenticateToken, authorize('ADMIN_ONLY'), BudgetController.closeBudget);

// Get budget utilization
router.get('/budgets/:id/utilization', authenticateToken, BudgetController.getBudgetUtilization);

// ==========================================
// EXPENSE ROUTES
// ==========================================

// Bulk approve expenses (must be before /:id routes)
router.post('/expenses/bulk-approve', authenticateToken, authorize('MANAGER_AND_ABOVE'), ExpenseController.bulkApproveExpenses);

// Get expense summary for a project
router.get('/expenses/summary/:projectId', authenticateToken, ExpenseController.getExpenseSummary);

// Create a new expense
router.post('/expenses', authenticateToken, authorize('ENGINEER_AND_ABOVE'), ExpenseController.createExpense);

// Get all expenses with filtering
router.get('/expenses', authenticateToken, ExpenseController.getAllExpenses);

// Get a single expense by ID
router.get('/expenses/:id', authenticateToken, ExpenseController.getExpenseById);

// Update an expense
router.put('/expenses/:id', authenticateToken, authorize('ENGINEER_AND_ABOVE'), ExpenseController.updateExpense);

// Delete an expense
router.delete('/expenses/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), ExpenseController.deleteExpense);

// Approve an expense
router.patch('/expenses/:id/approve', authenticateToken, authorize('MANAGER_AND_ABOVE'), ExpenseController.approveExpense);

// Reject an expense
router.patch('/expenses/:id/reject', authenticateToken, authorize('MANAGER_AND_ABOVE'), ExpenseController.rejectExpense);

// Mark expense as paid
router.patch('/expenses/:id/pay', authenticateToken, authorize('MANAGER_AND_ABOVE'), ExpenseController.markExpenseAsPaid);

// Upload a receipt to an expense
router.post('/expenses/:id/receipts', authenticateToken, authorize('ENGINEER_AND_ABOVE'), (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Max file size is 5 MB.' });
      }
      // Covers invalid MIME type message and other multer errors
      return res.status(400).json({ success: false, message: err.message || 'File upload error' });
    }
    next();
  });
}, ExpenseController.uploadReceipt);

// Delete a receipt from an expense by index
router.delete('/expenses/:id/receipts/:index', authenticateToken, authorize('ENGINEER_AND_ABOVE'), ExpenseController.deleteReceipt);

// ==========================================
// COST ANALYSIS ROUTES
// ==========================================

// Compare costs across projects
router.get('/analysis/compare', authenticateToken, CostAnalysisController.compareCosts);

// Get cost overview for a project
router.get('/analysis/overview/:projectId', authenticateToken, CostAnalysisController.getCostOverview);

// Budget vs actual (project.budget vs sum of expenses)
router.get('/analysis/budget-vs-actual/:projectId', authenticateToken, CostAnalysisController.getBudgetVsActual);

// Get EVM metrics for a project
router.get('/analysis/evm/:projectId', authenticateToken, CostAnalysisController.getEVMMetrics);

// Get cost breakdown by category
router.get('/analysis/breakdown/:projectId', authenticateToken, CostAnalysisController.getCostBreakdown);

// Get cost trend over time
router.get('/analysis/trend/:projectId', authenticateToken, CostAnalysisController.getCostTrend);

// Get cost forecast
router.get('/analysis/forecast/:projectId', authenticateToken, CostAnalysisController.getCostForecast);

module.exports = router; 
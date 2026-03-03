const { Project, Budget, Expense } = require('../models');

/**
 * Cost Authorization Middleware
 * Handles project-based access control and approval permissions for cost management
 */

/**
 * Check if user has access to a project
 */
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;

    if (!projectId) {
      return next(); // No project context, allow through
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Admin has access to all projects
    if (req.user?.role === 'ADMIN') {
      req.project = project;
      return next();
    }

    // Project manager has access to their projects
    if (project.projectManagerId === req.user?.id) {
      req.project = project;
      return next();
    }

    // Check if user is assigned to any tasks in this project
    // (This could be expanded based on your user-project relationship model)
    
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this project'
    });
  } catch (error) {
    console.error('Project access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking project access',
      error: error.message
    });
  }
};

/**
 * Check if user can approve expenses
 */
const canApproveExpenses = (req, res, next) => {
  const allowedRoles = ['ADMIN', 'PROJECT_MANAGER', 'FINANCE_MANAGER'];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to approve expenses'
    });
  }

  next();
};

/**
 * Check if user can approve budgets
 */
const canApproveBudgets = (req, res, next) => {
  const allowedRoles = ['ADMIN', 'FINANCE_MANAGER'];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to approve budgets'
    });
  }

  next();
};

/**
 * Check if user can manage costs
 */
const canManageCosts = (req, res, next) => {
  const allowedRoles = ['ADMIN', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'ACCOUNTANT'];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to manage costs'
    });
  }

  next();
};

/**
 * Check threshold-based approval requirements
 * Expenses above certain thresholds require higher-level approval
 */
const checkApprovalThreshold = (thresholds = { manager: 5000, director: 25000, executive: 100000 }) => {
  return async (req, res, next) => {
    const { amount } = req.body;
    const expenseAmount = parseFloat(amount) || 0;

    if (expenseAmount > thresholds.executive) {
      // Requires executive approval
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: `Expenses over $${thresholds.executive} require executive approval`,
          requiredApproval: 'EXECUTIVE'
        });
      }
    } else if (expenseAmount > thresholds.director) {
      // Requires director approval
      const allowedRoles = ['ADMIN', 'DIRECTOR'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: `Expenses over $${thresholds.director} require director approval`,
          requiredApproval: 'DIRECTOR'
        });
      }
    } else if (expenseAmount > thresholds.manager) {
      // Requires manager approval
      const allowedRoles = ['ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'FINANCE_MANAGER'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: `Expenses over $${thresholds.manager} require manager approval`,
          requiredApproval: 'MANAGER'
        });
      }
    }

    next();
  };
};

/**
 * Check if user owns the expense (for editing/deleting)
 */
const checkExpenseOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Admin can modify any expense
    if (req.user?.role === 'ADMIN') {
      req.expense = expense;
      return next();
    }

    // Owner can modify their own pending expenses
    if (expense.submittedBy === req.user?.id && expense.status === 'PENDING') {
      req.expense = expense;
      return next();
    }

    // Project manager can modify expenses in their projects
    const project = await Project.findByPk(expense.projectId);
    if (project && project.projectManagerId === req.user?.id) {
      req.expense = expense;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to modify this expense'
    });
  } catch (error) {
    console.error('Expense ownership check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking expense ownership',
      error: error.message
    });
  }
};

/**
 * Check if user can modify budget
 */
const checkBudgetModifyPermission = async (req, res, next) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findByPk(id);
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Admin can modify any budget
    if (req.user?.role === 'ADMIN') {
      req.budget = budget;
      return next();
    }

    // Only allow modification of non-closed budgets
    if (budget.status === 'CLOSED') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify closed budgets'
      });
    }

    // Project manager can modify budgets in their projects
    const project = await Project.findByPk(budget.projectId);
    if (project && project.projectManagerId === req.user?.id) {
      req.budget = budget;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to modify this budget'
    });
  } catch (error) {
    console.error('Budget permission check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking budget permissions',
      error: error.message
    });
  }
};

/**
 * Audit logging middleware for cost-related actions
 */
const auditCostAction = (action) => {
  return (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json function to log after response
    res.json = (data) => {
      if (data.success) {
        console.log(`[COST AUDIT] ${new Date().toISOString()} | User: ${req.user?.id || 'unknown'} | Action: ${action} | Path: ${req.path} | Success: true`);
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  checkProjectAccess,
  canApproveExpenses,
  canApproveBudgets,
  canManageCosts,
  checkApprovalThreshold,
  checkExpenseOwnership,
  checkBudgetModifyPermission,
  auditCostAction
};

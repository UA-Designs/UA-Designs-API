const { Budget, Project, Expense, User } = require('../../models');
const { Op } = require('sequelize');

/**
 * Budget Controller
 * Handles CRUD operations for budgets in the Cost Management system
 * PMBOK Knowledge Area: Project Cost Management - Determine Budget
 */
class BudgetController {
  /**
   * Create a new budget
   * POST /api/cost/budgets
   */
  static async createBudget(req, res) {
    try {
      const {
        name,
        amount,
        currency = 'USD',
        description,
        projectId,
        startDate,
        endDate,
        contingency = 0,
        managementReserve = 0
      } = req.body;

      // Validate required fields
      if (!name || !amount || !projectId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, amount, and projectId are required'
        });
      }

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const budget = await Budget.create({
        name,
        amount: parseFloat(amount),
        currency,
        description,
        projectId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        contingency: parseFloat(contingency),
        managementReserve: parseFloat(managementReserve),
        status: 'PLANNED',
        createdBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    } catch (error) {
      console.error('Create budget error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create budget',
        error: error.message
      });
    }
  }

  /**
   * Get all budgets with filtering and pagination
   * GET /api/cost/budgets
   */
  static async getAllBudgets(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        projectId,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (projectId) whereClause.projectId = projectId;
      if (status) whereClause.status = status;

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: budgets } = await Budget.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'status']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          budgets,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            hasNext: offset + budgets.length < count,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get budgets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budgets',
        error: error.message
      });
    }
  }

  /**
   * Get a single budget by ID with expense details
   * GET /api/cost/budgets/:id
   */
  static async getBudgetById(req, res) {
    try {
      const { id } = req.params;

      const budget = await Budget.findByPk(id, {
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'status']
          },
          {
            model: Expense,
            as: 'expenses',
            attributes: ['id', 'name', 'amount', 'status', 'date', 'category']
          }
        ]
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      // Calculate budget utilization
      const expenses = budget.expenses || [];
      const totalSpent = expenses
        .filter(e => ['APPROVED', 'PAID'].includes(e.status))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const utilization = budget.amount > 0 ? (totalSpent / parseFloat(budget.amount)) * 100 : 0;
      const remaining = parseFloat(budget.amount) - totalSpent;

      res.json({
        success: true,
        data: {
          ...budget.toJSON(),
          metrics: {
            totalSpent,
            remaining,
            utilization: Math.round(utilization * 100) / 100,
            isOverBudget: remaining < 0
          }
        }
      });
    } catch (error) {
      console.error('Get budget by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budget',
        error: error.message
      });
    }
  }

  /**
   * Update a budget
   * PUT /api/cost/budgets/:id
   */
  static async updateBudget(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const budget = await Budget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      // Prevent updating closed budgets
      if (budget.status === 'CLOSED' && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify closed budgets without admin privileges'
        });
      }

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Convert numeric fields
      if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
      if (updateData.contingency) updateData.contingency = parseFloat(updateData.contingency);
      if (updateData.managementReserve) updateData.managementReserve = parseFloat(updateData.managementReserve);

      // Convert date fields
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

      await budget.update(updateData);

      res.json({
        success: true,
        message: 'Budget updated successfully',
        data: budget
      });
    } catch (error) {
      console.error('Update budget error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update budget',
        error: error.message
      });
    }
  }

  /**
   * Delete a budget
   * DELETE /api/cost/budgets/:id
   */
  static async deleteBudget(req, res) {
    try {
      const { id } = req.params;

      const budget = await Budget.findByPk(id, {
        include: [{ model: Expense, as: 'expenses' }]
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      // Prevent deleting budgets with expenses
      if (budget.expenses && budget.expenses.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete budget with associated expenses. Remove expenses first.'
        });
      }

      await budget.destroy();

      res.json({
        success: true,
        message: 'Budget deleted successfully'
      });
    } catch (error) {
      console.error('Delete budget error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete budget',
        error: error.message
      });
    }
  }

  /**
   * Approve a budget
   * PATCH /api/cost/budgets/:id/approve
   */
  static async approveBudget(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const budget = await Budget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      if (budget.status !== 'PLANNED') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve budget with status: ${budget.status}`
        });
      }

      await budget.update({
        status: 'APPROVED',
        approvedBy: req.user?.id,
        approvedAt: new Date(),
        approvalNotes: notes
      });

      res.json({
        success: true,
        message: 'Budget approved successfully',
        data: budget
      });
    } catch (error) {
      console.error('Approve budget error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve budget',
        error: error.message
      });
    }
  }

  /**
   * Revise a budget (create new version)
   * POST /api/cost/budgets/:id/revise
   */
  static async reviseBudget(req, res) {
    try {
      const { id } = req.params;
      const { amount, reason, description } = req.body;

      const currentBudget = await Budget.findByPk(id);

      if (!currentBudget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      // Update current budget status
      await currentBudget.update({ status: 'REVISED' });

      // Create new revised budget
      const revisedBudget = await Budget.create({
        name: currentBudget.name,
        amount: amount ? parseFloat(amount) : currentBudget.amount,
        currency: currentBudget.currency,
        description: description || currentBudget.description,
        projectId: currentBudget.projectId,
        startDate: currentBudget.startDate,
        endDate: currentBudget.endDate,
        contingency: currentBudget.contingency,
        managementReserve: currentBudget.managementReserve,
        status: 'PLANNED',
        previousBudgetId: currentBudget.id,
        revisionReason: reason,
        createdBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        message: 'Budget revised successfully',
        data: {
          previousBudget: currentBudget,
          newBudget: revisedBudget
        }
      });
    } catch (error) {
      console.error('Revise budget error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revise budget',
        error: error.message
      });
    }
  }

  /**
   * Close a budget
   * PATCH /api/cost/budgets/:id/close
   */
  static async closeBudget(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const budget = await Budget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      await budget.update({
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: req.user?.id,
        closureNotes: notes
      });

      res.json({
        success: true,
        message: 'Budget closed successfully',
        data: budget
      });
    } catch (error) {
      console.error('Close budget error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to close budget',
        error: error.message
      });
    }
  }

  /**
   * Get budget utilization report
   * GET /api/cost/budgets/:id/utilization
   */
  static async getBudgetUtilization(req, res) {
    try {
      const { id } = req.params;

      const budget = await Budget.findByPk(id, {
        include: [
          {
            model: Expense,
            as: 'expenses',
            attributes: ['id', 'name', 'amount', 'status', 'date', 'category']
          }
        ]
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }

      const expenses = budget.expenses || [];
      
      // Calculate by category
      const byCategory = {};
      let totalApproved = 0;
      let totalPending = 0;
      let totalPaid = 0;

      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount);
        
        if (!byCategory[expense.category]) {
          byCategory[expense.category] = {
            count: 0,
            total: 0,
            approved: 0,
            pending: 0,
            paid: 0
          };
        }
        
        byCategory[expense.category].count++;
        byCategory[expense.category].total += amount;
        
        if (expense.status === 'APPROVED') {
          byCategory[expense.category].approved += amount;
          totalApproved += amount;
        }
        if (expense.status === 'PENDING') {
          byCategory[expense.category].pending += amount;
          totalPending += amount;
        }
        if (expense.status === 'PAID') {
          byCategory[expense.category].paid += amount;
          totalPaid += amount;
        }
      });

      const budgetAmount = parseFloat(budget.amount);
      const totalCommitted = totalApproved + totalPaid;
      const remaining = budgetAmount - totalCommitted;
      const utilizationPercent = budgetAmount > 0 ? (totalCommitted / budgetAmount) * 100 : 0;

      res.json({
        success: true,
        data: {
          budgetId: budget.id,
          budgetName: budget.name,
          budgetAmount,
          currency: budget.currency,
          summary: {
            totalCommitted,
            totalApproved,
            totalPending,
            totalPaid,
            remaining,
            utilizationPercent: Math.round(utilizationPercent * 100) / 100,
            isOverBudget: remaining < 0
          },
          byCategory,
          expenseCount: expenses.length
        }
      });
    } catch (error) {
      console.error('Get budget utilization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budget utilization',
        error: error.message
      });
    }
  }
}

module.exports = BudgetController;

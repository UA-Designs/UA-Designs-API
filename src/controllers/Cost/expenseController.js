const { Expense, Budget, Project, Task, User, CostCategory } = require('../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads/receipts');

/**
 * Expense Controller
 * Handles CRUD operations for expenses in the Cost Management system
 * PMBOK Knowledge Area: Project Cost Management - Control Costs
 */
class ExpenseController {
  /**
   * Create a new expense
   * POST /api/cost/expenses
   */
  static async createExpense(req, res) {
    try {
      const {
        name,
        description,
        amount,
        currency = 'PHP',
        category,
        subcategory,
        date,
        vendor,
        invoiceNumber,
        receiptNumber,
        projectId,
        taskId,
        budgetId,
        categoryId,
        notes,
        tags
      } = req.body;

      // Validate required fields
      if (!name || !amount || !category || !date || !projectId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, amount, category, date, and projectId are required'
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

      // Validate budget exists if budgetId provided
      if (budgetId) {
        const budget = await Budget.findByPk(budgetId);
        if (!budget) {
          return res.status(404).json({
            success: false,
            message: 'Budget not found'
          });
        }
      }

      // Validate task exists if taskId provided
      if (taskId) {
        const task = await Task.findByPk(taskId);
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Task not found'
          });
        }
      }

      const expense = await Expense.create({
        name,
        description,
        amount: parseFloat(amount),
        currency,
        category,
        subcategory,
        date: new Date(date),
        vendor,
        invoiceNumber,
        receiptNumber,
        projectId,
        taskId,
        budgetId,
        categoryId,
        notes,
        tags,
        status: 'PENDING',
        submittedBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: expense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create expense',
        error: error.message
      });
    }
  }

  /**
   * Get all expenses with filtering and pagination
   * GET /api/cost/expenses
   */
  static async getAllExpenses(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        projectId,
        budgetId,
        taskId,
        category,
        status,
        vendor,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        sortBy = 'date',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (projectId) whereClause.projectId = projectId;
      if (budgetId) whereClause.budgetId = budgetId;
      if (taskId) whereClause.taskId = taskId;
      if (category) whereClause.category = category;
      if (status) whereClause.status = status;
      if (vendor) whereClause.vendor = { [Op.iLike]: `%${vendor}%` };

      // Date range filter
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate);
        if (endDate) whereClause.date[Op.lte] = new Date(endDate);
      }

      // Amount range filter
      if (minAmount || maxAmount) {
        whereClause.amount = {};
        if (minAmount) whereClause.amount[Op.gte] = parseFloat(minAmount);
        if (maxAmount) whereClause.amount[Op.lte] = parseFloat(maxAmount);
      }

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { vendor: { [Op.iLike]: `%${search}%` } },
          { invoiceNumber: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: expenses } = await Expense.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name']
          },
          {
            model: Budget,
            as: 'budget',
            attributes: ['id', 'name', 'amount']
          },
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          expenses,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            hasNext: offset + expenses.length < count,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expenses',
        error: error.message
      });
    }
  }

  /**
   * Get a single expense by ID
   * GET /api/cost/expenses/:id
   */
  static async getExpenseById(req, res) {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id, {
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name', 'status']
          },
          {
            model: Budget,
            as: 'budget',
            attributes: ['id', 'name', 'amount', 'status']
          },
          {
            model: Task,
            as: 'task',
            attributes: ['id', 'name', 'status']
          },
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      res.json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error('Get expense by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expense',
        error: error.message
      });
    }
  }

  /**
   * Update an expense
   * PUT /api/cost/expenses/:id
   */
  static async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Only allow updates to pending expenses (unless admin)
      if (expense.status !== 'PENDING' && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Can only modify pending expenses. Contact admin for changes to approved/paid expenses.'
        });
      }

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.submittedBy;
      delete updateData.approvedBy;
      delete updateData.approvedAt;

      // Convert numeric and date fields
      if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
      if (updateData.date) updateData.date = new Date(updateData.date);

      await expense.update(updateData);

      res.json({
        success: true,
        message: 'Expense updated successfully',
        data: expense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update expense',
        error: error.message
      });
    }
  }

  /**
   * Delete an expense
   * DELETE /api/cost/expenses/:id
   */
  static async deleteExpense(req, res) {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Prevent deleting paid expenses
      if (expense.status === 'PAID') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete paid expenses'
        });
      }

      await expense.destroy();

      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete expense',
        error: error.message
      });
    }
  }

  /**
   * Approve an expense
   * PATCH /api/cost/expenses/:id/approve
   */
  static async approveExpense(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      if (expense.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve expense with status: ${expense.status}`
        });
      }

      await expense.update({
        status: 'APPROVED',
        approvedBy: req.user?.id,
        approvedAt: new Date(),
        approvalNotes: notes
      });

      res.json({
        success: true,
        message: 'Expense approved successfully',
        data: expense
      });
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve expense',
        error: error.message
      });
    }
  }

  /**
   * Reject an expense
   * PATCH /api/cost/expenses/:id/reject
   */
  static async rejectExpense(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      if (expense.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Cannot reject expense with status: ${expense.status}`
        });
      }

      await expense.update({
        status: 'REJECTED',
        rejectedBy: req.user?.id,
        rejectedAt: new Date(),
        rejectionReason: reason
      });

      res.json({
        success: true,
        message: 'Expense rejected',
        data: expense
      });
    } catch (error) {
      console.error('Reject expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject expense',
        error: error.message
      });
    }
  }

  /**
   * Mark an expense as paid
   * PATCH /api/cost/expenses/:id/pay
   */
  static async markExpenseAsPaid(req, res) {
    try {
      const { id } = req.params;
      const { paymentDate, paymentReference, paymentMethod } = req.body;

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      if (expense.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Only approved expenses can be marked as paid'
        });
      }

      await expense.update({
        status: 'PAID',
        paidAt: paymentDate ? new Date(paymentDate) : new Date(),
        paymentReference,
        paymentMethod,
        paidBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'Expense marked as paid',
        data: expense
      });
    } catch (error) {
      console.error('Mark expense as paid error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark expense as paid',
        error: error.message
      });
    }
  }

  /**
   * Bulk approve expenses
   * POST /api/cost/expenses/bulk-approve
   */
  static async bulkApproveExpenses(req, res) {
    try {
      const { expenseIds, notes } = req.body;

      if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Expense IDs array is required'
        });
      }

      const results = {
        approved: [],
        failed: []
      };

      for (const expenseId of expenseIds) {
        try {
          const expense = await Expense.findByPk(expenseId);
          if (expense && expense.status === 'PENDING') {
            await expense.update({
              status: 'APPROVED',
              approvedBy: req.user?.id,
              approvedAt: new Date(),
              approvalNotes: notes
            });
            results.approved.push(expenseId);
          } else {
            results.failed.push({
              id: expenseId,
              reason: expense ? `Invalid status: ${expense.status}` : 'Not found'
            });
          }
        } catch (err) {
          results.failed.push({ id: expenseId, reason: err.message });
        }
      }

      res.json({
        success: true,
        message: `Approved ${results.approved.length} expenses`,
        data: results
      });
    } catch (error) {
      console.error('Bulk approve expenses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk approve expenses',
        error: error.message
      });
    }
  }

  /**
   * Get expense summary by category for a project
   * GET /api/cost/expenses/summary/:projectId
   */
  static async getExpenseSummary(req, res) {
    try {
      const { projectId } = req.params;
      const { startDate, endDate } = req.query;

      const whereClause = { projectId };
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate);
        if (endDate) whereClause.date[Op.lte] = new Date(endDate);
      }

      const expenses = await Expense.findAll({
        where: whereClause,
        attributes: ['category', 'amount', 'status']
      });

      // Calculate summary
      const summary = {
        byCategory: {},
        byStatus: {},
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        paid: 0,
        count: expenses.length
      };

      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount);
        
        // By category
        if (!summary.byCategory[expense.category]) {
          summary.byCategory[expense.category] = { count: 0, total: 0 };
        }
        summary.byCategory[expense.category].count++;
        summary.byCategory[expense.category].total += amount;
        
        // By status
        if (!summary.byStatus[expense.status]) {
          summary.byStatus[expense.status] = { count: 0, total: 0 };
        }
        summary.byStatus[expense.status].count++;
        summary.byStatus[expense.status].total += amount;
        
        // Totals by status
        summary.total += amount;
        if (expense.status === 'APPROVED') summary.approved += amount;
        if (expense.status === 'PENDING') summary.pending += amount;
        if (expense.status === 'REJECTED') summary.rejected += amount;
        if (expense.status === 'PAID') summary.paid += amount;
      });

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get expense summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expense summary',
        error: error.message
      });
    }
  }
  /**
   * Upload a receipt to an expense
   * POST /api/cost/expenses/:id/receipts
   */
  static async uploadReceipt(req, res) {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id);
      if (!expense) {
        // Clean up the uploaded file if expense not found
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Permission check: owner, ADMIN, or PROJECT_MANAGER
      const userRole = req.user?.role;
      const isOwner = expense.submittedBy === req.user?.id;
      if (!isOwner && !['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          success: false,
          message: 'Forbidden: only the expense owner, ADMIN, or PROJECT_MANAGER can upload receipts'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided. Send a file as the "receipt" field in multipart/form-data.'
        });
      }

      const currentAttachments = expense.attachments || [];
      if (currentAttachments.length >= 5) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          success: false,
          message: 'Maximum of 5 receipts per expense has been reached'
        });
      }

      const attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/receipts/${req.file.filename}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.id
      };

      await expense.update({ attachments: [...currentAttachments, attachment] });

      res.json({
        success: true,
        message: 'Receipt uploaded successfully',
        data: expense
      });
    } catch (error) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error('Upload receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload receipt',
        error: error.message
      });
    }
  }

  /**
   * Delete a receipt from an expense by attachment index
   * DELETE /api/cost/expenses/:id/receipts/:index
   */
  static async deleteReceipt(req, res) {
    try {
      const { id, index } = req.params;
      const attachmentIndex = parseInt(index, 10);

      const expense = await Expense.findByPk(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Permission check: owner, ADMIN, or PROJECT_MANAGER
      const userRole = req.user?.role;
      const isOwner = expense.submittedBy === req.user?.id;
      if (!isOwner && !['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: only the expense owner, ADMIN, or PROJECT_MANAGER can delete receipts'
        });
      }

      const currentAttachments = expense.attachments || [];
      if (isNaN(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= currentAttachments.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid attachment index: ${index}. Valid range is 0–${currentAttachments.length - 1}.`
        });
      }

      const attachment = currentAttachments[attachmentIndex];

      // Delete file from disk
      const filePath = path.join(UPLOAD_DIR, attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Failed to delete receipt file:', err);
        });
      }

      const updatedAttachments = currentAttachments.filter((_, i) => i !== attachmentIndex);
      await expense.update({ attachments: updatedAttachments });

      res.json({
        success: true,
        message: 'Receipt deleted successfully',
        data: expense
      });
    } catch (error) {
      console.error('Delete receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete receipt',
        error: error.message
      });
    }
  }
}

module.exports = ExpenseController;

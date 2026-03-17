const { Cost, Project, Task, User } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cost Controller
 * Handles CRUD operations for costs in the Cost Management system
 * PMBOK Knowledge Area: Project Cost Management
 */
class CostController {
  /**
   * Create a new cost entry
   * POST /api/cost/costs
   */
  static async createCost(req, res) {
    try {
      const {
        name,
        type,
        amount,
        currency = 'PHP',
        date,
        description,
        taskId,
        projectId,
        estimatedQty,
        unitCost,
        unit,
        actualQty,
        actualAmount,
        amountReceived
      } = req.body;

      // Validate required fields (projectId required so BOQ item shows in project list)
      if (!name || !type || (!amount && !(estimatedQty && unitCost)) || !date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type, date, and either amount or (estimatedQty and unitCost) are required'
        });
      }
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'projectId is required so the BOQ item appears in the project list'
        });
      }

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
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

      const parsedEstimatedQty = estimatedQty !== undefined && estimatedQty !== null
        ? parseFloat(estimatedQty)
        : null;
      const parsedUnitCost = unitCost !== undefined && unitCost !== null
        ? parseFloat(unitCost)
        : null;
      const parsedActualQty = actualQty !== undefined && actualQty !== null
        ? parseFloat(actualQty)
        : 0;
      const parsedActualAmount = actualAmount !== undefined && actualAmount !== null
        ? parseFloat(actualAmount)
        : 0;
      const parsedAmountReceived = amountReceived !== undefined && amountReceived !== null
        ? parseFloat(amountReceived)
        : 0;

      const finalAmount = amount !== undefined && amount !== null
        ? parseFloat(amount)
        : (parsedEstimatedQty !== null && parsedUnitCost !== null
          ? parsedEstimatedQty * parsedUnitCost
          : null);

      if (finalAmount === null) {
        return res.status(400).json({
          success: false,
          message: 'Unable to determine amount. Provide amount or both estimatedQty and unitCost.'
        });
      }

      const cost = await Cost.create({
        name,
        type,
        estimatedQty: parsedEstimatedQty,
        unitCost: parsedUnitCost,
        amount: finalAmount,
        unit: unit || null,
        currency,
        date: new Date(date),
        description,
        taskId,
        projectId,
        actualQty: parsedActualQty,
        actualAmount: parsedActualAmount,
        amountReceived: parsedAmountReceived,
        status: 'PENDING'
      });

      res.status(201).json({
        success: true,
        message: 'Cost created successfully',
        data: cost
      });
    } catch (error) {
      console.error('Create cost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create cost',
        error: error.message
      });
    }
  }

  /**
   * Get all costs with filtering and pagination
   * GET /api/cost/costs
   */
  static async getAllCosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        projectId,
        taskId,
        type,
        status,
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
      if (taskId) whereClause.taskId = taskId;
      if (type) whereClause.type = type;
      if (status) whereClause.status = status;

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
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: costs } = await Cost.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Compute varianceStatus for each cost based on remaining percentage
      const enrichedCosts = costs.map(cost => {
        const plain = cost.toJSON();
        const amount = plain.amount !== null && plain.amount !== undefined ? parseFloat(plain.amount) : null;
        const amountReceived = plain.amountReceived !== null && plain.amountReceived !== undefined
          ? parseFloat(plain.amountReceived)
          : null;

        let varianceStatus = null;

        if (amount !== null && amountReceived !== null && amount > 0) {
          const remaining = Math.max(0, amount - amountReceived);
          const remainingPct = (remaining / amount) * 100;

          if (remainingPct <= 10) {
            varianceStatus = 'CRITICAL';
          } else if (remainingPct < 20) {
            varianceStatus = 'LOW';
          } else {
            varianceStatus = 'OK';
          }
        }

        return {
          ...plain,
          varianceStatus
        };
      });

      res.json({
        success: true,
        data: {
          costs: enrichedCosts,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            hasNext: offset + costs.length < count,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get costs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch costs',
        error: error.message
      });
    }
  }

  /**
   * Get a single cost by ID
   * GET /api/cost/costs/:id
   */
  static async getCostById(req, res) {
    try {
      const { id } = req.params;

      const cost = await Cost.findByPk(id);

      if (!cost) {
        return res.status(404).json({
          success: false,
          message: 'Cost not found'
        });
      }

      res.json({
        success: true,
        data: (() => {
          const plain = cost.toJSON();
          const amount = plain.amount !== null && plain.amount !== undefined ? parseFloat(plain.amount) : null;
          const amountReceived = plain.amountReceived !== null && plain.amountReceived !== undefined
            ? parseFloat(plain.amountReceived)
            : null;

          let varianceStatus = null;

          if (amount !== null && amountReceived !== null && amount > 0) {
            const remaining = Math.max(0, amount - amountReceived);
            const remainingPct = (remaining / amount) * 100;

            if (remainingPct <= 10) {
              varianceStatus = 'CRITICAL';
            } else if (remainingPct < 20) {
              varianceStatus = 'LOW';
            } else {
              varianceStatus = 'OK';
            }
          }

          return {
            ...plain,
            varianceStatus
          };
        })()
      });
    } catch (error) {
      console.error('Get cost by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cost',
        error: error.message
      });
    }
  }

  /**
   * Update a cost entry
   * PUT /api/cost/costs/:id
   */
  static async updateCost(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const cost = await Cost.findByPk(id);

      if (!cost) {
        return res.status(404).json({
          success: false,
          message: 'Cost not found'
        });
      }

      // Prevent updating approved/paid costs without proper authorization
      if (['APPROVED', 'PAID'].includes(cost.status) && !['ADMIN', 'PROPRIETOR'].includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify approved or paid costs without admin privileges'
        });
      }

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Convert numeric fields
      if (updateData.amount !== undefined && updateData.amount !== null) {
        updateData.amount = parseFloat(updateData.amount);
      }
      if (updateData.estimatedQty !== undefined && updateData.estimatedQty !== null) {
        updateData.estimatedQty = parseFloat(updateData.estimatedQty);
      }
      if (updateData.unitCost !== undefined && updateData.unitCost !== null) {
        updateData.unitCost = parseFloat(updateData.unitCost);
      }
      if (updateData.actualQty !== undefined && updateData.actualQty !== null) {
        updateData.actualQty = parseFloat(updateData.actualQty);
      }
      if (updateData.actualAmount !== undefined && updateData.actualAmount !== null) {
        updateData.actualAmount = parseFloat(updateData.actualAmount);
      }
      if (updateData.date) updateData.date = new Date(updateData.date);

      // If estimatedQty or unitCost changed and amount not explicitly provided, recompute amount
      const willUpdateEstimated = Object.prototype.hasOwnProperty.call(updateData, 'estimatedQty');
      const willUpdateUnitCost = Object.prototype.hasOwnProperty.call(updateData, 'unitCost');
      const amountProvided = Object.prototype.hasOwnProperty.call(updateData, 'amount');

      if (!amountProvided && (willUpdateEstimated || willUpdateUnitCost)) {
        const newEstimated = willUpdateEstimated ? updateData.estimatedQty : cost.estimatedQty;
        const newUnitCost = willUpdateUnitCost ? updateData.unitCost : cost.unitCost;

        if (newEstimated !== null && newEstimated !== undefined &&
            newUnitCost !== null && newUnitCost !== undefined) {
          updateData.amount = parseFloat(newEstimated) * parseFloat(newUnitCost);
        }
      }

      await cost.update(updateData);

      res.json({
        success: true,
        message: 'Cost updated successfully',
        data: cost
      });
    } catch (error) {
      console.error('Update cost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cost',
        error: error.message
      });
    }
  }

  /**
   * Delete a cost entry
   * DELETE /api/cost/costs/:id
   */
  static async deleteCost(req, res) {
    try {
      const { id } = req.params;

      const cost = await Cost.findByPk(id);

      if (!cost) {
        return res.status(404).json({
          success: false,
          message: 'Cost not found'
        });
      }

      // Prevent deleting paid costs
      if (cost.status === 'PAID') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete paid costs'
        });
      }

      await cost.destroy();

      res.json({
        success: true,
        message: 'Cost deleted successfully'
      });
    } catch (error) {
      console.error('Delete cost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete cost',
        error: error.message
      });
    }
  }

  /**
   * Update cost status (approve/reject)
   * PATCH /api/cost/costs/:id/status
   */
  static async updateCostStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const cost = await Cost.findByPk(id);

      if (!cost) {
        return res.status(404).json({
          success: false,
          message: 'Cost not found'
        });
      }

      await cost.update({
        status,
        notes: notes || cost.notes
      });

      res.json({
        success: true,
        message: `Cost ${status.toLowerCase()} successfully`,
        data: cost
      });
    } catch (error) {
      console.error('Update cost status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cost status',
        error: error.message
      });
    }
  }

  /**
   * Get cost summary by type
   * GET /api/cost/costs/summary
   */
  static async getCostSummary(req, res) {
    try {
      const { projectId, startDate, endDate } = req.query;

      const whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate);
        if (endDate) whereClause.date[Op.lte] = new Date(endDate);
      }

      const costs = await Cost.findAll({
        where: whereClause,
        attributes: ['type', 'amount', 'status']
      });

      // Calculate summary by type
      const summary = {
        byType: {},
        byStatus: {},
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        paid: 0
      };

      costs.forEach(cost => {
        const amount = parseFloat(cost.amount);
        
        // By type
        if (!summary.byType[cost.type]) {
          summary.byType[cost.type] = { count: 0, total: 0 };
        }
        summary.byType[cost.type].count++;
        summary.byType[cost.type].total += amount;
        
        // By status
        if (!summary.byStatus[cost.status]) {
          summary.byStatus[cost.status] = { count: 0, total: 0 };
        }
        summary.byStatus[cost.status].count++;
        summary.byStatus[cost.status].total += amount;
        
        // Totals
        summary.total += amount;
        if (cost.status === 'APPROVED') summary.approved += amount;
        if (cost.status === 'PENDING') summary.pending += amount;
        if (cost.status === 'REJECTED') summary.rejected += amount;
        if (cost.status === 'PAID') summary.paid += amount;
      });

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get cost summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cost summary',
        error: error.message
      });
    }
  }
}

module.exports = CostController;

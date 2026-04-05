const { SiteUsage, Cost, Project, sequelize } = require('../../models');

class SiteUsageController {
  /**
   * Create a new site usage entry and update aggregates on the related cost.
   * POST /api/cost/site-usage
   */
  static async createSiteUsage(req, res) {
    try {
      const { projectId, costId, date, quantityUsed, notes } = req.body;

      if (!projectId || !costId || !date || quantityUsed === undefined || quantityUsed === null) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: projectId, costId, date, quantityUsed are required'
        });
      }

      const qty = parseFloat(quantityUsed);
      if (Number.isNaN(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: 'quantityUsed must be a non-negative number'
        });
      }

      const result = await sequelize.transaction(async (transaction) => {
        const project = await Project.findByPk(projectId, { transaction });
        if (!project) {
          const error = new Error('Project not found');
          error.statusCode = 404;
          throw error;
        }

        // Lock cost row so usage writes for the same BOQ line serialize safely.
        const cost = await Cost.findByPk(costId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!cost) {
          const error = new Error('Cost not found');
          error.statusCode = 404;
          throw error;
        }

        if (String(cost.projectId) !== String(projectId)) {
          const error = new Error('Cost does not belong to the provided projectId');
          error.statusCode = 400;
          throw error;
        }

        const usage = await SiteUsage.create({
          projectId,
          costId,
          date: new Date(date),
          quantityUsed: qty,
          notes: notes || null
        }, { transaction });

        // Recompute from source-of-truth logs so retries/concurrent writes stay accurate.
        const totalQty = parseFloat(await SiteUsage.sum('quantityUsed', {
          where: { costId },
          transaction
        }) || 0);
        const unitCost = cost.unitCost ? parseFloat(cost.unitCost) : 0;
        const amountReceived = unitCost > 0 ? totalQty * unitCost : 0;

        await cost.update({
          actualQty: totalQty,
          amountReceived
        }, { transaction });

        return {
          usage,
          aggregates: {
            actualQty: totalQty,
            amountReceived
          }
        };
      });

      res.status(201).json({
        success: true,
        message: 'Site usage created successfully',
        data: {
          usage: result.usage,
          aggregates: result.aggregates
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      console.error('Create site usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create site usage',
        error: error.message
      });
    }
  }

  /**
   * Get site usage entries for a project and/or cost
   * GET /api/cost/site-usage
   */
  static async getSiteUsage(req, res) {
    try {
      const { projectId, costId } = req.query;

      const whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (costId) whereClause.costId = costId;

      const usage = await SiteUsage.findAll({
        where: whereClause,
        order: [['date', 'ASC']]
      });

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Get site usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch site usage',
        error: error.message
      });
    }
  }
}

module.exports = SiteUsageController;


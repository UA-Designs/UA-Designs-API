const { SiteUsage, Cost, Project } = require('../../models');

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

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const cost = await Cost.findByPk(costId);
      if (!cost) {
        return res.status(404).json({
          success: false,
          message: 'Cost not found'
        });
      }

      const usage = await SiteUsage.create({
        projectId,
        costId,
        date: new Date(date),
        quantityUsed: qty,
        notes: notes || null
      });

      // Recompute aggregates for this cost
      const totalQty = parseFloat(await SiteUsage.sum('quantityUsed', { where: { costId } }) || 0);
      const unitCost = cost.unitCost ? parseFloat(cost.unitCost) : 0;
      const amountReceived = unitCost > 0 ? totalQty * unitCost : 0;

      await cost.update({
        actualQty: totalQty,
        amountReceived
      });

      res.status(201).json({
        success: true,
        message: 'Site usage created successfully',
        data: {
          usage,
          aggregates: {
            actualQty: totalQty,
            amountReceived
          }
        }
      });
    } catch (error) {
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


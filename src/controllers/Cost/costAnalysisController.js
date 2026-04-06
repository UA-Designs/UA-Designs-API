const { Budget, Expense, Project, Task } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cost Analysis Controller
 * Provides cost overview, EVM metrics, and reporting endpoints
 * PMBOK Knowledge Area: Project Cost Management - Control Costs
 */
class CostAnalysisController {
  static round2(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  static round3(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 1000) / 1000;
  }

  static buildCompleteness(project, tasks, expenses, totalBudget) {
    const hasBudgetBaseline = totalBudget > 0;
    const hasScheduleBaseline = Boolean(project?.startDate && project?.endDate);
    const hasActualCosts = expenses.length > 0;
    const hasProgressData = tasks.some(t => Number.isFinite(Number(t.progress)));
    const missingFields = [];
    if (!hasBudgetBaseline) missingFields.push('totalBudget');
    if (!hasScheduleBaseline) missingFields.push('project.startDate', 'project.endDate');
    if (!hasActualCosts) missingFields.push('actualCost');
    if (!hasProgressData) missingFields.push('earnedValue');
    return {
      hasBudgetBaseline,
      hasScheduleBaseline,
      hasActualCosts,
      hasProgressData,
      missingFields: [...new Set(missingFields)]
    };
  }

  static buildStatusAndNotes(dataCompleteness) {
    const calculationStatus = dataCompleteness.missingFields.length === 0 ? 'complete' : 'partial';
    const notes = [];
    if (!dataCompleteness.hasBudgetBaseline) notes.push('Budget baseline is missing; budget-dependent metrics may be partial.');
    if (!dataCompleteness.hasScheduleBaseline) notes.push('Schedule baseline dates are missing; planned value is defaulted to 0.');
    if (!dataCompleteness.hasActualCosts) notes.push('No approved/paid actual costs found; actualCost and cost-derived indices use safe defaults.');
    if (!dataCompleteness.hasProgressData) notes.push('Task progress data is missing; earnedValue is defaulted to 0.');
    return { calculationStatus, notes };
  }

  static async collectEvmInputs(projectId, reportDate = new Date()) {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const [tasks, expenses, budgets] = await Promise.all([
      Task.findAll({ where: { projectId } }),
      Expense.findAll({
        where: {
          projectId,
          status: { [Op.in]: ['APPROVED', 'PAID'] },
          date: { [Op.lte]: reportDate }
        }
      }),
      Budget.findAll({
        where: { projectId, status: { [Op.in]: ['APPROVED', 'PLANNED'] } }
      })
    ]);

    const approvedBudget = budgets
      .filter(b => b.status === 'APPROVED')
      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const plannedBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const totalBudget = approvedBudget > 0 ? approvedBudget : (plannedBudget > 0 ? plannedBudget : parseFloat(project.budget || 0));

    const projectStart = project.startDate ? new Date(project.startDate) : null;
    const projectEnd = project.endDate ? new Date(project.endDate) : null;
    let plannedProgressPct = 0;
    if (projectStart && projectEnd && projectEnd > projectStart) {
      const totalDuration = projectEnd - projectStart;
      const elapsedDuration = reportDate - projectStart;
      plannedProgressPct = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    }

    const taskProgressValues = tasks
      .map(t => Number(t.progress))
      .filter(v => Number.isFinite(v));
    const actualProgressPct = taskProgressValues.length
      ? taskProgressValues.reduce((sum, p) => sum + p, 0) / taskProgressValues.length
      : 0;

    const plannedValue = (plannedProgressPct / 100) * totalBudget;
    const earnedValue = (actualProgressPct / 100) * totalBudget;
    const actualCost = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const cpi = actualCost > 0 ? earnedValue / actualCost : 0;
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 0;
    const costVariance = earnedValue - actualCost;
    const scheduleVariance = earnedValue - plannedValue;
    const budgetUsedPct = totalBudget > 0 ? (actualCost / totalBudget) * 100 : 0;
    const eac = cpi > 0 ? totalBudget / cpi : totalBudget;
    const etc = eac - actualCost;
    const vac = totalBudget - eac;
    const tcpiDenominator = totalBudget - actualCost;
    const tcpi = tcpiDenominator > 0 ? (totalBudget - earnedValue) / tcpiDenominator : 0;

    const dataCompleteness = CostAnalysisController.buildCompleteness(project, tasks, expenses, totalBudget);
    const { calculationStatus, notes } = CostAnalysisController.buildStatusAndNotes(dataCompleteness);

    return {
      project,
      tasks,
      expenses,
      budgets,
      totalBudget: CostAnalysisController.round2(totalBudget),
      plannedValue: CostAnalysisController.round2(plannedValue),
      earnedValue: CostAnalysisController.round2(earnedValue),
      actualCost: CostAnalysisController.round2(actualCost),
      cpi: CostAnalysisController.round3(cpi),
      spi: CostAnalysisController.round3(spi),
      costVariance: CostAnalysisController.round2(costVariance),
      scheduleVariance: CostAnalysisController.round2(scheduleVariance),
      budgetUsedPct: CostAnalysisController.round2(budgetUsedPct),
      eac: CostAnalysisController.round2(eac),
      etc: CostAnalysisController.round2(etc),
      vac: CostAnalysisController.round2(vac),
      tcpi: CostAnalysisController.round3(tcpi),
      dataCompleteness,
      calculationStatus,
      notes
    };
  }

  /**
   * Get cost overview for a project
   * GET /api/cost/analysis/overview/:projectId
   */
  static async getCostOverview(req, res) {
    try {
      const { projectId } = req.params;

      const inputs = await CostAnalysisController.collectEvmInputs(projectId, new Date());
      if (!inputs) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const { project, totalBudget, actualCost, costVariance, dataCompleteness, calculationStatus, notes, expenses, budgets } = inputs;
      const totalPending = expenses
        .filter(e => e.status === 'PENDING')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalPaid = expenses
        .filter(e => e.status === 'PAID')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const budgetUtilization = totalBudget > 0 ? (actualCost / totalBudget) * 100 : 0;

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          totalBudget,
          totalActualCost: actualCost,
          totalCosts: actualCost,
          variance: costVariance,
          costVariance,
          budgetUtilization: CostAnalysisController.round2(budgetUtilization),
          remaining: CostAnalysisController.round2(totalBudget - actualCost),
          totalPending: CostAnalysisController.round2(totalPending),
          totalPaid: CostAnalysisController.round2(totalPaid),
          isOverBudget: costVariance < 0,
          overview: {
            totalBudget,
            totalApproved: actualCost,
            totalPending: CostAnalysisController.round2(totalPending),
            totalPaid: CostAnalysisController.round2(totalPaid),
            remaining: CostAnalysisController.round2(totalBudget - actualCost),
            costVariance,
            budgetUtilization: CostAnalysisController.round2(budgetUtilization),
            isOverBudget: costVariance < 0
          },
          dataCompleteness,
          calculationStatus,
          notes,
          budgetCount: budgets.length,
          expenseCount: expenses.length
        }
      });
    } catch (error) {
      console.error('Get cost overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cost overview',
        error: error.message
      });
    }
  }

  /**
   * Budget vs actual (single project): project.budget vs sum of logged expenses.
   * Actual cost = every expense logged on the Expenses page for this project.
   * GET /api/cost/analysis/budget-vs-actual/:projectId
   */
  static async getBudgetVsActual(req, res) {
    try {
      const { projectId } = req.params;
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      const budget = parseFloat(project.budget || 0);
      const expenses = await Expense.findAll({
        where: { projectId },
        attributes: ['amount', 'status']
      });
      // Actual cost = sum of all expenses logged on the Expenses page (this project)
      const totalActualCost = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const variance = budget - totalActualCost;
      const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0, PAID: 0 };
      expenses.forEach(e => {
        if (byStatus[e.status] !== undefined) byStatus[e.status] += parseFloat(e.amount || 0);
      });
      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          budget,
          totalActualCost,
          variance,
          isOverBudget: variance < 0,
          expenseCount: expenses.length,
          actualCostByStatus: byStatus
        }
      });
    } catch (error) {
      console.error('Get budget vs actual error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budget vs actual',
        error: error.message
      });
    }
  }

  /**
   * Get Earned Value Management (EVM) metrics for a project
   * GET /api/cost/analysis/evm/:projectId
   */
  static async getEVMMetrics(req, res) {
    try {
      const { projectId } = req.params;
      const { asOfDate } = req.query;
      const reportDate = asOfDate ? new Date(asOfDate) : new Date();

      const inputs = await CostAnalysisController.collectEvmInputs(projectId, reportDate);
      if (!inputs) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      const {
        project,
        totalBudget,
        plannedValue,
        earnedValue,
        actualCost,
        cpi,
        spi,
        costVariance,
        scheduleVariance,
        budgetUsedPct,
        eac,
        etc,
        vac,
        tcpi,
        dataCompleteness,
        calculationStatus,
        notes
      } = inputs;

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          asOfDate: reportDate.toISOString(),
          plannedValue,
          earnedValue,
          actualCost,
          cpi,
          spi,
          totalBudget,
          costVariance,
          scheduleVariance,
          budgetUsedPct,
          dataCompleteness,
          calculationStatus,
          notes,
          // Backward-compatible fields
          baseMetrics: { BAC: totalBudget, PV: plannedValue, EV: earnedValue, AC: actualCost },
          variances: { CV: costVariance, SV: scheduleVariance },
          indices: { CPI: cpi, SPI: spi },
          forecasts: { EAC: eac, ETC: etc, VAC: vac, TCPI: tcpi }
        }
      });
    } catch (error) {
      console.error('Get EVM metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch EVM metrics',
        error: error.message
      });
    }
  }

  /**
   * Get cost breakdown by category
   * GET /api/cost/analysis/breakdown/:projectId
   */
  static async getCostBreakdown(req, res) {
    try {
      const { projectId } = req.params;
      const { startDate, endDate, groupBy = 'category' } = req.query;

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const whereClause = { projectId };
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate);
        if (endDate) whereClause.date[Op.lte] = new Date(endDate);
      }

      const expenses = await Expense.findAll({
        where: whereClause
      });

      // Group by specified field
      const breakdown = {};
      let totalAmount = 0;

      expenses.forEach(expense => {
        const key = expense[groupBy] || 'Uncategorized';
        const amount = parseFloat(expense.amount || 0);

        if (!breakdown[key]) {
          breakdown[key] = {
            count: 0,
            totalAmount: 0,
            approved: 0,
            pending: 0,
            paid: 0,
            rejected: 0
          };
        }

        breakdown[key].count++;
        breakdown[key].totalAmount += amount;
        totalAmount += amount;

        // Track by status
        const status = expense.status.toLowerCase();
        if (breakdown[key][status] !== undefined) {
          breakdown[key][status] += amount;
        }
      });

      // Calculate percentages
      const breakdownWithPercentages = Object.entries(breakdown).map(([key, value]) => ({
        [groupBy]: key,
        ...value,
        percentage: totalAmount > 0 ? Math.round((value.totalAmount / totalAmount) * 10000) / 100 : 0
      }));

      // Sort by total amount descending
      breakdownWithPercentages.sort((a, b) => b.totalAmount - a.totalAmount);

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          groupedBy: groupBy,
          totalAmount,
          breakdown: breakdownWithPercentages
        }
      });
    } catch (error) {
      console.error('Get cost breakdown error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cost breakdown',
        error: error.message
      });
    }
  }

  /**
   * Get cost trend over time
   * GET /api/cost/analysis/trend/:projectId
   */
  static async getCostTrend(req, res) {
    try {
      const { projectId } = req.params;
      const { 
        startDate, 
        endDate, 
        interval = 'month' // day, week, month
      } = req.query;

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const whereClause = {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] }
      };
      
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate);
        if (endDate) whereClause.date[Op.lte] = new Date(endDate);
      }

      const expenses = await Expense.findAll({
        where: whereClause,
        order: [['date', 'ASC']]
      });

      // Group by interval
      const trend = {};
      let cumulativeAmount = 0;

      expenses.forEach(expense => {
        const date = new Date(expense.date);
        let key;

        switch (interval) {
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
          default:
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
        }

        if (!trend[key]) {
          trend[key] = {
            period: key,
            amount: 0,
            count: 0,
            cumulative: 0
          };
        }

        const amount = parseFloat(expense.amount || 0);
        trend[key].amount += amount;
        trend[key].count++;
        cumulativeAmount += amount;
        trend[key].cumulative = cumulativeAmount;
      });

      // Convert to array and sort
      const trendData = Object.values(trend).sort((a, b) => a.period.localeCompare(b.period));

      // Calculate running cumulative for sorted data
      let runningTotal = 0;
      trendData.forEach(item => {
        runningTotal += item.amount;
        item.cumulative = Math.round(runningTotal * 100) / 100;
        item.amount = Math.round(item.amount * 100) / 100;
      });

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          interval,
          totalAmount: Math.round(cumulativeAmount * 100) / 100,
          trend: trendData
        }
      });
    } catch (error) {
      console.error('Get cost trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cost trend',
        error: error.message
      });
    }
  }

  /**
   * Get cost comparison across projects
   * GET /api/cost/analysis/compare
   */
  static async compareCosts(req, res) {
    try {
      const { projectIds } = req.query;

      if (!projectIds) {
        return res.status(400).json({
          success: false,
          message: 'projectIds query parameter is required (comma-separated)'
        });
      }

      const projectIdArray = projectIds.split(',').map(id => id.trim());

      const projects = await Project.findAll({
        where: { id: { [Op.in]: projectIdArray } }
      });

      const comparison = await Promise.all(projects.map(async (project) => {
        const budgets = await Budget.findAll({
          where: { projectId: project.id, status: 'APPROVED' }
        });
        
        const expenses = await Expense.findAll({
          where: {
            projectId: project.id,
            status: { [Op.in]: ['APPROVED', 'PAID'] }
          }
        });

        const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          budget: Math.round(totalBudget * 100) / 100,
          spent: Math.round(totalSpent * 100) / 100,
          remaining: Math.round((totalBudget - totalSpent) * 100) / 100,
          utilization: Math.round(utilization * 100) / 100,
          expenseCount: expenses.length,
          isOverBudget: totalSpent > totalBudget
        };
      }));

      // Sort by spent amount descending
      comparison.sort((a, b) => b.spent - a.spent);

      res.json({
        success: true,
        data: {
          projectCount: comparison.length,
          comparison
        }
      });
    } catch (error) {
      console.error('Compare costs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare costs',
        error: error.message
      });
    }
  }

  /**
   * Get cost forecast based on current spending
   * GET /api/cost/analysis/forecast/:projectId
   */
  static async getCostForecast(req, res) {
    try {
      const { projectId } = req.params;

      const inputs = await CostAnalysisController.collectEvmInputs(projectId, new Date());
      if (!inputs) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      const {
        project,
        totalBudget,
        actualCost,
        earnedValue,
        cpi,
        eac,
        etc,
        vac,
        tcpi,
        dataCompleteness,
        calculationStatus,
        notes
      } = inputs;
      const remaining = CostAnalysisController.round2(totalBudget - actualCost);
      const spendableDenominator = totalBudget - actualCost;
      const daysUntilBudgetExhausted = spendableDenominator > 0 && actualCost > 0 ? CostAnalysisController.round2(spendableDenominator / actualCost) : 0;
      const message = dataCompleteness.hasActualCosts ? null : 'No approved/paid expense data available for forecasting';

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          eac,
          etc,
          vac,
          tcpi,
          totalBudget,
          actualCost,
          earnedValue,
          cpi,
          remaining,
          daysUntilBudgetExhausted,
          dataCompleteness,
          calculationStatus,
          notes,
          message,
          // Backward-compatible fields
          budget: totalBudget,
          spent: actualCost,
          forecast: {
            forecastedTotalCost: eac,
            willExceedBudget: eac > totalBudget,
            potentialOverage: CostAnalysisController.round2(eac - totalBudget)
          }
        }
      });
    } catch (error) {
      console.error('Get cost forecast error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate cost forecast',
        error: error.message
      });
    }
  }
}

module.exports = CostAnalysisController;

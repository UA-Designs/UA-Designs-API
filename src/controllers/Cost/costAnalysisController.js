const { Cost, Budget, Expense, Project, Task } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Cost Analysis Controller
 * Provides cost overview, EVM metrics, and reporting endpoints
 * PMBOK Knowledge Area: Project Cost Management - Control Costs
 */
class CostAnalysisController {
  /**
   * Get cost overview for a project
   * GET /api/cost/analysis/overview/:projectId
   */
  static async getCostOverview(req, res) {
    try {
      const { projectId } = req.params;

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Get budgets for project
      const budgets = await Budget.findAll({
        where: { projectId, status: { [Op.ne]: 'CLOSED' } }
      });

      // Get expenses for project
      const expenses = await Expense.findAll({
        where: { projectId }
      });

      // Calculate totals
      const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
      const totalApproved = expenses
        .filter(e => ['APPROVED', 'PAID'].includes(e.status))
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalPending = expenses
        .filter(e => e.status === 'PENDING')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalPaid = expenses
        .filter(e => e.status === 'PAID')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const costVariance = totalBudget - totalApproved;
      const budgetUtilization = totalBudget > 0 ? (totalApproved / totalBudget) * 100 : 0;

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          overview: {
            totalBudget,
            totalApproved,
            totalPending,
            totalPaid,
            remaining: totalBudget - totalApproved,
            costVariance,
            budgetUtilization: Math.round(budgetUtilization * 100) / 100,
            isOverBudget: costVariance < 0
          },
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
   * Get Earned Value Management (EVM) metrics for a project
   * GET /api/cost/analysis/evm/:projectId
   */
  static async getEVMMetrics(req, res) {
    try {
      const { projectId } = req.params;
      const { asOfDate } = req.query;
      const reportDate = asOfDate ? new Date(asOfDate) : new Date();

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Get tasks with cost and progress data
      const tasks = await Task.findAll({
        where: { projectId }
      });

      // Get approved/paid expenses
      const expenses = await Expense.findAll({
        where: {
          projectId,
          status: { [Op.in]: ['APPROVED', 'PAID'] },
          date: { [Op.lte]: reportDate }
        }
      });

      // Get budget
      const budgets = await Budget.findAll({
        where: { projectId, status: 'APPROVED' }
      });
      const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

      // Calculate EVM metrics
      // BAC - Budget at Completion (total approved budget)
      const BAC = totalBudget;

      // Calculate Planned Value (PV) - Based on project timeline and budget
      const projectStart = project.startDate ? new Date(project.startDate) : null;
      const projectEnd = project.endDate ? new Date(project.endDate) : null;
      let plannedProgress = 100;
      
      if (projectStart && projectEnd) {
        const totalDuration = projectEnd - projectStart;
        const elapsedDuration = reportDate - projectStart;
        plannedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
      }
      
      // PV - Planned Value (what should have been spent by now based on schedule)
      const PV = (plannedProgress / 100) * BAC;

      // Calculate actual progress from tasks
      const actualProgress = tasks.length > 0
        ? tasks.reduce((sum, t) => sum + (parseFloat(t.progress) || 0), 0) / tasks.length
        : 0;

      // EV - Earned Value (value of work actually completed)
      const EV = (actualProgress / 100) * BAC;

      // AC - Actual Cost (actual money spent)
      const AC = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      // Calculate variances and indices
      // CV - Cost Variance (positive is under budget)
      const CV = EV - AC;
      
      // SV - Schedule Variance (positive is ahead of schedule)
      const SV = EV - PV;

      // CPI - Cost Performance Index (>1 is under budget)
      const CPI = AC > 0 ? EV / AC : 1;

      // SPI - Schedule Performance Index (>1 is ahead of schedule)
      const SPI = PV > 0 ? EV / PV : 1;

      // Forecasting metrics
      // EAC - Estimate at Completion
      const EAC = CPI > 0 ? BAC / CPI : BAC;

      // ETC - Estimate to Complete
      const ETC = EAC - AC;

      // VAC - Variance at Completion
      const VAC = BAC - EAC;

      // TCPI - To Complete Performance Index (CPI needed to finish on budget)
      const TCPI = (BAC - EV) > 0 ? (BAC - EV) / (BAC - AC) : 1;

      // Percent complete
      const percentComplete = BAC > 0 ? (EV / BAC) * 100 : 0;
      const percentSpent = BAC > 0 ? (AC / BAC) * 100 : 0;

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          asOfDate: reportDate.toISOString(),
          baseMetrics: {
            BAC: Math.round(BAC * 100) / 100,
            PV: Math.round(PV * 100) / 100,
            EV: Math.round(EV * 100) / 100,
            AC: Math.round(AC * 100) / 100
          },
          variances: {
            CV: Math.round(CV * 100) / 100,
            SV: Math.round(SV * 100) / 100,
            costStatus: CV >= 0 ? 'Under Budget' : 'Over Budget',
            scheduleStatus: SV >= 0 ? 'Ahead of Schedule' : 'Behind Schedule'
          },
          indices: {
            CPI: Math.round(CPI * 1000) / 1000,
            SPI: Math.round(SPI * 1000) / 1000
          },
          forecasts: {
            EAC: Math.round(EAC * 100) / 100,
            ETC: Math.round(ETC * 100) / 100,
            VAC: Math.round(VAC * 100) / 100,
            TCPI: Math.round(TCPI * 1000) / 1000
          },
          progress: {
            plannedProgress: Math.round(plannedProgress * 100) / 100,
            actualProgress: Math.round(actualProgress * 100) / 100,
            percentComplete: Math.round(percentComplete * 100) / 100,
            percentSpent: Math.round(percentSpent * 100) / 100
          },
          health: {
            costHealth: CPI >= 1 ? 'Good' : CPI >= 0.9 ? 'Warning' : 'Critical',
            scheduleHealth: SPI >= 1 ? 'Good' : SPI >= 0.9 ? 'Warning' : 'Critical',
            overallHealth: CPI >= 1 && SPI >= 1 ? 'Good' : (CPI >= 0.9 && SPI >= 0.9) ? 'Warning' : 'Critical'
          }
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

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Get approved budgets
      const budgets = await Budget.findAll({
        where: { projectId, status: 'APPROVED' }
      });
      const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

      // Get all expenses
      const expenses = await Expense.findAll({
        where: {
          projectId,
          status: { [Op.in]: ['APPROVED', 'PAID'] }
        },
        order: [['date', 'ASC']]
      });

      if (expenses.length === 0) {
        return res.json({
          success: true,
          data: {
            projectId,
            projectName: project.name,
            message: 'No expense data available for forecasting',
            budget: totalBudget,
            forecast: null
          }
        });
      }

      // Calculate spending rate
      const firstExpenseDate = new Date(expenses[0].date);
      const lastExpenseDate = new Date(expenses[expenses.length - 1].date);
      const daysDiff = Math.max(1, (lastExpenseDate - firstExpenseDate) / (1000 * 60 * 60 * 24));
      
      const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const dailySpendingRate = totalSpent / daysDiff;
      const weeklySpendingRate = dailySpendingRate * 7;
      const monthlySpendingRate = dailySpendingRate * 30;

      // Forecast
      const remaining = totalBudget - totalSpent;
      const daysUntilBudgetExhausted = dailySpendingRate > 0 ? remaining / dailySpendingRate : null;
      const budgetExhaustionDate = daysUntilBudgetExhausted && daysUntilBudgetExhausted > 0
        ? new Date(Date.now() + daysUntilBudgetExhausted * 24 * 60 * 60 * 1000)
        : null;

      // Project end date forecast
      const projectEndDate = project.endDate ? new Date(project.endDate) : null;
      let forecastedTotalCost = null;
      
      if (projectEndDate) {
        const daysRemaining = Math.max(0, (projectEndDate - new Date()) / (1000 * 60 * 60 * 24));
        forecastedTotalCost = totalSpent + (dailySpendingRate * daysRemaining);
      }

      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.name,
          budget: Math.round(totalBudget * 100) / 100,
          spent: Math.round(totalSpent * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          spendingRates: {
            daily: Math.round(dailySpendingRate * 100) / 100,
            weekly: Math.round(weeklySpendingRate * 100) / 100,
            monthly: Math.round(monthlySpendingRate * 100) / 100
          },
          forecast: {
            daysUntilBudgetExhausted: daysUntilBudgetExhausted ? Math.round(daysUntilBudgetExhausted) : null,
            budgetExhaustionDate: budgetExhaustionDate?.toISOString().split('T')[0] || null,
            forecastedTotalCost: forecastedTotalCost ? Math.round(forecastedTotalCost * 100) / 100 : null,
            projectEndDate: projectEndDate?.toISOString().split('T')[0] || null,
            willExceedBudget: forecastedTotalCost ? forecastedTotalCost > totalBudget : null,
            potentialOverage: forecastedTotalCost ? Math.round((forecastedTotalCost - totalBudget) * 100) / 100 : null
          },
          analysisBasedOn: {
            expenseCount: expenses.length,
            firstExpenseDate: firstExpenseDate.toISOString().split('T')[0],
            lastExpenseDate: lastExpenseDate.toISOString().split('T')[0],
            analyzedDays: Math.round(daysDiff)
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

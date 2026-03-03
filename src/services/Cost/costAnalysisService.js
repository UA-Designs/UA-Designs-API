const { Cost, Budget, Expense, Project, Task, CostCategory } = require('../../models');
const { Op } = require('sequelize');
const EarnedValueService = require('./earnedValueService');

/**
 * Cost Analysis Service
 * Provides cost variance analysis, forecasting, and breakdown capabilities
 * PMBOK Knowledge Area: Project Cost Management
 */
class CostAnalysisService {
  /**
   * Get comprehensive cost analysis for a project
   * @param {string} projectId - Project ID
   * @returns {Object} Complete cost analysis
   */
  static async getComprehensiveCostAnalysis(projectId) {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const [
      budgetAnalysis,
      expenseAnalysis,
      categoryBreakdown,
      burnRate,
      evmMetrics,
      forecast
    ] = await Promise.all([
      this.analyzeBudgets(projectId),
      this.analyzeExpenses(projectId),
      this.getCategoryBreakdown(projectId),
      this.calculateBurnRate(projectId),
      this.getEVMSummary(projectId),
      this.forecastCosts(projectId)
    ]);

    return {
      projectId,
      projectName: project.name,
      analysisDate: new Date().toISOString(),
      budgetAnalysis,
      expenseAnalysis,
      categoryBreakdown,
      burnRate,
      evmMetrics,
      forecast
    };
  }

  /**
   * Analyze project budgets
   */
  static async analyzeBudgets(projectId) {
    const budgets = await Budget.findAll({
      where: { projectId }
    });

    const analysis = {
      totalBudgets: budgets.length,
      byStatus: {},
      totalAllocated: 0,
      totalApproved: 0
    };

    budgets.forEach(budget => {
      const amount = parseFloat(budget.amount || 0);
      
      if (!analysis.byStatus[budget.status]) {
        analysis.byStatus[budget.status] = { count: 0, total: 0 };
      }
      analysis.byStatus[budget.status].count++;
      analysis.byStatus[budget.status].total += amount;
      
      analysis.totalAllocated += amount;
      if (budget.status === 'APPROVED') {
        analysis.totalApproved += amount;
      }
    });

    return analysis;
  }

  /**
   * Analyze project expenses
   */
  static async analyzeExpenses(projectId) {
    const expenses = await Expense.findAll({
      where: { projectId }
    });

    const analysis = {
      totalExpenses: expenses.length,
      byStatus: {},
      byCategory: {},
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      paidAmount: 0
    };

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount || 0);
      
      // By status
      if (!analysis.byStatus[expense.status]) {
        analysis.byStatus[expense.status] = { count: 0, total: 0 };
      }
      analysis.byStatus[expense.status].count++;
      analysis.byStatus[expense.status].total += amount;
      
      // By category
      if (!analysis.byCategory[expense.category]) {
        analysis.byCategory[expense.category] = { count: 0, total: 0 };
      }
      analysis.byCategory[expense.category].count++;
      analysis.byCategory[expense.category].total += amount;
      
      // Totals
      analysis.totalAmount += amount;
      if (expense.status === 'APPROVED') analysis.approvedAmount += amount;
      if (expense.status === 'PENDING') analysis.pendingAmount += amount;
      if (expense.status === 'PAID') analysis.paidAmount += amount;
    });

    return analysis;
  }

  /**
   * Get cost breakdown by category
   */
  static async getCategoryBreakdown(projectId) {
    const expenses = await Expense.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] }
      }
    });

    const breakdown = {};
    let totalAmount = 0;

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount || 0);
      const category = expense.category || 'UNCATEGORIZED';
      
      if (!breakdown[category]) {
        breakdown[category] = {
          amount: 0,
          count: 0,
          percentage: 0
        };
      }
      
      breakdown[category].amount += amount;
      breakdown[category].count++;
      totalAmount += amount;
    });

    // Calculate percentages
    Object.keys(breakdown).forEach(category => {
      breakdown[category].percentage = totalAmount > 0
        ? this.round((breakdown[category].amount / totalAmount) * 100)
        : 0;
      breakdown[category].amount = this.round(breakdown[category].amount);
    });

    return {
      totalAmount: this.round(totalAmount),
      categories: breakdown
    };
  }

  /**
   * Calculate burn rate (spending rate)
   */
  static async calculateBurnRate(projectId, days = 30) {
    const expenses = await Expense.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] }
      },
      order: [['date', 'ASC']]
    });

    if (expenses.length === 0) {
      return {
        dailyRate: 0,
        weeklyRate: 0,
        monthlyRate: 0,
        dataPoints: 0
      };
    }

    // Calculate rate based on last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentExpenses = expenses.filter(e => new Date(e.date) >= cutoffDate);
    const recentTotal = recentExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const actualDays = recentExpenses.length > 0
      ? Math.max(1, (new Date() - new Date(recentExpenses[0].date)) / (1000 * 60 * 60 * 24))
      : days;

    const dailyRate = recentTotal / actualDays;

    return {
      dailyRate: this.round(dailyRate),
      weeklyRate: this.round(dailyRate * 7),
      monthlyRate: this.round(dailyRate * 30),
      periodDays: Math.round(actualDays),
      periodTotal: this.round(recentTotal),
      dataPoints: recentExpenses.length
    };
  }

  /**
   * Get EVM summary
   */
  static async getEVMSummary(projectId) {
    try {
      const evm = await EarnedValueService.calculateEVM(projectId);
      return {
        CPI: evm.indices.CPI,
        SPI: evm.indices.SPI,
        CV: evm.variances.CV,
        SV: evm.variances.SV,
        costStatus: evm.status.cost,
        scheduleStatus: evm.status.schedule,
        overallStatus: evm.status.overall
      };
    } catch (error) {
      return {
        error: error.message,
        available: false
      };
    }
  }

  /**
   * Forecast future costs
   */
  static async forecastCosts(projectId) {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const budgets = await Budget.findAll({
      where: { projectId, status: 'APPROVED' }
    });
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

    const expenses = await Expense.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] }
      },
      order: [['date', 'ASC']]
    });

    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const remaining = totalBudget - totalSpent;

    // Calculate spending rate
    const burnRate = await this.calculateBurnRate(projectId);

    // Forecast based on burn rate
    const daysUntilExhausted = burnRate.dailyRate > 0
      ? Math.ceil(remaining / burnRate.dailyRate)
      : null;

    const exhaustionDate = daysUntilExhausted && daysUntilExhausted > 0
      ? new Date(Date.now() + daysUntilExhausted * 24 * 60 * 60 * 1000)
      : null;

    // Forecast based on project end date
    let forecastedTotalCost = null;
    let daysRemaining = null;

    if (project.endDate) {
      daysRemaining = Math.max(0, Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
      forecastedTotalCost = totalSpent + (burnRate.dailyRate * daysRemaining);
    }

    return {
      budget: this.round(totalBudget),
      spent: this.round(totalSpent),
      remaining: this.round(remaining),
      utilizationPercent: totalBudget > 0 ? this.round((totalSpent / totalBudget) * 100) : 0,
      burnRate: {
        daily: burnRate.dailyRate,
        monthly: burnRate.monthlyRate
      },
      forecast: {
        daysUntilBudgetExhausted: daysUntilExhausted,
        budgetExhaustionDate: exhaustionDate?.toISOString().split('T')[0] || null,
        daysRemaining,
        forecastedTotalCost: forecastedTotalCost ? this.round(forecastedTotalCost) : null,
        willExceedBudget: forecastedTotalCost ? forecastedTotalCost > totalBudget : null,
        potentialOverage: forecastedTotalCost ? this.round(forecastedTotalCost - totalBudget) : null
      }
    };
  }

  /**
   * Get cost variance analysis
   */
  static async getCostVarianceAnalysis(projectId) {
    const budgets = await Budget.findAll({
      where: { projectId, status: 'APPROVED' }
    });
    
    const expenses = await Expense.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] }
      }
    });

    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const variance = totalBudget - totalSpent;
    const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

    return {
      budget: this.round(totalBudget),
      actual: this.round(totalSpent),
      variance: this.round(variance),
      variancePercent: this.round(variancePercent),
      status: variance >= 0 ? 'UNDER_BUDGET' : 'OVER_BUDGET',
      severity: this.getVarianceSeverity(variancePercent)
    };
  }

  /**
   * Get variance severity
   */
  static getVarianceSeverity(variancePercent) {
    if (variancePercent >= 10) return 'SIGNIFICANTLY_UNDER';
    if (variancePercent >= 0) return 'ON_TRACK';
    if (variancePercent >= -10) return 'SLIGHTLY_OVER';
    if (variancePercent >= -25) return 'MODERATELY_OVER';
    return 'SIGNIFICANTLY_OVER';
  }

  /**
   * Compare costs across multiple projects
   */
  static async compareProjects(projectIds) {
    const comparisons = await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          const project = await Project.findByPk(projectId);
          if (!project) return { projectId, error: 'Not found' };

          const variance = await this.getCostVarianceAnalysis(projectId);
          const burnRate = await this.calculateBurnRate(projectId);

          return {
            projectId,
            projectName: project.name,
            status: project.status,
            ...variance,
            burnRate: burnRate.monthlyRate
          };
        } catch (error) {
          return { projectId, error: error.message };
        }
      })
    );

    return comparisons;
  }

  /**
   * Get monthly cost summary
   */
  static async getMonthlyCostSummary(projectId, year) {
    const targetYear = year || new Date().getFullYear();
    const expenses = await Expense.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] },
        date: {
          [Op.gte]: new Date(`${targetYear}-01-01`),
          [Op.lte]: new Date(`${targetYear}-12-31`)
        }
      }
    });

    const monthlySummary = {};
    for (let i = 1; i <= 12; i++) {
      const monthKey = `${targetYear}-${String(i).padStart(2, '0')}`;
      monthlySummary[monthKey] = { amount: 0, count: 0 };
    }

    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlySummary[monthKey]) {
        monthlySummary[monthKey].amount += parseFloat(expense.amount || 0);
        monthlySummary[monthKey].count++;
      }
    });

    // Round amounts
    Object.keys(monthlySummary).forEach(key => {
      monthlySummary[key].amount = this.round(monthlySummary[key].amount);
    });

    return {
      projectId,
      year: targetYear,
      monthly: monthlySummary,
      yearTotal: this.round(expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0))
    };
  }

  /**
   * Helper: Round number
   */
  static round(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}

module.exports = CostAnalysisService;

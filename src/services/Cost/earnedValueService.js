const { Budget, Expense, Project, Task } = require('../../models');
const { Op } = require('sequelize');

/**
 * Earned Value Management (EVM) Service
 * Implements PMBOK EVM calculations for project cost and schedule performance
 * 
 * Key EVM Metrics:
 * - BAC: Budget at Completion
 * - PV: Planned Value
 * - EV: Earned Value  
 * - AC: Actual Cost
 * - CV: Cost Variance
 * - SV: Schedule Variance
 * - CPI: Cost Performance Index
 * - SPI: Schedule Performance Index
 * - EAC: Estimate at Completion
 * - ETC: Estimate to Complete
 * - VAC: Variance at Completion
 * - TCPI: To-Complete Performance Index
 */
class EarnedValueService {
  /**
   * Calculate all EVM metrics for a project
   * @param {string} projectId - Project ID
   * @param {Date} asOfDate - Date for calculations (default: now)
   * @returns {Object} EVM metrics
   */
  static async calculateEVM(projectId, asOfDate = new Date()) {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Get base metrics
    const BAC = await this.calculateBAC(projectId);
    const PV = await this.calculatePV(projectId, asOfDate);
    const EV = await this.calculateEV(projectId);
    const AC = await this.calculateAC(projectId, asOfDate);

    // Calculate variances
    const CV = this.calculateCV(EV, AC);
    const SV = this.calculateSV(EV, PV);

    // Calculate indices
    const CPI = this.calculateCPI(EV, AC);
    const SPI = this.calculateSPI(EV, PV);

    // Calculate forecasts
    const EAC = this.calculateEAC(BAC, CPI);
    const ETC = this.calculateETC(EAC, AC);
    const VAC = this.calculateVAC(BAC, EAC);
    const TCPI = this.calculateTCPI(BAC, EV, AC);

    // Calculate additional metrics
    const percentComplete = BAC > 0 ? (EV / BAC) * 100 : 0;
    const percentSpent = BAC > 0 ? (AC / BAC) * 100 : 0;

    return {
      projectId,
      asOfDate: asOfDate.toISOString(),
      baseMetrics: {
        BAC: this.round(BAC),
        PV: this.round(PV),
        EV: this.round(EV),
        AC: this.round(AC)
      },
      variances: {
        CV: this.round(CV),
        SV: this.round(SV),
        CVPercent: BAC > 0 ? this.round((CV / BAC) * 100) : 0,
        SVPercent: BAC > 0 ? this.round((SV / BAC) * 100) : 0
      },
      indices: {
        CPI: this.round(CPI, 3),
        SPI: this.round(SPI, 3)
      },
      forecasts: {
        EAC: this.round(EAC),
        ETC: this.round(ETC),
        VAC: this.round(VAC),
        TCPI: this.round(TCPI, 3)
      },
      progress: {
        percentComplete: this.round(percentComplete),
        percentSpent: this.round(percentSpent)
      },
      status: {
        cost: this.getCostStatus(CPI),
        schedule: this.getScheduleStatus(SPI),
        overall: this.getOverallStatus(CPI, SPI)
      }
    };
  }

  /**
   * Calculate Budget at Completion (BAC)
   * Total approved budget for the project
   */
  static async calculateBAC(projectId) {
    const budgets = await Budget.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PLANNED'] }
      }
    });

    return budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  }

  /**
   * Calculate Planned Value (PV)
   * Value of work scheduled to be completed by a given date
   * PV = BAC × Planned % Complete
   */
  static async calculatePV(projectId, asOfDate = new Date()) {
    const project = await Project.findByPk(projectId);
    const BAC = await this.calculateBAC(projectId);

    if (!project.startDate || !project.endDate) {
      return 0;
    }

    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const totalDuration = projectEnd - projectStart;

    if (totalDuration <= 0) return BAC;

    const elapsedDuration = asOfDate - projectStart;
    const plannedPercent = Math.min(1, Math.max(0, elapsedDuration / totalDuration));

    return BAC * plannedPercent;
  }

  /**
   * Calculate Earned Value (EV)
   * Value of work actually completed
   * EV = BAC × Actual % Complete
   */
  static async calculateEV(projectId) {
    const BAC = await this.calculateBAC(projectId);
    const tasks = await Task.findAll({
      where: { projectId }
    });

    if (tasks.length === 0) return 0;

    // Calculate weighted average progress
    const totalProgress = tasks.reduce((sum, t) => sum + (parseFloat(t.progress) || 0), 0);
    const actualPercent = totalProgress / tasks.length / 100;

    return BAC * actualPercent;
  }

  /**
   * Calculate Actual Cost (AC)
   * Actual cost incurred for work performed
   */
  static async calculateAC(projectId, asOfDate = new Date()) {
    const expenses = await Expense.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['APPROVED', 'PAID'] },
        date: { [Op.lte]: asOfDate }
      }
    });

    return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }

  /**
   * Calculate Cost Variance (CV)
   * CV = EV - AC
   * Positive: Under budget, Negative: Over budget
   */
  static calculateCV(EV, AC) {
    return EV - AC;
  }

  /**
   * Calculate Schedule Variance (SV)
   * SV = EV - PV
   * Positive: Ahead of schedule, Negative: Behind schedule
   */
  static calculateSV(EV, PV) {
    return EV - PV;
  }

  /**
   * Calculate Cost Performance Index (CPI)
   * CPI = EV / AC
   * > 1: Under budget, < 1: Over budget
   */
  static calculateCPI(EV, AC) {
    if (AC === 0) return EV > 0 ? Infinity : 1;
    return EV / AC;
  }

  /**
   * Calculate Schedule Performance Index (SPI)
   * SPI = EV / PV
   * > 1: Ahead of schedule, < 1: Behind schedule
   */
  static calculateSPI(EV, PV) {
    if (PV === 0) return EV > 0 ? Infinity : 1;
    return EV / PV;
  }

  /**
   * Calculate Estimate at Completion (EAC)
   * Three methods available:
   * 1. EAC = BAC / CPI (assumes current performance continues)
   * 2. EAC = AC + (BAC - EV) (assumes remaining work at original rate)
   * 3. EAC = AC + (BAC - EV) / (CPI * SPI) (considers both cost and schedule)
   */
  static calculateEAC(BAC, CPI, method = 'cpi') {
    if (method === 'cpi') {
      return CPI > 0 ? BAC / CPI : BAC;
    }
    return BAC;
  }

  /**
   * Calculate alternative EAC using AC + ETC method
   */
  static calculateEAC_ACETC(AC, BAC, EV) {
    return AC + (BAC - EV);
  }

  /**
   * Calculate EAC considering both CPI and SPI
   */
  static calculateEAC_Combined(AC, BAC, EV, CPI, SPI) {
    const performance = CPI * SPI;
    if (performance === 0) return BAC;
    return AC + (BAC - EV) / performance;
  }

  /**
   * Calculate Estimate to Complete (ETC)
   * ETC = EAC - AC
   */
  static calculateETC(EAC, AC) {
    return EAC - AC;
  }

  /**
   * Calculate Variance at Completion (VAC)
   * VAC = BAC - EAC
   * Positive: Under budget at completion, Negative: Over budget at completion
   */
  static calculateVAC(BAC, EAC) {
    return BAC - EAC;
  }

  /**
   * Calculate To-Complete Performance Index (TCPI)
   * TCPI = (BAC - EV) / (BAC - AC)
   * CPI required to complete within budget
   */
  static calculateTCPI(BAC, EV, AC) {
    const remaining = BAC - AC;
    if (remaining <= 0) return Infinity;
    return (BAC - EV) / remaining;
  }

  /**
   * Calculate TCPI based on EAC instead of BAC
   */
  static calculateTCPI_EAC(BAC, EV, AC, EAC) {
    const remaining = EAC - AC;
    if (remaining <= 0) return Infinity;
    return (BAC - EV) / remaining;
  }

  /**
   * Get cost status based on CPI
   */
  static getCostStatus(CPI) {
    if (CPI >= 1.0) return 'UNDER_BUDGET';
    if (CPI >= 0.9) return 'SLIGHTLY_OVER_BUDGET';
    if (CPI >= 0.8) return 'OVER_BUDGET';
    return 'SIGNIFICANTLY_OVER_BUDGET';
  }

  /**
   * Get schedule status based on SPI
   */
  static getScheduleStatus(SPI) {
    if (SPI >= 1.0) return 'AHEAD_OF_SCHEDULE';
    if (SPI >= 0.9) return 'SLIGHTLY_BEHIND';
    if (SPI >= 0.8) return 'BEHIND_SCHEDULE';
    return 'SIGNIFICANTLY_BEHIND';
  }

  /**
   * Get overall status based on CPI and SPI
   */
  static getOverallStatus(CPI, SPI) {
    if (CPI >= 1.0 && SPI >= 1.0) return 'GREEN';
    if (CPI >= 0.9 && SPI >= 0.9) return 'YELLOW';
    return 'RED';
  }

  /**
   * Calculate EVM for multiple projects (bulk)
   */
  static async calculateBulkEVM(projectIds, asOfDate = new Date()) {
    const results = [];

    for (const projectId of projectIds) {
      try {
        const evm = await this.calculateEVM(projectId, asOfDate);
        results.push({ projectId, success: true, data: evm });
      } catch (error) {
        results.push({ projectId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get EVM trend over time for a project
   */
  static async getEVMTrend(projectId, startDate, endDate, interval = 'week') {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const start = new Date(startDate || project.startDate);
    const end = new Date(endDate || new Date());
    const trend = [];

    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      try {
        const evm = await this.calculateEVM(projectId, currentDate);
        trend.push({
          date: currentDate.toISOString().split('T')[0],
          ...evm.baseMetrics,
          CPI: evm.indices.CPI,
          SPI: evm.indices.SPI
        });
      } catch (error) {
        trend.push({
          date: currentDate.toISOString().split('T')[0],
          error: error.message
        });
      }

      // Increment by interval
      switch (interval) {
        case 'day':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'month':
        default:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return {
      projectId,
      interval,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      trend
    };
  }

  /**
   * Helper: Round number to specified decimal places
   */
  static round(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}

module.exports = EarnedValueService;

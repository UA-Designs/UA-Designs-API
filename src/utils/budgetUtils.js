/**
 * Budget Utilities
 * Helper functions for budget management and calculations
 */

/**
 * Budget Status Utilities
 */
const BudgetStatus = {
  PLANNED: 'PLANNED',
  APPROVED: 'APPROVED',
  REVISED: 'REVISED',
  CLOSED: 'CLOSED',

  /**
   * Check if status is valid
   */
  isValid: (status) => {
    return ['PLANNED', 'APPROVED', 'REVISED', 'CLOSED'].includes(status);
  },

  /**
   * Check if budget can be modified
   */
  canModify: (status) => {
    return ['PLANNED', 'APPROVED'].includes(status);
  },

  /**
   * Get next valid statuses
   */
  getNextStatuses: (currentStatus) => {
    const transitions = {
      PLANNED: ['APPROVED'],
      APPROVED: ['REVISED', 'CLOSED'],
      REVISED: ['APPROVED', 'CLOSED'],
      CLOSED: []
    };
    return transitions[currentStatus] || [];
  },

  /**
   * Check if transition is valid
   */
  canTransition: (from, to) => {
    return BudgetStatus.getNextStatuses(from).includes(to);
  }
};

/**
 * Budget Utilization Calculations
 */
const BudgetUtilization = {
  /**
   * Calculate utilization percentage
   */
  calculate: (spent, budget) => {
    if (budget <= 0) return 0;
    return (spent / budget) * 100;
  },

  /**
   * Calculate remaining amount
   */
  remaining: (budget, spent) => budget - spent,

  /**
   * Calculate remaining percentage
   */
  remainingPercent: (budget, spent) => {
    if (budget <= 0) return 0;
    return ((budget - spent) / budget) * 100;
  },

  /**
   * Get utilization status
   */
  getStatus: (utilizationPercent) => {
    if (utilizationPercent >= 100) return { status: 'EXHAUSTED', severity: 'critical', color: 'red' };
    if (utilizationPercent >= 90) return { status: 'CRITICAL', severity: 'critical', color: 'red' };
    if (utilizationPercent >= 75) return { status: 'WARNING', severity: 'warning', color: 'orange' };
    if (utilizationPercent >= 50) return { status: 'ON_TRACK', severity: 'normal', color: 'green' };
    if (utilizationPercent >= 25) return { status: 'UNDER_UTILIZED', severity: 'info', color: 'blue' };
    return { status: 'MINIMAL', severity: 'info', color: 'gray' };
  },

  /**
   * Check if over budget
   */
  isOverBudget: (spent, budget) => spent > budget,

  /**
   * Calculate overrun amount
   */
  overrunAmount: (spent, budget) => Math.max(0, spent - budget),

  /**
   * Calculate overrun percentage
   */
  overrunPercent: (spent, budget) => {
    if (budget <= 0) return 0;
    return Math.max(0, ((spent - budget) / budget) * 100);
  }
};

/**
 * Budget Allocation Utilities
 */
const BudgetAllocation = {
  /**
   * Calculate allocation percentage
   */
  allocationPercent: (allocation, totalBudget) => {
    if (totalBudget <= 0) return 0;
    return (allocation / totalBudget) * 100;
  },

  /**
   * Validate allocations sum to total
   */
  validateAllocations: (allocations, totalBudget, tolerance = 0.01) => {
    const sum = allocations.reduce((a, b) => a + b, 0);
    return Math.abs(sum - totalBudget) <= tolerance;
  },

  /**
   * Calculate allocation from percentage
   */
  allocationFromPercent: (totalBudget, percentage) => {
    return totalBudget * (percentage / 100);
  },

  /**
   * Distribute budget equally
   */
  distributeEqually: (totalBudget, parts) => {
    if (parts <= 0) return [];
    const perPart = totalBudget / parts;
    return Array(parts).fill(perPart);
  },

  /**
   * Distribute budget by weights
   */
  distributeByWeights: (totalBudget, weights) => {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) return weights.map(() => 0);
    return weights.map(w => (w / totalWeight) * totalBudget);
  }
};

/**
 * Contingency and Reserve Calculations
 */
const ContingencyReserve = {
  /**
   * Calculate contingency amount
   */
  contingencyAmount: (baseBudget, contingencyPercent) => {
    return baseBudget * (contingencyPercent / 100);
  },

  /**
   * Calculate management reserve
   */
  managementReserve: (baseBudget, reservePercent) => {
    return baseBudget * (reservePercent / 100);
  },

  /**
   * Calculate total budget with contingency and reserve
   */
  totalBudget: (baseBudget, contingencyPercent, reservePercent) => {
    const contingency = ContingencyReserve.contingencyAmount(baseBudget, contingencyPercent);
    const reserve = ContingencyReserve.managementReserve(baseBudget, reservePercent);
    return baseBudget + contingency + reserve;
  },

  /**
   * Calculate Cost Baseline (without management reserve)
   */
  costBaseline: (baseBudget, contingencyPercent) => {
    return baseBudget + ContingencyReserve.contingencyAmount(baseBudget, contingencyPercent);
  },

  /**
   * Get recommended contingency percentage based on project risk
   */
  recommendedContingency: (riskLevel) => {
    const recommendations = {
      LOW: 5,
      MEDIUM: 10,
      HIGH: 15,
      VERY_HIGH: 25
    };
    return recommendations[riskLevel] || 10;
  }
};

/**
 * Budget Period Calculations
 */
const BudgetPeriod = {
  /**
   * Calculate monthly budget
   */
  monthly: (annualBudget) => annualBudget / 12,

  /**
   * Calculate quarterly budget
   */
  quarterly: (annualBudget) => annualBudget / 4,

  /**
   * Calculate weekly budget
   */
  weekly: (monthlyBudget) => monthlyBudget / 4.33,

  /**
   * Calculate daily budget
   */
  daily: (monthlyBudget) => monthlyBudget / 30,

  /**
   * Prorate budget for partial period
   */
  prorate: (periodBudget, daysInPeriod, actualDays) => {
    if (daysInPeriod <= 0) return 0;
    return (periodBudget / daysInPeriod) * actualDays;
  },

  /**
   * Calculate time-phased budget
   */
  timePhased: (totalBudget, startDate, endDate, interval = 'month') => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periods = [];
    
    let current = new Date(start);
    let periodCount = 0;
    
    while (current < end) {
      periodCount++;
      const next = new Date(current);
      
      switch (interval) {
        case 'week':
          next.setDate(next.getDate() + 7);
          break;
        case 'month':
        default:
          next.setMonth(next.getMonth() + 1);
          break;
      }
      
      current = next;
    }
    
    const perPeriod = totalBudget / periodCount;
    current = new Date(start);
    
    for (let i = 0; i < periodCount; i++) {
      const next = new Date(current);
      switch (interval) {
        case 'week':
          next.setDate(next.getDate() + 7);
          break;
        case 'month':
        default:
          next.setMonth(next.getMonth() + 1);
          break;
      }
      
      periods.push({
        period: i + 1,
        startDate: current.toISOString().split('T')[0],
        endDate: next.toISOString().split('T')[0],
        amount: perPeriod,
        cumulative: perPeriod * (i + 1)
      });
      
      current = next;
    }
    
    return periods;
  }
};

/**
 * Budget Comparison Utilities
 */
const BudgetComparison = {
  /**
   * Compare actual vs planned
   */
  compare: (planned, actual) => {
    return {
      planned,
      actual,
      variance: planned - actual,
      variancePercent: planned > 0 ? ((planned - actual) / planned) * 100 : 0,
      status: actual <= planned ? 'UNDER' : 'OVER'
    };
  },

  /**
   * Compare multiple budget periods
   */
  comparePeriods: (periods) => {
    return periods.map((period, index) => ({
      ...period,
      change: index > 0 ? period.amount - periods[index - 1].amount : 0,
      changePercent: index > 0 && periods[index - 1].amount > 0
        ? ((period.amount - periods[index - 1].amount) / periods[index - 1].amount) * 100
        : 0
    }));
  },

  /**
   * Calculate year-over-year comparison
   */
  yearOverYear: (currentYear, previousYear) => {
    const change = currentYear - previousYear;
    const changePercent = previousYear > 0 ? (change / previousYear) * 100 : 0;
    return {
      currentYear,
      previousYear,
      change,
      changePercent,
      trend: change > 0 ? 'INCREASE' : change < 0 ? 'DECREASE' : 'STABLE'
    };
  }
};

/**
 * Budget Validation Utilities
 */
const BudgetValidation = {
  /**
   * Validate budget amount
   */
  isValidAmount: (amount) => {
    return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
  },

  /**
   * Validate date range
   */
  isValidDateRange: (startDate, endDate) => {
    if (!startDate || !endDate) return false;
    return new Date(startDate) < new Date(endDate);
  },

  /**
   * Validate budget data
   */
  validateBudget: (budget) => {
    const errors = [];
    
    if (!budget.name || budget.name.trim() === '') {
      errors.push({ field: 'name', message: 'Budget name is required' });
    }
    
    if (!BudgetValidation.isValidAmount(budget.amount)) {
      errors.push({ field: 'amount', message: 'Valid budget amount is required' });
    }
    
    if (budget.startDate && budget.endDate && !BudgetValidation.isValidDateRange(budget.startDate, budget.endDate)) {
      errors.push({ field: 'dates', message: 'End date must be after start date' });
    }
    
    if (budget.contingency && (budget.contingency < 0 || budget.contingency > 100)) {
      errors.push({ field: 'contingency', message: 'Contingency must be between 0 and 100%' });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Formatting Utilities
 */
const BudgetFormat = {
  /**
   * Format as currency
   */
  currency: (amount, currency = 'PHP', locale = 'en-PH') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Format as percentage
   */
  percentage: (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format compact number (e.g., 1.5M, 500K)
   */
  compact: (amount, locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  },

  /**
   * Round to specified decimals
   */
  round: (amount, decimals = 2) => {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
};

module.exports = {
  BudgetStatus,
  BudgetUtilization,
  BudgetAllocation,
  ContingencyReserve,
  BudgetPeriod,
  BudgetComparison,
  BudgetValidation,
  BudgetFormat
};

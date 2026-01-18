/**
 * Cost Calculation Utilities
 * PMBOK-compliant cost and EVM calculation functions
 */

/**
 * Earned Value Management (EVM) Calculations
 */
const EVM = {
  /**
   * Calculate Cost Variance (CV)
   * CV = EV - AC
   * Positive = Under budget, Negative = Over budget
   */
  costVariance: (EV, AC) => EV - AC,

  /**
   * Calculate Schedule Variance (SV)
   * SV = EV - PV
   * Positive = Ahead of schedule, Negative = Behind schedule
   */
  scheduleVariance: (EV, PV) => EV - PV,

  /**
   * Calculate Cost Performance Index (CPI)
   * CPI = EV / AC
   * > 1 = Under budget, < 1 = Over budget
   */
  costPerformanceIndex: (EV, AC) => {
    if (AC === 0) return EV > 0 ? Infinity : 1;
    return EV / AC;
  },

  /**
   * Calculate Schedule Performance Index (SPI)
   * SPI = EV / PV
   * > 1 = Ahead of schedule, < 1 = Behind schedule
   */
  schedulePerformanceIndex: (EV, PV) => {
    if (PV === 0) return EV > 0 ? Infinity : 1;
    return EV / PV;
  },

  /**
   * Calculate Estimate at Completion (EAC) using CPI method
   * EAC = BAC / CPI
   */
  estimateAtCompletion: (BAC, CPI) => {
    if (CPI <= 0) return BAC;
    return BAC / CPI;
  },

  /**
   * Calculate EAC using AC + ETC method
   * EAC = AC + (BAC - EV)
   */
  estimateAtCompletionACETC: (AC, BAC, EV) => AC + (BAC - EV),

  /**
   * Calculate EAC using combined CPI and SPI
   * EAC = AC + (BAC - EV) / (CPI * SPI)
   */
  estimateAtCompletionCombined: (AC, BAC, EV, CPI, SPI) => {
    const performance = CPI * SPI;
    if (performance === 0) return BAC;
    return AC + (BAC - EV) / performance;
  },

  /**
   * Calculate Estimate to Complete (ETC)
   * ETC = EAC - AC
   */
  estimateToComplete: (EAC, AC) => EAC - AC,

  /**
   * Calculate Variance at Completion (VAC)
   * VAC = BAC - EAC
   * Positive = Under budget at completion, Negative = Over budget at completion
   */
  varianceAtCompletion: (BAC, EAC) => BAC - EAC,

  /**
   * Calculate To-Complete Performance Index (TCPI) based on BAC
   * TCPI = (BAC - EV) / (BAC - AC)
   */
  toCompletePerformanceIndex: (BAC, EV, AC) => {
    const remaining = BAC - AC;
    if (remaining <= 0) return Infinity;
    return (BAC - EV) / remaining;
  },

  /**
   * Calculate TCPI based on EAC
   * TCPI = (BAC - EV) / (EAC - AC)
   */
  toCompletePerformanceIndexEAC: (BAC, EV, AC, EAC) => {
    const remaining = EAC - AC;
    if (remaining <= 0) return Infinity;
    return (BAC - EV) / remaining;
  },

  /**
   * Calculate Planned Value (PV)
   * PV = BAC × Planned % Complete
   */
  plannedValue: (BAC, plannedPercentComplete) => BAC * (plannedPercentComplete / 100),

  /**
   * Calculate Earned Value (EV)
   * EV = BAC × Actual % Complete
   */
  earnedValue: (BAC, actualPercentComplete) => BAC * (actualPercentComplete / 100),

  /**
   * Calculate Percent Complete based on work
   */
  percentComplete: (workCompleted, totalWork) => {
    if (totalWork <= 0) return 0;
    return (workCompleted / totalWork) * 100;
  },

  /**
   * Calculate Percent Spent
   */
  percentSpent: (actualCost, budget) => {
    if (budget <= 0) return 0;
    return (actualCost / budget) * 100;
  }
};

/**
 * Cost Variance Analysis
 */
const VarianceAnalysis = {
  /**
   * Calculate variance amount
   */
  variance: (planned, actual) => planned - actual,

  /**
   * Calculate variance percentage
   */
  variancePercent: (planned, actual) => {
    if (planned === 0) return 0;
    return ((planned - actual) / planned) * 100;
  },

  /**
   * Get variance status
   */
  getVarianceStatus: (variancePercent) => {
    if (variancePercent >= 10) return { status: 'SIGNIFICANTLY_UNDER', severity: 'good' };
    if (variancePercent >= 5) return { status: 'UNDER', severity: 'good' };
    if (variancePercent >= 0) return { status: 'ON_TARGET', severity: 'normal' };
    if (variancePercent >= -5) return { status: 'SLIGHTLY_OVER', severity: 'warning' };
    if (variancePercent >= -10) return { status: 'OVER', severity: 'warning' };
    return { status: 'SIGNIFICANTLY_OVER', severity: 'critical' };
  },

  /**
   * Calculate cost per unit
   */
  costPerUnit: (totalCost, units) => {
    if (units <= 0) return 0;
    return totalCost / units;
  }
};

/**
 * Forecasting Utilities
 */
const Forecasting = {
  /**
   * Calculate burn rate (cost per day)
   */
  dailyBurnRate: (totalCost, days) => {
    if (days <= 0) return 0;
    return totalCost / days;
  },

  /**
   * Calculate weekly burn rate
   */
  weeklyBurnRate: (dailyRate) => dailyRate * 7,

  /**
   * Calculate monthly burn rate
   */
  monthlyBurnRate: (dailyRate) => dailyRate * 30,

  /**
   * Estimate days until budget exhausted
   */
  daysUntilExhausted: (remainingBudget, dailyBurnRate) => {
    if (dailyBurnRate <= 0) return Infinity;
    return remainingBudget / dailyBurnRate;
  },

  /**
   * Forecast cost at project end
   */
  forecastCostAtEnd: (currentCost, dailyBurnRate, daysRemaining) => {
    return currentCost + (dailyBurnRate * daysRemaining);
  },

  /**
   * Linear regression for cost forecasting
   */
  linearForecast: (dataPoints, futureX) => {
    if (dataPoints.length < 2) return null;

    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    dataPoints.forEach((point, i) => {
      sumX += i;
      sumY += point;
      sumXY += i * point;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * futureX + intercept;
  },

  /**
   * Moving average forecast
   */
  movingAverage: (dataPoints, periods = 3) => {
    if (dataPoints.length < periods) return null;
    const slice = dataPoints.slice(-periods);
    return slice.reduce((a, b) => a + b, 0) / periods;
  }
};

/**
 * Currency Utilities
 */
const Currency = {
  /**
   * Format amount with currency symbol
   */
  format: (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  /**
   * Round to specified decimal places
   */
  round: (amount, decimals = 2) => {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Convert between currencies (requires exchange rate)
   */
  convert: (amount, exchangeRate) => {
    return amount * exchangeRate;
  }
};

/**
 * Percentage Utilities
 */
const Percentage = {
  /**
   * Calculate percentage
   */
  calculate: (value, total) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  },

  /**
   * Calculate value from percentage
   */
  fromPercentage: (total, percentage) => {
    return total * (percentage / 100);
  },

  /**
   * Format as percentage string
   */
  format: (value, decimals = 2) => {
    return `${Currency.round(value, decimals)}%`;
  }
};

/**
 * Aggregation Utilities
 */
const Aggregation = {
  /**
   * Sum array of numbers
   */
  sum: (values) => values.reduce((a, b) => a + b, 0),

  /**
   * Calculate average
   */
  average: (values) => {
    if (values.length === 0) return 0;
    return Aggregation.sum(values) / values.length;
  },

  /**
   * Find minimum value
   */
  min: (values) => Math.min(...values),

  /**
   * Find maximum value
   */
  max: (values) => Math.max(...values),

  /**
   * Calculate weighted average
   */
  weightedAverage: (values, weights) => {
    if (values.length !== weights.length || values.length === 0) return 0;
    const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
    const weightSum = Aggregation.sum(weights);
    return weightSum > 0 ? weightedSum / weightSum : 0;
  },

  /**
   * Group and sum by key
   */
  groupAndSum: (items, keyField, valueField) => {
    return items.reduce((acc, item) => {
      const key = item[keyField];
      acc[key] = (acc[key] || 0) + (parseFloat(item[valueField]) || 0);
      return acc;
    }, {});
  }
};

/**
 * Status Determination Utilities
 */
const Status = {
  /**
   * Get health status based on index value
   */
  getHealthFromIndex: (index) => {
    if (index >= 1.0) return 'GREEN';
    if (index >= 0.9) return 'YELLOW';
    if (index >= 0.8) return 'ORANGE';
    return 'RED';
  },

  /**
   * Get combined health status
   */
  getCombinedHealth: (cpi, spi) => {
    const costHealth = Status.getHealthFromIndex(cpi);
    const scheduleHealth = Status.getHealthFromIndex(spi);
    
    const healthOrder = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];
    const worstIndex = Math.min(
      healthOrder.indexOf(costHealth),
      healthOrder.indexOf(scheduleHealth)
    );
    
    return healthOrder[worstIndex];
  },

  /**
   * Get budget status
   */
  getBudgetStatus: (utilization) => {
    if (utilization >= 100) return 'EXHAUSTED';
    if (utilization >= 90) return 'CRITICAL';
    if (utilization >= 75) return 'WARNING';
    if (utilization >= 50) return 'ON_TRACK';
    return 'UNDER_UTILIZED';
  }
};

module.exports = {
  EVM,
  VarianceAnalysis,
  Forecasting,
  Currency,
  Percentage,
  Aggregation,
  Status
};

const {
  calculateCPI,
  calculateSPI,
  calculateEAC,
  calculateETC,
  calculateVAC,
  calculateCV,
  safeDivide,
  costStatusFromCpi,
  scheduleStatusFromSpi,
  linearRegression,
  predictLinear,
  movingAverage
} = require('../../../../src/services/Forecast/forecastMath');
const { forecastThresholds } = require('../../../../src/config/forecastThresholds');
const { computeFromInputs } = require('../../../../src/services/Forecast/forecastService');
const { applyScenario } = require('../../../../src/services/Forecast/scenarioService');

describe('forecastMath', () => {
  it('calculates CPI = EV / AC', () => {
    expect(calculateCPI(6500000, 7200000)).toBeCloseTo(0.902777, 5);
  });

  it('calculates SPI = EV / PV', () => {
    expect(calculateSPI(6500000, 7800000)).toBeCloseTo(0.833333, 5);
  });

  it('calculates EAC = BAC / CPI', () => {
    const cpi = calculateCPI(6500000, 7200000);
    expect(calculateEAC(10000000, cpi)).toBeCloseTo(11076923.08, 1);
  });

  it('calculates ETC = EAC - AC', () => {
    expect(calculateETC(11076923.08, 7200000)).toBeCloseTo(3876923.08, 1);
  });

  it('calculates VAC = BAC - EAC', () => {
    expect(calculateVAC(10000000, 11076923.08)).toBeCloseTo(-1076923.08, 1);
  });

  it('never divides by zero or returns Infinity/NaN', () => {
    expect(safeDivide(100, 0, null)).toBeNull();
    expect(calculateCPI(5000, 0)).toBeNull();
    expect(calculateSPI(5000, 0)).toBeNull();
    expect(calculateEAC(10000, 0)).toBeNull();
    expect(calculateEAC(10000, null)).toBeNull();
    expect(Number.isFinite(calculateCPI(0, 100))).toBe(true);
  });

  it('maps CPI/SPI thresholds from centralized config', () => {
    expect(costStatusFromCpi(1.0, forecastThresholds.cpi)).toBe('ON_TRACK');
    expect(costStatusFromCpi(0.95, forecastThresholds.cpi)).toBe('AT_RISK');
    expect(costStatusFromCpi(0.80, forecastThresholds.cpi)).toBe('OVER_BUDGET');
    expect(scheduleStatusFromSpi(1.02, forecastThresholds.spi)).toBe('ON_TRACK');
    expect(scheduleStatusFromSpi(0.92, forecastThresholds.spi)).toBe('AT_RISK');
    expect(scheduleStatusFromSpi(0.83, forecastThresholds.spi)).toBe('DELAYED');
    expect(costStatusFromCpi(null)).toBe('INSUFFICIENT_DATA');
  });

  it('forecasts progress with linear trend regression', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 7, y: 18 },
      { x: 14, y: 27 },
      { x: 21, y: 34 }
    ];
    const model = linearRegression(points);
    expect(model.slope).toBeGreaterThan(1);
    const week5 = predictLinear(model, 28);
    expect(week5).toBeGreaterThan(34);
    expect(movingAverage([8, 9, 7, 8], 3)).toBeCloseTo(8, 5);
  });
});

function constructionInputs(overrides = {}) {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-04-11T00:00:00.000Z');
  const asOf = new Date('2026-02-20T00:00:00.000Z');
  return {
    project: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Harbor Warehouse Fit-out',
      status: 'active',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      budget: 10000000,
      progress: 50
    },
    asOfDate: asOf,
    budgets: [{ id: 'b1', amount: 10000000, status: 'APPROVED' }],
    expenses: [{
      id: 'e1',
      amount: 6500000,
      status: 'APPROVED',
      date: '2026-02-10T00:00:00.000Z',
      category: 'LABOR'
    }],
    costs: [{
      id: 'c1',
      type: 'MATERIAL',
      amount: 2000000,
      actualAmount: 800000
    }],
    tasks: [
      {
        id: 't1',
        name: 'Foundation',
        status: 'COMPLETED',
        progress: 100,
        duration: 30,
        isCritical: true,
        assignedTo: 'u1',
        actualEndDate: '2026-01-31T00:00:00.000Z',
        endDate: '2026-01-31T00:00:00.000Z'
      },
      {
        id: 't2',
        name: 'Structural steel',
        status: 'IN_PROGRESS',
        progress: 40,
        duration: 40,
        isCritical: true,
        assignedTo: 'u1',
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-03-12T00:00:00.000Z'
      },
      {
        id: 't3',
        name: 'MEP rough-in',
        status: 'NOT_STARTED',
        progress: 0,
        duration: 30,
        isCritical: false,
        assignedTo: 'u2',
        startDate: '2026-03-13T00:00:00.000Z',
        endDate: '2026-04-11T00:00:00.000Z'
      }
    ],
    labor: [
      { id: 'l1', status: 'ASSIGNED', name: 'Crew A', dailyRate: 800 },
      { id: 'l2', status: 'ASSIGNED', name: 'Crew B', dailyRate: 800 }
    ],
    teamMembers: [
      { id: 'tm1', status: 'ACTIVE', hoursPerWeek: 40, allocation: 100, userId: 'u1' },
      { id: 'tm2', status: 'ACTIVE', hoursPerWeek: 40, allocation: 100, userId: 'u2' }
    ],
    allocations: [
      { taskId: 't2', resourceType: 'LABOR', status: 'IN_USE', quantity: 2 },
      { taskId: 't3', resourceType: 'LABOR', status: 'PLANNED', quantity: 2 }
    ],
    snapshots: [],
    ...overrides
  };
}

describe('forecast engine with construction data', () => {
  it('produces EVM cost and schedule forecasts', () => {
    const result = computeFromInputs(constructionInputs());
    expect(result.costForecast.budgetAtCompletion).toBe(10000000);
    expect(result.costForecast.actualCost).toBe(6500000);
    expect(result.costForecast.costPerformanceIndex).toBeGreaterThan(0);
    expect(result.costForecast.estimateAtCompletion).toBeGreaterThan(result.costForecast.actualCost);
    expect(Number.isFinite(result.costForecast.costPerformanceIndex)).toBe(true);
    expect(result.scheduleForecast.schedulePerformanceIndex).not.toBe(Infinity);
    expect(result.scheduleForecast.methodology).not.toBeUndefined();
  });

  it('identifies resource shortage from remaining task hours', () => {
    const result = computeFromInputs(constructionInputs());
    expect(result.resourceForecast.methodology).toBe('REMAINING_TASK_HOURS');
    expect(result.resourceForecast.requiredHours).toBeGreaterThan(0);
    expect(Array.isArray(result.resourceForecast.affectedTasks)).toBe(true);
    expect(result.resourceForecast.affectedTasks.length).toBeGreaterThan(0);
  });

  it('returns INSUFFICIENT_DATA instead of fabricating resource requirements', () => {
    const result = computeFromInputs(constructionInputs({
      labor: [],
      teamMembers: [],
      allocations: [],
      tasks: [{ id: 't1', name: 'Unknown scope', status: 'IN_PROGRESS', progress: 10 }]
    }));
    expect(result.resourceForecast.status).toBe('INSUFFICIENT_DATA');
    expect(result.resourceForecast.requiredResources).toBeNull();
  });

  it('flags missing budget and invalid progress in data quality', () => {
    const result = computeFromInputs(constructionInputs({
      project: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Empty project',
        status: 'planning',
        budget: 0,
        progress: 0
      },
      budgets: [],
      expenses: [{ id: 'e-neg', amount: -100, status: 'APPROVED', date: '2026-02-01T00:00:00.000Z' }],
      costs: [],
      tasks: [{ id: 't-bad', name: 'Bad %', status: 'IN_PROGRESS', progress: 140, duration: null }]
    }));
    expect(result.dataQuality.missingData).toEqual(expect.arrayContaining(['budget']));
    expect(result.dataQuality.warnings).toEqual(expect.arrayContaining(['invalidCompletionPercentages']));
    expect(result.costForecast.actualCost).toBe(0);
  });

  it('runs ADD_WORKERS as an in-memory scenario without changing baseline inputs', () => {
    const baselineInputs = constructionInputs();
    const originalDuration = baselineInputs.tasks[1].duration;
    const applied = applyScenario(baselineInputs, { scenarioType: 'ADD_WORKERS', workersToAdd: 3 });
    expect(applied.scenarioType).toBe('ADD_WORKERS');
    expect(applied.applied.workersAdded).toBe(3);
    expect(baselineInputs.tasks[1].duration).toBe(originalDuration);
    expect(applied.inputs.labor.length).toBeGreaterThan(baselineInputs.labor.length);
    const scenario = computeFromInputs(applied.inputs, { label: 'SCENARIO / WHAT-IF' });
    expect(scenario.resultKind).toBe('SCENARIO / WHAT-IF');
  });

  it('generates deterministic alerts from forecast metrics', () => {
    const result = computeFromInputs(constructionInputs({
      expenses: [{
        id: 'e1',
        amount: 9000000,
        status: 'PAID',
        date: '2026-02-10T00:00:00.000Z',
        category: 'LABOR'
      }]
    }));
    const types = result.alerts.map((item) => item.type);
    expect(types.length).toBeGreaterThan(0);
    expect(result.alerts.every((item) => item.recommendedAction)).toBe(true);
  });
});

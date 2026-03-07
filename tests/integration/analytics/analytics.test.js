const request = require('supertest');
const app = require('../../../src/server');
const {
  sequelize,
  User,
  Project,
  Task,
  Budget,
  Expense,
  Risk,
  TeamMember
} = require('../../../src/models');
const { generateAuthToken, createTestUser } = require('../../helpers/testHelpers');
const { v4: uuidv4 } = require('uuid');

let authToken;
let testUser;
let testProject;
let testProject2;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  authToken = generateAuthToken(testUser);

  // Project 1 — active, with full data
  testProject = await Project.create({
    id: uuidv4(),
    name: 'Analytics Test Project A',
    projectType: 'residential',
    status: 'active',
    clientName: 'Client A',
    budget: 1000000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    projectManagerId: testUser.id
  });

  // Project 2 — completed
  testProject2 = await Project.create({
    id: uuidv4(),
    name: 'Analytics Test Project B',
    projectType: 'commercial',
    status: 'completed',
    clientName: 'Client B',
    budget: 500000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    projectManagerId: testUser.id
  });

  // Tasks
  await Task.create({
    id: uuidv4(),
    name: 'Completed Task',
    projectId: testProject.id,
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    assignedTo: testUser.id,
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-03-01')
  });
  await Task.create({
    id: uuidv4(),
    name: 'In Progress Task',
    projectId: testProject.id,
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    progress: 50,
    assignedTo: testUser.id,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-06-30')
  });
  await Task.create({
    id: uuidv4(),
    name: 'Not Started Task',
    projectId: testProject.id,
    status: 'NOT_STARTED',
    priority: 'LOW',
    progress: 0
  });

  // Budget
  await Budget.create({
    id: uuidv4(),
    name: 'Test Construction Budget',
    amount: 1000000,
    projectId: testProject.id,
    status: 'APPROVED',
    createdBy: testUser.id
  });

  // Expenses — different categories
  await Expense.create({
    id: uuidv4(),
    name: 'Labor Cost',
    amount: 150000,
    category: 'LABOR',
    date: new Date('2026-01-20'),
    projectId: testProject.id,
    status: 'PAID',
    submittedBy: testUser.id
  });
  await Expense.create({
    id: uuidv4(),
    name: 'Material Cost',
    amount: 200000,
    category: 'MATERIAL',
    date: new Date('2026-02-15'),
    projectId: testProject.id,
    status: 'APPROVED',
    submittedBy: testUser.id
  });
  await Expense.create({
    id: uuidv4(),
    name: 'Pending Equipment',
    amount: 50000,
    category: 'EQUIPMENT',
    date: new Date('2026-03-01'),
    projectId: testProject.id,
    status: 'PENDING',
    submittedBy: testUser.id
  });

  // Risks
  await Risk.create({
    id: uuidv4(),
    title: 'Weather Risk',
    probability: 0.7,
    impact: 0.8,
    riskScore: 0.56,
    severity: 'HIGH',
    status: 'IDENTIFIED',
    responseStrategy: 'MITIGATE',
    identifiedDate: new Date(),
    projectId: testProject.id,
    identifiedBy: testUser.id
  });
  await Risk.create({
    id: uuidv4(),
    title: 'Supply Risk',
    probability: 0.4,
    impact: 0.5,
    riskScore: 0.2,
    severity: 'MEDIUM',
    status: 'ANALYZING',
    responseStrategy: 'ACCEPT',
    identifiedDate: new Date(),
    projectId: testProject.id,
    identifiedBy: testUser.id
  });
  await Risk.create({
    id: uuidv4(),
    title: 'Closed Risk',
    probability: 0.1,
    impact: 0.1,
    riskScore: 0.01,
    severity: 'LOW',
    status: 'CLOSED',
    responseStrategy: 'ACCEPT',
    identifiedDate: new Date(),
    projectId: testProject.id,
    identifiedBy: testUser.id
  });

  // Team member
  await TeamMember.create({
    id: uuidv4(),
    projectId: testProject.id,
    userId: testUser.id,
    role: 'Lead Engineer',
    status: 'ACTIVE'
  });
});

afterAll(async () => {
  await sequelize.close();
});

// ============================================================
describe('Analytics API', () => {
  // ------------------------------------------------------------
  describe('GET /api/analytics/overview', () => {
    it('should return 200 with correct top-level shape', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('generatedAt');

      const d = res.body.data;
      expect(d).toHaveProperty('kpis');
      expect(d).toHaveProperty('projectHealth');
      expect(d).toHaveProperty('taskDistribution');
      expect(d).toHaveProperty('expensesByCategory');
      expect(d).toHaveProperty('monthlySpending');
      expect(d).toHaveProperty('riskSummary');
      expect(d).toHaveProperty('upcomingDeadlines');
      expect(d).toHaveProperty('recentActivity');
    });

    it('should return correct KPI counts', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      const { kpis } = res.body.data;
      expect(kpis.totalProjects).toBe(2);
      expect(kpis.activeProjects).toBe(1);
      expect(kpis.completedProjects).toBe(1);
      expect(kpis.totalTasks).toBe(3);
      expect(kpis.completedTasks).toBe(1);
      expect(kpis.openRisks).toBe(2); // 3 risks, 1 closed
      expect(kpis.activeTeamMembers).toBe(1);
      expect(typeof kpis.totalBudget).toBe('number');
      expect(typeof kpis.totalSpent).toBe('number');
      expect(typeof kpis.budgetUtilization).toBe('number');
      expect(typeof kpis.taskCompletionRate).toBe('number');
    });

    it('should return task distribution with all statuses present', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      const { taskDistribution } = res.body.data;
      expect(taskDistribution).toHaveProperty('NOT_STARTED');
      expect(taskDistribution).toHaveProperty('IN_PROGRESS');
      expect(taskDistribution).toHaveProperty('ON_HOLD');
      expect(taskDistribution).toHaveProperty('COMPLETED');
      expect(taskDistribution).toHaveProperty('CANCELLED');

      expect(taskDistribution.NOT_STARTED).toBe(1);
      expect(taskDistribution.IN_PROGRESS).toBe(1);
      expect(taskDistribution.COMPLETED).toBe(1);
    });

    it('should return expensesByCategory with all categories present', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      const { expensesByCategory } = res.body.data;
      ['MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'SUBCONTRACTOR', 'PERMITS', 'OTHER'].forEach(cat => {
        expect(expensesByCategory).toHaveProperty(cat);
        expect(typeof expensesByCategory[cat]).toBe('number');
      });

      // Approved/paid: LABOR=150000, MATERIAL=200000 — EQUIPMENT is PENDING so excluded
      expect(expensesByCategory.LABOR).toBe(150000);
      expect(expensesByCategory.MATERIAL).toBe(200000);
      expect(expensesByCategory.EQUIPMENT).toBe(0);
    });

    it('should return monthlySpending as 6-element array', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      const { monthlySpending } = res.body.data;
      expect(Array.isArray(monthlySpending)).toBe(true);
      expect(monthlySpending.length).toBe(6);
      monthlySpending.forEach(entry => {
        expect(entry).toHaveProperty('month');
        expect(entry).toHaveProperty('amount');
        expect(typeof entry.amount).toBe('number');
      });
    });

    it('should return riskSummary with bySeverity and byStatus', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      const { riskSummary } = res.body.data;
      expect(riskSummary).toHaveProperty('bySeverity');
      expect(riskSummary).toHaveProperty('byStatus');
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(s => {
        expect(riskSummary.bySeverity).toHaveProperty(s);
      });
      expect(riskSummary.bySeverity.HIGH).toBe(1);
      expect(riskSummary.bySeverity.MEDIUM).toBe(1);
    });

    it('should return projectHealth array with correct fields', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      const { projectHealth } = res.body.data;
      expect(Array.isArray(projectHealth)).toBe(true);
      expect(projectHealth.length).toBe(2);

      const proj = projectHealth.find(p => p.id === testProject.id);
      expect(proj).toBeDefined();
      expect(proj).toHaveProperty('name', 'Analytics Test Project A');
      expect(proj).toHaveProperty('status', 'active');
      expect(proj).toHaveProperty('budget');
      expect(proj).toHaveProperty('spent');
      expect(proj).toHaveProperty('budgetStatus');
      expect(proj).toHaveProperty('openRisks');
      expect(proj).toHaveProperty('taskCount');
      expect(proj).toHaveProperty('completedTaskCount');
      expect(proj.openRisks).toBe(2);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/analytics/overview');
      expect(res.status).toBe(401);
    });
  });

  // ------------------------------------------------------------
  describe('GET /api/analytics/project/:projectId', () => {
    it('should return 200 with correct top-level shape', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('generatedAt');

      const d = res.body.data;
      expect(d).toHaveProperty('project');
      expect(d).toHaveProperty('budget');
      expect(d).toHaveProperty('taskSummary');
      expect(d).toHaveProperty('expensesByCategory');
      expect(d).toHaveProperty('monthlySpending');
      expect(d).toHaveProperty('risks');
      expect(d).toHaveProperty('team');
      expect(d).toHaveProperty('recentActivity');
    });

    it('should return correct project info', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { project } = res.body.data;
      expect(project.id).toBe(testProject.id);
      expect(project.name).toBe('Analytics Test Project A');
      expect(project.status).toBe('active');
      expect(typeof project.progress).toBe('number');
      expect(project).toHaveProperty('daysRemaining');
      expect(project).toHaveProperty('isOverdue');
    });

    it('should return correct budget totals', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { budget } = res.body.data;
      expect(budget.totalBudget).toBe(1000000);
      expect(budget.totalSpent).toBe(350000); // LABOR + MATERIAL (both approved/paid)
      expect(budget.totalPending).toBe(50000); // EQUIPMENT is pending
      expect(budget.remaining).toBe(650000);
      expect(budget.utilization).toBe(35);
      expect(budget.isOverBudget).toBe(false);
    });

    it('should return correct task summary', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { taskSummary } = res.body.data;
      expect(taskSummary.total).toBe(3);
      expect(taskSummary.distribution.COMPLETED).toBe(1);
      expect(taskSummary.distribution.IN_PROGRESS).toBe(1);
      expect(taskSummary.distribution.NOT_STARTED).toBe(1);
      expect(typeof taskSummary.completionRate).toBe('number');
    });

    it('should return expensesByCategory for project only', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { expensesByCategory } = res.body.data;
      expect(expensesByCategory.LABOR).toBe(150000);
      expect(expensesByCategory.MATERIAL).toBe(200000);
      expect(expensesByCategory.EQUIPMENT).toBe(0); // PENDING, excluded
    });

    it('should return monthlySpending as 6-element array', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { monthlySpending } = res.body.data;
      expect(Array.isArray(monthlySpending)).toBe(true);
      expect(monthlySpending.length).toBe(6);
    });

    it('should return correct risk data', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { risks } = res.body.data;
      expect(risks.total).toBe(3);      // 3 risks total
      expect(risks.open).toBe(2);       // 1 is CLOSED
      expect(risks.bySeverity.HIGH).toBe(1);
      expect(risks.bySeverity.MEDIUM).toBe(1);
      expect(Array.isArray(risks.topRisks)).toBe(true);
      expect(risks.topRisks.length).toBeLessThanOrEqual(5);
      // Top risks should be sorted by severity (HIGH before MEDIUM)
      expect(risks.topRisks[0].severity).toBe('HIGH');
    });

    it('should return correct team data', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const { team } = res.body.data;
      expect(team.totalMembers).toBe(1);
      expect(team.byStatus.ACTIVE).toBe(1);
      expect(team.byStatus.PENDING).toBe(0);
      expect(team.byStatus.INACTIVE).toBe(0);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/analytics/project/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Project not found');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get(`/api/analytics/project/${testProject.id}`);
      expect(res.status).toBe(401);
    });
  });
});

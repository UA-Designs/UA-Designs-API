'use strict';

const { Op } = require('sequelize');
const {
  Project,
  Task,
  Budget,
  Expense,
  Risk,
  User,
  AuditLog,
  TeamMember
} = require('../../models');

// All expense categories — always present in output even if 0
const EXPENSE_CATEGORIES = ['MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'SUBCONTRACTOR', 'PERMITS', 'OTHER'];
const TASK_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const RISK_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const RISK_STATUSES = ['IDENTIFIED', 'ANALYZED', 'MITIGATING', 'MONITORING', 'ESCALATED'];
const TEAM_STATUSES = ['ACTIVE', 'PENDING', 'INACTIVE'];

class AnalyticsService {
  /**
   * Global overview — whole-company analytics
   */
  async getOverview() {
    const now = new Date();

    const [
      projects,
      tasks,
      budgetTotal,
      expenses,
      openRisks,
      risks,
      activeTeamMembers,
      recentAuditLogs,
      upcomingTasks
    ] = await Promise.all([
      // All active projects with tasks and expenses
      Project.findAll({
        include: [
          { model: Task, as: 'tasks', attributes: ['id', 'status', 'endDate'] },
          { model: Budget, as: 'budgets', attributes: ['amount', 'status'] },
          { model: Expense, as: 'expenses', attributes: ['amount', 'status'] },
          {
            model: Risk,
            as: 'risks',
            attributes: ['id'],
            where: { status: { [Op.ne]: 'CLOSED' } },
            required: false
          }
        ]
      }),

      // All tasks for distribution
      Task.findAll({ attributes: ['status'] }),

      // Total budget
      Budget.sum('amount') || 0,

      // All approved/paid expenses (for category breakdown + monthly trend)
      Expense.findAll({
        where: { status: { [Op.in]: ['APPROVED', 'PAID'] } },
        attributes: ['category', 'amount', 'date']
      }),

      // Open risk count
      Risk.count({ where: { status: { [Op.ne]: 'CLOSED' } } }),

      // All open risks for severity/status summary
      Risk.findAll({
        where: { status: { [Op.ne]: 'CLOSED' } },
        attributes: ['severity', 'status']
      }),

      // Active team members
      TeamMember.count({ where: { status: 'ACTIVE' } }),

      // Recent audit log entries
      AuditLog.findAll({
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: ['id', 'action', 'entity', 'description', 'createdAt']
      }),

      // Upcoming task deadlines (next 30 days, not completed)
      Task.findAll({
        where: {
          endDate: { [Op.between]: [now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)] },
          status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }
        },
        include: [{ model: Project, attributes: ['id', 'name'] }],
        order: [['endDate', 'ASC']],
        limit: 10,
        attributes: ['id', 'name', 'endDate', 'priority', 'status']
      })
    ]);

    // --- KPIs ---
    const totalBudgetSum = parseFloat(budgetTotal) || 0;
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdueTasks = tasks.filter(t => {
      if (!t.endDate) return false;
      return new Date(t.endDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    }).length;

    const kpis = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      onHoldProjects: projects.filter(p => p.status === 'on_hold').length,
      totalBudget: Math.round(totalBudgetSum * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      budgetUtilization: totalBudgetSum > 0
        ? Math.round((totalSpent / totalBudgetSum) * 10000) / 100
        : 0,
      totalTasks: tasks.length,
      completedTasks,
      overdueTasks,
      taskCompletionRate: tasks.length > 0
        ? Math.round((completedTasks / tasks.length) * 10000) / 100
        : 0,
      openRisks,
      activeTeamMembers
    };

    // --- Project Health ---
    const projectHealth = projects.map(p => {
      const pTasks = p.tasks || [];
      const pExpenses = p.expenses || [];
      const pBudgets = p.budgets || [];
      const spent = pExpenses
        .filter(e => ['APPROVED', 'PAID'].includes(e.status))
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const budget = pBudgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
        || parseFloat(p.budget || 0);
      const variance = spent - budget;

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        progress: pTasks.length > 0
          ? Math.round((pTasks.filter(t => t.status === 'COMPLETED').length / pTasks.length) * 100)
          : (p.progress || 0),
        budget: Math.round(budget * 100) / 100,
        spent: Math.round(spent * 100) / 100,
        budgetStatus: variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget',
        endDate: p.endDate,
        isOverdue: p.endDate ? new Date(p.endDate) < now && p.status !== 'completed' : false,
        openRisks: (p.risks || []).length,
        taskCount: pTasks.length,
        completedTaskCount: pTasks.filter(t => t.status === 'COMPLETED').length
      };
    });

    // --- Task Distribution ---
    const taskDistribution = Object.fromEntries(TASK_STATUSES.map(s => [s, 0]));
    tasks.forEach(t => {
      if (taskDistribution.hasOwnProperty(t.status)) taskDistribution[t.status]++;
    });

    // --- Expenses by Category ---
    const expensesByCategory = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, 0]));
    expenses.forEach(e => {
      if (expensesByCategory.hasOwnProperty(e.category)) {
        expensesByCategory[e.category] = Math.round(
          (expensesByCategory[e.category] + parseFloat(e.amount || 0)) * 100
        ) / 100;
      }
    });

    // --- Monthly Spending (last 6 months) ---
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }
    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.hasOwnProperty(key)) {
        monthlyMap[key] = Math.round((monthlyMap[key] + parseFloat(e.amount || 0)) * 100) / 100;
      }
    });
    const monthlySpending = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

    // --- Risk Summary ---
    const bySeverity = Object.fromEntries(RISK_SEVERITIES.map(s => [s, 0]));
    const byStatus = Object.fromEntries(RISK_STATUSES.map(s => [s, 0]));
    risks.forEach(r => {
      if (bySeverity.hasOwnProperty(r.severity)) bySeverity[r.severity]++;
      if (byStatus.hasOwnProperty(r.status)) byStatus[r.status]++;
    });
    const riskSummary = { bySeverity, byStatus };

    // --- Upcoming Deadlines ---
    const upcomingDeadlines = upcomingTasks.map(t => ({
      id: t.id,
      name: t.name,
      type: 'task',
      dueDate: t.endDate,
      projectId: t.Project ? t.Project.id : null,
      projectName: t.Project ? t.Project.name : null,
      priority: t.priority,
      status: t.status
    }));

    // --- Recent Activity ---
    const recentActivity = recentAuditLogs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      description: log.description,
      timestamp: log.createdAt,
      userName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`
        : 'System'
    }));

    return {
      kpis,
      projectHealth,
      taskDistribution,
      expensesByCategory,
      monthlySpending,
      riskSummary,
      upcomingDeadlines,
      recentActivity
    };
  }

  /**
   * Per-project deep-dive analytics
   */
  async getProjectAnalytics(projectId) {
    const now = new Date();

    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const [tasks, budgets, expenses, risks, teamMembers, recentAuditLogs] = await Promise.all([
      Task.findAll({
        where: { projectId },
        attributes: ['id', 'status', 'endDate', 'progress']
      }),

      Budget.findAll({
        where: { projectId },
        attributes: ['amount', 'status']
      }),

      Expense.findAll({
        where: { projectId },
        attributes: ['category', 'amount', 'status', 'date']
      }),

      Risk.findAll({
        where: { projectId },
        attributes: ['id', 'title', 'severity', 'status'],
        order: [['severity', 'ASC']]
      }),

      TeamMember.findAll({
        where: { projectId },
        attributes: ['id', 'status']
      }),

      AuditLog.findAll({
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 8,
        attributes: ['id', 'action', 'entity', 'description', 'createdAt']
      })
    ]);

    // AuditLog has no projectId FK — use global recent logs
    const recentLogs = recentAuditLogs;

    // --- Project info ---
    const startDate = project.startDate ? new Date(project.startDate) : null;
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const daysRemaining = endDate
      ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
      : null;

    const projectInfo = {
      id: project.id,
      name: project.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      progress: tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100)
        : (project.progress || 0),
      daysRemaining,
      isOverdue: endDate ? endDate < now && project.status !== 'completed' : false
    };

    // --- Budget ---
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
      || parseFloat(project.budget || 0);
    const approvedExpenses = expenses.filter(e => ['APPROVED', 'PAID'].includes(e.status));
    const pendingExpenses = expenses.filter(e => e.status === 'PENDING');
    const totalSpent = approvedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalPending = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const budget = {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      remaining: Math.round((totalBudget - totalSpent) * 100) / 100,
      utilization: totalBudget > 0
        ? Math.round((totalSpent / totalBudget) * 10000) / 100
        : 0,
      isOverBudget: totalSpent > totalBudget
    };

    // --- Task Summary ---
    const distribution = Object.fromEntries(TASK_STATUSES.map(s => [s, 0]));
    tasks.forEach(t => {
      if (distribution.hasOwnProperty(t.status)) distribution[t.status]++;
    });
    const overdueCount = tasks.filter(t => {
      if (!t.endDate) return false;
      return new Date(t.endDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    }).length;

    const taskSummary = {
      total: tasks.length,
      distribution,
      overdue: overdueCount,
      completionRate: tasks.length > 0
        ? Math.round((distribution.COMPLETED / tasks.length) * 10000) / 100
        : 0
    };

    // --- Expenses by Category ---
    const expensesByCategory = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, 0]));
    approvedExpenses.forEach(e => {
      if (expensesByCategory.hasOwnProperty(e.category)) {
        expensesByCategory[e.category] = Math.round(
          (expensesByCategory[e.category] + parseFloat(e.amount || 0)) * 100
        ) / 100;
      }
    });

    // --- Monthly Spending (last 6 months) ---
    const monthlyMap = {};
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }
    approvedExpenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.hasOwnProperty(key)) {
        monthlyMap[key] = Math.round((monthlyMap[key] + parseFloat(e.amount || 0)) * 100) / 100;
      }
    });
    const monthlySpending = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

    // --- Risks ---
    const openRisks = risks.filter(r => r.status !== 'CLOSED');
    const bySeverity = Object.fromEntries(RISK_SEVERITIES.map(s => [s, 0]));
    openRisks.forEach(r => {
      if (bySeverity.hasOwnProperty(r.severity)) bySeverity[r.severity]++;
    });
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const topRisks = openRisks
      .sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4))
      .slice(0, 5)
      .map(r => ({ id: r.id, title: r.title, severity: r.severity, status: r.status }));

    const riskData = {
      total: risks.length,
      open: openRisks.length,
      bySeverity,
      topRisks
    };

    // --- Team ---
    const byStatus = Object.fromEntries(TEAM_STATUSES.map(s => [s, 0]));
    teamMembers.forEach(m => {
      if (byStatus.hasOwnProperty(m.status)) byStatus[m.status]++;
    });
    const team = { totalMembers: teamMembers.length, byStatus };

    // --- Recent Activity ---
    const recentActivity = recentLogs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      description: log.description,
      timestamp: log.createdAt,
      userName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`
        : 'System'
    }));

    return {
      project: projectInfo,
      budget,
      taskSummary,
      expensesByCategory,
      monthlySpending,
      risks: riskData,
      team,
      recentActivity
    };
  }
}

module.exports = new AnalyticsService();

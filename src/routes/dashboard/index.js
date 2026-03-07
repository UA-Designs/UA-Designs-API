const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticateToken } = require('../../middleware/auth');
const { Project, Task, User, Budget, Expense, Risk } = require('../../models');

// Dashboard controller functions
const getStats = async (req, res) => {
  try {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      totalBudgetRaw,
      spentBudgetRaw,
      teamMembers,
      riskItems
    ] = await Promise.all([
      Project.count(),
      Project.count({ where: { status: 'active' } }),
      Project.count({ where: { status: 'completed' } }),
      Task.count(),
      Task.count({ where: { status: 'COMPLETED' } }),
      Task.count({
        where: {
          endDate: { [Op.lt]: new Date() },
          status: { [Op.ne]: 'COMPLETED' }
        }
      }),
      Budget.sum('amount'),
      Expense.sum('amount', {
        where: { status: { [Op.in]: ['APPROVED', 'PAID'] } }
      }),
      User.count({ where: { isActive: true } }),
      Risk.count({ where: { status: { [Op.ne]: 'CLOSED' } } })
    ]);

    const totalBudget = parseFloat(totalBudgetRaw) || 0;
    const spentBudget = parseFloat(spentBudgetRaw) || 0;

    res.json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        overdueTasks,
        totalBudget,
        spentBudget,
        remainingBudget: totalBudget - spentBudget,
        teamMembers,
        riskItems
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

const getProjectProgress = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'status']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const projectProgress = projects.map(project => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
      const progress = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : (project.progress || 0);

      return {
        id: project.id,
        name: project.name,
        progress,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: parseFloat(project.budget) || 0,
        phase: project.phase || null
      };
    });

    res.json({
      success: true,
      data: projectProgress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Project progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project progress',
      error: error.message
    });
  }
};

const getTaskProgress = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: [
        { model: Project, attributes: ['id', 'name'] },
        { model: User, as: 'assignedUser', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    const taskProgress = tasks.map(task => ({
      id: task.id,
      name: task.name,
      projectId: task.Project ? task.Project.id : null,
      projectName: task.Project ? task.Project.name : null,
      progress: task.progress || 0,
      status: task.status,
      assignedTo: task.assignedUser
        ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
        : null,
      dueDate: task.endDate,
      priority: task.priority
    }));

    res.json({
      success: true,
      data: taskProgress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Task progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task progress',
      error: error.message
    });
  }
};

const getCostVariance = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [
        {
          model: Budget,
          as: 'budgets',
          attributes: ['amount']
        },
        {
          model: Expense,
          as: 'expenses',
          attributes: ['amount', 'status']
        }
      ]
    });

    const costVariance = projects.map(project => {
      const budgets = project.budgets || [];
      const expenses = project.expenses || [];

      const budgetedCost = budgets.length > 0
        ? budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0)
        : parseFloat(project.budget) || 0;

      const actualCost = expenses
        .filter(e => ['APPROVED', 'PAID'].includes(e.status))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const variance = actualCost - budgetedCost;
      const variancePercentage = budgetedCost > 0
        ? parseFloat(((variance / budgetedCost) * 100).toFixed(2))
        : 0;

      return {
        id: project.id,
        projectName: project.name,
        budgetedCost,
        actualCost,
        variance,
        variancePercentage,
        status: variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget'
      };
    });

    res.json({
      success: true,
      data: costVariance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cost variance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost variance data',
      error: error.message
    });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 10, 100);

    const [tasks, risks, expenses] = await Promise.all([
      Task.findAll({
        include: [
          { model: Project, attributes: ['id', 'name'] },
          { model: User, as: 'assignedUser', attributes: ['firstName', 'lastName'] }
        ],
        order: [['updatedAt', 'DESC']],
        limit: limitNum
      }),
      Risk.findAll({
        include: [
          { model: Project, attributes: ['id', 'name'] },
          { model: User, as: 'riskOwner', attributes: ['firstName', 'lastName'] }
        ],
        order: [['updatedAt', 'DESC']],
        limit: limitNum
      }),
      Expense.findAll({
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] }
        ],
        order: [['updatedAt', 'DESC']],
        limit: limitNum
      })
    ]);

    const activities = [];

    tasks.forEach(task => {
      activities.push({
        id: task.id,
        type: 'task',
        message: `Task "${task.name}" is ${task.status}`,
        timestamp: task.updatedAt,
        projectId: task.Project ? task.Project.id : null,
        projectName: task.Project ? task.Project.name : null,
        userName: task.assignedUser
          ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
          : 'Unassigned'
      });
    });

    risks.forEach(risk => {
      activities.push({
        id: risk.id,
        type: 'risk',
        message: `Risk "${risk.title}" is ${risk.status}`,
        timestamp: risk.updatedAt,
        projectId: risk.Project ? risk.Project.id : null,
        projectName: risk.Project ? risk.Project.name : null,
        userName: risk.riskOwner
          ? `${risk.riskOwner.firstName} ${risk.riskOwner.lastName}`
          : 'Unknown'
      });
    });

    expenses.forEach(expense => {
      activities.push({
        id: expense.id,
        type: 'expense',
        message: `Expense "${expense.name}" is ${expense.status}`,
        timestamp: expense.updatedAt,
        projectId: expense.project ? expense.project.id : null,
        projectName: expense.project ? expense.project.name : null,
        userName: 'N/A'
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limited = activities.slice(0, limitNum);

    res.json({
      success: true,
      data: limited,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
};

const getRiskMatrix = async (req, res) => {
  try {
    const risks = await Risk.findAll({
      where: { status: { [Op.ne]: 'CLOSED' } },
      include: [
        { model: Project, attributes: ['id', 'name'] },
        { model: User, as: 'riskOwner', attributes: ['firstName', 'lastName'] }
      ],
      order: [
        ['impact', 'DESC'],
        ['probability', 'DESC']
      ]
    });

    const riskMatrix = risks.map(risk => ({
      id: risk.id,
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      projectId: risk.Project ? risk.Project.id : null,
      projectName: risk.Project ? risk.Project.name : null,
      assignedTo: risk.riskOwner
        ? `${risk.riskOwner.firstName} ${risk.riskOwner.lastName}`
        : null,
      mitigationStrategy: risk.mitigationStrategy || null
    }));

    res.json({
      success: true,
      data: riskMatrix,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Risk matrix error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk matrix',
      error: error.message
    });
  }
};

// Dashboard routes
router.get('/stats', authenticateToken, getStats);
router.get('/project-progress', authenticateToken, getProjectProgress);
router.get('/task-progress', authenticateToken, getTaskProgress);
router.get('/cost-variance', authenticateToken, getCostVariance);
router.get('/recent-activities', authenticateToken, getRecentActivities);
router.get('/risk-matrix', authenticateToken, getRiskMatrix);

module.exports = router;

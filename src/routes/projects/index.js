const express = require('express');
const { Project, User, Task, Budget, Risk, Stakeholder, Material, Labor, Equipment, Expense } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');
const { authorize, authorizeOwnerOr } = require('../../middleware/authorize');
const { Op } = require('sequelize');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'UA Designs Project Management Service',
    timestamp: new Date().toISOString()
  });
});

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      projectType, 
      phase,
      projectManagerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (status) whereClause.status = status;
    if (projectType) whereClause.projectType = projectType;
    if (phase) whereClause.phase = phase;
    if (projectManagerId) whereClause.projectManagerId = projectManagerId;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { projectNumber: { [Op.iLike]: `%${search}%` } },
        { clientName: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Attach actualCost per project (sum of all expenses for that project)
    const projectIds = projects.map(p => p.id);
    let spentByProject = {};
    if (projectIds.length > 0) {
      const expenseSums = await Expense.findAll({
        attributes: [
          'projectId',
          [Project.sequelize.fn('SUM', Project.sequelize.col('amount')), 'totalSpent']
        ],
        where: { projectId: { [Op.in]: projectIds } },
        group: ['projectId'],
        raw: true
      });

      spentByProject = expenseSums.reduce((acc, row) => {
        acc[row.projectId] = parseFloat(row.totalSpent || 0);
        return acc;
      }, {});

      projects.forEach(project => {
        const actualCost = spentByProject[project.id] || 0;
        project.setDataValue('actualCost', actualCost);
      });
    }

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalProjects: count,
          hasNext: offset + projects.length < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

// Budget overview for project detail: project.budget vs actual (sum of logged expenses)
router.get('/:id/budget-overview', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id, { attributes: ['id', 'name', 'budget'] });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const budget = parseFloat(project.budget || 0);
    const expenses = await Expense.findAll({
      where: { projectId: id },
      attributes: ['amount', 'status']
    });
    // Actual cost = sum of all expenses logged on the Expenses page for this project
    const totalActualCost = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const variance = budget - totalActualCost;
    res.json({
      success: true,
      data: {
        projectId: id,
        projectName: project.name,
        budget,
        totalActualCost,
        variance,
        isOverBudget: variance < 0,
        expenseCount: expenses.length
      }
    });
  } catch (error) {
    console.error('Get budget overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget overview',
      error: error.message
    });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'name', 'status', 'progress', 'priority', 'plannedStartDate', 'plannedEndDate'],
          include: [
            {
              model: User,
              as: 'assignedUser',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
});

// Get project dashboard with all PMBOK core areas
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get counts for each PMBOK core area
    const [
      taskCount,
      budgetCount,
      riskCount,
      stakeholderCount,
      materialCount,
      laborCount,
      equipmentCount
    ] = await Promise.all([
      Task.count({ where: { projectId: id } }),
      Budget.count({ where: { projectId: id } }),
      Risk.count({ where: { projectId: id } }),
      Stakeholder.count({ where: { projectId: id } }),
      Material.count({ where: { projectId: id } }),
      Labor.count({ where: { projectId: id } }),
      Equipment.count({ where: { projectId: id } })
    ]);

    // Get recent activities
    const recentTasks = await Task.findAll({
      where: { projectId: id },
      order: [['updatedAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'status', 'updatedAt']
    });

    const recentRisks = await Risk.findAll({
      where: { projectId: id },
      order: [['updatedAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'status', 'riskScore', 'updatedAt']
    });

    const dashboardData = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress || 0,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        priority: project.priority,
        projectType: project.projectType,
        clientName: project.clientName
      },
      pmbokCoreAreas: {
        schedule: { 
          count: taskCount, 
          label: 'Tasks',
          description: 'Project scheduling and task management'
        },
        cost: { 
          count: budgetCount, 
          label: 'Budgets',
          description: 'Budget tracking and cost management'
        },
        risk: { 
          count: riskCount, 
          label: 'Risks',
          description: 'Risk assessment and mitigation'
        },
        stakeholders: { 
          count: stakeholderCount, 
          label: 'Stakeholders',
          description: 'Stakeholder communication and engagement'
        },
        resources: { 
          count: materialCount + laborCount + equipmentCount, 
          label: 'Resources',
          description: 'Resource allocation and management',
          breakdown: {
            materials: materialCount,
            labor: laborCount,
            equipment: equipmentCount
          }
        }
      },
      recentActivities: {
        tasks: recentTasks,
        risks: recentRisks
      },
      projectHealth: {
        isOverdue: project.endDate ? new Date() > new Date(project.endDate) && project.status !== 'completed' : false,
        daysRemaining: project.endDate ? Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
        progress: project.progress || 0
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get project dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project dashboard',
      error: error.message
    });
  }
});

// Create new project
router.post('/', authenticateToken, authorize('ENGINEER_AND_ABOVE'), async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      budget,
      projectManagerId,
      clientName,
      clientEmail,
      clientPhone,
      location,
      projectType,
      priority
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!clientName) missingFields.push('clientName');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? parseFloat(budget) : 0,
      projectManagerId: projectManagerId || req.user.id,
      clientName,
      clientEmail,
      clientPhone,
      location,
      projectType: projectType || 'residential',
      priority: priority || 'medium'
    });

    // Fetch the created project with project manager details
    const projectWithManager = await Project.findByPk(project.id, {
      include: [{
        model: User,
        as: 'projectManager',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: projectWithManager
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
});

// Update project (ADMIN/PROPRIETOR or MANAGER_AND_ABOVE e.g. PROJECT_MANAGER, ARCHITECT; or assigned project manager)
router.put('/:id', authenticateToken, authorizeOwnerOr('MANAGER_AND_ABOVE', async (req) => {
  const project = await Project.findByPk(req.params.id, { attributes: ['projectManagerId'] });
  return project?.projectManagerId;
}), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.projectNumber;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Convert date strings to Date objects
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.plannedEndDate) updateData.plannedEndDate = new Date(updateData.plannedEndDate);
    if (updateData.actualEndDate) updateData.actualEndDate = new Date(updateData.actualEndDate);

    // Convert numeric fields
    if (updateData.budget) updateData.budget = parseFloat(updateData.budget);
    if (updateData.estimatedCost) updateData.estimatedCost = parseFloat(updateData.estimatedCost);
    if (updateData.actualCost) updateData.actualCost = parseFloat(updateData.actualCost);

    await project.update(updateData);

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
});

// Update project status (ADMIN/PROPRIETOR or MANAGER_AND_ABOVE e.g. PROJECT_MANAGER, ARCHITECT; or assigned project manager)
router.patch('/:id/status', authenticateToken, authorizeOwnerOr('MANAGER_AND_ABOVE', async (req) => {
  const project = await Project.findByPk(req.params.id, { attributes: ['projectManagerId'] });
  return project?.projectManagerId;
}), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, phase, actualEndDate } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (phase) updateData.phase = phase;
    if (actualEndDate) updateData.actualEndDate = new Date(actualEndDate);

    await project.update(updateData);

    res.json({
      success: true,
      message: 'Project status updated successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project status',
      error: error.message
    });
  }
});

// Assign project manager
router.patch('/:id/assign-manager', authenticateToken, authorize('ADMIN_ONLY'), async (req, res) => {
  try {
    const { id } = req.params;
    const { projectManagerId } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify the new project manager exists and has appropriate role
    const newManager = await User.findByPk(projectManagerId);
    if (!newManager) {
      return res.status(404).json({
        success: false,
        message: 'Project manager not found'
      });
    }

    if (!['ADMIN', 'PROJECT_MANAGER', 'ARCHITECT'].includes(newManager.role)) {
      return res.status(400).json({
        success: false,
        message: 'User must be an architect, project manager, or admin to be assigned as project manager'
      });
    }

    await project.update({ projectManagerId });

    res.json({
      success: true,
      message: 'Project manager assigned successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Assign project manager error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign project manager',
      error: error.message
    });
  }
});

// Delete project (soft delete)
router.delete('/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.destroy(); // Soft delete

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
});

// Get project statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const totalProjects = await Project.count();
    const activeProjects = await Project.count({ where: { status: 'active' } });
    const completedProjects = await Project.count({ where: { status: 'completed' } });
    const planningProjects = await Project.count({ where: { status: 'planning' } });

    // Count projects by type
    const typeStats = await Project.findAll({
      attributes: [
        'projectType',
        [Project.sequelize.fn('COUNT', Project.sequelize.col('id')), 'count']
      ],
      group: ['projectType'],
      raw: true
    });

    // Count projects by status
    const statusStats = await Project.findAll({
      attributes: [
        'status',
        [Project.sequelize.fn('COUNT', Project.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Recent projects (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentProjects = await Project.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Total budget and spend across all projects
    const budgetStats = await Project.findAll({
      attributes: [
        [Project.sequelize.fn('SUM', Project.sequelize.col('budget')), 'totalBudget']
      ],
      raw: true
    });

    const expenseStats = await Expense.findAll({
      attributes: [
        [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount')), 'totalSpent']
      ],
      raw: true
    });

    const totalBudget = parseFloat(budgetStats[0]?.totalBudget || 0);
    const spentBudget = parseFloat(expenseStats[0]?.totalSpent || 0);
    const remainingBudget = totalBudget - spentBudget;

    res.json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        planningProjects,
        recentProjects,
        typeStats: typeStats.reduce((acc, stat) => {
          acc[stat.projectType] = parseInt(stat.count);
          return acc;
        }, {}),
        statusStats: statusStats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {}),
        budgetStats: {
          totalBudget,
          spentBudget,
          remainingBudget
        }
      }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project statistics',
      error: error.message
    });
  }
});

// Get projects by status
router.get('/status/:status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.params;

    const projects = await Project.findAll({
      where: { status },
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('Get projects by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects by status',
      error: error.message
    });
  }
});

// Get projects by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;

    const projects = await Project.findAll({
      where: { projectType: type.toUpperCase() },
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('Get projects by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects by type',
      error: error.message
    });
  }
});

// Get user's projects
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own projects unless they're admin
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own projects'
      });
    }

    const projects = await Project.findAll({
      where: { projectManagerId: userId },
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user projects',
      error: error.message
    });
  }
});

module.exports = router;


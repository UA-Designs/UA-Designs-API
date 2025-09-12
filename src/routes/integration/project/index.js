const express = require('express');
const { Project, User, Task } = require('../../models');
const { authenticateToken, authorizeRoles, authorizePermission } = require('../../middleware/auth');
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
              as: 'assignedTo',
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

// Create new project
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), async (req, res) => {
  try {
    const {
      name,
      description,
      projectType,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      projectLocation,
      startDate,
      plannedEndDate,
      budget,
      estimatedCost,
      scope,
      deliverables,
      exclusions,
      constraints,
      assumptions,
      qualityObjectives,
      resourceRequirements,
      riskRegister,
      communicationPlan,
      procurementPlan,
      stakeholderRegister,
      buildingPermits,
      siteConditions,
      weatherConsiderations,
      safetyRequirements,
      priority
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!projectType) missingFields.push('projectType');
    if (!clientName) missingFields.push('clientName');
    if (!projectLocation) missingFields.push('projectLocation');
    if (!startDate) missingFields.push('startDate');
    if (!plannedEndDate) missingFields.push('plannedEndDate');
    if (!budget) missingFields.push('budget');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Generate project number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const projectCount = await Project.count({
      where: {
        projectNumber: {
          [Op.like]: `UA-${year}${month}%`
        }
      }
    });
    const projectNumber = `UA-${year}${month}${String(projectCount + 1).padStart(3, '0')}`;

    // Create project
    const project = await Project.create({
      projectNumber,
      name,
      description,
      projectType,
      status: 'PROPOSAL',
      phase: 'INITIATION',
      projectManagerId: req.user.id,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      projectLocation,
      startDate: new Date(startDate),
      plannedEndDate: new Date(plannedEndDate),
      budget: parseFloat(budget),
      estimatedCost: parseFloat(estimatedCost || budget),
      actualCost: 0,
      scope: scope || {},
      deliverables: deliverables || [],
      exclusions: exclusions || [],
      constraints: constraints || [],
      assumptions: assumptions || [],
      qualityObjectives: qualityObjectives || [],
      resourceRequirements: resourceRequirements || {
        materials: [],
        equipment: [],
        labor: [],
        subcontractors: []
      },
      riskRegister: riskRegister || [],
      communicationPlan: communicationPlan || {
        stakeholders: [],
        communicationChannels: [],
        reportingSchedule: [],
        escalationProcedures: []
      },
      procurementPlan: procurementPlan || {
        materials: [],
        equipment: [],
        services: [],
        subcontractors: []
      },
      stakeholderRegister: stakeholderRegister || [],
      buildingPermits: buildingPermits || [],
      siteConditions: siteConditions || {},
      weatherConsiderations: weatherConsiderations || {},
      safetyRequirements: safetyRequirements || [],
      priority: priority || 'MEDIUM'
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
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

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
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

    // Check permissions - only project manager or admin can update
    if (req.user.role !== 'ADMIN' && project.projectManagerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only project manager or admin can update this project'
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

// Update project status
router.patch('/:id/status', authenticateToken, async (req, res) => {
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

    // Check permissions
    if (req.user.role !== 'ADMIN' && project.projectManagerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only project manager or admin can update project status'
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
router.patch('/:id/assign-manager', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), async (req, res) => {
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

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(newManager.role)) {
      return res.status(400).json({
        success: false,
        message: 'User must be a project manager or admin to be assigned as project manager'
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
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
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
    const activeProjects = await Project.count({ where: { status: 'IN_PROGRESS' } });
    const completedProjects = await Project.count({ where: { status: 'COMPLETED' } });
    const planningProjects = await Project.count({ where: { status: 'PLANNING' } });

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

    // Total budget and actual cost
    const budgetStats = await Project.findAll({
      attributes: [
        [Project.sequelize.fn('SUM', Project.sequelize.col('budget')), 'totalBudget'],
        [Project.sequelize.fn('SUM', Project.sequelize.col('actualCost')), 'totalActualCost']
      ],
      raw: true
    });

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
          totalBudget: parseFloat(budgetStats[0]?.totalBudget || 0),
          totalActualCost: parseFloat(budgetStats[0]?.totalActualCost || 0)
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


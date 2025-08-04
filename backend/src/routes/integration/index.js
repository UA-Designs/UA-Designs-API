const express = require('express');
const { Project, Task, User, ChangeRequest } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize'); // Added Op for OR queries
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Integration route is working!',
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'UA Designs PMS Project Integration Service'
  });
});

// Get all projects (simplified for testing)
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        projects: projects,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: projects.length,
          itemsPerPage: 10
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get project by ID with full details
router.get('/projects/:id', authenticateToken, async (req, res) => {
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
          include: [
            {
              model: User,
              as: 'assignedTo',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: ChangeRequest,
          as: 'changeRequests'
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
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new project
router.post('/projects', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), async (req, res) => {
  try {
    const {
      name,
      description,
      projectType,
      clientName,
      clientEmail,
      clientPhone,
      projectLocation,
      budget,
      plannedEndDate,
      projectManagerId
    } = req.body;

    // Validate required fields
    if (!name || !projectType || !clientName || !budget || !plannedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, projectType, clientName, budget, plannedEndDate'
      });
    }

    // Generate project number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const projectNumber = `UA-${timestamp}-${random}`;

    const project = await Project.create({
      projectNumber,
      name,
      description,
      projectType,
      status: 'PROPOSAL',
      phase: 'INITIATION',
      clientName,
      clientEmail,
      clientPhone,
      projectLocation,
      budget: parseFloat(budget),
      plannedEndDate: new Date(plannedEndDate),
      projectManagerId: projectManagerId || req.user.id,
      startDate: new Date()
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
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update project
router.put('/projects/:id', authenticateToken, async (req, res) => {
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

    // Check permissions (only project manager or admin can update)
    if (req.user.role !== 'ADMIN' && project.projectManagerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only project manager or admin can update this project'
      });
    }

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
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete project (soft delete)
router.delete('/projects/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
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
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get project dashboard data
router.get('/projects/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'tasks',
          include: [
            {
              model: User,
              as: 'assignedTo',
              attributes: ['firstName', 'lastName']
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

    // Calculate dashboard metrics
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length;
    const inProgressTasks = project.tasks.filter(task => task.status === 'IN_PROGRESS').length;
    const delayedTasks = project.tasks.filter(task => {
      return task.status !== 'COMPLETED' && new Date() > task.plannedEndDate;
    }).length;

    const totalPlannedCost = project.tasks.reduce((sum, task) => sum + parseFloat(task.plannedCost || 0), 0);
    const totalActualCost = project.tasks.reduce((sum, task) => sum + parseFloat(task.actualCost || 0), 0);
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const dashboardData = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        phase: project.phase,
        budget: project.budget,
        actualCost: project.actualCost,
        plannedEndDate: project.plannedEndDate
      },
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        delayedTasks,
        totalPlannedCost,
        totalActualCost,
        overallProgress: Math.round(overallProgress * 100) / 100,
        costVariance: totalPlannedCost - totalActualCost,
        scheduleVariance: project.plannedEndDate ? 
          Math.ceil((new Date(project.plannedEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
      },
      recentTasks: project.tasks.slice(0, 5).map(task => ({
        id: task.id,
        name: task.name,
        status: task.status,
        progress: task.progress,
        assignedTo: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned'
      }))
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get project performance metrics
router.get('/projects/:id/performance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'tasks'
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Calculate performance metrics
    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const onTimeTasks = tasks.filter(task => {
      return task.status === 'COMPLETED' && 
             task.actualEndDate && 
             new Date(task.actualEndDate) <= new Date(task.plannedEndDate);
    }).length;

    const totalPlannedCost = tasks.reduce((sum, task) => sum + parseFloat(task.plannedCost || 0), 0);
    const totalActualCost = tasks.reduce((sum, task) => sum + parseFloat(task.actualCost || 0), 0);

    const performanceMetrics = {
      schedulePerformance: totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 0,
      costPerformance: totalPlannedCost > 0 ? ((totalPlannedCost - totalActualCost) / totalPlannedCost) * 100 : 0,
      qualityPerformance: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      overallProgress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    };

    res.json({
      success: true,
      data: {
        projectId: id,
        metrics: performanceMetrics,
        summary: {
          totalTasks,
          completedTasks,
          onTimeTasks,
          totalPlannedCost,
          totalActualCost
        }
      }
    });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router; 
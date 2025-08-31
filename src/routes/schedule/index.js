const express = require('express');
const { Task, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'UA Designs PMS Schedule Management Service'
  });
});

// Get all tasks for a project
router.get('/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignedTo, taskType, search } = req.query;

    // Build where clause
    const whereClause = { projectId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedTo) whereClause.assignedToId = assignedTo;
    if (taskType) whereClause.taskType = taskType;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { taskNumber: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          attributes: ['id', 'name', 'projectNumber']
        }
      ],
      order: [['wbsCode', 'ASC']]
    });

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get task by ID
router.get('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          attributes: ['id', 'name', 'projectNumber']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new task
router.post('/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      wbsCode,
      priority,
      plannedStartDate,
      plannedEndDate,
      plannedCost,
      assignedToId,
      taskType,
      location,
      dependencies,
      predecessors,
      successors
    } = req.body;

    // Validate required fields
    if (!name || !wbsCode || !plannedStartDate || !plannedEndDate || !taskType) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, wbsCode, plannedStartDate, plannedEndDate, taskType'
      });
    }

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Generate task number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const taskNumber = `TASK-${timestamp}-${random}`;

    // Calculate planned duration
    const startDate = new Date(plannedStartDate);
    const endDate = new Date(plannedEndDate);
    const plannedDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const task = await Task.create({
      taskNumber,
      name,
      description,
      wbsCode,
      wbsLevel: wbsCode.split('.').length,
      projectId,
      priority: priority || 'MEDIUM',
      plannedStartDate: startDate,
      plannedEndDate: endDate,
      plannedDuration,
      plannedCost: parseFloat(plannedCost || 0),
      assignedToId,
      createdById: req.user.id,
      taskType,
      location,
      dependencies: dependencies || [],
      predecessors: predecessors || [],
      successors: successors || [],
      status: 'NOT_STARTED',
      progress: 0
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update task
router.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions (assigned user, project manager, or admin can update)
    const project = await Project.findByPk(task.projectId);
    if (req.user.role !== 'ADMIN' && 
        task.assignedToId !== req.user.id && 
        project.projectManagerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned user, project manager, or admin can update this task'
      });
    }

    // Update planned duration if dates changed
    if (updateData.plannedStartDate || updateData.plannedEndDate) {
      const startDate = new Date(updateData.plannedStartDate || task.plannedStartDate);
      const endDate = new Date(updateData.plannedEndDate || task.plannedEndDate);
      updateData.plannedDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }

    await task.update(updateData);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update task progress
router.patch('/tasks/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status, actualStartDate, actualEndDate, actualCost, notes } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions (assigned user, project manager, or admin can update progress)
    const project = await Project.findByPk(task.projectId);
    if (req.user.role !== 'ADMIN' && 
        task.assignedToId !== req.user.id && 
        project.projectManagerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned user, project manager, or admin can update task progress'
      });
    }

    const updateData = {};

    if (progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress));
      
      // Auto-update status based on progress
      if (updateData.progress === 100) {
        updateData.status = 'COMPLETED';
        updateData.actualEndDate = new Date();
      } else if (updateData.progress > 0 && task.status === 'NOT_STARTED') {
        updateData.status = 'IN_PROGRESS';
        updateData.actualStartDate = new Date();
      }
    }

    if (status) updateData.status = status;
    if (actualStartDate) updateData.actualStartDate = new Date(actualStartDate);
    if (actualEndDate) updateData.actualEndDate = new Date(actualEndDate);
    if (actualCost !== undefined) updateData.actualCost = parseFloat(actualCost);
    if (notes) updateData.notes = notes;

    // Update actual duration if dates changed
    if (updateData.actualStartDate || updateData.actualEndDate) {
      const startDate = updateData.actualStartDate || task.actualStartDate;
      const endDate = updateData.actualEndDate || task.actualEndDate;
      if (startDate && endDate) {
        updateData.actualDuration = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      }
    }

    await task.update(updateData);

    res.json({
      success: true,
      message: 'Task progress updated successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Update task progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete task
router.delete('/tasks/:id', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.destroy(); // Soft delete

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get project schedule (Gantt chart data)
router.get('/projects/:projectId/schedule', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['wbsCode', 'ASC']]
    });

    const scheduleData = tasks.map(task => ({
      id: task.id,
      taskNumber: task.taskNumber,
      name: task.name,
      wbsCode: task.wbsCode,
      status: task.status,
      progress: task.progress,
      priority: task.priority,
      plannedStartDate: task.plannedStartDate,
      plannedEndDate: task.plannedEndDate,
      actualStartDate: task.actualStartDate,
      actualEndDate: task.actualEndDate,
      plannedDuration: task.plannedDuration,
      actualDuration: task.actualDuration,
      assignedTo: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned',
      isCritical: task.isCritical,
      dependencies: task.dependencies,
      predecessors: task.predecessors,
      successors: task.successors
    }));

    res.json({
      success: true,
      data: {
        projectId,
        tasks: scheduleData,
        criticalPath: scheduleData.filter(task => task.isCritical),
        delayedTasks: scheduleData.filter(task => {
          return task.status !== 'COMPLETED' && new Date() > task.plannedEndDate;
        })
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get task dependencies
router.get('/tasks/:id/dependencies', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get predecessor tasks
    const predecessors = await Task.findAll({
      where: {
        id: task.predecessors
      },
      attributes: ['id', 'name', 'status', 'progress', 'plannedEndDate']
    });

    // Get successor tasks
    const successors = await Task.findAll({
      where: {
        id: task.successors
      },
      attributes: ['id', 'name', 'status', 'progress', 'plannedStartDate']
    });

    res.json({
      success: true,
      data: {
        taskId: id,
        taskName: task.name,
        predecessors,
        successors,
        dependencies: task.dependencies
      }
    });
  } catch (error) {
    console.error('Get dependencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get critical path analysis
router.get('/projects/:projectId/critical-path', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.findAll({
      where: { projectId },
      order: [['wbsCode', 'ASC']]
    });

    // Simple critical path calculation
    const criticalPath = tasks.filter(task => task.isCritical);
    const delayedTasks = tasks.filter(task => {
      return task.status !== 'COMPLETED' && new Date() > task.plannedEndDate;
    });

    const totalFloat = tasks.reduce((sum, task) => sum + (task.totalFloat || 0), 0);
    const freeFloat = tasks.reduce((sum, task) => sum + (task.freeFloat || 0), 0);

    res.json({
      success: true,
      data: {
        projectId,
        criticalPath,
        delayedTasks,
        totalFloat,
        freeFloat,
        totalTasks: tasks.length,
        criticalTasks: criticalPath.length,
        delayedTasksCount: delayedTasks.length
      }
    });
  } catch (error) {
    console.error('Get critical path error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router; 
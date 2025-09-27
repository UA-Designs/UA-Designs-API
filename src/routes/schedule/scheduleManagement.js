const express = require('express');
const { Task, TaskDependency, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const taskController = require('../../controllers/Schedule/taskController');
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

// ==================== TASK MANAGEMENT ROUTES ====================

// Get all tasks for a project with filtering and pagination
router.get('/projects/:projectId/tasks', authenticateToken, taskController.getTasks);

// Get all tasks (general endpoint)
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId, ...filters } = req.query;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    req.params.projectId = projectId;
    return taskController.getTasks(req, res);
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
router.get('/tasks/:id', authenticateToken, taskController.getTaskById);

// Create new task
router.post('/projects/:projectId/tasks', authenticateToken, taskController.createTask);

// Create new task (general endpoint)
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId, ...taskData } = req.body;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    req.params.projectId = projectId;
    req.body = taskData;
    return taskController.createTask(req, res);
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
router.put('/tasks/:id', authenticateToken, taskController.updateTask);

// Update task status/progress
router.put('/tasks/:id/status', authenticateToken, taskController.updateTaskStatus);

// Delete task
router.delete('/tasks/:id', authenticateToken, taskController.deleteTask);

// ==================== TASK DEPENDENCY ROUTES ====================

// Get task dependencies
router.get('/tasks/:id/dependencies', authenticateToken, taskController.getTaskDependencies);

// Get all task dependencies for a project
router.get('/projects/:projectId/dependencies', authenticateToken, taskController.getProjectDependencies);

// Create task dependency
router.post('/dependencies', authenticateToken, taskController.createTaskDependency);

// Delete task dependency
router.delete('/dependencies/:id', authenticateToken, taskController.deleteTaskDependency);

// ==================== CRITICAL PATH ROUTES ====================

// Get critical path for project
router.get('/projects/:projectId/critical-path', authenticateToken, taskController.getCriticalPath);

// ==================== SCHEDULE VISUALIZATION ROUTES ====================

// Get project schedule (Gantt chart data)
router.get('/projects/:projectId/schedule', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['firstName', 'lastName']
        },
        {
          model: TaskDependency,
          as: 'predecessorDependencies',
          attributes: ['id', 'dependencyType', 'lag']
        },
        {
          model: TaskDependency,
          as: 'successorDependencies',
          attributes: ['id', 'dependencyType', 'lag']
        }
      ],
      order: [['startDate', 'ASC']]
    });

    const scheduleData = tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      progress: task.progress,
      priority: task.priority,
      startDate: task.startDate,
      endDate: task.endDate,
      duration: task.duration,
      assignedTo: task.assignedUser ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : 'Unassigned',
      isCritical: task.isCritical,
      dependencies: task.predecessorDependencies.map(dep => ({
        id: dep.id,
        type: dep.dependencyType,
        lag: dep.lag
      }))
    }));

    res.json({
      success: true,
      data: {
        projectId,
        tasks: scheduleData,
        criticalPath: scheduleData.filter(task => task.isCritical),
        delayedTasks: scheduleData.filter(task => {
          return task.status !== 'COMPLETED' && task.endDate && new Date() > new Date(task.endDate);
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

module.exports = router; 
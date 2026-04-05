const express = require('express');
const { Task, TaskDependency, Project, User } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const taskController = require('../../controllers/Schedule/taskController');
const taskService = require('../../services/Schedule/taskService');
const { Op } = require('sequelize');
const router = express.Router();

const toIsoOrNull = (value) => (value ? new Date(value).toISOString() : null);
const diffInDays = (laterDate, earlierDate) => {
  if (!laterDate || !earlierDate) return null;
  const ms = new Date(laterDate).getTime() - new Date(earlierDate).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

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
router.post('/projects/:projectId/tasks', authenticateToken, authorize('MANAGER_AND_ABOVE'), taskController.createTask);

// Create new task (general endpoint)
router.post('/tasks', authenticateToken, authorize('MANAGER_AND_ABOVE'), async (req, res) => {
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
router.put('/tasks/:id', authenticateToken, authorize('ENGINEER_AND_ABOVE'), taskController.updateTask);
router.patch('/tasks/:id', authenticateToken, authorize('ENGINEER_AND_ABOVE'), taskController.patchTaskActualDates);

// Update task status/progress
router.put('/tasks/:id/status', authenticateToken, authorize('ENGINEER_AND_ABOVE'), taskController.updateTaskStatus);

// Delete task
router.delete('/tasks/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), taskController.deleteTask);

// ==================== TASK DEPENDENCY ROUTES ====================

// Get task dependencies
router.get('/tasks/:id/dependencies', authenticateToken, taskController.getTaskDependencies);

// Get all task dependencies for a project
router.get('/projects/:projectId/dependencies', authenticateToken, taskController.getProjectDependencies);

// Create task dependency
router.post('/dependencies', authenticateToken, authorize('MANAGER_AND_ABOVE'), taskController.createTaskDependency);

// Delete task dependency
router.delete('/dependencies/:id', authenticateToken, authorize('MANAGER_AND_ABOVE'), taskController.deleteTaskDependency);

// ==================== CRITICAL PATH ROUTES ====================

// Get critical path for project
router.get('/projects/:projectId/critical-path', authenticateToken, taskController.getCriticalPath);
router.get('/projects/:projectId/risk-adjusted-tasks', authenticateToken, taskController.getTasks);
router.post('/projects/:projectId/baseline/reset', authenticateToken, authorize('MANAGER_AND_ABOVE'), taskController.resetProjectBaseline);

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
    const riskAdjustment = await taskService.calculateTaskRiskAdjustments(projectId, tasks.map(task => task.id));

    const scheduleData = tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      progress: task.progress,
      priority: task.priority,
      startDate: task.startDate,
      endDate: task.endDate,
      baselineStartDate: task.baselineStartDate,
      baselineEndDate: task.baselineEndDate,
      plannedStartDate: task.plannedStartDate,
      plannedEndDate: task.plannedEndDate,
      actualStartDate: task.actualStartDate,
      actualEndDate: task.actualEndDate,
      scheduleRevision: task.scheduleRevision,
      actual_end_date: toIsoOrNull(task.actualEndDate),
      completedAt: toIsoOrNull(task.actualEndDate),
      completed_at: toIsoOrNull(task.actualEndDate),
      completionDelayDays: diffInDays(task.actualEndDate, task.plannedEndDate || task.endDate),
      completionDays: diffInDays(task.actualEndDate, task.actualStartDate),
      riskDelayDays: Number(riskAdjustment.taskAdjustments[task.id]?.riskDelayDays || 0),
      adjustedStartDate: riskAdjustment.taskAdjustments[task.id]?.adjustedStartDate || null,
      adjustedEndDate: riskAdjustment.taskAdjustments[task.id]?.adjustedEndDate || null,
      hasScheduleRisk: Boolean(riskAdjustment.taskAdjustments[task.id]?.hasScheduleRisk),
      linkedRiskIds: riskAdjustment.taskAdjustments[task.id]?.linkedRiskIds || [],
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
        }),
        forecast: {
          baselineFinishDate: riskAdjustment.baselineForecastEndDate,
          riskAdjustedFinishDate: riskAdjustment.riskAdjustedForecastEndDate,
          totalProjectRiskDelayDays: riskAdjustment.totalProjectRiskDelayDays,
          formula: riskAdjustment.adjustmentFormula
        }
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
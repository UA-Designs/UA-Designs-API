const taskService = require('../../services/Schedule/taskService');
const { Task, TaskDependency, Project, User } = require('../../models');
const { Op } = require('sequelize');

const SUGGESTED_SCHEDULE_FIELDS = [
  'suggestedStartDate',
  'suggestedEndDate',
  'suggestedDurationDays',
  'suggestedIsCritical',
  'suggestedTotalFloat',
  'suggestedFreeFloat',
  'suggestedModelVersion',
  'suggestedGeneratedAt'
];

const normalizeTaskPayload = (payload = {}) => {
  const normalized = { ...payload };
  SUGGESTED_SCHEDULE_FIELDS.forEach((field) => {
    delete normalized[field];
  });
  const completionCandidate = [
    payload.completedAt,
    payload.completed_at,
    payload.actual_end_date
  ].find(v => v !== undefined && v !== null && v !== '');

  if (completionCandidate !== undefined && normalized.actualEndDate === undefined) {
    normalized.actualEndDate = completionCandidate;
  }
  const actualStartCandidate = [
    payload.actualStartDate,
    payload.actual_start_date
  ].find(v => v !== undefined && v !== null && v !== '');
  if (actualStartCandidate !== undefined && normalized.actualStartDate === undefined) {
    normalized.actualStartDate = actualStartCandidate;
  }
  return normalized;
};

const serializeTask = (taskLike) => {
  const task = typeof taskLike?.toJSON === 'function' ? taskLike.toJSON() : { ...taskLike };
  const completedAt = task.actualEndDate || null;
  const linkedRiskIds = Array.isArray(task.linkedRiskIds) ? task.linkedRiskIds : [];
  return {
    ...task,
    actual_end_date: completedAt,
    completedAt,
    completed_at: completedAt,
    riskDelayDays: Number(task.riskDelayDays || 0),
    adjustedStartDate: task.adjustedStartDate || null,
    adjustedEndDate: task.adjustedEndDate || null,
    hasScheduleRisk: Boolean(task.hasScheduleRisk),
    linkedRiskIds
  };
};

const canModifyTask = (req, project, task) => (
  ['ADMIN', 'PROPRIETOR'].includes(req.user.role)
  || project.projectManagerId === req.user.id
  || task.assignedTo === req.user.id
);

const canManageProject = (req, project) => (
  ['ADMIN', 'PROPRIETOR'].includes(req.user.role) || project.projectManagerId === req.user.id
);

class TaskController {
  /**
   * Get all tasks with filtering and pagination
   */
  async getTasks(req, res) {
    try {
      const { projectId } = req.params;
      const filters = req.query;

      // Verify project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const result = await taskService.getTasksWithFilters(projectId, filters);

      res.json({
        success: true,
        data: {
          ...result,
          tasks: result.tasks.map(serializeTask)
        }
      });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get single task by ID
   */
  async getTaskById(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findByPk(id, {
        include: [
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: Project,
            attributes: ['id', 'name']
          },
          {
            model: TaskDependency,
            as: 'predecessorDependencies',
            include: [{
              model: Task,
              as: 'successorTask',
              attributes: ['id', 'name', 'status', 'progress']
            }]
          },
          {
            model: TaskDependency,
            as: 'successorDependencies',
            include: [{
              model: Task,
              as: 'predecessorTask',
              attributes: ['id', 'name', 'status', 'progress']
            }]
          }
        ]
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check user permissions
      const project = await Project.findByPk(task.projectId);
      if (!canModifyTask(req, project, task)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this task'
        });
      }

      const riskAdjustment = await taskService.calculateTaskRiskAdjustments(task.projectId, [task.id]);
      const taskWithRiskData = taskService.mergeTaskWithRiskAdjustment(task, riskAdjustment.taskAdjustments);

      res.json({
        success: true,
        data: { task: serializeTask(taskWithRiskData) }
      });
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Create new task
   */
  async createTask(req, res) {
    try {
      const { projectId } = req.params;
      const {
        name,
        description,
        startDate,
        endDate,
        duration,
        priority,
        assignedTo,
        parentTaskId,
        tags,
        notes
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Task name is required'
        });
      }

      // Verify project exists and user has access
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check user permissions
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role) && 
          project.projectManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only project managers and admins can create tasks'
        });
      }

      // Validate assigned user if provided
      if (assignedTo) {
        const assignedUser = await User.findByPk(assignedTo);
        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user not found'
          });
        }
      }

      // Calculate duration if not provided
      let calculatedDuration = duration;
      if (!calculatedDuration && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        calculatedDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }

      // Create task
      const task = await Task.create({
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        baselineStartDate: startDate ? new Date(startDate) : null,
        baselineEndDate: endDate ? new Date(endDate) : null,
        duration: calculatedDuration,
        scheduleRevision: 1,
        priority: priority || 'MEDIUM',
        assignedTo,
        projectId,
        parentTaskId,
        tags: tags || [],
        notes,
        status: 'NOT_STARTED',
        progress: 0
      });

      // Recalculate critical path for the project
      await taskService.calculateCriticalPath(projectId);

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: { task: serializeTask(task) }
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update task
   */
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updateData = normalizeTaskPayload(req.body);

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check user permissions
      const project = await Project.findByPk(task.projectId);
      if (!canModifyTask(req, project, task)) {
        return res.status(403).json({
          success: false,
          message: 'Only assigned user, project manager, or admin can update this task'
        });
      }

      const attemptedBaselineChange = ['baselineStartDate', 'baselineEndDate', 'scheduleRevision']
        .some(field => Object.prototype.hasOwnProperty.call(updateData, field));
      if (attemptedBaselineChange) {
        return res.status(400).json({
          success: false,
          message: 'Baseline fields are immutable. Use baseline reset endpoint to change them.'
        });
      }

      // Validate assigned user if being updated
      if (updateData.assignedTo) {
        const assignedUser = await User.findByPk(updateData.assignedTo);
        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user not found'
          });
        }
      }

      // Calculate duration if dates are being updated
      if (updateData.startDate || updateData.endDate) {
        const startDate = new Date(updateData.startDate || task.startDate);
        const endDate = new Date(updateData.endDate || task.endDate);
        if (startDate && endDate) {
          updateData.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        }
      }

      // Convert date strings to Date objects
      const startDateChanged = updateData.startDate && (
        !task.startDate || new Date(updateData.startDate).toISOString() !== new Date(task.startDate).toISOString()
      );
      const endDateChanged = updateData.endDate && (
        !task.endDate || new Date(updateData.endDate).toISOString() !== new Date(task.endDate).toISOString()
      );
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
      if (updateData.actualStartDate) updateData.actualStartDate = new Date(updateData.actualStartDate);
      if (updateData.actualEndDate) updateData.actualEndDate = new Date(updateData.actualEndDate);
      if (startDateChanged || endDateChanged) {
        updateData.scheduleRevision = (task.scheduleRevision || 1) + 1;
      }

      await task.update(updateData);

      // Recalculate critical path for the project
      await taskService.calculateCriticalPath(task.projectId);

      res.json({
        success: true,
        message: 'Task updated successfully',
        data: { task: serializeTask(task) }
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const normalizedBody = normalizeTaskPayload(req.body);
      const { status, progress, actualStartDate, actualEndDate, notes } = normalizedBody;

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check user permissions
      const project = await Project.findByPk(task.projectId);
      if (!canModifyTask(req, project, task)) {
        return res.status(403).json({
          success: false,
          message: 'Only assigned user, project manager, or admin can update task status'
        });
      }

      const updateData = {};

      if (status) {
        updateData.status = status;
        
        // Auto-set dates based on status
        if (status === 'IN_PROGRESS' && !task.actualStartDate) {
          updateData.actualStartDate = new Date();
        } else if (status === 'COMPLETED') {
          updateData.actualEndDate = new Date();
          updateData.progress = 100;
        }
      }

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

      if (actualStartDate) updateData.actualStartDate = new Date(actualStartDate);
      if (actualEndDate) updateData.actualEndDate = new Date(actualEndDate);
      if (notes) updateData.notes = notes;

      await task.update(updateData);

      // Recalculate critical path for the project
      await taskService.calculateCriticalPath(task.projectId);

      res.json({
        success: true,
        message: 'Task status updated successfully',
        data: { task: serializeTask(task) }
      });
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async patchTaskActualDates(req, res) {
    try {
      const { id } = req.params;
      const payload = normalizeTaskPayload(req.body);
      const { actualStartDate, actualEndDate, notes } = payload;

      if (!actualStartDate && !actualEndDate && !notes) {
        return res.status(400).json({
          success: false,
          message: 'Provide at least one field: actualStartDate, actualEndDate, or notes'
        });
      }

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const project = await Project.findByPk(task.projectId);
      if (!canModifyTask(req, project, task)) {
        return res.status(403).json({
          success: false,
          message: 'Only assigned user, project manager, or admin can patch task actual dates'
        });
      }

      const updateData = {};
      if (actualStartDate) updateData.actualStartDate = new Date(actualStartDate);
      if (actualEndDate) {
        updateData.actualEndDate = new Date(actualEndDate);
        updateData.status = 'COMPLETED';
        updateData.progress = 100;
      } else if (actualStartDate && task.status === 'NOT_STARTED') {
        updateData.status = 'IN_PROGRESS';
      }
      if (notes) updateData.notes = notes;

      await task.update(updateData);
      await taskService.calculateCriticalPath(task.projectId);

      const riskAdjustment = await taskService.calculateTaskRiskAdjustments(task.projectId, [task.id]);
      const taskWithRiskData = taskService.mergeTaskWithRiskAdjustment(task, riskAdjustment.taskAdjustments);

      res.json({
        success: true,
        message: 'Task actual dates patched successfully',
        data: { task: serializeTask(taskWithRiskData) }
      });
    } catch (error) {
      console.error('Patch task actual dates error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async resetProjectBaseline(req, res) {
    try {
      const { projectId } = req.params;
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      if (!canManageProject(req, project)) {
        return res.status(403).json({
          success: false,
          message: 'Only project managers and admins can reset baselines'
        });
      }

      const tasks = await Task.findAll({ where: { projectId } });
      for (const task of tasks) {
        // Baseline reset intentionally captures the current planned schedule.
        // eslint-disable-next-line no-await-in-loop
        await task.update({
          baselineStartDate: task.startDate || null,
          baselineEndDate: task.endDate || null,
          scheduleRevision: (task.scheduleRevision || 1) + 1
        });
      }

      await taskService.calculateCriticalPath(projectId);
      res.json({
        success: true,
        message: 'Project baseline reset successfully',
        data: {
          projectId,
          tasksUpdated: tasks.length,
          resetAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Reset baseline error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete task
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check user permissions
      const project = await Project.findByPk(task.projectId);
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role) && 
          project.projectManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only project managers and admins can delete tasks'
        });
      }

      // Check if task has dependencies
      const dependencies = await TaskDependency.findAll({
        where: {
          [Op.or]: [
            { predecessorTaskId: id },
            { successorTaskId: id }
          ]
        }
      });

      if (dependencies.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete task with dependencies. Remove dependencies first.'
        });
      }

      await task.destroy(); // Soft delete

      // Recalculate critical path for the project
      await taskService.calculateCriticalPath(task.projectId);

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
  }

  /**
   * Get critical path for project
   */
  async getCriticalPath(req, res) {
    try {
      const { projectId } = req.params;

      // Verify project exists and user has access
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check user permissions
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role) && 
          project.projectManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project'
        });
      }

      const criticalPathData = await taskService.calculateCriticalPath(projectId);

      res.json({
        success: true,
        data: criticalPathData
      });
    } catch (error) {
      console.error('Get critical path error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check user permissions
      const project = await Project.findByPk(task.projectId);
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role) && 
          project.projectManagerId !== req.user.id &&
          task.assignedTo !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this task'
        });
      }

      const dependencies = await taskService.getTaskDependencies(id);

      res.json({
        success: true,
        data: dependencies
      });
    } catch (error) {
      console.error('Get task dependencies error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Create task dependency
   */
  async createTaskDependency(req, res) {
    try {
      const {
        predecessorTaskId,
        successorTaskId,
        dependencyType,
        lag,
        description,
        isHardDependency
      } = req.body;

      // Validate required fields
      if (!predecessorTaskId || !successorTaskId) {
        return res.status(400).json({
          success: false,
          message: 'Both predecessor and successor task IDs are required'
        });
      }

      // Check user permissions - must be project manager or admin
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role)) {
        const predecessorTask = await Task.findByPk(predecessorTaskId);
        if (!predecessorTask) {
          return res.status(404).json({
            success: false,
            message: 'Predecessor task not found'
          });
        }

        const project = await Project.findByPk(predecessorTask.projectId);
        if (project.projectManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Only project managers and admins can create task dependencies'
          });
        }
      }

      const dependency = await taskService.createTaskDependency({
        predecessorTaskId,
        successorTaskId,
        dependencyType,
        lag,
        description,
        isHardDependency
      }, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Task dependency created successfully',
        data: { dependency }
      });
    } catch (error) {
      console.error('Create task dependency error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete task dependency
   */
  async deleteTaskDependency(req, res) {
    try {
      const { id } = req.params;

      const dependency = await TaskDependency.findByPk(id, {
        include: [{
          model: Task,
          as: 'predecessorTask',
          attributes: ['projectId']
        }]
      });

      if (!dependency) {
        return res.status(404).json({
          success: false,
          message: 'Dependency not found'
        });
      }

      // Check user permissions
      const project = await Project.findByPk(dependency.predecessorTask.projectId);
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role) && 
          project.projectManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only project managers and admins can delete task dependencies'
        });
      }

      const result = await taskService.deleteTaskDependency(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete task dependency error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get all task dependencies for a project
   */
  async getProjectDependencies(req, res) {
    try {
      const { projectId } = req.params;

      // Verify project exists and user has access
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check user permissions
    if (!['ADMIN', 'PROPRIETOR'].includes(req.user.role) && 
          project.projectManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project'
        });
      }

      const dependencies = await TaskDependency.findAll({
        include: [
          {
            model: Task,
            as: 'predecessorTask',
            where: { projectId },
            attributes: ['id', 'name', 'status', 'progress']
          },
          {
            model: Task,
            as: 'successorTask',
            where: { projectId },
            attributes: ['id', 'name', 'status', 'progress']
          }
        ]
      });

      res.json({
        success: true,
        data: { dependencies }
      });
    } catch (error) {
      console.error('Get project dependencies error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new TaskController();

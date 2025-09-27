const { Task, TaskDependency, Project, User } = require('../../models');
const { Op } = require('sequelize');

class TaskService {
  /**
   * Calculate critical path for a project using CPM (Critical Path Method)
   * @param {string} projectId - Project ID
   * @returns {Object} Critical path analysis results
   */
  async calculateCriticalPath(projectId) {
    try {
      // Get all tasks for the project with dependencies
      const tasks = await Task.findAll({
        where: { projectId },
        include: [
          {
            model: TaskDependency,
            as: 'predecessorDependencies',
            include: [
              {
                model: Task,
                as: 'successorTask',
                attributes: ['id', 'name', 'duration', 'plannedStartDate', 'plannedEndDate']
              }
            ]
          },
          {
            model: TaskDependency,
            as: 'successorDependencies',
            include: [
              {
                model: Task,
                as: 'predecessorTask',
                attributes: ['id', 'name', 'duration', 'plannedStartDate', 'plannedEndDate']
              }
            ]
          }
        ]
      });

      if (tasks.length === 0) {
        return {
          criticalPath: [],
          totalDuration: 0,
          criticalTasks: [],
          delayedTasks: [],
          analysis: 'No tasks found for this project'
        };
      }

      // Build task graph
      const taskGraph = this.buildTaskGraph(tasks);
      
      // Calculate forward pass (Early Start/Finish)
      const forwardPass = this.calculateForwardPass(taskGraph, tasks);
      
      // Calculate backward pass (Late Start/Finish)
      const backwardPass = this.calculateBackwardPass(taskGraph, tasks, forwardPass);
      
      // Identify critical path
      const criticalPath = this.identifyCriticalPath(tasks, forwardPass, backwardPass);
      
      // Calculate project metrics
      const projectMetrics = this.calculateProjectMetrics(tasks, forwardPass, backwardPass);
      
      // Update task critical path flags
      await this.updateTaskCriticalFlags(tasks, criticalPath);

      return {
        criticalPath,
        totalDuration: projectMetrics.totalDuration,
        criticalTasks: criticalPath.map(task => task.id),
        delayedTasks: projectMetrics.delayedTasks,
        analysis: {
          totalTasks: tasks.length,
          criticalTasksCount: criticalPath.length,
          projectDuration: projectMetrics.totalDuration,
          totalFloat: projectMetrics.totalFloat,
          freeFloat: projectMetrics.freeFloat
        }
      };
    } catch (error) {
      console.error('Error calculating critical path:', error);
      throw new Error(`Critical path calculation failed: ${error.message}`);
    }
  }

  /**
   * Build task dependency graph
   */
  buildTaskGraph(tasks) {
    const graph = new Map();
    
    tasks.forEach(task => {
      graph.set(task.id, {
        task,
        predecessors: [],
        successors: [],
        dependencies: []
      });
    });

    // Build relationships from dependencies
    tasks.forEach(task => {
      task.predecessorDependencies?.forEach(dep => {
        const predecessor = graph.get(dep.predecessorTaskId);
        const successor = graph.get(dep.successorTaskId);
        
        if (predecessor && successor) {
          predecessor.successors.push({
            taskId: successor.task.id,
            dependency: dep
          });
          successor.predecessors.push({
            taskId: predecessor.task.id,
            dependency: dep
          });
          successor.dependencies.push(dep);
        }
      });
    });

    return graph;
  }

  /**
   * Calculate forward pass (Early Start/Finish times)
   */
  calculateForwardPass(graph, tasks) {
    const forwardPass = new Map();
    const visited = new Set();
    
    // Initialize all tasks
    tasks.forEach(task => {
      forwardPass.set(task.id, {
        earlyStart: 0,
        earlyFinish: 0,
        duration: task.duration || 1
      });
    });

    // Topological sort and calculate early times
    const calculateEarlyTimes = (taskId) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      const node = graph.get(taskId);
      if (!node) return;

      let maxEarlyFinish = 0;
      
      // Calculate based on predecessors
      node.predecessors.forEach(pred => {
        calculateEarlyTimes(pred.taskId);
        const predData = forwardPass.get(pred.taskId);
        const dependency = pred.dependency;
        
        let earlyStart = predData.earlyFinish;
        
        // Apply dependency type and lag
        switch (dependency.dependencyType) {
          case 'FINISH_TO_START':
            earlyStart = predData.earlyFinish + dependency.lag;
            break;
          case 'START_TO_START':
            earlyStart = predData.earlyStart + dependency.lag;
            break;
          case 'FINISH_TO_FINISH':
            earlyStart = predData.earlyFinish - node.task.duration + dependency.lag;
            break;
          case 'START_TO_FINISH':
            earlyStart = predData.earlyStart - node.task.duration + dependency.lag;
            break;
        }
        
        maxEarlyFinish = Math.max(maxEarlyFinish, earlyStart);
      });
      
      const taskData = forwardPass.get(taskId);
      taskData.earlyStart = maxEarlyFinish;
      taskData.earlyFinish = maxEarlyFinish + taskData.duration;
    };

    // Calculate for all tasks
    tasks.forEach(task => calculateEarlyTimes(task.id));
    
    return forwardPass;
  }

  /**
   * Calculate backward pass (Late Start/Finish times)
   */
  calculateBackwardPass(graph, tasks, forwardPass) {
    const backwardPass = new Map();
    const visited = new Set();
    
    // Initialize all tasks
    tasks.forEach(task => {
      const forwardData = forwardPass.get(task.id);
      backwardPass.set(task.id, {
        lateStart: 0,
        lateFinish: 0,
        totalFloat: 0,
        freeFloat: 0
      });
    });

    // Find project end time
    const projectEndTime = Math.max(...Array.from(forwardPass.values()).map(data => data.earlyFinish));
    
    // Calculate late times (backward pass)
    const calculateLateTimes = (taskId) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      const node = graph.get(taskId);
      if (!node) return;

      const forwardData = forwardPass.get(taskId);
      const backwardData = backwardPass.get(taskId);
      
      // If no successors, set late finish to project end time
      if (node.successors.length === 0) {
        backwardData.lateFinish = projectEndTime;
        backwardData.lateStart = projectEndTime - forwardData.duration;
      } else {
        let minLateStart = projectEndTime;
        
        // Calculate based on successors
        node.successors.forEach(succ => {
          calculateLateTimes(succ.taskId);
          const succData = backwardPass.get(succ.taskId);
          const dependency = succ.dependency;
          
          let lateFinish = succData.lateStart;
          
          // Apply dependency type and lag
          switch (dependency.dependencyType) {
            case 'FINISH_TO_START':
              lateFinish = succData.lateStart - dependency.lag;
              break;
            case 'START_TO_START':
              lateFinish = succData.lateStart - dependency.lag + forwardData.duration;
              break;
            case 'FINISH_TO_FINISH':
              lateFinish = succData.lateFinish - dependency.lag;
              break;
            case 'START_TO_FINISH':
              lateFinish = succData.lateFinish - dependency.lag + forwardData.duration;
              break;
          }
          
          minLateStart = Math.min(minLateStart, lateFinish);
        });
        
        backwardData.lateFinish = minLateStart;
        backwardData.lateStart = minLateStart - forwardData.duration;
      }
      
      // Calculate floats
      backwardData.totalFloat = backwardData.lateStart - forwardData.earlyStart;
      backwardData.freeFloat = this.calculateFreeFloat(taskId, graph, forwardPass, backwardPass);
    };

    // Calculate for all tasks
    tasks.forEach(task => calculateLateTimes(task.id));
    
    return backwardPass;
  }

  /**
   * Calculate free float for a task
   */
  calculateFreeFloat(taskId, graph, forwardPass, backwardPass) {
    const node = graph.get(taskId);
    if (!node || node.successors.length === 0) return 0;
    
    const forwardData = forwardPass.get(taskId);
    let minSuccessorEarlyStart = Infinity;
    
    node.successors.forEach(succ => {
      const succForwardData = forwardPass.get(succ.taskId);
      minSuccessorEarlyStart = Math.min(minSuccessorEarlyStart, succForwardData.earlyStart);
    });
    
    return minSuccessorEarlyStart - forwardData.earlyFinish;
  }

  /**
   * Identify critical path tasks
   */
  identifyCriticalPath(tasks, forwardPass, backwardPass) {
    const criticalTasks = [];
    
    tasks.forEach(task => {
      const forwardData = forwardPass.get(task.id);
      const backwardData = backwardPass.get(task.id);
      
      // Task is critical if total float is 0
      if (backwardData.totalFloat === 0) {
        criticalTasks.push({
          ...task.toJSON(),
          earlyStart: forwardData.earlyStart,
          earlyFinish: forwardData.earlyFinish,
          lateStart: backwardData.lateStart,
          lateFinish: backwardData.lateFinish,
          totalFloat: backwardData.totalFloat,
          freeFloat: backwardData.freeFloat,
          isCritical: true
        });
      }
    });
    
    // Sort by early start time
    return criticalTasks.sort((a, b) => a.earlyStart - b.earlyStart);
  }

  /**
   * Calculate project metrics
   */
  calculateProjectMetrics(tasks, forwardPass, backwardPass) {
    const projectEndTime = Math.max(...Array.from(forwardPass.values()).map(data => data.earlyFinish));
    const totalFloat = Array.from(backwardPass.values()).reduce((sum, data) => sum + data.totalFloat, 0);
    const freeFloat = Array.from(backwardPass.values()).reduce((sum, data) => sum + data.freeFloat, 0);
    
    // Find delayed tasks
    const delayedTasks = tasks.filter(task => {
      const forwardData = forwardPass.get(task.id);
      return task.status !== 'COMPLETED' && 
             task.plannedEndDate && 
             new Date(task.plannedEndDate) < new Date(Date.now() + forwardData.earlyFinish * 24 * 60 * 60 * 1000);
    });
    
    return {
      totalDuration: projectEndTime,
      totalFloat,
      freeFloat,
      delayedTasks: delayedTasks.map(task => ({
        id: task.id,
        name: task.name,
        status: task.status,
        plannedEndDate: task.plannedEndDate,
        delay: Math.ceil((Date.now() - new Date(task.plannedEndDate)) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  /**
   * Update task critical path flags in database
   */
  async updateTaskCriticalFlags(tasks, criticalPath) {
    const criticalTaskIds = criticalPath.map(task => task.id);
    
    // Update all tasks to not critical first
    await Task.update(
      { isCritical: false },
      { where: { id: { [Op.in]: tasks.map(t => t.id) } } }
    );
    
    // Update critical tasks
    if (criticalTaskIds.length > 0) {
      await Task.update(
        { isCritical: true },
        { where: { id: { [Op.in]: criticalTaskIds } } }
      );
    }
  }

  /**
   * Validate circular dependencies
   */
  async validateCircularDependencies(predecessorTaskId, successorTaskId) {
    try {
      // Check if adding this dependency would create a cycle
      const visited = new Set();
      const recursionStack = new Set();
      
      const hasCycle = (taskId) => {
        if (recursionStack.has(taskId)) return true;
        if (visited.has(taskId)) return false;
        
        visited.add(taskId);
        recursionStack.add(taskId);
        
        // Get all successors of this task
        return TaskDependency.findAll({
          where: { predecessorTaskId: taskId },
          include: [{
            model: Task,
            as: 'successorTask',
            attributes: ['id']
          }]
        }).then(dependencies => {
          for (const dep of dependencies) {
            if (hasCycle(dep.successorTaskId)) return true;
          }
          recursionStack.delete(taskId);
          return false;
        });
      };
      
      // Check if adding the new dependency creates a cycle
      return hasCycle(successorTaskId);
    } catch (error) {
      console.error('Error validating circular dependencies:', error);
      return false;
    }
  }

  /**
   * Get task dependencies with full details
   */
  async getTaskDependencies(taskId) {
    try {
      const task = await Task.findByPk(taskId, {
        include: [
          {
            model: TaskDependency,
            as: 'predecessorDependencies',
            include: [{
              model: Task,
              as: 'successorTask',
              attributes: ['id', 'name', 'status', 'progress', 'plannedEndDate']
            }]
          },
          {
            model: TaskDependency,
            as: 'successorDependencies',
            include: [{
              model: Task,
              as: 'predecessorTask',
              attributes: ['id', 'name', 'status', 'progress', 'plannedStartDate']
            }]
          }
        ]
      });

      if (!task) {
        throw new Error('Task not found');
      }

      return {
        task: {
          id: task.id,
          name: task.name,
          status: task.status,
          progress: task.progress
        },
        predecessors: task.predecessorDependencies.map(dep => ({
          id: dep.id,
          task: dep.successorTask,
          dependencyType: dep.dependencyType,
          lag: dep.lag,
          description: dep.description,
          isHardDependency: dep.isHardDependency
        })),
        successors: task.successorDependencies.map(dep => ({
          id: dep.id,
          task: dep.predecessorTask,
          dependencyType: dep.dependencyType,
          lag: dep.lag,
          description: dep.description,
          isHardDependency: dep.isHardDependency
        }))
      };
    } catch (error) {
      console.error('Error getting task dependencies:', error);
      throw new Error(`Failed to get task dependencies: ${error.message}`);
    }
  }

  /**
   * Create task dependency
   */
  async createTaskDependency(dependencyData, createdBy) {
    try {
      const { predecessorTaskId, successorTaskId, dependencyType, lag, description, isHardDependency } = dependencyData;

      // Validate tasks exist
      const [predecessor, successor] = await Promise.all([
        Task.findByPk(predecessorTaskId),
        Task.findByPk(successorTaskId)
      ]);

      if (!predecessor || !successor) {
        throw new Error('One or both tasks not found');
      }

      // Check if tasks belong to same project
      if (predecessor.projectId !== successor.projectId) {
        throw new Error('Tasks must belong to the same project');
      }

      // Check for existing dependency
      const existingDependency = await TaskDependency.findOne({
        where: {
          predecessorTaskId,
          successorTaskId
        }
      });

      if (existingDependency) {
        throw new Error('Dependency already exists between these tasks');
      }

      // Validate circular dependencies
      const hasCycle = await this.validateCircularDependencies(predecessorTaskId, successorTaskId);
      if (hasCycle) {
        throw new Error('This dependency would create a circular reference');
      }

      // Create dependency
      const dependency = await TaskDependency.create({
        predecessorTaskId,
        successorTaskId,
        dependencyType: dependencyType || 'FINISH_TO_START',
        lag: lag || 0,
        description,
        isHardDependency: isHardDependency !== false,
        createdBy
      });

      // Recalculate critical path for the project
      await this.calculateCriticalPath(predecessor.projectId);

      return dependency;
    } catch (error) {
      console.error('Error creating task dependency:', error);
      throw new Error(`Failed to create task dependency: ${error.message}`);
    }
  }

  /**
   * Delete task dependency
   */
  async deleteTaskDependency(dependencyId) {
    try {
      const dependency = await TaskDependency.findByPk(dependencyId, {
        include: [{
          model: Task,
          as: 'predecessorTask',
          attributes: ['projectId']
        }]
      });

      if (!dependency) {
        throw new Error('Dependency not found');
      }

      const projectId = dependency.predecessorTask.projectId;
      
      await dependency.destroy();

      // Recalculate critical path for the project
      await this.calculateCriticalPath(projectId);

      return { success: true, message: 'Dependency deleted successfully' };
    } catch (error) {
      console.error('Error deleting task dependency:', error);
      throw new Error(`Failed to delete task dependency: ${error.message}`);
    }
  }

  /**
   * Get tasks with filtering options
   */
  async getTasksWithFilters(projectId, filters = {}) {
    try {
      const {
        status,
        priority,
        assignedTo,
        dateRange,
        search,
        isCritical,
        page = 1,
        limit = 50
      } = filters;

      const whereClause = { projectId };
      
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;
      if (assignedTo) whereClause.assignedTo = assignedTo;
      if (isCritical !== undefined) whereClause.isCritical = isCritical;
      
      if (dateRange) {
        if (dateRange.start) whereClause.plannedStartDate = { [Op.gte]: new Date(dateRange.start) };
        if (dateRange.end) whereClause.plannedEndDate = { [Op.lte]: new Date(dateRange.end) };
      }
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows: tasks } = await Task.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'firstName', 'lastName', 'email']
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
        order: [['plannedStartDate', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        tasks,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting tasks with filters:', error);
      throw new Error(`Failed to get tasks: ${error.message}`);
    }
  }
}

module.exports = new TaskService();

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    taskNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'WBS task numbering system'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // PMBOK Work Breakdown Structure
    wbsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Work Breakdown Structure level'
    },
    wbsCode: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'WBS code for hierarchical organization'
    },
    parentTaskId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      },
      comment: 'Parent task in WBS hierarchy'
    },
    // PMBOK Project Schedule Management
    status: {
      type: DataTypes.ENUM(
        'NOT_STARTED',    // Task not yet started
        'IN_PROGRESS',    // Task is being worked on
        'ON_HOLD',        // Task temporarily suspended
        'COMPLETED',      // Task completed successfully
        'CANCELLED',      // Task cancelled
        'BLOCKED'         // Task blocked by dependencies
      ),
      defaultValue: 'NOT_STARTED'
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    // Schedule information
    plannedStartDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    plannedEndDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    actualStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Duration tracking
    plannedDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Planned duration in days'
    },
    actualDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Actual duration in days'
    },
    // Progress tracking
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Task completion percentage'
    },
    // PMBOK Project Cost Management
    plannedCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    actualCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Construction-specific cost breakdown
    costBreakdown: {
      type: DataTypes.JSON,
      defaultValue: {
        materials: 0,
        labor: 0,
        equipment: 0,
        subcontractors: 0,
        other: 0
      }
    },
    // PMBOK Project Resource Management
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Resource requirements
    resourceRequirements: {
      type: DataTypes.JSON,
      defaultValue: {
        materials: [],
        equipment: [],
        labor: [],
        subcontractors: []
      }
    },
    // PMBOK Project Quality Management
    qualityRequirements: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Quality requirements and standards'
    },
    // Dependencies and relationships
    dependencies: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task dependencies (FS, SS, FF, SF)'
    },
    predecessors: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Predecessor tasks'
    },
    successors: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Successor tasks'
    },
    // Construction-specific fields
    taskType: {
      type: DataTypes.ENUM(
        'EXCAVATION',      // Site excavation and grading
        'FOUNDATION',      // Foundation work
        'STRUCTURAL',      // Structural framing
        'MECHANICAL',      // HVAC, plumbing, electrical
        'ENCLOSURE',       // Roofing, siding, windows
        'INTERIOR',        // Interior finishes
        'SITE_WORK',       // Landscaping, paving
        'INSPECTION',      // Quality inspections
        'ADMINISTRATIVE',  // Documentation, permits
        'PLANNING',        // Planning and coordination
        'PROCUREMENT',     // Material procurement
        'SAFETY',          // Safety management
        'QUALITY_CONTROL', // Quality control activities
        'COMMUNICATION'    // Stakeholder communication
      ),
      allowNull: false
    },
    // Location information
    location: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Task location within project site'
    },
    // Safety requirements
    safetyRequirements: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Safety requirements for this task'
    },
    // Permits and approvals
    requiredPermits: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Required permits for this task'
    },
    // Weather considerations
    weatherDependent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether task is weather dependent'
    },
    weatherConstraints: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Weather constraints for task execution'
    },
    // Equipment requirements
    equipmentRequirements: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Equipment needed for this task'
    },
    // Material requirements
    materialRequirements: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Materials needed for this task'
    },
    // Subcontractor information
    subcontractorInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Subcontractor details if applicable'
    },
    // Task constraints
    constraints: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task-specific constraints'
    },
    // Assumptions
    assumptions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task-specific assumptions'
    },
    // Acceptance criteria
    acceptanceCriteria: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task completion acceptance criteria'
    },
    // Deliverables
    deliverables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task deliverables'
    },
    // Notes and comments
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Attachments
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task-related files and documents'
    },
    // Performance metrics
    performanceMetrics: {
      type: DataTypes.JSON,
      defaultValue: {
        schedulePerformance: 0,
        costPerformance: 0,
        qualityPerformance: 0,
        safetyIncidents: 0
      }
    },
    // Change history
    changeHistory: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task change history'
    },
    // Lessons learned
    lessonsLearned: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lessons learned from task execution'
    },
    // Critical path indicator
    isCritical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether task is on critical path'
    },
    // Float/slack time
    totalFloat: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total float in days'
    },
    freeFloat: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Free float in days'
    },
    // Task tags
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Task tags for categorization'
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        unique: true,
        fields: ['taskNumber']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['taskType']
      },
      {
        fields: ['assignedToId']
      },
      {
        fields: ['wbsCode']
      },
      {
        fields: ['parentTaskId']
      },
      {
        fields: ['isCritical']
      }
    ],
    hooks: {
      beforeCreate: (task) => {
        // Generate task number if not provided
        if (!task.taskNumber) {
          task.taskNumber = Task.generateTaskNumber(task.projectId);
        }
        
        // Calculate planned duration
        if (task.plannedStartDate && task.plannedEndDate) {
          const start = new Date(task.plannedStartDate);
          const end = new Date(task.plannedEndDate);
          task.plannedDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }
      },
      beforeUpdate: (task) => {
        // Update actual duration when dates change
        if (task.changed('actualStartDate') || task.changed('actualEndDate')) {
          if (task.actualStartDate && task.actualEndDate) {
            const start = new Date(task.actualStartDate);
            const end = new Date(task.actualEndDate);
            task.actualDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          }
        }
        
        // Update performance metrics
        if (task.changed('actualCost') || task.changed('plannedCost')) {
          task.updatePerformanceMetrics();
        }
      }
    }
  });

  // Static methods
  Task.generateTaskNumber = function(projectId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TASK-${timestamp}-${random}`;
  };

  // Instance methods
  Task.prototype.updatePerformanceMetrics = function() {
    if (this.plannedCost > 0) {
      this.performanceMetrics.costPerformance = ((this.plannedCost - this.actualCost) / this.plannedCost) * 100;
    }
    
    if (this.plannedDuration > 0 && this.actualDuration) {
      this.performanceMetrics.schedulePerformance = ((this.plannedDuration - this.actualDuration) / this.plannedDuration) * 100;
    }
  };

  Task.prototype.isDelayed = function() {
    const today = new Date();
    return today > this.plannedEndDate && this.status !== 'COMPLETED';
  };

  Task.prototype.isOverBudget = function() {
    return this.actualCost > this.plannedCost;
  };

  Task.prototype.getDependencies = function() {
    return this.getPredecessors()
      .then(predecessors => {
        return predecessors.map(pred => ({
          id: pred.id,
          name: pred.name,
          status: pred.status,
          type: 'PREDECESSOR'
        }));
      });
  };

  Task.prototype.canStart = function() {
    // Check if all predecessor tasks are completed
    return this.getPredecessors()
      .then(predecessors => {
        if (predecessors.length === 0) return true;
        return predecessors.every(pred => pred.status === 'COMPLETED');
      });
  };

  Task.prototype.getCriticalPathImpact = function() {
    // Calculate impact on critical path
    return this.getSuccessors()
      .then(successors => {
        if (successors.length === 0) return 0;
        
        let totalImpact = 0;
        successors.forEach(successor => {
          if (successor.isCritical) {
            totalImpact += successor.totalFloat || 0;
          }
        });
        
        return totalImpact;
      });
  };

  Task.prototype.updateProgress = function(newProgress) {
    this.progress = Math.max(0, Math.min(100, newProgress));
    
    if (this.progress === 100 && this.status !== 'COMPLETED') {
      this.status = 'COMPLETED';
      this.actualEndDate = new Date();
    } else if (this.progress > 0 && this.status === 'NOT_STARTED') {
      this.status = 'IN_PROGRESS';
      if (!this.actualStartDate) {
        this.actualStartDate = new Date();
      }
    }
  };

  return Task;
}; 
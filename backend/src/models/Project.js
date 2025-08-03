module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'UA Designs project numbering system'
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
    // PMBOK Project Life Cycle Phases
    phase: {
      type: DataTypes.ENUM(
        'INITIATION',      // Project charter, stakeholder identification
        'PLANNING',        // Scope, schedule, cost, quality planning
        'EXECUTION',       // Project work execution
        'MONITORING_CONTROL', // Performance monitoring and control
        'CLOSURE'          // Project closure and lessons learned
      ),
      defaultValue: 'INITIATION'
    },
    // Construction-specific project types
    projectType: {
      type: DataTypes.ENUM(
        'RESIDENTIAL',     // Single-family homes, apartments
        'COMMERCIAL',      // Office buildings, retail spaces
        'INDUSTRIAL',      // Factories, warehouses
        'INFRASTRUCTURE',  // Roads, bridges, utilities
        'RENOVATION',      // Existing building renovations
        'INTERIOR_DESIGN', // Interior fit-outs
        'LANDSCAPING',     // Landscape architecture
        'MIXED_USE'        // Combined residential/commercial
      ),
      allowNull: false
    },
    // Project status aligned with construction industry
    status: {
      type: DataTypes.ENUM(
        'PROPOSAL',        // Initial proposal stage
        'CONTRACT_NEGOTIATION', // Contract discussions
        'PLANNING',        // Detailed planning phase
        'PRE_CONSTRUCTION', // Site preparation and permits
        'CONSTRUCTION',    // Active construction
        'INSPECTION',      // Quality inspections
        'PUNCH_LIST',      // Final corrections
        'COMPLETION',      // Project completion
        'WARRANTY',        // Warranty period
        'ON_HOLD',         // Temporarily suspended
        'CANCELLED'        // Project cancelled
      ),
      defaultValue: 'PROPOSAL'
    },
    // PMBOK Project Integration Management
    projectManagerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Client information
    clientName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    clientEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    clientPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clientAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Project location
    projectLocation: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Project site location and coordinates'
    },
    // PMBOK Project Scope Management
    scope: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Project scope statement and work breakdown structure'
    },
    deliverables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project deliverables list'
    },
    exclusions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'What is not included in project scope'
    },
    constraints: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project constraints (time, cost, quality)'
    },
    assumptions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project assumptions'
    },
    // PMBOK Project Schedule Management
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    plannedEndDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    actualEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // PMBOK Project Cost Management
    budget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    actualCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    estimatedCost: {
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
        permits: 0,
        contingency: 0
      }
    },
    // PMBOK Project Quality Management
    qualityObjectives: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Quality objectives and standards'
    },
    qualityMetrics: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Quality measurement criteria'
    },
    // PMBOK Project Resource Management
    resourceRequirements: {
      type: DataTypes.JSON,
      defaultValue: {
        materials: [],
        equipment: [],
        labor: [],
        subcontractors: []
      },
      comment: 'Resource requirements for the project'
    },
    // PMBOK Project Risk Management
    riskRegister: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project risk register'
    },
    riskMitigationStrategies: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Risk mitigation strategies'
    },
    // PMBOK Project Communications Management
    communicationPlan: {
      type: DataTypes.JSON,
      defaultValue: {
        stakeholders: [],
        communicationChannels: [],
        reportingSchedule: [],
        escalationProcedures: []
      },
      comment: 'Project communication plan'
    },
    // PMBOK Project Procurement Management
    procurementPlan: {
      type: DataTypes.JSON,
      defaultValue: {
        materials: [],
        equipment: [],
        services: [],
        subcontractors: []
      },
      comment: 'Project procurement plan'
    },
    // PMBOK Project Stakeholder Management
    stakeholderRegister: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project stakeholder register'
    },
    // Construction-specific fields
    buildingPermits: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Required building permits and approvals'
    },
    siteConditions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Site conditions and constraints'
    },
    weatherConsiderations: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Weather impact considerations'
    },
    safetyRequirements: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Safety requirements and protocols'
    },
    // Project performance metrics
    performanceMetrics: {
      type: DataTypes.JSON,
      defaultValue: {
        schedulePerformance: 0,
        costPerformance: 0,
        qualityPerformance: 0,
        safetyIncidents: 0,
        customerSatisfaction: 0
      }
    },
    // Document management
    documents: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project documents and files'
    },
    // Change management
    changeRequests: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Change request history'
    },
    // Lessons learned
    lessonsLearned: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lessons learned from project execution'
    },
    // Project completion
    completionCertificate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Project completion certificate details'
    },
    warrantyPeriod: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Warranty period in months'
    },
    // Project priority
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    // Project tags for categorization
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Project tags for easy categorization'
    },
    // External references
    externalReferences: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'External project references and links'
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        unique: true,
        fields: ['projectNumber']
      },
      {
        fields: ['status']
      },
      {
        fields: ['projectType']
      },
      {
        fields: ['phase']
      },
      {
        fields: ['startDate']
      },
      {
        fields: ['projectManagerId']
      },
      {
        fields: ['clientName']
      }
    ],
    hooks: {
      beforeCreate: (project) => {
        // Generate project number if not provided
        if (!project.projectNumber) {
          project.projectNumber = Project.generateProjectNumber();
        }
      },
      beforeUpdate: (project) => {
        // Update performance metrics when project data changes
        if (project.changed('actualCost') || project.changed('budget')) {
          project.updatePerformanceMetrics();
        }
      }
    }
  });

  // Static methods
  Project.generateProjectNumber = function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `UA-${year}${month}-${random}`;
  };

  // Instance methods
  Project.prototype.updatePerformanceMetrics = function() {
    if (this.budget > 0) {
      this.performanceMetrics.costPerformance = ((this.budget - this.actualCost) / this.budget) * 100;
    }
    
    if (this.plannedEndDate && this.actualEndDate) {
      const plannedDuration = new Date(this.plannedEndDate) - new Date(this.startDate);
      const actualDuration = new Date(this.actualEndDate) - new Date(this.startDate);
      this.performanceMetrics.schedulePerformance = ((plannedDuration - actualDuration) / plannedDuration) * 100;
    }
  };

  Project.prototype.getProgress = function() {
    // Calculate project progress based on completed tasks
    return this.getTasks()
      .then(tasks => {
        if (tasks.length === 0) return 0;
        const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
        return (completedTasks.length / tasks.length) * 100;
      });
  };

  Project.prototype.isOverBudget = function() {
    return this.actualCost > this.budget;
  };

  Project.prototype.isBehindSchedule = function() {
    const today = new Date();
    return today > this.plannedEndDate && this.status !== 'COMPLETION';
  };

  Project.prototype.getCriticalPath = function() {
    // Calculate critical path for project scheduling
    return this.getTasks({
      include: ['dependencies']
    }).then(tasks => {
      // Critical path calculation logic
      return tasks.filter(task => task.isCritical);
    });
  };

  Project.prototype.getRiskLevel = function() {
    const risks = this.riskRegister || [];
    const highRisks = risks.filter(risk => risk.impact === 'HIGH' && risk.probability === 'HIGH');
    const mediumRisks = risks.filter(risk => risk.impact === 'MEDIUM' && risk.probability === 'HIGH');
    
    if (highRisks.length > 0) return 'HIGH';
    if (mediumRisks.length > 2) return 'MEDIUM';
    return 'LOW';
  };

  return Project;
}; 
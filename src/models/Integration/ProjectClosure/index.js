module.exports = (sequelize, DataTypes) => {
  const ProjectClosure = sequelize.define('ProjectClosure', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    closureNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    closureType: {
      type: DataTypes.ENUM('NORMAL', 'EARLY_TERMINATION', 'PHASE_CLOSURE', 'MILESTONE_CLOSURE'),
      defaultValue: 'NORMAL'
    },
    closureDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    closureReason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    projectManager: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    closureStatus: {
      type: DataTypes.ENUM('INITIATED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED'),
      defaultValue: 'INITIATED'
    },
    
    // Project Performance Summary
    originalBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    finalBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    budgetVariance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    originalSchedule: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualCompletionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduleVariance: {
      type: DataTypes.INTEGER, // Days variance
      allowNull: true
    },
    scopeCompletion: {
      type: DataTypes.DECIMAL(5, 2), // Percentage
      allowNull: true
    },
    qualityMetrics: {
      type: DataTypes.JSON, // Quality performance data
      allowNull: true
    },
    
    // Deliverables Status
    deliverablesStatus: {
      type: DataTypes.JSON, // Array of deliverable statuses
      allowNull: false
    },
    outstandingDeliverables: {
      type: DataTypes.JSON, // Array of outstanding items
      allowNull: true
    },
    
    // Lessons Learned
    lessonsLearned: {
      type: DataTypes.JSON, // Array of lessons learned
      allowNull: true
    },
    bestPractices: {
      type: DataTypes.JSON, // Array of best practices
      allowNull: true
    },
    improvementAreas: {
      type: DataTypes.JSON, // Array of improvement areas
      allowNull: true
    },
    
    // Team Performance
    teamPerformance: {
      type: DataTypes.JSON, // Team performance metrics
      allowNull: true
    },
    individualContributions: {
      type: DataTypes.JSON, // Individual team member contributions
      allowNull: true
    },
    
    // Stakeholder Satisfaction
    stakeholderSatisfaction: {
      type: DataTypes.JSON, // Stakeholder feedback and satisfaction scores
      allowNull: true
    },
    
    // Financial Closure
    financialClosure: {
      type: DataTypes.JSON, // Financial closure details
      allowNull: true
    },
    outstandingInvoices: {
      type: DataTypes.JSON, // Outstanding financial items
      allowNull: true
    },
    
    // Resource Release
    resourceRelease: {
      type: DataTypes.JSON, // Resource release plan and status
      allowNull: true
    },
    equipmentReturn: {
      type: DataTypes.JSON, // Equipment return status
      allowNull: true
    },
    
    // Documentation
    closureDocumentation: {
      type: DataTypes.JSON, // Required closure documents
      allowNull: true
    },
    handoverDocuments: {
      type: DataTypes.JSON, // Handover documentation
      allowNull: true
    },
    
    // Approvals
    closureApprovedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    closureApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sponsorApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sponsorApprovedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sponsorApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Post-Closure
    postClosureReview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    postClosureReviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    postClosureReviewBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    // Archive and Retention
    archiveStatus: {
      type: DataTypes.ENUM('ACTIVE', 'ARCHIVED', 'DESTROYED'),
      defaultValue: 'ACTIVE'
    },
    retentionPeriod: {
      type: DataTypes.INTEGER, // Years to retain
      defaultValue: 7
    },
    archiveDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Additional Fields
    closureComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON, // Array of file references
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON, // Array of tags
      allowNull: true
    }
  }, {
    tableName: 'project_closures',
    timestamps: true,
    paranoid: true
  });

  return ProjectClosure;
};

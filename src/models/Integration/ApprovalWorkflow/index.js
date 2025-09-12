module.exports = (sequelize, DataTypes) => {
  const ApprovalWorkflow = sequelize.define('ApprovalWorkflow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    workflowName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    workflowCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    workflowType: {
      type: DataTypes.ENUM(
        'PROJECT_CHARTER',
        'CHANGE_REQUEST',
        'PROJECT_CLOSURE',
        'BUDGET_APPROVAL',
        'SCOPE_CHANGE',
        'SCHEDULE_CHANGE',
        'QUALITY_APPROVAL',
        'PROCUREMENT_APPROVAL',
        'RISK_APPROVAL',
        'CUSTOM'
      ),
      allowNull: false
    },
    projectType: {
      type: DataTypes.ENUM(
        'RESIDENTIAL',
        'COMMERCIAL',
        'INDUSTRIAL',
        'INFRASTRUCTURE',
        'RENOVATION',
        'MAINTENANCE',
        'ALL'
      ),
      allowNull: false,
      defaultValue: 'ALL'
    },
    changeImpactLevel: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'ALL'),
      allowNull: false,
      defaultValue: 'ALL'
    },
    changeType: {
      type: DataTypes.ENUM(
        'SCOPE',
        'SCHEDULE',
        'COST',
        'QUALITY',
        'RESOURCE',
        'TECHNICAL',
        'ALL'
      ),
      allowNull: false,
      defaultValue: 'ALL'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    version: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    },
    // Workflow Steps
    workflowSteps: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of workflow steps with approval requirements'
    },
    // Approval Rules
    approvalRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Business rules for approval routing'
    },
    // Escalation Rules
    escalationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Rules for escalating approvals'
    },
    // Notification Rules
    notificationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Rules for sending notifications'
    },
    // Timeout Rules
    timeoutRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Rules for handling timeouts'
    },
    // Parallel vs Sequential
    executionType: {
      type: DataTypes.ENUM('SEQUENTIAL', 'PARALLEL', 'CONDITIONAL'),
      defaultValue: 'SEQUENTIAL'
    },
    // Required Approvals
    requiredApprovals: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Minimum number of approvals required'
    },
    // Auto-approval Rules
    autoApprovalRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Rules for automatic approval'
    },
    // Rejection Rules
    rejectionRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Rules for handling rejections'
    },
    // Conditional Logic
    conditionalLogic: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Conditional logic for workflow routing'
    },
    // Integration Points
    integrationPoints: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Integration points with other systems'
    },
    // Audit Trail
    auditTrail: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether to maintain audit trail'
    },
    // Created By
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Usage Statistics
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this workflow has been used'
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this workflow was used'
    },
    // Performance Metrics
    averageApprovalTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Average approval time in hours'
    },
    successRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Success rate percentage'
    },
    // Template Metadata
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for categorization'
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of keywords for searchability'
    },
    // Validation
    isValidated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    validatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Sharing
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this workflow can be used by other users'
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this workflow is shared across the organization'
    }
  }, {
    tableName: 'approval_workflows',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['workflowType']
      },
      {
        fields: ['projectType']
      },
      {
        fields: ['changeImpactLevel']
      },
      {
        fields: ['changeType']
      },
      {
        fields: ['isDefault']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['executionType']
      }
    ]
  });

  return ApprovalWorkflow;
};

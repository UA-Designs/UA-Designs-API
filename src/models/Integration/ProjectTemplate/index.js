module.exports = (sequelize, DataTypes) => {
  const ProjectTemplate = sequelize.define('ProjectTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    templateCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectType: {
      type: DataTypes.ENUM(
        'RESIDENTIAL',
        'COMMERCIAL',
        'INDUSTRIAL',
        'INFRASTRUCTURE',
        'RENOVATION',
        'MAINTENANCE',
        'CUSTOM'
      ),
      allowNull: false
    },
    constructionType: {
      type: DataTypes.ENUM(
        'NEW_CONSTRUCTION',
        'RENOVATION',
        'ADDITION',
        'RESTORATION',
        'DEMOLITION',
        'MAINTENANCE'
      ),
      allowNull: false
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
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Project Charter Template
    charterTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Project charter template structure'
    },
    // Scope Management Template
    scopeTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Scope management template'
    },
    // Schedule Template
    scheduleTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Schedule management template'
    },
    // Cost Template
    costTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Cost management template'
    },
    // Quality Template
    qualityTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Quality management template'
    },
    // Resource Template
    resourceTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Resource management template'
    },
    // Communication Template
    communicationTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Communication management template'
    },
    // Risk Template
    riskTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Risk management template'
    },
    // Procurement Template
    procurementTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Procurement management template'
    },
    // Stakeholder Template
    stakeholderTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Stakeholder management template'
    },
    // Construction-Specific Templates
    constructionTemplates: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Construction-specific templates and forms'
    },
    // Default Roles and Responsibilities
    defaultRoles: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default roles and responsibilities for this project type'
    },
    // Default Workflows
    defaultWorkflows: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default approval workflows for this project type'
    },
    // Default Milestones
    defaultMilestones: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default project milestones for this project type'
    },
    // Default Deliverables
    defaultDeliverables: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default project deliverables for this project type'
    },
    // Default Budget Categories
    defaultBudgetCategories: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default budget categories for this project type'
    },
    // Default Quality Standards
    defaultQualityStandards: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default quality standards for this project type'
    },
    // Default Safety Requirements
    defaultSafetyRequirements: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default safety requirements for this project type'
    },
    // Default Permits and Approvals
    defaultPermits: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default permits and approvals required for this project type'
    },
    // Default Risk Categories
    defaultRiskCategories: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default risk categories for this project type'
    },
    // Default Stakeholder Groups
    defaultStakeholderGroups: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default stakeholder groups for this project type'
    },
    // Usage Statistics
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this template has been used'
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this template was used'
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
    // Template Validation
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
    // Template Sharing
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this template can be used by other users'
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this template is shared across the organization'
    },
    // Template Rating
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Average rating of this template (1-5)'
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of ratings received'
    }
  }, {
    tableName: 'project_templates',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['projectType']
      },
      {
        fields: ['constructionType']
      },
      {
        fields: ['isDefault']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['isValidated']
      }
    ]
  });

  return ProjectTemplate;
};

module.exports = (sequelize, DataTypes) => {
  const LessonsLearned = sequelize.define('LessonsLearned', {
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
    lessonNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM(
        'SCOPE_MANAGEMENT',
        'SCHEDULE_MANAGEMENT', 
        'COST_MANAGEMENT',
        'QUALITY_MANAGEMENT',
        'RESOURCE_MANAGEMENT',
        'COMMUNICATION_MANAGEMENT',
        'RISK_MANAGEMENT',
        'PROCUREMENT_MANAGEMENT',
        'STAKEHOLDER_MANAGEMENT',
        'TECHNICAL',
        'PROCESS',
        'TEAM',
        'CLIENT_RELATIONS',
        'SAFETY',
        'OTHER'
      ),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lessonType: {
      type: DataTypes.ENUM('SUCCESS', 'FAILURE', 'IMPROVEMENT', 'BEST_PRACTICE', 'WARNING'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    situation: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'What was the situation or context?'
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'What action was taken?'
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'What was the result?'
    },
    impact: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false
    },
    probability: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: true,
      comment: 'Probability of this lesson occurring again'
    },
    recommendations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of recommendations for future projects'
    },
    applicableTo: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of project types this lesson applies to'
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of keywords for searchability'
    },
    capturedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    status: {
      type: DataTypes.ENUM('DRAFT', 'VALIDATED', 'APPROVED', 'ARCHIVED'),
      defaultValue: 'DRAFT'
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this lesson can be shared across projects'
    },
    isReusable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this lesson can be applied to other projects'
    },
    timesApplied: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this lesson has been applied to other projects'
    },
    effectiveness: {
      type: DataTypes.ENUM('NOT_APPLICABLE', 'INEFFECTIVE', 'SOMEWHAT_EFFECTIVE', 'EFFECTIVE', 'VERY_EFFECTIVE'),
      allowNull: true,
      comment: 'Effectiveness rating when applied to other projects'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of file references'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for categorization'
    },
    relatedLessons: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of related lesson IDs'
    },
    constructionSpecific: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this lesson is specific to construction industry'
    },
    phase: {
      type: DataTypes.ENUM('INITIATION', 'PLANNING', 'EXECUTION', 'MONITORING', 'CLOSURE'),
      allowNull: true,
      comment: 'Project phase when this lesson was learned'
    }
  }, {
    tableName: 'lessons_learned',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['category']
      },
      {
        fields: ['lessonType']
      },
      {
        fields: ['impact']
      },
      {
        fields: ['status']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['constructionSpecific']
      }
    ]
  });

  return LessonsLearned;
};

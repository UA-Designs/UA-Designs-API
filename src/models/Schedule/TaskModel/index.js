module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'),
      defaultValue: 'NOT_STARTED'
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    plannedStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    plannedEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in days'
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    plannedCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    actualCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    costBreakdown: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Breakdown of costs by category'
    },
    dependencies: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of task dependencies'
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User ID of assigned person'
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    parentTaskId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for categorization'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of file attachments'
    },
    isCritical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this task is on the critical path'
    },
    totalFloat: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total float time in days'
    },
    freeFloat: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Free float time in days'
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['assignedTo']
      },
      {
        fields: ['startDate', 'endDate']
      }
    ]
  });

  return Task;
};

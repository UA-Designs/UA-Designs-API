module.exports = (sequelize, DataTypes) => {
  const TaskDependency = sequelize.define('TaskDependency', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    predecessorTaskId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      },
      comment: 'The task that must be completed first'
    },
    successorTaskId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      },
      comment: 'The task that depends on the predecessor'
    },
    dependencyType: {
      type: DataTypes.ENUM('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH'),
      defaultValue: 'FINISH_TO_START',
      comment: 'Type of dependency relationship'
    },
    lag: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Lag time in days (can be negative for lead time)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the dependency relationship'
    },
    isHardDependency: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this is a hard constraint or can be overridden'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'task_dependencies',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['predecessorTaskId']
      },
      {
        fields: ['successorTaskId']
      },
      {
        fields: ['predecessorTaskId', 'successorTaskId'],
        unique: true,
        name: 'unique_dependency'
      },
      {
        fields: ['dependencyType']
      }
    ],
    validate: {
      // Prevent self-dependency
      noSelfDependency() {
        if (this.predecessorTaskId === this.successorTaskId) {
          throw new Error('A task cannot depend on itself');
        }
      }
    }
  });

  return TaskDependency;
};

module.exports = (sequelize, DataTypes) => {
  const Budget = sequelize.define('Budget', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('PLANNED', 'APPROVED', 'REVISED', 'CLOSED'),
      defaultValue: 'PLANNED'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    contingency: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Contingency percentage'
    },
    managementReserve: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Management reserve percentage'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approvalNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    previousBudgetId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'budgets',
        key: 'id'
      },
      comment: 'Reference to previous budget version if revised'
    },
    revisionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    closureNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'budgets',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['projectId'] },
      { fields: ['status'] },
      { fields: ['createdBy'] }
    ]
  });

  return Budget;
};
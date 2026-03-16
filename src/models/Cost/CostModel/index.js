module.exports = (sequelize, DataTypes) => {
  const Cost = sequelize.define('Cost', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'OTHER', 'FUEL', 'FORMWORKS'),
      allowNull: false
    },
    estimatedQty: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    unitCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true
    },
    actualQty: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    actualAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    amountReceived: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'PHP'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID'),
      defaultValue: 'PENDING'
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'projects', key: 'id' }
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'tasks', key: 'id' }
    },
    budgetId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'budgets', key: 'id' }
    }
  }, {
    tableName: 'costs',
    timestamps: true,
    paranoid: true
  });

  return Cost;
}; 
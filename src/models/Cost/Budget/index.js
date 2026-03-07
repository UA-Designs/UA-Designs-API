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
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'PHP'
    },
    status: {
      type: DataTypes.ENUM('PLANNED', 'APPROVED', 'REVISED', 'CLOSED'),
      defaultValue: 'PLANNED'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'budgets',
    timestamps: true,
    paranoid: true
  });

  return Budget;
};
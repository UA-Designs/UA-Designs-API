module.exports = (sequelize, DataTypes) => {
  const Cost = sequelize.define('Cost', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'cost_categories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'OTHER'),
      allowNull: false
    },
    phase: {
      type: DataTypes.ENUM('INITIATION', 'PLANNING', 'EXECUTION', 'MONITORING', 'CLOSING'),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD'
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
    }
  }, {
    tableName: 'costs',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['projectId'] },
      { fields: ['taskId'] },
      { fields: ['categoryId'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['date'] }
    ]
  });

  return Cost;
};
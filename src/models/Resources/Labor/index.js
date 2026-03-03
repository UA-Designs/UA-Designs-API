module.exports = (sequelize, DataTypes) => {
  const Labor = sequelize.define('Labor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    trade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dailyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    overtimeRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    hoursWorked: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'TERMINATED'),
      defaultValue: 'AVAILABLE'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    contactInfo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'labor',
    timestamps: true,
    paranoid: true
  });

  return Labor;
};
module.exports = (sequelize, DataTypes) => {
  const RiskMitigation = sequelize.define('RiskMitigation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    riskId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    strategy: {
      type: DataTypes.STRING,
      allowNull: false
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    responsible: {
      type: DataTypes.UUID,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'PLANNED'
    },
    cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },
    effectiveness: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'risk_mitigations',
    timestamps: true,
    paranoid: true
  });

  return RiskMitigation;
};

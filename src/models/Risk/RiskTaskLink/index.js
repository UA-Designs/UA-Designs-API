module.exports = (sequelize, DataTypes) => {
  const RiskTaskLink = sequelize.define('RiskTaskLink', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    riskId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    delayDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'risk_task_links',
    timestamps: true,
    indexes: [
      { fields: ['riskId'] },
      { fields: ['taskId'] },
      { unique: true, fields: ['riskId', 'taskId'] }
    ]
  });

  return RiskTaskLink;
};

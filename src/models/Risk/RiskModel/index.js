module.exports = (sequelize, DataTypes) => {
  const Risk = sequelize.define('Risk', {
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
    probability: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 1
      }
    },
    impact: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 1
      }
    },
    severity: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('IDENTIFIED', 'ANALYZING', 'MITIGATED', 'CLOSED'),
      defaultValue: 'IDENTIFIED'
    },
    mitigationStrategy: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contingencyPlan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'risks',
    timestamps: true,
    paranoid: true
  });

  return Risk;
}; 
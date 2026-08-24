module.exports = (sequelize, DataTypes) => {
  const ForecastSnapshot = sequelize.define('ForecastSnapshot', {
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
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    forecastDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    forecastType: {
      type: DataTypes.ENUM('COST', 'SCHEDULE', 'PROGRESS', 'RESOURCE', 'COMPOSITE'),
      allowNull: false,
      defaultValue: 'COMPOSITE'
    },
    baselineValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    actualValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    forecastValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    variance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    variancePercentage: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    },
    confidenceLevel: {
      type: DataTypes.ENUM('HIGH', 'MEDIUM', 'LOW'),
      allowNull: true
    },
    methodology: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    costForecastValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    scheduleForecastDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    progressForecastValue: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    resourceShortageHours: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'forecast_snapshots',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['projectId'] },
      { fields: ['forecastDate'] },
      { fields: ['forecastType'] },
      { fields: ['projectId', 'forecastDate'] }
    ]
  });

  return ForecastSnapshot;
};

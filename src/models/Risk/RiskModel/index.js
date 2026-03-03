module.exports = (sequelize, DataTypes) => {
  const Risk = sequelize.define('Risk', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
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
    riskScore: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true
    },
    severity: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('IDENTIFIED', 'ANALYZED', 'MITIGATING', 'MONITORING', 'CLOSED', 'ESCALATED'),
      defaultValue: 'IDENTIFIED'
    },
    responseStrategy: {
      type: DataTypes.ENUM('AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT'),
      allowNull: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    identifiedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    owner: {
      type: DataTypes.UUID,
      allowNull: true
    },
    identifiedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    escalatedTo: {
      type: DataTypes.UUID,
      allowNull: true
    },
    escalatedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
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

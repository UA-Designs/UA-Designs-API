module.exports = (sequelize, DataTypes) => {
  const ChangeRequest = sequelize.define('ChangeRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    changeRequestNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    changeType: {
      type: DataTypes.ENUM('SCOPE', 'SCHEDULE', 'COST', 'QUALITY', 'RESOURCE', 'TECHNICAL', 'OTHER'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    impactLevel: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    currentStatus: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CLOSED'),
      defaultValue: 'DRAFT'
    },
    businessJustification: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    impactAnalysis: {
      type: DataTypes.JSON, // Detailed impact analysis
      allowNull: true
    },
    costImpact: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    scheduleImpact: {
      type: DataTypes.INTEGER, // Days of impact
      allowNull: true
    },
    scopeImpact: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    qualityImpact: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    riskImpact: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    alternativesConsidered: {
      type: DataTypes.JSON, // Array of alternatives
      allowNull: true
    },
    recommendedSolution: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    implementationPlan: {
      type: DataTypes.JSON, // Implementation steps
      allowNull: true
    },
    changeControlBoard: {
      type: DataTypes.JSON, // Array of CCB member IDs
      allowNull: true
    },
    ccbReviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ccbDecision: {
      type: DataTypes.ENUM('APPROVED', 'REJECTED', 'APPROVED_WITH_CONDITIONS', 'DEFERRED'),
      allowNull: true
    },
    ccbComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    implementationDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    implementedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    closureDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closureComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON, // Array of file references
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON, // Array of tags
      allowNull: true
    }
  }, {
    tableName: 'change_requests',
    timestamps: true,
    paranoid: true
  });

  return ChangeRequest;
}; 
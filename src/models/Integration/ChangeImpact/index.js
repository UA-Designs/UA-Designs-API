module.exports = (sequelize, DataTypes) => {
  const ChangeImpact = sequelize.define('ChangeImpact', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    changeRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'change_requests',
        key: 'id'
      }
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    impactType: {
      type: DataTypes.ENUM(
        'SCOPE',
        'SCHEDULE',
        'COST',
        'QUALITY',
        'RESOURCE',
        'RISK',
        'STAKEHOLDER',
        'TECHNICAL',
        'REGULATORY',
        'SAFETY',
        'ENVIRONMENTAL'
      ),
      allowNull: false
    },
    impactLevel: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false
    },
    impactDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Scope Impact
    scopeImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed scope impact analysis'
    },
    // Schedule Impact
    scheduleImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed schedule impact analysis'
    },
    // Cost Impact
    costImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed cost impact analysis'
    },
    // Quality Impact
    qualityImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed quality impact analysis'
    },
    // Resource Impact
    resourceImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed resource impact analysis'
    },
    // Risk Impact
    riskImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed risk impact analysis'
    },
    // Stakeholder Impact
    stakeholderImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed stakeholder impact analysis'
    },
    // Technical Impact
    technicalImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed technical impact analysis'
    },
    // Regulatory Impact
    regulatoryImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed regulatory impact analysis'
    },
    // Safety Impact
    safetyImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed safety impact analysis'
    },
    // Environmental Impact
    environmentalImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed environmental impact analysis'
    },
    // Quantified Impact
    quantifiedImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Quantified impact metrics'
    },
    // Mitigation Strategies
    mitigationStrategies: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of mitigation strategies'
    },
    // Contingency Plans
    contingencyPlans: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of contingency plans'
    },
    // Dependencies
    dependencies: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of dependencies affected'
    },
    // Affected Tasks
    affectedTasks: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of affected task IDs'
    },
    // Affected Resources
    affectedResources: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of affected resource IDs'
    },
    // Affected Stakeholders
    affectedStakeholders: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of affected stakeholder IDs'
    },
    // Impact Timeline
    impactTimeline: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Timeline of impact occurrence'
    },
    // Recovery Time
    recoveryTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Estimated recovery time in days'
    },
    // Impact Probability
    impactProbability: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CERTAIN'),
      allowNull: true
    },
    // Impact Severity
    impactSeverity: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: true
    },
    // Risk Score
    riskScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Calculated risk score (1-100)'
    },
    // Business Impact
    businessImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Business impact assessment'
    },
    // Customer Impact
    customerImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Customer impact assessment'
    },
    // Operational Impact
    operationalImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Operational impact assessment'
    },
    // Financial Impact
    financialImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Financial impact assessment'
    },
    // Reputation Impact
    reputationImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Reputation impact assessment'
    },
    // Compliance Impact
    complianceImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Compliance impact assessment'
    },
    // Analyzed By
    analyzedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    analyzedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Review Status
    reviewStatus: {
      type: DataTypes.ENUM('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'),
      defaultValue: 'DRAFT'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Review Comments
    reviewComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Validation Status
    isValidated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    validatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Construction-Specific Impact
    constructionImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Construction-specific impact assessment'
    },
    // Weather Impact
    weatherImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Weather-related impact assessment'
    },
    // Permit Impact
    permitImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Permit and regulatory impact assessment'
    },
    // Subcontractor Impact
    subcontractorImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Subcontractor impact assessment'
    },
    // Material Impact
    materialImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Material impact assessment'
    },
    // Equipment Impact
    equipmentImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Equipment impact assessment'
    },
    // Labor Impact
    laborImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Labor impact assessment'
    },
    // Site Impact
    siteImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Site-specific impact assessment'
    },
    // Neighbor Impact
    neighborImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Neighbor and community impact assessment'
    },
    // Traffic Impact
    trafficImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Traffic impact assessment'
    },
    // Noise Impact
    noiseImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Noise impact assessment'
    },
    // Dust Impact
    dustImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Dust impact assessment'
    },
    // Vibration Impact
    vibrationImpact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Vibration impact assessment'
    },
    // Additional Fields
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of file references'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for categorization'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes'
    }
  }, {
    tableName: 'change_impacts',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['changeRequestId']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['impactType']
      },
      {
        fields: ['impactLevel']
      },
      {
        fields: ['reviewStatus']
      },
      {
        fields: ['analyzedBy']
      }
    ]
  });

  return ChangeImpact;
};

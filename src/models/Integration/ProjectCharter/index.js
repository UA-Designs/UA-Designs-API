module.exports = (sequelize, DataTypes) => {
  const ProjectCharter = sequelize.define('ProjectCharter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    charterNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    projectTitle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    projectDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    businessCase: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectObjectives: {
      type: DataTypes.JSON, // Array of objectives
      allowNull: false
    },
    successCriteria: {
      type: DataTypes.JSON, // Array of success criteria
      allowNull: false
    },
    highLevelRequirements: {
      type: DataTypes.JSON, // Array of requirements
      allowNull: true
    },
    projectScope: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectDeliverables: {
      type: DataTypes.JSON, // Array of deliverables
      allowNull: false
    },
    projectConstraints: {
      type: DataTypes.JSON, // Array of constraints
      allowNull: true
    },
    projectAssumptions: {
      type: DataTypes.JSON, // Array of assumptions
      allowNull: true
    },
    highLevelRisks: {
      type: DataTypes.JSON, // Array of risks
      allowNull: true
    },
    summaryMilestoneSchedule: {
      type: DataTypes.JSON, // Array of milestones
      allowNull: true
    },
    summaryBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    projectSponsor: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    projectManager: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    keyStakeholders: {
      type: DataTypes.JSON, // Array of stakeholder IDs
      allowNull: true
    },
    approvalStatus: {
      type: DataTypes.ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'),
      defaultValue: 'DRAFT'
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
    approvalComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    charterVersion: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'project_charters',
    timestamps: true,
    paranoid: true
  });

  return ProjectCharter;
};

module.exports = (sequelize, DataTypes) => {
  const StakeholderEngagement = sequelize.define('StakeholderEngagement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stakeholderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    assessedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    engagementLevel: {
      type: DataTypes.ENUM('UNAWARE', 'RESISTANT', 'NEUTRAL', 'SUPPORTIVE', 'LEADING'),
      allowNull: false
    },
    satisfaction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assessedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'stakeholder_engagements',
    timestamps: true,
    paranoid: true
  });

  return StakeholderEngagement;
};

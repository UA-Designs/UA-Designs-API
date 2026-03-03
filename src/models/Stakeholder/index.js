module.exports = (sequelize, DataTypes) => {
  const Stakeholder = sequelize.define('Stakeholder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    organization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('INTERNAL', 'EXTERNAL'),
      defaultValue: 'EXTERNAL'
    },
    influence: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      defaultValue: 'MEDIUM'
    },
    interest: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      defaultValue: 'MEDIUM'
    },
    engagementLevel: {
      type: DataTypes.ENUM('UNAWARE', 'RESISTANT', 'NEUTRAL', 'SUPPORTIVE', 'LEADING'),
      defaultValue: 'NEUTRAL'
    },
    communicationPreference: {
      type: DataTypes.ENUM('EMAIL', 'PHONE', 'IN_PERSON', 'REPORT'),
      defaultValue: 'EMAIL'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'stakeholders',
    timestamps: true,
    paranoid: true
  });

  return Stakeholder;
};

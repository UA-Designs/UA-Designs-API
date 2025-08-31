module.exports = (sequelize, DataTypes) => {
  const Stakeholder = sequelize.define('Stakeholder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    role: {
      type: DataTypes.ENUM('CLIENT', 'CONTRACTOR', 'SUPPLIER', 'REGULATOR', 'COMMUNITY'),
      allowNull: false
    },
    influence: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    interest: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      defaultValue: 'MEDIUM'
    },
    communicationPreference: {
      type: DataTypes.ENUM('EMAIL', 'PHONE', 'MEETING', 'REPORT'),
      defaultValue: 'EMAIL'
    }
  }, {
    tableName: 'stakeholders',
    timestamps: true,
    paranoid: true
  });

  return Stakeholder;
}; 
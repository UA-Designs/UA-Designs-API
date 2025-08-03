module.exports = (sequelize, DataTypes) => {
  const ChangeRequest = sequelize.define('ChangeRequest', {
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
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('SCOPE', 'SCHEDULE', 'COST', 'QUALITY', 'RESOURCE'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM'
    },
    status: {
      type: DataTypes.ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED'),
      defaultValue: 'SUBMITTED'
    },
    impact: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    justification: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'change_requests',
    timestamps: true,
    paranoid: true
  });

  return ChangeRequest;
}; 
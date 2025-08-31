module.exports = (sequelize, DataTypes) => {
  const Communication = sequelize.define('Communication', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('EMAIL', 'MEETING', 'REPORT', 'NOTIFICATION'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
      defaultValue: 'MEDIUM'
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SENT', 'READ', 'REPLIED'),
      defaultValue: 'DRAFT'
    },
    recipients: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'communications',
    timestamps: true,
    paranoid: true
  });

  return Communication;
}; 
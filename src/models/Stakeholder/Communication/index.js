module.exports = (sequelize, DataTypes) => {
  const Communication = sequelize.define('Communication', {
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
    sentBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('EMAIL', 'MEETING', 'PHONE_CALL', 'REPORT', 'SITE_VISIT', 'LETTER'),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    direction: {
      type: DataTypes.ENUM('INBOUND', 'OUTBOUND'),
      defaultValue: 'OUTBOUND'
    },
    sentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SENT', 'RECEIVED', 'ACKNOWLEDGED'),
      defaultValue: 'DRAFT'
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    followUpNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'communications',
    timestamps: true,
    paranoid: true
  });

  return Communication;
};

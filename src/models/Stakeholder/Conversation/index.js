module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    stakeholderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessagePreview: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'conversations',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['projectId', 'stakeholderId'],
        name: 'conversations_project_stakeholder_unique'
      }
    ]
  });

  return Conversation;
};

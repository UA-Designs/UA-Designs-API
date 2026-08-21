module.exports = (sequelize, DataTypes) => {
  const AIConversation = sequelize.define('AIConversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    }
  }, {
    tableName: 'ai_conversations',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['projectId'] },
      { fields: ['userId', 'projectId'] }
    ]
  });

  return AIConversation;
};

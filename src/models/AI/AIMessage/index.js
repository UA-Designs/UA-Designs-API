module.exports = (sequelize, DataTypes) => {
  const AIMessage = sequelize.define('AIMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ai_conversations',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system', 'tool'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'ai_messages',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['conversationId'] },
      { fields: ['createdAt'] }
    ]
  });

  return AIMessage;
};

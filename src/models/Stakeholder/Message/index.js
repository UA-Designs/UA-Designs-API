module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      }
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('SENT', 'DELIVERED', 'READ'),
      allowNull: false,
      defaultValue: 'SENT'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'messages',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['conversationId', 'createdAt'] },
      { fields: ['conversationId', 'senderId', 'status'] }
    ]
  });

  return Message;
};

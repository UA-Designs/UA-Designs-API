module.exports = (sequelize, DataTypes) => {
  const AIActionProposal = sequelize.define('AIActionProposal', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ai_conversations',
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
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'),
      allowNull: false,
      defaultValue: 'PENDING_APPROVAL'
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    result: {
      type: DataTypes.JSON,
      allowNull: true
    },
    decidedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'ai_action_proposals',
    timestamps: true,
    indexes: [
      { fields: ['projectId'] },
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['conversationId'] }
    ]
  });

  return AIActionProposal;
};

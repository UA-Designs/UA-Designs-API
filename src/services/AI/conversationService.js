const { Op } = require('sequelize');
const { AIConversation, AIMessage } = require('../../models');
const { getLlmConfig } = require('./llm/llmConfig');
const { forbidden, notFound, badRequest } = require('./aiErrors');
const { isUuid, truncateText } = require('./aiUtils');

class ConversationService {
  async getOrCreate({ conversationId, userId, projectId }) {
    if (conversationId) {
      if (!isUuid(conversationId)) {
        throw badRequest('conversationId must be a valid UUID', 'INVALID_CONVERSATION');
      }
      const existing = await AIConversation.findByPk(conversationId);
      if (!existing) throw notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
      if (String(existing.userId) !== String(userId)) {
        throw forbidden('You cannot use another user\'s conversation');
      }
      if (String(existing.projectId) !== String(projectId)) {
        throw badRequest('conversationId does not belong to this project', 'CONVERSATION_PROJECT_MISMATCH');
      }
      return existing;
    }

    return AIConversation.create({ userId, projectId });
  }

  async listHistory(conversationId, limit) {
    const config = getLlmConfig();
    const take = limit || config.historyLimit || 20;
    const rows = await AIMessage.findAll({
      where: { conversationId, role: { [Op.in]: ['user', 'assistant'] } },
      order: [['createdAt', 'DESC']],
      limit: take
    });
    return rows.reverse().map((row) => ({
      role: row.role,
      content: row.content || ''
    }));
  }

  async appendMessage({ conversationId, role, content, metadata }) {
    return AIMessage.create({
      conversationId,
      role,
      content: truncateText(content, 8000),
      metadata: metadata || null
    });
  }
}

module.exports = new ConversationService();

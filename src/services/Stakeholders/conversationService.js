const { Op } = require('sequelize');
const { Conversation, Message, Stakeholder, User } = require('../../models');
const realtime = require('./realtimeService');

const OPEN_ANY_ROLES = new Set([
  'ENGINEER',
  'ARCHITECT',
  'PROJECT_MANAGER',
  'PROPRIETOR',
  'ADMIN'
]);

const PREVIEW_LENGTH = 500;
const DEFAULT_PAGE = 50;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function stakeholderSummary(stakeholder) {
  if (!stakeholder) return null;
  return {
    id: stakeholder.id,
    name: stakeholder.name,
    organization: stakeholder.organization || null,
    role: stakeholder.role || null,
    userId: stakeholder.userId || null
  };
}

function serializeMessage(message, viewerId) {
  const plain = typeof message.toJSON === 'function' ? message.toJSON() : message;
  const sender = plain.sender || null;
  return {
    id: plain.id,
    conversationId: plain.conversationId,
    body: plain.body,
    status: plain.status,
    createdAt: plain.createdAt,
    deliveredAt: plain.deliveredAt || null,
    readAt: plain.readAt || null,
    mine: Boolean(viewerId) && String(plain.senderId) === String(viewerId),
    sender: sender
      ? {
          id: sender.id,
          firstName: sender.firstName,
          lastName: sender.lastName
        }
      : null
  };
}

const messageInclude = [
  {
    model: User,
    as: 'sender',
    attributes: ['id', 'firstName', 'lastName']
  }
];

async function linkedStakeholderIds(userId) {
  const rows = await Stakeholder.findAll({
    where: { userId },
    attributes: ['id']
  });
  return rows.map((row) => row.id);
}

async function assertCanAccess(user, conversation) {
  if (!conversation) throw httpError(404, 'Conversation not found');

  const role = String(user.role || '').toUpperCase();
  if (OPEN_ANY_ROLES.has(role)) return;

  if (role !== 'STAFF') {
    throw httpError(403, 'Insufficient permissions for this action');
  }

  const ownIds = await linkedStakeholderIds(user.id);
  if (ownIds.length === 0) return;

  if (!ownIds.includes(conversation.stakeholderId)) {
    throw httpError(403, 'You can only open your own stakeholder conversations');
  }
}

async function findOrCreateForStakeholder(stakeholder) {
  const where = { projectId: stakeholder.projectId, stakeholderId: stakeholder.id };
  const existing = await Conversation.findOne({ where });
  if (existing) return existing;

  try {
    return await Conversation.create(where);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const raced = await Conversation.findOne({ where });
      if (raced) return raced;
    }
    throw error;
  }
}

async function loadMessages({ conversationId, before, limit }) {
  const pageSize = limit || DEFAULT_PAGE;
  const where = { conversationId };
  if (before) where.createdAt = { [Op.lt]: before };

  const rows = await Message.findAll({
    where,
    include: messageInclude,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: pageSize + 1
  });

  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize).reverse();
  return { messages: page, hasMore };
}

function sortInbox(rows) {
  return rows.sort((a, b) => {
    if (!a.lastMessageAt && !b.lastMessageAt) return 0;
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
  });
}

class ConversationService {
  async listInbox(user, { projectId, stakeholderUser }) {
    const where = { projectId };
    const stakeholderWhere = {};

    if (stakeholderUser === 'me') {
      stakeholderWhere.userId = user.id;
    }

    const role = String(user.role || '').toUpperCase();
    if (role === 'STAFF') {
      const ownIds = await linkedStakeholderIds(user.id);
      if (ownIds.length > 0) where.stakeholderId = { [Op.in]: ownIds };
    } else if (!OPEN_ANY_ROLES.has(role)) {
      throw httpError(403, 'Insufficient permissions for this action');
    }

    const rows = await Conversation.findAll({
      where,
      include: [
        {
          model: Stakeholder,
          as: 'stakeholder',
          attributes: ['id', 'name', 'organization', 'role', 'userId'],
          where: Object.keys(stakeholderWhere).length ? stakeholderWhere : undefined,
          required: Object.keys(stakeholderWhere).length > 0
        }
      ]
    });

    const ordered = sortInbox(rows);
    const ids = ordered.map((row) => row.id);
    const unreadByConversation = {};

    if (ids.length > 0) {
      const unreadRows = await Message.findAll({
        attributes: ['conversationId'],
        where: {
          conversationId: { [Op.in]: ids },
          senderId: { [Op.ne]: user.id },
          status: { [Op.ne]: 'READ' }
        }
      });
      unreadRows.forEach((row) => {
        unreadByConversation[row.conversationId] = (unreadByConversation[row.conversationId] || 0) + 1;
      });
    }

    return ordered.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      stakeholderId: row.stakeholderId,
      stakeholder: stakeholderSummary(row.stakeholder),
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.lastMessagePreview,
      unreadCount: unreadByConversation[row.id] || 0
    }));
  }

  async getOrCreate(user, stakeholderId) {
    const stakeholder = await Stakeholder.findByPk(stakeholderId);
    if (!stakeholder) throw httpError(404, 'Stakeholder not found');

    await assertCanAccess(user, { stakeholderId: stakeholder.id });
    const conversation = await findOrCreateForStakeholder(stakeholder);

    const { messages } = await loadMessages({
      conversationId: conversation.id,
      limit: DEFAULT_PAGE
    });

    return {
      id: conversation.id,
      projectId: conversation.projectId,
      stakeholderId: conversation.stakeholderId,
      stakeholder: stakeholderSummary(stakeholder),
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview: conversation.lastMessagePreview,
      messages: messages.map((message) => serializeMessage(message, user.id))
    };
  }

  async getMessages(user, conversationId, { before, limit }) {
    const conversation = await Conversation.findByPk(conversationId);
    await assertCanAccess(user, conversation);

    const page = await loadMessages({ conversationId, before, limit });
    return {
      messages: page.messages.map((message) => serializeMessage(message, user.id)),
      hasMore: page.hasMore
    };
  }

  async send(user, conversationId, body) {
    const conversation = await Conversation.findByPk(conversationId);
    await assertCanAccess(user, conversation);

    const text = String(body || '').trim();
    if (!text) throw httpError(400, 'Message body is required');
    if (text.length > 4000) throw httpError(400, 'Message must not exceed 4000 characters');

    const message = await Message.create({
      conversationId,
      senderId: user.id,
      body: text,
      status: 'SENT'
    });

    await conversation.update({
      lastMessageAt: message.createdAt,
      lastMessagePreview: text.slice(0, PREVIEW_LENGTH)
    });

    const saved = await Message.findByPk(message.id, { include: messageInclude });
    const payload = serializeMessage(saved, user.id);

    await realtime.trigger(conversationId, 'message:new', {
      ...payload,
      mine: false
    });

    return payload;
  }

  async markDelivered(user, conversationId) {
    const conversation = await Conversation.findByPk(conversationId);
    await assertCanAccess(user, conversation);

    const rows = await Message.findAll({
      where: {
        conversationId,
        senderId: { [Op.ne]: user.id },
        status: 'SENT'
      },
      attributes: ['id']
    });
    const messageIds = rows.map((row) => row.id);
    const deliveredAt = new Date();

    if (messageIds.length > 0) {
      await Message.update(
        { status: 'DELIVERED', deliveredAt },
        { where: { id: { [Op.in]: messageIds } } }
      );
      await realtime.trigger(conversationId, 'message:delivered', {
        conversationId,
        messageIds,
        deliveredAt
      });
    }

    return { messageIds, deliveredAt: messageIds.length ? deliveredAt : null };
  }

  async markRead(user, conversationId) {
    const conversation = await Conversation.findByPk(conversationId);
    await assertCanAccess(user, conversation);

    const rows = await Message.findAll({
      where: {
        conversationId,
        senderId: { [Op.ne]: user.id },
        status: { [Op.ne]: 'READ' }
      },
      attributes: ['id']
    });
    const messageIds = rows.map((row) => row.id);
    const readAt = new Date();

    if (messageIds.length > 0) {
      await Message.update(
        { status: 'READ', readAt },
        { where: { id: { [Op.in]: messageIds } } }
      );
      await realtime.trigger(conversationId, 'message:read', {
        conversationId,
        messageIds,
        readAt
      });
    }

    return { messageIds, readAt: messageIds.length ? readAt : null };
  }

  async authorizeRealtime(user, socketId, channelName) {
    if (!realtime.isRealtimeEnabled()) {
      throw httpError(503, 'Realtime is not configured');
    }
    if (!socketId || !channelName) {
      throw httpError(400, 'socket_id and channel_name are required');
    }

    const match = /^private-conversation-([0-9a-f-]{36})$/i.exec(channelName);
    if (!match) throw httpError(403, 'Channel is not allowed');

    const conversation = await Conversation.findByPk(match[1]);
    await assertCanAccess(user, conversation);

    const auth = realtime.authorizeChannel(socketId, channelName);
    if (!auth) throw httpError(503, 'Realtime is not configured');
    return auth;
  }
}

module.exports = new ConversationService();

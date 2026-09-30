const conversationService = require('../../services/Stakeholders/conversationService');
const { realtimeConfig } = require('../../services/Stakeholders/realtimeService');

function sendError(res, error, fallback) {
  const status = error.status || 500;
  if (status >= 500) console.error(fallback, error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallback : error.message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

class ConversationController {
  async list(req, res) {
    try {
      const data = await conversationService.listInbox(req.user, {
        projectId: req.query.projectId,
        stakeholderUser: req.query.stakeholderUser
      });
      return res.json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Failed to fetch conversations');
    }
  }

  async getOrCreate(req, res) {
    try {
      const data = await conversationService.getOrCreate(req.user, req.params.id);
      return res.json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Failed to open conversation');
    }
  }

  async listMessages(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
      const before = req.query.before ? new Date(req.query.before) : undefined;
      const data = await conversationService.getMessages(req.user, req.params.conversationId, {
        before,
        limit
      });
      return res.json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Failed to fetch messages');
    }
  }

  async send(req, res) {
    try {
      const data = await conversationService.send(
        req.user,
        req.params.conversationId,
        req.body.body
      );
      return res.status(201).json({
        success: true,
        message: 'Message sent',
        data
      });
    } catch (error) {
      return sendError(res, error, 'Failed to send message');
    }
  }

  async markDelivered(req, res) {
    try {
      const data = await conversationService.markDelivered(req.user, req.params.conversationId);
      return res.json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Failed to mark messages delivered');
    }
  }

  async markRead(req, res) {
    try {
      const data = await conversationService.markRead(req.user, req.params.conversationId);
      return res.json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Failed to mark messages read');
    }
  }

  getRealtimeConfig(req, res) {
    return res.json({ success: true, data: realtimeConfig() });
  }

  async authorizePusher(req, res) {
    try {
      const auth = await conversationService.authorizeRealtime(
        req.user,
        req.body.socket_id,
        req.body.channel_name
      );
      return res.json(auth);
    } catch (error) {
      return sendError(res, error, 'Failed to authorize realtime channel');
    }
  }
}

module.exports = new ConversationController();

/**
 * Creates stakeholder chat tables if they are missing.
 * Fresh environments pick these up from sequelize.sync(); this covers
 * existing production databases that are not force-synced.
 */

async function ensureConversationTables() {
  const { Conversation, Message } = require('../models');
  await Conversation.sync();
  await Message.sync();
}

module.exports = {
  ensureConversationTables
};

/**
 * Creates AI conversation tables if they are missing.
 * Fresh environments pick these up from sequelize.sync(); this covers
 * existing production databases that are not force-synced.
 */

async function ensureAiConversationTables() {
  const { AIConversation, AIMessage, AIActionProposal } = require('../models');
  await AIConversation.sync();
  await AIMessage.sync();
  await AIActionProposal.sync();
}

module.exports = {
  ensureAiConversationTables
};

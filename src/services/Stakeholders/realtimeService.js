const Pusher = require('pusher');

let client = null;

function isRealtimeEnabled() {
  return Boolean(
    process.env.PUSHER_APP_ID
    && process.env.PUSHER_KEY
    && process.env.PUSHER_SECRET
    && process.env.PUSHER_CLUSTER
  );
}

function getClient() {
  if (!isRealtimeEnabled()) return null;
  if (!client) {
    client = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true
    });
  }
  return client;
}

function channelFor(conversationId) {
  return `private-conversation-${conversationId}`;
}

async function trigger(conversationId, event, payload) {
  const pusher = getClient();
  if (!pusher) return;
  try {
    await pusher.trigger(channelFor(conversationId), event, payload);
  } catch (error) {
    console.error('Pusher trigger failed:', error.message);
  }
}

function authorizeChannel(socketId, channelName) {
  const pusher = getClient();
  if (!pusher) return null;
  return pusher.authorizeChannel(socketId, channelName);
}

function realtimeConfig() {
  if (!isRealtimeEnabled()) {
    return { enabled: false, key: null, cluster: null };
  }
  return {
    enabled: true,
    key: process.env.PUSHER_KEY,
    cluster: process.env.PUSHER_CLUSTER
  };
}

module.exports = {
  isRealtimeEnabled,
  channelFor,
  trigger,
  authorizeChannel,
  realtimeConfig
};

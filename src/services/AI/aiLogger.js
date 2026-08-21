const { v4: uuidv4 } = require('uuid');

function logAiEvent(event) {
  const payload = {
    requestId: event.requestId || null,
    userId: event.userId || null,
    projectId: event.projectId || null,
    conversationId: event.conversationId || null,
    tool: event.tool || null,
    status: event.status || null,
    durationMs: event.durationMs != null ? event.durationMs : null,
    error: event.error || null
  };
  console.log('[AI]', JSON.stringify(payload));
}

function createRequestId() {
  return uuidv4();
}

module.exports = {
  logAiEvent,
  createRequestId
};

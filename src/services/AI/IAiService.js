/**
 * Application-facing LLM contract.
 *
 * Controllers and domain services must depend on this shape, never on a
 * provider SDK. A second provider can implement the same methods.
 *
 * @typedef {Object} AiMessage
 * @property {'system'|'user'|'assistant'|'tool'} role
 * @property {string|null} [content]
 * @property {Array<object>} [tool_calls]
 * @property {string} [tool_call_id]
 *
 * @typedef {Object} AiToolCall
 * @property {string} id
 * @property {string} name
 * @property {object} arguments
 *
 * @typedef {Object} AiCompletion
 * @property {string} text
 * @property {AiToolCall[]} toolCalls
 * @property {Array<object>} rawToolCalls
 * @property {string|null} finishReason
 * @property {object|null} usage
 * @property {string} [model]
 *
 * @typedef {Object} IAiService
 * @property {(input: {
 *   systemInstructions: string,
 *   projectContext?: object|null,
 *   conversationHistory?: Array<{role: string, content: string}>,
 *   userMessage: string,
 *   tools?: Array<object>,
 *   executeTool?: (call: AiToolCall) => Promise<object>,
 *   maxRounds?: number,
 *   onTool?: (event: object) => void
 * }) => Promise<{
 *   text: string,
 *   toolInvocations: Array<{name: string, arguments: object, result: object, durationMs: number, status: string}>,
 *   model?: string,
 *   usage?: object|null
 * }>} complete
 */

function assertAiService(service) {
  if (!service || typeof service.complete !== 'function') {
    throw new Error('IAiService requires a complete(input) method');
  }
  return service;
}

module.exports = {
  assertAiService
};

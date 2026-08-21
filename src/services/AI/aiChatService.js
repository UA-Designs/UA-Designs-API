const { getSystemPrompt } = require('./systemPrompt');
const { assertProjectAccess } = require('./projectAccess');
const projectContextService = require('./projectContextService');
const conversationService = require('./conversationService');
const actionProposalService = require('./actionProposalService');
const { executeTool } = require('./tools/toolExecutor');
const { getToolDefinitions } = require('./tools/toolDefinitions');
const { AiService } = require('./AiService');
const { createLlmProvider } = require('./llm/createLlmProvider');
const { getLlmConfig } = require('./llm/llmConfig');
const { logAiEvent } = require('./aiLogger');
const { AiAppError } = require('./aiErrors');

const INTENT_BY_TOOL = {
  get_project_schedule: 'schedule_estimate',
  get_overdue_tasks: 'schedule_estimate',
  get_task_dependencies: 'schedule_estimate',
  get_tasks: 'schedule_estimate',
  get_task: 'schedule_estimate',
  propose_schedule: 'schedule_propose',
  apply_suggested_schedule: 'action_proposal',
  analyze_schedule_impact: 'schedule_impact',
  get_project_budget: 'cost_forecast',
  get_project_risks: 'risk_summary',
  get_project: 'project_summary',
  get_project_status: 'project_summary',
  get_project_progress: 'project_summary',
  get_project_resources: 'resource_summary',
  create_task: 'action_proposal',
  update_task: 'action_proposal',
  assign_task: 'action_proposal',
  reschedule_task: 'action_proposal',
  create_risk: 'action_proposal',
  update_risk: 'action_proposal'
};

let llmProvider = null;
let aiService = null;

function setLlmProvider(provider) {
  llmProvider = provider;
  aiService = provider ? new AiService(provider, getLlmConfig()) : null;
}

function resetLlmProvider() {
  llmProvider = null;
  aiService = null;
}

function getAiService() {
  if (aiService) return aiService;
  llmProvider = createLlmProvider();
  aiService = new AiService(llmProvider, getLlmConfig());
  return aiService;
}

function resolveIntent(toolInvocations, actionProposals) {
  if (actionProposals.length > 0) return 'action_proposal';
  const names = (toolInvocations || []).map((item) => item.name);
  const intents = names.map((name) => INTENT_BY_TOOL[name]).filter(Boolean);
  if (intents.length === 0) return 'assistant';
  const unique = [...new Set(intents)];
  return unique.length === 1 ? unique[0] : 'assistant';
}

function buildKeyResults(toolInvocations) {
  const keyResults = {
    toolsUsed: (toolInvocations || []).map((item) => item.name),
    toolStatus: (toolInvocations || []).map((item) => ({
      name: item.name,
      status: item.status,
      durationMs: item.durationMs
    }))
  };

  (toolInvocations || []).forEach((item) => {
    if (item.result && item.result.ok && item.result.data && !item.result.data.proposal) {
      keyResults[item.name] = item.result.data;
    }
  });

  return keyResults;
}

class AiChatService {
  async respond({ projectId, message, user, conversationId, requestId }) {
    const started = Date.now();
    const project = await assertProjectAccess(user, projectId);
    const conversation = await conversationService.getOrCreate({
      conversationId,
      userId: user.id,
      projectId: project.id
    });

    const [projectSnapshot, history] = await Promise.all([
      projectContextService.getContext(project),
      conversationService.listHistory(conversation.id)
    ]);

    const projectContext = {
      ...projectSnapshot,
      currentUser: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || null,
        role: user.role || null
      }
    };

    logAiEvent({
      requestId,
      userId: user.id,
      projectId: project.id,
      conversationId: conversation.id,
      status: 'started'
    });

    await conversationService.appendMessage({
      conversationId: conversation.id,
      role: 'user',
      content: message
    });

    const service = getAiService();
    const completion = await service.complete({
      systemInstructions: getSystemPrompt(),
      projectContext,
      conversationHistory: history,
      userMessage: message,
      tools: getToolDefinitions(),
      maxRounds: getLlmConfig().maxToolRounds,
      executeTool: (call) => executeTool(call, { project, user, conversationId: conversation.id }),
      onTool: (event) => logAiEvent({
        requestId,
        userId: user.id,
        projectId: project.id,
        conversationId: conversation.id,
        tool: event.name,
        status: event.status,
        durationMs: event.durationMs
      })
    });

    const actionProposals = await actionProposalService.createFromToolResults({
      conversationId: conversation.id,
      projectId: project.id,
      userId: user.id,
      toolInvocations: completion.toolInvocations
    });

    const replyText = completion.text || 'I could not generate a response.';
    await conversationService.appendMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: replyText,
      metadata: {
        toolsUsed: (completion.toolInvocations || []).map((item) => item.name),
        actionProposalIds: actionProposals.map((item) => item.id),
        model: completion.model || null
      }
    });

    logAiEvent({
      requestId,
      userId: user.id,
      projectId: project.id,
      conversationId: conversation.id,
      status: 'ok',
      durationMs: Date.now() - started
    });

    return {
      replyText,
      conversationId: conversation.id,
      payload: {
        intent: resolveIntent(completion.toolInvocations, actionProposals),
        keyResults: buildKeyResults(completion.toolInvocations),
        actionProposals
      }
    };
  }
}

module.exports = new AiChatService();
module.exports.setLlmProvider = setLlmProvider;
module.exports.resetLlmProvider = resetLlmProvider;
module.exports.AiAppError = AiAppError;

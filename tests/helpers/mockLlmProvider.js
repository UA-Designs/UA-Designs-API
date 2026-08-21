function textReply(text) {
  return {
    text,
    toolCalls: [],
    rawToolCalls: [],
    finishReason: 'stop',
    usage: { prompt_tokens: 1, completion_tokens: 8 },
    model: 'mock-model'
  };
}

function toolCall(name, args = {}, id = 'call_1') {
  return {
    text: '',
    toolCalls: [{ id, name, arguments: args }],
    rawToolCalls: [{
      id,
      type: 'function',
      function: { name, arguments: JSON.stringify(args) }
    }],
    finishReason: 'tool_calls',
    usage: { prompt_tokens: 1, completion_tokens: 1 },
    model: 'mock-model'
  };
}

function createScriptedLlmProvider(script) {
  let index = 0;
  const calls = [];
  return {
    calls,
    async complete(input) {
      calls.push(input);
      if (index >= script.length) {
        throw new Error('Mock LLM script exhausted');
      }
      const step = script[index];
      index += 1;
      if (typeof step === 'function') return step(input);
      return step;
    }
  };
}

module.exports = {
  textReply,
  toolCall,
  createScriptedLlmProvider
};

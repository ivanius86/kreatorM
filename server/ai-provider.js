"use strict";

// Provider methods accept the Core's classify/generateReply inputs and return
// { content, usage }. Usage is server-only and never part of the chat response.
function error(code, phase = "provider", upstreamStatus = null) {
  const result = new Error(code); result.code = code; result.phase = phase;
  if (Number.isInteger(upstreamStatus) && upstreamStatus >= 100 && upstreamStatus <= 599) result.upstreamStatus = upstreamStatus;
  return result;
}

function usage(inputTokens, outputTokens, totalTokens) {
  const valid = value => Number.isSafeInteger(value) && value >= 0;
  if (!valid(inputTokens) && !valid(outputTokens) && !valid(totalTokens)) return null;
  return {
    inputTokens: valid(inputTokens) ? inputTokens : null,
    outputTokens: valid(outputTokens) ? outputTokens : null,
    totalTokens: valid(totalTokens) ? totalTokens : valid(inputTokens) && valid(outputTokens) ? inputTokens + outputTokens : null
  };
}

function result(content, tokenUsage = null) {
  return { content, usage: tokenUsage };
}

function assertProvider(provider) {
  if (!provider || typeof provider.classify !== "function" || typeof provider.generateReply !== "function") throw error("INVALID_REQUEST");
  return provider;
}

module.exports = { error, usage, result, assertProvider };

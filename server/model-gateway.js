"use strict";
const contract = require("./ai-provider.js");
const { createGemini, DEFAULT_MODEL: GEMINI_MODEL } = require("./gemini.js");
const { createQwen, DEFAULT_MODEL: QWEN_MODEL, DEFAULT_BASE_URL: QWEN_BASE_URL } = require("./qwen.js");

function createModelGateway({ name = "gemini", model, apiKey, baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 75000 } = {}) {
  if (!["gemini", "qwen"].includes(name)) throw contract.error("INVALID_REQUEST");
  const selectedModel = model || (name === "gemini" ? GEMINI_MODEL : QWEN_MODEL);
  const instance = contract.assertProvider(name === "gemini"
    ? createGemini({ apiKey, model: selectedModel, fetchImpl, timeoutMs })
    : createQwen({ apiKey, model: selectedModel, baseUrl: baseUrl || QWEN_BASE_URL, fetchImpl, timeoutMs }));

  async function invoke(method, request, options) {
    const value = await instance[method](request, options);
    const structured = method === "classify" || Boolean(request.schema);
    if (!value || typeof value !== "object" || !("content" in value) || (structured ? !value.content || typeof value.content !== "object" || Array.isArray(value.content) : typeof value.content !== "string")) throw contract.error("INVALID_RESPONSE", "provider");
    return contract.result(value.content, value.usage == null ? null : contract.usage(value.usage.inputTokens, value.usage.outputTokens, value.usage.totalTokens));
  }

  return Object.freeze({
    name, model: selectedModel, configured: Boolean(apiKey),
    classify: (request, options) => invoke("classify", request, options),
    generateReply: (request, options) => invoke("generateReply", request, options),
    check: () => instance.check()
  });
}

module.exports = { createModelGateway };

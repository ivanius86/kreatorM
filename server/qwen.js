"use strict";
const provider = require("./ai-provider.js");
const { error } = provider;

const DEFAULT_MODEL = "qwen-plus";
const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

function endpointFor(value) {
  let url;
  try { url = new URL(value); } catch (_) { throw error("INVALID_REQUEST"); }
  const hostname = url.hostname.toLowerCase();
  const official = ["dashscope-intl.aliyuncs.com", "dashscope.aliyuncs.com", "dashscope-us.aliyuncs.com", "cn-hongkong.dashscope.aliyuncs.com"].includes(hostname)
    || /^[a-z0-9-]+\.(?:ap-southeast-1|us-east-1|cn-beijing|cn-hongkong|eu-central-1|ap-northeast-1)\.maas\.aliyuncs\.com$/.test(hostname);
  if (!official || url.protocol !== "https:" || url.port || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== "/compatible-mode/v1") throw error("INVALID_REQUEST");
  return url.origin + "/compatible-mode/v1/chat/completions";
}

function upstreamError(status, payload) {
  const code = String(payload?.error?.code || payload?.code || "");
  if (status === 429) return error("QUOTA", "upstream-http", status);
  if (status === 401 || status === 403 || /(?:invalid.?api.?key|authentication|unauthorized)/i.test(code)) return error("INVALID_API_KEY", "upstream-http", status);
  if (status === 404) return error("MODEL_UNAVAILABLE", "upstream-http", status);
  if (status === 408 || status === 504) return error("TIMEOUT", "upstream-http", status);
  if (status === 400) return error("INVALID_RESPONSE", "upstream-http", status);
  return error("NETWORK", "upstream-http", status);
}

function createQwen({ apiKey, model = DEFAULT_MODEL, baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 75000 } = {}) {
  if (typeof model !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}$/.test(model)) throw error("MODEL_UNAVAILABLE");
  const endpoint = endpointFor(baseUrl);
  const hybridThinking = /^qwen3(?:[.-]|$)/i.test(model.split("/").at(-1));

  async function call({ instructions, messages, schema, maxOutputTokens, temperature }, { signal } = {}) {
    if (!apiKey) throw error("MISSING_API_KEY");
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", abort, { once: true });
    }
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const system = schema ? instructions + "\nReturn only JSON matching this schema: " + JSON.stringify(schema) : instructions;
      const body = {
        model,
        messages: [{ role: "system", content: system }, ...messages.map(message => ({ role: message.role, content: message.text }))],
        stream: false,
        max_tokens: maxOutputTokens,
        temperature,
        ...(hybridThinking ? { enable_thinking: false } : {}),
        ...(schema ? { response_format: { type: "json_object" } } : {})
      };
      const response = await fetchImpl(endpoint, {
        method: "POST", redirect: "error",
        headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal
      });
      const raw = await response.text();
      if (raw.length > 262144) throw error("INVALID_RESPONSE", "upstream-size");
      let payload;
      try { payload = JSON.parse(raw); } catch (_) { throw error(response.ok ? "INVALID_RESPONSE" : "NETWORK", "upstream-json", response.status); }
      if (!response.ok) throw upstreamError(response.status, payload);
      const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
      if (choice?.finish_reason === "content_filter") throw error("BLOCKED");
      if (!choice || choice.finish_reason !== "stop" || typeof choice.message?.content !== "string") throw error("INVALID_RESPONSE", "candidate-finish");
      const content = choice.message.content.trim();
      if (!content || content.length > 120000) throw error("INVALID_RESPONSE", "candidate-text");
      let value = content;
      if (schema) {
        try { value = JSON.parse(content); } catch (_) { throw error("INVALID_RESPONSE", "generated-json"); }
      }
      return provider.result(value, provider.usage(payload.usage?.prompt_tokens, payload.usage?.completion_tokens, payload.usage?.total_tokens));
    } catch (cause) {
      if (timedOut) throw error("TIMEOUT");
      if (cause && ["MISSING_API_KEY", "INVALID_API_KEY", "QUOTA", "NETWORK", "TIMEOUT", "MODEL_UNAVAILABLE", "BLOCKED", "INVALID_RESPONSE"].includes(cause.code)) throw cause;
      throw error("NETWORK", "transport");
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", abort);
    }
  }

  async function classify({ instruction, command, latest, schema }, options = {}) {
    return call({ instructions: instruction, messages: [{ role: "user", text: JSON.stringify({ command, latest }) }], schema, maxOutputTokens: 600, temperature: 0 }, options);
  }
  async function generateReply(request, options = {}) { return call(request, options); }
  async function check() {
    await generateReply({ instructions: "You are Mentor. Reply in plain English text.", messages: [{ role: "user", text: "Ask one brief question about learning a skill." }], schema: null, maxOutputTokens: 100, temperature: 0.4 });
    return { ok: true, model };
  }
  return { classify, generateReply, check };
}

module.exports = { createQwen, DEFAULT_MODEL, DEFAULT_BASE_URL };

"use strict";
const provider = require("./ai-provider.js");
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models/";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const { error } = provider;
function upstreamError(status, payload) {
  const providerCode = payload && payload.error && payload.error.status;
  if (status === 429 || providerCode === "RESOURCE_EXHAUSTED") return error("QUOTA", "upstream-http", status);
  if (status === 401 || status === 403 || providerCode === "UNAUTHENTICATED" || providerCode === "PERMISSION_DENIED") return error("INVALID_API_KEY", "upstream-http", status);
  if (status === 400 && payload && payload.error && (payload.error.details || []).some(item => item.reason === "API_KEY_INVALID")) return error("INVALID_API_KEY", "upstream-http", status);
  if (status === 404) return error("MODEL_UNAVAILABLE", "upstream-http", status);
  if (status === 400) return error("INVALID_RESPONSE", "upstream-http", status);
  return error("NETWORK", "upstream-http", status);
}
function createGemini({ apiKey, model = DEFAULT_MODEL, fetchImpl = globalThis.fetch, timeoutMs = 75000 } = {}) {
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw error("MODEL_UNAVAILABLE");
  async function call(suffix, body, parentSignal, schemaFallback = false) {
    if (!apiKey) throw error("MISSING_API_KEY");
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (parentSignal) {
      if (parentSignal.aborted) controller.abort();
      else parentSignal.addEventListener("abort", abort, { once: true });
    }
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(API_ROOT + encodeURIComponent(model) + suffix, {
        method: body ? "POST" : "GET", headers: { "x-goog-api-key": apiKey, ...(body ? { "content-type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal
      });
      const raw = await response.text();
      if (raw.length > 262144) throw error("INVALID_RESPONSE", "upstream-size");
      let payload;
      try { payload = JSON.parse(raw); } catch (_) { throw error(response.ok ? "INVALID_RESPONSE" : "NETWORK", "upstream-json", response.status); }
      if (!response.ok) {
        const cause = upstreamError(response.status, payload);
        if (schemaFallback && response.status === 400 && cause.code === "INVALID_RESPONSE" && body?.generationConfig?.responseJsonSchema) {
          // A rejected schema produced no generation. Retry once in JSON mode;
          // the same strict application validator and authorization policy remain mandatory.
          const { responseJsonSchema, ...generationConfig } = body.generationConfig;
          const instruction = "Return exactly this JSON structure, without Markdown: " + JSON.stringify(responseJsonSchema);
          return call(suffix, { ...body, systemInstruction: { parts: [...body.systemInstruction.parts, { text: instruction }] }, generationConfig }, parentSignal, false);
        }
        throw cause;
      }
      return payload;
    } catch (cause) {
      if (timedOut) throw error("TIMEOUT");
      if (cause && ["MISSING_API_KEY", "INVALID_API_KEY", "QUOTA", "NETWORK", "MODEL_UNAVAILABLE", "INVALID_RESPONSE"].includes(cause.code)) throw cause;
      throw error("NETWORK", "transport");
    } finally {
      clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener("abort", abort);
    }
  }
  function contentText(payload) {
    if (payload?.promptFeedback?.blockReason) throw error("BLOCKED");
    const candidate = Array.isArray(payload?.candidates) && payload.candidates[0];
    if (candidate && ["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "RECITATION", "SPII", "IMAGE_SAFETY"].includes(candidate.finishReason)) throw error("BLOCKED");
    if (!candidate || candidate.finishReason !== "STOP" || !candidate.content || !Array.isArray(candidate.content.parts)) throw error("INVALID_RESPONSE", "candidate-finish");
    const text = candidate.content.parts.filter(part => !part.thought && typeof part.text === "string").map(part => part.text).join("");
    if (!text.trim() || text.length > 120000) throw error("INVALID_RESPONSE", "candidate-text");
    return text;
  }
  function decode(payload) {
    try { return JSON.parse(contentText(payload)); } catch (cause) {
      if (cause?.code) throw cause;
      throw error("INVALID_RESPONSE", "generated-json");
    }
  }
  function usage(payload) {
    const value = payload?.usageMetadata;
    return provider.usage(value?.promptTokenCount, value?.candidatesTokenCount, value?.totalTokenCount);
  }
  async function classify({ instruction, command, latest, schema }, { signal } = {}) {
    const payload = await call(":generateContent", {
      systemInstruction: { parts: [{ text: instruction }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify({ command, latest }) }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, maxOutputTokens: 600, temperature: 0 }
    }, signal);
    return provider.result(decode(payload), usage(payload));
  }
  async function generateReply({ instructions, messages, schema, maxOutputTokens, temperature }, { signal } = {}) {
    const payload = await call(":generateContent", {
      systemInstruction: { parts: [{ text: instructions }] },
      contents: messages.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.text }] })),
      generationConfig: schema ? { responseMimeType: "application/json", responseJsonSchema: schema, maxOutputTokens, temperature } : { maxOutputTokens, temperature }
    }, signal, Boolean(schema));
    return provider.result(schema ? decode(payload) : contentText(payload), usage(payload));
  }
  async function check() {
    const info = await call("", null);
    if (!Array.isArray(info.supportedGenerationMethods) || !info.supportedGenerationMethods.includes("generateContent")) throw error("MODEL_UNAVAILABLE");
    await generateReply({
      instructions: "You are Mentor, a thoughtful, practical personal mentor. Reply in English. Reply directly in plain text.",
      messages: [{ role: "user", text: "Help me pick one small step toward learning a new skill. Ask one brief question. Do not propose a goal yet." }],
      schema: null, maxOutputTokens: 3072, temperature: 0.4
    });
    return { ok: true, model };
  }
  return { classify, generateReply, check };
}
module.exports = { createGemini, DEFAULT_MODEL };

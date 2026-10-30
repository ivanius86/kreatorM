"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createModelGateway } = require("../../server/model-gateway.js");
const { createMentorCore } = require("../../server/mentor-core.js");
const { createServer } = require("../../server.js");
const protocol = require("../../js/mentor/mentor-protocol.js");

const qwenReply = (content, options = {}) => new Response(JSON.stringify({
  choices: [{ finish_reason: options.finishReason || "stop", message: { role: "assistant", content } }],
  ...(options.usage ? { usage: options.usage } : {})
}), { status: options.status || 200 });
const geminiReply = (content, usageMetadata) => new Response(JSON.stringify({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text: content }] } }],
  ...(usageMetadata ? { usageMetadata } : {})
}));
const request = (text = "Help me choose one priority.", extra = {}) => ({ requestId: "gateway-request-0001", language: "en", messages: [{ id: "gateway-user-1", role: "user", text }], goalContext: null, ...extra });
const recipeSources = { discover: async () => [], get: () => null };

async function serverFixture(t, options) {
  const server = createServer(options);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const post = (value, id) => fetch(origin + "/api/mentor/chat", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ ...value, requestId: id || value.requestId }) });
  return { origin, post };
}

test("gateway selects Gemini by default and normalizes token usage without exposing it to chat", async t => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return geminiReply("A short reply.", { promptTokenCount: 12, candidatesTokenCount: 5, totalTokenCount: 17 }); };
  const gateway = createModelGateway({ apiKey: "gemini-private-key", fetchImpl });
  assert.equal(gateway.name, "gemini"); assert.equal(gateway.configured, true);
  const direct = await gateway.generateReply({ instructions: "Test", messages: [{ role: "user", text: "Hi" }], schema: null, maxOutputTokens: 30, temperature: 0 });
  assert.deepEqual(direct, { content: "A short reply.", usage: { inputTokens: 12, outputTokens: 5, totalTokens: 17 } });
  assert.equal(calls[0].init.headers["x-goog-api-key"], "gemini-private-key");
  const app = await serverFixture(t, { apiKey: "gemini-private-key", fetchImpl });
  const response = await (await app.post(request())).json();
  assert.equal(response.reply, "A short reply.");
  assert.equal(response.usage, undefined);
  assert.ok(!JSON.stringify(response).includes("gemini-private-key"));
  assert.deepEqual(await (await fetch(app.origin + "/api/mentor/status")).json(), { configured: true });
});

test("Qwen maps the same Core prompt to official chat endpoint and keeps usage server-side", async t => {
  let sent;
  const fetchImpl = async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return qwenReply("A short reply.", { usage: { prompt_tokens: 13, completion_tokens: 4, total_tokens: 17 } }); };
  const gateway = createModelGateway({ name: "qwen", model: "qwen-plus", apiKey: "qwen-private-key", fetchImpl });
  const direct = await gateway.generateReply({ instructions: "Test", messages: [{ role: "user", text: "Hi" }], schema: null, maxOutputTokens: 30, temperature: 0 });
  assert.deepEqual(direct, { content: "A short reply.", usage: { inputTokens: 13, outputTokens: 4, totalTokens: 17 } });
  assert.equal(sent.url, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
  assert.equal(sent.init.headers.authorization, "Bearer qwen-private-key");
  assert.equal(sent.body.model, "qwen-plus");
  assert.deepEqual(sent.body.messages, [{ role: "system", content: "Test" }, { role: "user", content: "Hi" }]);
  const app = await serverFixture(t, { providerName: "qwen", model: "qwen-plus", qwenApiKey: "qwen-private-key", apiKey: "unused-gemini-key", fetchImpl });
  const response = await (await app.post(request())).json();
  assert.equal(response.reply, "A short reply."); assert.equal(response.usage, undefined);
  assert.ok(!JSON.stringify(response).includes("qwen-private-key"));
  assert.deepEqual(await (await fetch(app.origin + "/api/mentor/status")).json(), { configured: true });
});

test("Qwen3 hybrid models disable thinking before JSON action generation", async () => {
  const bodies = [];
  const gateway = createModelGateway({ name: "qwen", model: "qwen3.5-plus", apiKey: "test", fetchImpl: async (_url, init) => { bodies.push(JSON.parse(init.body)); return qwenReply(JSON.stringify({ evidence: "Create one idea", requests: [{ action: "createIdea", count: 1 }] })); } });
  const schema = { type: "object", properties: { evidence: { type: "string" }, requests: { type: "array" } }, required: ["evidence", "requests"] };
  const result = await gateway.classify({ instruction: "Classify", command: "Create one idea", latest: "Create one idea", schema });
  assert.equal(result.content.evidence, "Create one idea");
  assert.equal(bodies[0].enable_thinking, false);
  assert.equal(bodies[0].response_format.type, "json_object");
  assert.ok(bodies[0].messages[0].content.includes("JSON"));
});

test("Qwen sends no extra private context compared with Gemini", async () => {
  let geminiBody, qwenBody;
  const input = request("Help me prioritize.", { unrelatedPrivateData: { secret: "never-send" } });
  input.messages[0].privateNote = "never-send";
  const gemini = createMentorCore({ provider: createModelGateway({ name: "gemini", apiKey: "test", fetchImpl: async (_url, init) => { geminiBody = JSON.parse(init.body); return geminiReply("Fine."); } }), recipeSources });
  const qwen = createMentorCore({ provider: createModelGateway({ name: "qwen", apiKey: "test", fetchImpl: async (_url, init) => { qwenBody = JSON.parse(init.body); return qwenReply("Fine."); } }), recipeSources });
  await gemini.generate(input); await qwen.generate(input);
  assert.equal(qwenBody.messages[0].content, geminiBody.systemInstruction.parts[0].text);
  assert.deepEqual(qwenBody.messages.slice(1).map(item => item.content), geminiBody.contents.map(item => item.parts[0].text));
  assert.ok(!JSON.stringify(qwenBody).includes("never-send"));
});

test("Qwen structured action output still passes Mentor Core authorization and frontend protocol", async t => {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body); calls.push(body);
    if (calls.length === 1) return qwenReply(JSON.stringify({ evidence: "Create one idea", requests: [{ action: "createIdea", count: 1 }] }));
    return qwenReply(JSON.stringify({ reply: "Review", ideas: [{ action: "createIdea", title: "Try it", description: "A small idea", type: "creative", priority: "medium", tags: [] }], goals: [{ action: "createGoal", title: "Not authorized", type: "habit", category: "Personal Growth", targetDate: null, tasks: [], milestones: [] }] }));
  };
  const app = await serverFixture(t, { providerName: "qwen", qwenApiKey: "test", fetchImpl });
  const response = await (await app.post(request("Create one idea"))).json();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].response_format.type, "json_object"); assert.equal(calls[1].response_format.type, "json_object");
  assert.deepEqual(response.proposals.map(item => item.action), ["createIdea"]);
  assert.equal(response.proposals[0].authorizationId, response.intent.id);
  assert.deepEqual(protocol.validateResponse(response), response);
});

test("Qwen meal proposal uses the same existing Core action and saved-recipe constraint", async t => {
  let calls = 0;
  const fetchImpl = async () => ++calls === 1
    ? qwenReply(JSON.stringify({ evidence: "Create one meal", requests: [{ action: "createMealPlanEntry", count: 1 }] }))
    : qwenReply(JSON.stringify({ reply: "Review", mealPlanEntries: [{ action: "createMealPlanEntry", recipeId: "saved-recipe-1", plannedDate: "2028-01-15", mealType: "dinner", servings: 1 }] }));
  const app = await serverFixture(t, { providerName: "qwen", qwenApiKey: "test", fetchImpl });
  const response = await (await app.post(request("Create one meal", { recipeContext: [{ id: "saved-recipe-1", name: "Existing", servings: 1, mealType: "dinner" }] }))).json();
  assert.equal(calls, 2);
  assert.deepEqual(response.proposals.map(item => item.action), ["createMealPlanEntry"]);
  assert.equal(response.proposals[0].recipeId, "saved-recipe-1");
  assert.deepEqual(protocol.validateResponse(response), response);
});

test("Qwen malformed, incomplete, filtered and invalid action responses are safe failures", async t => {
  const bad = [
    { response: new Response(JSON.stringify({ choices: [] })), code: "INVALID_RESPONSE" },
    { response: qwenReply("partial", { finishReason: "length" }), code: "INVALID_RESPONSE" },
    { response: qwenReply("filtered", { finishReason: "content_filter" }), code: "BLOCKED" },
    { response: new Response("not json"), code: "INVALID_RESPONSE" }
  ];
  for (const [index, item] of bad.entries()) {
    const app = await serverFixture(t, { providerName: "qwen", qwenApiKey: "test", fetchImpl: async () => item.response.clone() });
    const response = await (await app.post(request(), "gateway-bad-" + index)).json();
    assert.deepEqual(response, { error: { code: item.code } });
  }
  let calls = 0;
  const app = await serverFixture(t, { providerName: "qwen", qwenApiKey: "test", fetchImpl: async () => ++calls === 1
    ? qwenReply(JSON.stringify({ evidence: "Create one idea", requests: [{ action: "createIdea", count: 1 }] }))
    : qwenReply("not json") });
  assert.deepEqual(await (await app.post(request("Create one idea"), "gateway-bad-action")).json(), { error: { code: "INVALID_RESPONSE" } });
});

test("Qwen key errors, timeout and rate limit do not fall back to Gemini", async t => {
  const missing = await serverFixture(t, { providerName: "qwen", qwenApiKey: "", apiKey: "configured-gemini", fetchImpl: async () => { throw new Error("must not call Gemini"); } });
  assert.deepEqual(await (await fetch(missing.origin + "/api/mentor/status")).json(), { configured: false });
  assert.deepEqual(await (await missing.post(request())).json(), { error: { code: "MISSING_API_KEY" } });
  const wrong = await serverFixture(t, { providerName: "qwen", qwenApiKey: "wrong", fetchImpl: async () => new Response(JSON.stringify({ error: { code: "InvalidApiKey", message: "private" } }), { status: 401 }) });
  assert.deepEqual(await (await wrong.post(request())).json(), { error: { code: "INVALID_API_KEY" } });
  let aborted = false;
  const slow = await serverFixture(t, { providerName: "qwen", qwenApiKey: "test", timeoutMs: 20, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => { aborted = true; reject(new Error("private")); })) });
  assert.deepEqual(await (await slow.post(request())).json(), { error: { code: "TIMEOUT" } }); assert.equal(aborted, true);
  let calls = 0;
  const limited = await serverFixture(t, { providerName: "qwen", qwenApiKey: "test", fetchImpl: async () => { calls++; return qwenReply("Fine."); } });
  for (let index = 0; index < 12; index++) assert.equal((await limited.post(request(), "gateway-rate-" + index)).status, 200);
  assert.deepEqual(await (await limited.post(request(), "gateway-rate-last")).json(), { error: { code: "BUSY" } });
  assert.equal(calls, 12);
});

test("gateway rejects unsupported provider and non-official Qwen endpoints before sending a key", () => {
  assert.throws(() => createModelGateway({ name: "other", apiKey: "test" }), { code: "INVALID_REQUEST" });
  assert.throws(() => createModelGateway({ name: "qwen", apiKey: "test", baseUrl: "http://localhost:8000/compatible-mode/v1" }), { code: "INVALID_REQUEST" });
  assert.throws(() => createModelGateway({ name: "qwen", apiKey: "test", baseUrl: "https://evil.example/compatible-mode/v1" }), { code: "INVALID_REQUEST" });
  assert.equal(createModelGateway({ name: "qwen", apiKey: "test", baseUrl: "https://dashscope-us.aliyuncs.com/compatible-mode/v1" }).name, "qwen");
});

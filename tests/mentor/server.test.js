"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createServer } = require("../../server.js");
const { createGemini, DEFAULT_MODEL } = require("../../server/gemini.js");
const protocol = require("../../js/mentor/mentor-protocol.js");
const request = (id = "request-0001") => ({ requestId: id, language: "en", messages: [{ role: "user", text: "Help me choose a goal." }], goalContext: null });
const success = value => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value || { reply: "What would you like to change?", proposal: null }) }] } }] }), { status: 200 });
async function fixture(t, options = {}) {
  const server = createServer({ apiKey: "test-secret-never-return", fetchImpl: async () => success(), ...options });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const post = (value, extra = {}) => fetch(origin + "/api/mentor/chat", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value), ...extra });
  return { server, origin, post };
}
test("protocol validates allowlisted proposals and real dates", () => {
  assert.equal(DEFAULT_MODEL, "gemini-3.1-flash-lite");
  const proposal = protocol.validateProposal({ action: "createGoal", title: "Learn", type: "habit", category: "Personal Growth", targetDate: "2028-02-29", tasks: [{ title: "Read", cadence: "Daily", arbitrary: "ignored" }], storage: "forbidden" });
  assert.equal(proposal.priority, "medium"); assert.equal(proposal.reason, ""); assert.deepEqual(proposal.milestones, []);
  assert.equal(proposal.storage, undefined); assert.equal(proposal.tasks[0].arbitrary, undefined);
  assert.throws(() => protocol.validateProposal({ ...proposal, action: "deleteAll" }), { code: "INVALID_RESPONSE" });
  assert.throws(() => protocol.validateProposal({ ...proposal, targetDate: "2027-02-29" }), { code: "INVALID_RESPONSE" });
});
test("protocol keeps newest complete context and rejects oversized or invalid messages", () => {
  const history = [];
  for (let index = 0; index < 20; index++) history.push({ role: "user", text: "u" + index }, { role: "assistant", text: "a" + index });
  history.push({ role: "user", text: "latest" });
  const limited = protocol.limitContext(history);
  assert.equal(limited.length, 23); assert.equal(limited[0].role, "user"); assert.equal(limited.at(-1).text, "latest");
  assert.deepEqual(protocol.validateRequest({ ...request(), messages: limited }).messages, limited);
  assert.throws(() => protocol.validateRequest({ ...request(), messages: [{ role: "user", text: "x".repeat(4001) }] }), { code: "INVALID_REQUEST" });
  assert.throws(() => protocol.validateRequest({ ...request(), language: "de" }), { code: "INVALID_REQUEST" });
  assert.throws(() => protocol.validateRequest({ ...request(), messages: [{ role: "assistant", text: "orphan" }] }), { code: "INVALID_REQUEST" });
});
test("status reveals only configuration and missing key returns safe code", async t => {
  const app = await fixture(t, { apiKey: "" });
  assert.deepEqual(await (await fetch(app.origin + "/api/mentor/status")).json(), { configured: false });
  assert.deepEqual(await (await app.post(request())).json(), { error: { code: "MISSING_API_KEY" } });
});

test("food source endpoints enforce origin and signed complete-profile approval without allowing arbitrary URLs", async t => {
  let sourceCalls = 0;
  const food = { fdcId: 170000, description: "Onions, raw", dataType: "SR Legacy", foodNutrients: [{ nutrient: { id: 1003, unitName: "g" }, amount: 1.1 }] };
  const app = await fixture(t, { apiKey: "", fetchImpl: async url => { sourceCalls++; assert.ok(url.startsWith("https://api.nal.usda.gov/fdc/v1/")); return Response.json(url.includes("foods/search") ? { foods: [food] } : food); } });
  const foodPost = (operation, value, origin = app.origin) => fetch(app.origin + "/api/mentor/foods/" + operation, { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(value) });
  assert.equal((await foodPost("search", { text: "onion" }, null)).status, 403);
  assert.equal((await foodPost("details", { id: "https://example.com/" })).status, 400);
  assert.equal(sourceCalls, 0);
  const search = await (await foodPost("search", { text: "onion raw" })).json(); assert.equal(search.candidates[0].id, "170000");
  const proposal = await (await foodPost("details", { id: "170000" })).json(); assert.equal(proposal.snapshot.nutrients.length, 45);
  const verified = await (await foodPost("verify", { token: proposal.token })).json(); assert.deepEqual(verified, proposal.snapshot);
  const tampered = await foodPost("verify", { token: proposal.token.slice(0, -3) + "abc" }); assert.equal(tampered.status, 502);
  assert.deepEqual(await tampered.json(), { error: { code: "FOOD_PROPOSAL_EXPIRED" } });
  assert.equal(sourceCalls, 2);
});

test("food USDA quota endpoint returns the source and sanitized retry delay without calling Gemini", async t => {
  let calls = 0;
  const app = await fixture(t, { fetchImpl: async url => {
    calls++; assert.ok(url.startsWith("https://api.nal.usda.gov/"));
    return new Response("private upstream payload", { status: 429, headers: { "retry-after": "90" } });
  } });
  const response = await fetch(app.origin + "/api/mentor/foods/search", { method: "POST", headers: { origin: app.origin, "content-type": "application/json" }, body: JSON.stringify({ text: "pršuta" }) });
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: { code: "FOOD_USDA_QUOTA", source: "usda", retryAfterSeconds: 90 } });
  assert.equal(calls, 1);
});
test("same-origin JSON proxy uses header key and strips unrelated data", async t => {
  let sent;
  const app = await fixture(t, { fetchImpl: async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return success(); } });
  const input = { ...request(), financialData: { private: true } };
  input.messages[0].unrelated = "secret-private-data";
  const response = await app.post(input);
  assert.equal(response.status, 200); const result = await response.json(); assert.equal(result.proposal, null);
  assert.equal(sent.init.headers["x-goog-api-key"], "test-secret-never-return");
  assert.ok(!sent.url.includes("test-secret")); assert.ok(!JSON.stringify(sent.body).includes("secret-private-data"));
  assert.equal(sent.body.generationConfig.maxOutputTokens, 3072);
  assert.ok(!JSON.stringify(result).includes("test-secret"));
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
test("cross-origin, missing origin, invalid Host and non-JSON requests are rejected", async t => {
  let calls = 0; const app = await fixture(t, { fetchImpl: async () => { calls++; return success(); } });
  for (const headers of [{ "content-type": "application/json" }, { origin: "https://evil.invalid", "content-type": "application/json" }]) {
    assert.equal((await app.post(request(), { headers })).status, 403);
  }
  const invalidHost = await new Promise((resolve, reject) => {
    const outgoing = http.request(app.origin + "/api/mentor/status", { headers: { host: "evil.invalid" } }, incoming => { incoming.resume(); resolve(incoming.statusCode); });
    outgoing.on("error", reject); outgoing.end();
  });
  assert.equal(invalidHost, 403);
  assert.equal((await app.post(request(), { headers: { origin: app.origin, "content-type": "text/plain" } })).status, 400);
  assert.equal(calls, 0);
});
test("static allowlist protects environment, server, tests, dependencies and traversal", async t => {
  const app = await fixture(t);
  for (const pathname of ["/.env", "/.env.example", "/server.js", "/server/gemini.js", "/tests/mentor/server.test.js", "/package.json", "/node_modules/dexie/package.json", "/js/%2e%2e/.env", "/js/%2e%2e%5cserver.js", "/.git/config"]) {
    assert.equal((await fetch(app.origin + pathname)).status, 404, pathname);
  }
  assert.equal((await fetch(app.origin + "/")).status, 200);
  assert.equal((await fetch(app.origin + "/js/mentor/mentor-protocol.js")).status, 200);
  assert.equal((await fetch(app.origin + "/icons/flag-serbia.svg")).status, 200);
});
test("duplicate in-flight and completed requests cost one generation; changed body conflicts", async t => {
  let calls = 0; let release;
  const gate = new Promise(resolve => { release = resolve; });
  const app = await fixture(t, { fetchImpl: async () => { calls++; await gate; return success(); } });
  const first = app.post(request()); const second = app.post(request());
  await new Promise(resolve => setTimeout(resolve, 35)); release();
  assert.equal((await first).status, 200); assert.equal((await second).status, 200);
  assert.equal((await app.post(request())).status, 200); assert.equal(calls, 1);
  const conflict = await app.post({ ...request(), language: "sr" });
  assert.deepEqual(await conflict.json(), { error: { code: "INVALID_REQUEST" } });
});
test("upstream errors never expose provider payload or credentials", async t => {
  for (const [status, body, code] of [[429, { error: { message: "secret raw upstream" } }, "QUOTA"], [403, { error: { message: "secret raw upstream" } }, "INVALID_API_KEY"], [404, {}, "MODEL_UNAVAILABLE"], [400, { error: { details: [{ reason: "API_KEY_INVALID" }] } }, "INVALID_API_KEY"]]) {
    const app = await fixture(t, { fetchImpl: async () => new Response(JSON.stringify(body), { status }) });
    assert.deepEqual(await (await app.post(request())).json(), { error: { code } });
  }
});
test("blocked and truncated responses are safe errors; plain chat accepts text", async t => {
  for (const [payload, code] of [[{ promptFeedback: { blockReason: "SAFETY" } }, "BLOCKED"], [{ candidates: [{ finishReason: "SAFETY" }] }, "BLOCKED"], [{ candidates: [{ finishReason: "MAX_TOKENS" }] }, "INVALID_RESPONSE"]]) {
    const app = await fixture(t, { fetchImpl: async () => new Response(JSON.stringify(payload)) });
    assert.deepEqual(await (await app.post(request())).json(), { error: { code } });
  }
  const plain = await fixture(t, { fetchImpl: async () => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not json" }] } }] })) });
  assert.equal((await (await plain.post(request())).json()).reply, "not json");
});

test("malformed structured action response is rejected", async t => {
  let calls = 0;
  const app = await fixture(t, { fetchImpl: async () => ++calls === 1 ? success({ evidence: "Create one goal", requests: [{ action: "createGoal", count: 1 }] }) : new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not json" }] } }] })) });
  assert.deepEqual(await (await app.post({ ...request("structured-1"), messages: [{ role: "user", text: "Create one goal" }] })).json(), { error: { code: "INVALID_RESPONSE" } });
  assert.equal(calls, 2);
});
test("timeout aborts provider and network failures return safe errors", async t => {
  let aborted = false;
  const app = await fixture(t, { timeoutMs: 20, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => { aborted = true; reject(new Error("private failure")); })) });
  assert.deepEqual(await (await app.post(request())).json(), { error: { code: "TIMEOUT" } }); assert.equal(aborted, true);
  const offline = await fixture(t, { fetchImpl: async () => { throw new Error("private network failure"); } });
  assert.deepEqual(await (await offline.post(request())).json(), { error: { code: "NETWORK" } });
});
test("rate and simultaneous generation caps apply before provider cost", async t => {
  let calls = 0; const app = await fixture(t, { fetchImpl: async () => { calls++; return success(); } });
  for (let index = 0; index < 12; index++) assert.equal((await app.post(request("ratelimit-" + index))).status, 200);
  assert.deepEqual(await (await app.post(request("ratelimit-last"))).json(), { error: { code: "BUSY" } }); assert.equal(calls, 12);
  let release; const gate = new Promise(resolve => { release = resolve; });
  const busy = await fixture(t, { fetchImpl: async () => { await gate; return success(); } });
  const one = busy.post(request("parallel-one")); const two = busy.post(request("parallel-two"));
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.deepEqual(await (await busy.post(request("parallel-three"))).json(), { error: { code: "BUSY" } });
  release(); await one; await two;
});
test("manual diagnostic verifies getModel and actual structured generation with synthetic context", async () => {
  const calls = [];
  const provider = createGemini({ apiKey: "test", fetchImpl: async (url, init) => { calls.push({ url, init }); return init.method === "GET" ? new Response(JSON.stringify({ supportedGenerationMethods: ["generateContent"] })) : success(); } });
  assert.equal((await provider.check()).ok, true); assert.equal(calls.length, 2);
  assert.equal(calls[0].init.method, "GET"); assert.equal(calls[1].init.method, "POST");
  assert.equal(JSON.parse(calls[1].init.body).contents.length, 1);
});

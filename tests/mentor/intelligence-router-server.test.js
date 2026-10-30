"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../../server.js");
const geminiReply = value => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] }));

async function fixture(t, reply = { capabilityId: "nutrition.recipe.search" }) {
  const calls = [];
  const server = createServer({ apiKey: "test-key-only", fetchImpl: async (_, options) => { calls.push(JSON.parse(options.body)); return geminiReply(reply); } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const post = (value, options = {}) => fetch(origin + "/api/mentor/route", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value), ...options });
  return { post, calls };
}

test("ambiguous read classification uses Gemini through Mentor Core with only the latest question", async t => {
  const f = await fixture(t);
  const response = await f.post({ text: "Pogledaj recept i zalihe?" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { capabilityId: "nutrition.recipe.search" });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].contents.length, 1);
  assert.deepEqual(JSON.parse(f.calls[0].contents[0].parts[0].text), { command: "Pogledaj recept i zalihe?", latest: "Pogledaj recept i zalihe?" });
  assert.equal(JSON.stringify(f.calls[0]).includes("inventoryBatchId"), false);
});

test("route rejects unrelated private fields, cross-origin requests and unexpected model capabilities", async t => {
  const f = await fixture(t, { capabilityId: "nutrition.inventory.delete" });
  assert.equal((await f.post({ text: "What is in my pantry?", inventory: [{ quantity: 99 }] })).status, 400);
  assert.equal((await f.post({ text: "What is in my pantry?" }, { headers: { origin: "http://evil.example", "content-type": "application/json" } })).status, 403);
  assert.equal(f.calls.length, 0);
  const response = await f.post({ text: "What is in my pantry?" });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: { code: "INVALID_RESPONSE" } });
});

test("ambiguous inventory write is classified without sending local catalog or batch data", async t => {
  const f = await fixture(t, { capabilityId: "nutrition.inventory.restock" });
  const response = await f.post({ text: "Dopuni postojeće zalihe mleka" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { capabilityId: "nutrition.inventory.restock" });
  assert.equal(f.calls.length, 1);
  assert.deepEqual(JSON.parse(f.calls[0].contents[0].parts[0].text), { command: "Dopuni postojeće zalihe mleka", latest: "Dopuni postojeće zalihe mleka" });
});

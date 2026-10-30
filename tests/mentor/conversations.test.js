const test = require("node:test");
const assert = require("node:assert/strict");
const Dexie = require("dexie");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");
const protocol = require("../../js/mentor/mentor-protocol.js");
const Repository = require("../../js/mentor/mentor-conversations.repository.js");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
global.MentorChatProtocol = protocol;
let count = 0;
async function fixture(run, options = {}) {
  const repo = await new Repository({ Dexie, indexedDB, IDBKeyRange, databaseName: "mentor-test-" + ++count, ...options }).initialize();
  try { await run(repo); } finally { await repo.db.delete(); }
}
const reply = { reply: "What would success look like?", proposal: null };

test("missing-food recovery binds the stored current recipe and cannot apply a raw/cooked choice in place", async () => {
  await fixture(async repo => {
    const conversation = await repo.create(), user = await repo.reserve(conversation.id, "owner", { text: "Create one recipe" });
    const recipe = { id: "missing-recipe", action: "createRecipe", name: "Beans", description: "1. Cook.\n2. Serve.", servings: 1, mealType: "lunch", sourceId: "catalog", adapted: true, adaptationNote: "Use available foods.", ingredients: [{ foodId: "missing:beans", name: "Cooked beans", quantity: 500, unit: "g" }], unresolved: ["missing"], resolutionRequests: [{ kind: "missing", sourceIndex: null, targetIndex: 0, name: "Cooked beans", sourceMeasure: "", quantity: 500, unit: "g", issue: "missing", candidates: [{ id: "dry-beans", name: "Dry beans" }] }] };
    const assistant = await repo.complete(conversation.id, user.id, "owner", { reply: "Choose", proposals: [recipe], intent: null });
    await assert.rejects(repo.setRecipeChoice(assistant.id, recipe.id, 0, "dry-beans"), { code: "INVALID_REQUEST" });
    const binding = { kind: "recipe-food", messageId: assistant.id, actionId: recipe.id, requestIndex: 0, foodId: "dry-beans" };
    await assert.rejects(repo.reserve(conversation.id, "owner", { text: "Create a replacement recipe", localChoice: { ...binding, foodId: "invented" } }), { code: "STALE_REQUEST" });
    const replacement = await repo.reserve(conversation.id, "owner", { text: "Create a replacement recipe with dry beans", localChoice: binding });
    await repo.release(conversation.id, replacement.id, "owner");
    await assert.rejects(repo.reserve(conversation.id, "owner", { text: "Create another replacement", localChoice: binding }), { code: "STALE_REQUEST" });
    const stored = await repo.getMessage(assistant.id); assert.equal(stored.proposals[0].ingredients[0].foodId, "missing:beans"); assert.equal(Object.keys(stored.actionStates).length, 0);
  });
});

test("choice reservation atomically binds message, task version and pending question, including safe retry", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "owner", { text: "Dodaj jaja i hleb", localOnly: true });
    const task = await repo.setActiveTask(conversation.id, { id: "choice-task", status: "collecting", pendingItemId: "bread", items: [{ id: "bread" }] }, null);
    const assistant = await repo.complete(conversation.id, user.id, "owner", reply, { localOnly: true, writeTask: task });
    const binding = { kind: "write", messageId: assistant.id, taskId: task.id, taskVersion: task.version, questionId: "bread" };
    const current = await repo.setActiveTask(conversation.id, { ...task, pendingItemId: "eggs" }, task.version);
    await assert.rejects(repo.reserve(conversation.id, "click", { text: "1. Hleb", localOnly: true, localChoice: binding }), { code: "STALE_REQUEST" });
    await assert.rejects(repo.reserve(conversation.id, "click", { text: "1. Hleb", localOnly: true, localChoice: { ...binding, taskVersion: current.version } }), { code: "STALE_REQUEST" });
    assert.equal((await repo.messages(conversation.id)).length, 2);
    const valid = { ...binding, taskVersion: current.version, questionId: "eggs" };
    const chosen = await repo.reserve(conversation.id, "click", { text: "1. Jaja", localOnly: true, localChoice: valid });
    assert.deepEqual(chosen.localChoice, valid); assert.equal(chosen.contextPolicy, "local-only");
    await repo.release(conversation.id, chosen.id, "click", "STORAGE");
    const retried = await repo.reserve(conversation.id, "retry", { retryId: chosen.id, localChoice: valid });
    assert.equal(retried.id, chosen.id);
    await repo.release(conversation.id, chosen.id, "retry", "STORAGE");
    await repo.setActiveTask(conversation.id, { ...current, pendingItemId: "next-item" }, current.version);
    await assert.rejects(repo.reserve(conversation.id, "retry", { retryId: chosen.id, localChoice: valid }), { code: "STALE_REQUEST" });
    assert.equal((await repo.messages(conversation.id)).length, 3);
  });
});

test("read choice cannot attach to a newer turn after its question", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "owner", { text: "Which food?", localOnly: true });
    const readTask = { capabilityId: "nutrition.inventory.getAvailability", input: { text: "Which food?" }, candidates: [{ id: "egg", name: "Jaja" }] };
    const assistant = await repo.complete(conversation.id, user.id, "owner", reply, { localOnly: true, readTask });
    const newer = await repo.reserve(conversation.id, "owner", { text: "New unrelated topic" });
    await repo.release(conversation.id, newer.id, "owner", "NETWORK");
    const binding = { kind: "read", messageId: assistant.id, capabilityId: readTask.capabilityId };
    await assert.rejects(repo.reserve(conversation.id, "click", { text: "1. Jaja", localOnly: true, localChoice: binding }), { code: "STALE_REQUEST" });
    assert.equal((await repo.messages(conversation.id)).length, 3);
  });
});

test("multi-item pending question and independent parameters survive IndexedDB reopen and stay local-only", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "owner", { text: "Dodaj jaja i hleb", localOnly: true });
    const task = await repo.setActiveTask(conversation.id, { id: "multi-task", capabilityId: "nutrition.inventory.add", status: "collecting", pendingItemId: "bread-item", items: [
      { id: "egg-item", foodId: "eggs", foodName: "Jaja", quantity: 10, unit: "kom", locationId: "location_fridge", clarificationStatus: "ready", executionStatus: "notAttempted" },
      { id: "bread-item", quantity: 400, unit: "g", locationId: "location_pantry", clarificationStatus: "food", executionStatus: "notAttempted", foodChoices: [{ id: "whole", name: "Integralni hleb" }, { id: "rye", name: "Ražani hleb" }] }
    ] }, null);
    await repo.complete(conversation.id, user.id, "owner", reply, { localOnly: true, writeTask: task });
    repo.close(); await repo.initialize();
    const restored = (await repo.get(conversation.id)).activeTask;
    assert.deepEqual(restored, task);
    assert.equal((await repo.messages(conversation.id))[1].writeTask.pendingItemId, "bread-item");
    restored.items[0].quantity = 999;
    assert.equal((await repo.get(conversation.id)).activeTask.items[0].quantity, 10);
    const next = await repo.reserve(conversation.id, "owner", { text: "Help me prioritize" });
    assert.deepEqual(await repo.context(conversation.id, next.id), [{ role: "user", text: "Help me prioritize" }]);
  });
});

test("an executing task cannot be replaced or cleared by another tab with a current version", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const current = await repo.setActiveTask(conversation.id, { id: "active-write", capabilityId: "nutrition.inventory.add", status: "executing", items: [{ id: "one", executionStatus: "executing" }] }, null);
    await assert.rejects(repo.setActiveTask(conversation.id, { id: "another-write", status: "proposed" }, current.version), { code: "BUSY" });
    await assert.rejects(repo.setActiveTask(conversation.id, null, current.version), { code: "BUSY" });
    await assert.rejects(repo.setActiveTask(conversation.id, { ...current, status: "collecting" }, current.version), { code: "BUSY" });
    assert.deepEqual((await repo.get(conversation.id)).activeTask, current);
    const receipt = await repo.setActiveTask(conversation.id, { ...current, status: "succeeded", items: [{ id: "one", executionStatus: "succeeded", result: { id: "batch-one" } }] }, current.version);
    assert.equal(receipt.version, current.version + 1);
  });
});

test("partial pipeline outcomes survive real repository reload and a fresh pipeline never replays them", async () => {
  await fixture(async repo => {
    const conversation = await repo.create(); let writes = 0;
    const capability = { type: "write", id: "nutrition.inventory.add", preflight: async () => {}, inputFor: item => item };
    const pipeline = () => {
      const context = vm.createContext({ Map, window: { MentorCapabilityRegistry: { get: () => capability, execute: async () => { writes++; if (writes === 2) throw new Error("simulated failure"); return { id: "batch-one" }; } } } });
      vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor/mentor-write-pipeline.js"), "utf8"), context);
      return context.window.MentorWritePipeline;
    };
    const task = await repo.setActiveTask(conversation.id, { id: "multi-execution", capabilityId: capability.id, status: "proposed", items: ["one", "two", "three"].map(id => ({ id, executionStatus: "notAttempted" })) }, null);
    await assert.rejects(pipeline().confirm(repo, conversation.id, task.id, task.version), /simulated failure/);
    repo.close(); await repo.initialize();
    const stored = (await repo.get(conversation.id)).activeTask;
    assert.equal(stored.status, "partial");
    assert.deepEqual(stored.items.map(item => item.executionStatus), ["succeeded", "uncertain", "notAttempted"]);
    assert.equal(stored.items[0].result.id, "batch-one");
    await pipeline().confirm(repo, conversation.id, task.id, task.version);
    assert.equal(writes, 2);
  });
});

test("conversation order, IDs and messages survive database close/reopen", async () => {
  await fixture(async repo => {
    const first = await repo.create();
    const user = await repo.reserve(first.id, "owner", { text: "I want to learn Serbian." });
    await repo.complete(first.id, user.id, "owner", reply);
    const second = await repo.create();
    assert.notEqual(first.id, second.id);
    repo.close(); await repo.initialize();
    const rows = await repo.messages(first.id);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].text, "I want to learn Serbian.");
    assert.deepEqual(rows.map(row => row.sequence), [0, 1]);
    assert.ok(rows.every(row => row.createdAt && row.id));
    assert.equal((await repo.list()).find(row => row.id === first.id).title, user.text);
  });
});
test("local write task survives reload, requires versioned update and stays out of cloud history", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "owner", { text: "Dodaj 2 kg pirinča", localOnly: true });
    const task = await repo.setActiveTask(conversation.id, { id: "write-one", capabilityId: "nutrition.inventory.add", status: "collecting", quantity: 2, unit: "kg" }, null);
    await repo.complete(conversation.id, user.id, "owner", { reply: "Gde da smestim?", proposal: null }, { localOnly: true, writeTask: task });
    repo.close(); await repo.initialize();
    assert.equal((await repo.get(conversation.id)).activeTask.quantity, 2);
    assert.equal((await repo.messages(conversation.id))[1].writeTask.id, "write-one");
    await assert.rejects(repo.setActiveTask(conversation.id, { ...task, status: "proposed" }, null), { code: "STALE_REQUEST" });
    const next = await repo.reserve(conversation.id, "owner", { text: "Pomozi mi s idejom" });
    assert.deepEqual(await repo.context(conversation.id, next.id), [{ role: "user", text: "Pomozi mi s idejom" }]);
  });
});
test("ambiguous local inventory read keeps its food choice after reload without entering cloud history", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "owner", { text: "Koliko jaja imam u frižideru?", localOnly: true });
    const readTask = { capabilityId: "nutrition.inventory.getAvailability", input: { text: user.text }, candidates: [{ id: "egg", name: "Jaje, celo, sirovo" }, { id: "quail", name: "Jaja japanske prepelice" }] };
    await repo.complete(conversation.id, user.id, "owner", { reply: "Na koju namirnicu misliš?", proposal: null }, { localOnly: true, capabilityId: readTask.capabilityId, readTask });
    repo.close(); await repo.initialize();
    assert.equal((await repo.messages(conversation.id))[1].readTask.candidates.length, 2);
    const next = await repo.reserve(conversation.id, "owner", { text: "Pomozi mi sa ciljem" });
    assert.deepEqual(await repo.context(conversation.id, next.id), [{ role: "user", text: "Pomozi mi sa ciljem" }]);
  });
});
test("retry reuses original user turn and commits exactly one assistant reply", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "first", { text: "Start a business" });
    await repo.release(conversation.id, user.id, "first", "NETWORK");
    const retry = await repo.reserve(conversation.id, "retry", { retryId: user.id });
    assert.equal(retry.id, user.id);
    await repo.complete(conversation.id, user.id, "retry", reply);
    await assert.rejects(repo.complete(conversation.id, user.id, "retry", reply), { code: "STALE_REQUEST" });
    assert.equal((await repo.messages(conversation.id)).length, 2);
    await assert.rejects(repo.reserve(conversation.id, "again", { retryId: user.id }), { code: "STALE_REQUEST" });
  });
});
test("transaction leases prevent concurrent tabs and expire without losing pending text", async () => {
  let now = Date.now();
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "tab1", { text: "My goal" });
    await assert.rejects(repo.reserve(conversation.id, "tab2", { text: "Concurrent message" }), { code: "BUSY" });
    now += repo.leaseMs + 1;
    await repo.reserve(conversation.id, "tab2", { retryId: user.id });
    await assert.rejects(repo.complete(conversation.id, user.id, "tab1", reply), { code: "STALE_REQUEST" });
    await repo.complete(conversation.id, user.id, "tab2", reply);
    assert.equal((await repo.messages(conversation.id)).length, 2);
  }, { now: () => now });
});
test("late replies cannot resurrect deleted conversations", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const user = await repo.reserve(conversation.id, "owner", { text: "A goal" });
    await repo.remove(conversation.id);
    await assert.rejects(repo.complete(conversation.id, user.id, "owner", reply), { code: "CONVERSATION_DELETED" });
    assert.equal(await repo.release(conversation.id, user.id, "owner"), false);
    assert.equal((await repo.list()).length, 0);
    assert.equal((await repo.messages(conversation.id)).length, 0);
  });
});
test("context excludes failed turns, other conversations and unrelated app data", async () => {
  await fixture(async repo => {
    const a = await repo.create(); const b = await repo.create();
    const ignored = await repo.reserve(b.id, "b", { text: "PRIVATE OTHER CONVERSATION" });
    await repo.complete(b.id, ignored.id, "b", reply);
    const failed = await repo.reserve(a.id, "a", { text: "failed turn" });
    await repo.release(a.id, failed.id, "a", "NETWORK");
    const first = await repo.reserve(a.id, "a", { text: "My skill goal" });
    await repo.complete(a.id, first.id, "a", reply);
    const last = await repo.reserve(a.id, "a", { text: "Ten minutes a day" });
    assert.deepEqual(await repo.context(a.id, last.id), [
      { role: "user", text: "My skill goal" }, { role: "assistant", text: reply.reply }, { role: "user", text: "Ten minutes a day" }
    ]);
    const exported = await repo.export();
    assert.equal(exported.format, "mentor-conversations");
    assert.equal(exported.conversations.length, 2);
    assert.ok(exported.conversations.every(row => !Object.hasOwn(row, "lease")));
  });
});
test("local inventory answer stays in history but never enters later cloud context", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const local = await repo.reserve(conversation.id, "owner", { text: "Koliko imam mleka u frižideru?", localOnly: true });
    await assert.rejects(repo.context(conversation.id, local.id), { code: "INVALID_REQUEST" });
    await repo.complete(conversation.id, local.id, "owner", { reply: "Mleko: 1.5 l dostupno", proposal: null }, { localOnly: true });
    const current = await repo.reserve(conversation.id, "owner", { text: "Help me set a goal" });
    const context = await repo.context(conversation.id, current.id);
    assert.deepEqual(context, [{ role: "user", text: "Help me set a goal" }]);
    assert.equal((await repo.messages(conversation.id))[1].contextPolicy, "local-only");
    assert.equal((await repo.messages(conversation.id))[1].text, "Mleko: 1.5 l dostupno");
    assert.equal((await repo.messages(conversation.id))[0].contextPolicy, "local-only");
  });
});
test("failed storage transaction rolls back both reservation and conversation sequence", async () => {
  await fixture(async repo => {
    const conversation = await repo.create();
    const hook = () => { throw new Error("simulated quota"); };
    repo.db.messages.hook("creating", hook);
    await assert.rejects(repo.reserve(conversation.id, "owner", { text: "Keep my text" }), /simulated quota/);
    repo.db.messages.hook("creating").unsubscribe(hook);
    assert.equal((await repo.messages(conversation.id)).length, 0);
    assert.equal((await repo.get(conversation.id)).nextSequence, 0);
    assert.equal((await repo.get(conversation.id)).lease, null);
  });
});

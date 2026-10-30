const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const protocol = require("../../js/mentor/mentor-protocol.js");

async function fixture() {
  const stored = new Map();
  const context = vm.createContext({ console, MentorChatProtocol: protocol, appState: { goals: [] }, MentorAppReadyPromise: Promise.resolve(),
    navigator: {}, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent() {} });
  context.window = context;
  const files = ["js/data/state/repository-state.constants.js", "js/data/errors/data-error.js", "js/data/state/data-event-bus.js", "js/data/contracts/storage-adapter.contract.js", "js/data/contracts/repository.contract.js", "js/data/adapters/local-storage.adapter.js", "js/data/repositories/repository-helpers.js", "js/data/repositories/goals.repository.js", "js/data/services/goals.service.js", "js/mentor/mentor-goal-proposals.js"];
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), context);
  const adapter = new context.MentorLocalStorageAdapter({ getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) });
  const goals = context.MentorDataRepositoryFactories.createGoalsRepository(adapter);
  context.MentorData = { repositories: { goals } };
  await goals.initialize();
  const original = { id: "existing-goal", type: "long-term", title: "Existing", category: "Other", privateNote: "NEVER SHARE", firstAction: "Review", targetDate: null };
  await context.MentorGoalsService.createGoal(original, context.appState);
  const proposal = protocol.validateProposal({ action: "createGoal", title: "Read Serbian", type: "habit", category: "Personal Growth", firstAction: "Read one page", priority: "high", frequency: "Daily", tasks: [{ title: "Read one page", cadence: "Daily" }], milestones: ["Finish first chapter"] });
  const message = { id: "message-proposal_reply", conversationId: "conversation-1", proposal, proposalStatus: null };
  const chats = { failStatus: false, getMessage: async () => structuredClone(message), get: async () => ({ id: message.conversationId }),
    async setProposalStatus(id, status) { if (this.failStatus) throw new Error("quota"); message.proposalStatus = status; } };
  return { context, goals, original, proposal, message, chats, stored, api: context.MentorGoalProposals };
}
test("proposal preview validates without writes and approved creation reuses existing goal service", async () => {
  const f = await fixture();
  const before = f.stored.get("mentor_goals_v1");
  const preview = f.api.toGoal(f.proposal, f.message.id, f.message.conversationId);
  assert.equal(f.stored.get("mentor_goals_v1"), before);
  assert.equal(preview.actions[0].completed, false);
  await Promise.all([f.api.approve(f.chats, f.message.id), f.api.approve(f.chats, f.message.id)]);
  await f.api.approve(f.chats, f.message.id);
  assert.equal(f.goals.getAll().length, 2);
  assert.equal(f.goals.getById(f.original.id).privateNote, "NEVER SHARE");
  const saved = f.goals.getById(f.api.goalId(f.message.id));
  assert.equal(saved.actions[0].title, "Read one page");
  assert.equal(saved.mainMilestone, "Finish first chapter");
  assert.equal(saved.priority, "high");
  assert.equal(f.message.proposalStatus, "approved");
  assert.equal(f.context.appState.goals.length, 2);
});
test("approval recovers after goal save succeeds and chat status storage fails", async () => {
  const f = await fixture(); f.chats.failStatus = true;
  await assert.rejects(f.api.approve(f.chats, f.message.id), /quota/);
  assert.equal(f.goals.getAll().length, 2);
  f.chats.failStatus = false;
  await f.api.approve(f.chats, f.message.id);
  assert.equal(f.goals.getAll().length, 2);
  assert.equal(f.message.proposalStatus, "approved");
});
test("dismissed or invalid proposals never create goals", async () => {
  const f = await fixture();
  await f.api.dismiss(f.chats, f.message.id);
  await assert.rejects(f.api.approve(f.chats, f.message.id), { code: "STALE_REQUEST" });
  assert.equal(f.goals.getAll().length, 1);
  assert.throws(() => f.api.toGoal({ ...f.proposal, action: "deleteAll" }, "bad", "conversation"), { code: "INVALID_RESPONSE" });
});
test("goal sharing is opt-in and returns only approved goal context fields", async () => {
  const f = await fixture();
  assert.equal(f.api.readGoalContext(""), null);
  assert.deepEqual(Object.keys(f.api.readGoalContext(f.original.id)).sort(), ["category", "firstAction", "id", "targetDate", "title", "type"]);
  assert.equal(f.api.readGoalContext(f.original.id).privateNote, undefined);
  assert.throws(() => f.api.readGoalContext("missing"), { code: "INVALID_REQUEST" });
});

test("an approved proposal cannot recreate a goal later deleted by the user", async () => {
  const f = await fixture();
  await f.api.approve(f.chats, f.message.id);
  await f.goals.remove(f.api.goalId(f.message.id));
  await assert.rejects(f.api.approve(f.chats, f.message.id), { code: "STALE_REQUEST" });
  assert.equal(f.goals.getAll().length, 1);
});

test("Finance proposal approval creates only the goal without budgets or transactions", async () => {
  const f = await fixture();
  f.message.proposal.category = "Finance";
  f.context.MentorLazy = { loadFeature() { throw new Error("Finance must not be loaded by AI approval"); } };
  f.context.Finance = { ensureSavingsBudgetForGoal() { throw new Error("AI must not create a budget"); } };
  const result = await f.api.approve(f.chats, f.message.id);
  assert.equal(result.goal.category, "Finance");
  assert.equal(f.goals.getAll().length, 2);
});

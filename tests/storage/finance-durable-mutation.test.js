const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(
  path.join(__dirname, "../../js/data/services/domain-durable-save.service.js"),
  "utf8"
);

test("Domain durable save delays success and returns the prior snapshot on failure", async () => {
  global.window = global;
  vm.runInThisContext(script, { filename: "domain-durable-save.service.js" });

  let durable = { records: [{ id: "before" }] };
  let successCount = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const pending = global.MentorDomainDurableSave.commit({
    read: () => durable,
    next: { records: [{ id: "saved" }] },
    save: async (next) => { await gate; durable = next; return next; },
    onSuccess: () => { successCount += 1; }
  });
  assert.equal(successCount, 0);
  release();
  assert.equal((await pending).ok, true);
  assert.equal(successCount, 1);

  const failed = await global.MentorDomainDurableSave.commit({
    read: () => durable,
    next: { records: [{ id: "not-saved" }] },
    save: async () => { throw new Error("quota"); },
    onSuccess: () => { successCount += 1; }
  });
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.value, { records: [{ id: "saved" }] });
  assert.equal(successCount, 1);
});

test("Background commit queue reports failure without rejecting or emitting success", async () => {
  const signals = [];
  let successCount = 0;
  const queue = global.MentorDomainDurableSave.createQueue({
    onError: (detail) => signals.push(detail)
  });

  const failed = await queue.enqueue("finance-cache", async () => {
    throw new Error("quota");
  });
  if (failed.ok) successCount += 1;

  assert.equal(failed.ok, false);
  assert.equal(failed.label, "finance-cache");
  assert.equal(successCount, 0);
  assert.equal(signals.length, 1);

  const recovered = await queue.enqueue("finance-assets", async () => "saved");
  if (recovered.ok) successCount += 1;
  assert.equal(recovered.ok, true);
  assert.equal(successCount, 1);
});

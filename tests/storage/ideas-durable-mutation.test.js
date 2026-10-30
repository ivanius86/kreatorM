const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(
  path.join(__dirname, "../../js/data/services/ideas-durable-save.service.js"),
  "utf8"
);

test("Ideas durable commit emits success only after save and restores the prior snapshot on failure", async () => {
  global.window = global;
  vm.runInThisContext(script, { filename: "ideas-durable-save.service.js" });

  let durable = [{ id: "before" }];
  let successCount = 0;
  let errorCount = 0;
  let releaseSave;
  const pendingSave = new Promise((resolve) => { releaseSave = resolve; });
  const repository = {
    getAll: () => JSON.parse(JSON.stringify(durable)),
    replaceAll: async (items) => {
      await pendingSave;
      durable = JSON.parse(JSON.stringify(items));
      return durable;
    }
  };

  const pendingIdeas = [{ id: "saved", title: "Durable title" }];
  const save = global.MentorIdeasDurableSave.commit({
    repository,
    nextIdeas: pendingIdeas,
    onSuccess: () => { successCount += 1; }
  });
  assert.equal(successCount, 0);
  pendingIdeas[0].title = "Mutated while queued";
  pendingIdeas.push({ id: "late-mutation" });
  releaseSave();
  const saved = await save;
  assert.equal(saved.ok, true);
  assert.equal(successCount, 1);
  assert.deepEqual(durable, [{ id: "saved", title: "Durable title" }]);

  const failed = await global.MentorIdeasDurableSave.commit({
    repository: {
      getAll: repository.getAll,
      replaceAll: async () => { throw Object.assign(new Error("quota"), { code: "QUOTA" }); }
    },
    nextIdeas: [{ id: "not-durable" }],
    onSuccess: () => { successCount += 1; },
    onError: () => { errorCount += 1; }
  });
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.ideas, [{ id: "saved", title: "Durable title" }]);
  assert.equal(successCount, 1);
  assert.equal(errorCount, 1);
});

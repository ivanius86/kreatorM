const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPhase0Scripts } = require("./test-helpers");

function load() {
  return loadPhase0Scripts([
    "js/data/legacy/legacy-storage.registry.js",
    "js/data/legacy/legacy-media.reader.js"
  ]);
}

test("media reader refuses to open a database when read-only discovery is unavailable", async () => {
  const api = load();
  let opened = false;
  const result = await api.LegacyMediaReader.readExistingMediaDatabase({
    open() {
      opened = true;
      throw new Error("must not open");
    }
  });
  assert.equal(result.status, "unsupported");
  assert.equal(opened, false);
});

test("media reader does not open an absent database", async () => {
  const api = load();
  let opened = false;
  const result = await api.LegacyMediaReader.readExistingMediaDatabase({
    async databases() { return [{ name: "some_other_database", version: 1 }]; },
    open() {
      opened = true;
      throw new Error("must not open");
    }
  });
  assert.equal(result.status, "absent");
  assert.equal(opened, false);
});

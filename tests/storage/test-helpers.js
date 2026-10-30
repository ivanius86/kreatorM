const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "../..");

function loadPhase0Scripts(relativePaths) {
  global.window = global;
  global.MentorDataPhase0 = {};
  relativePaths.forEach((relativePath) => {
    const script = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    vm.runInThisContext(script, { filename: relativePath });
  });
  return global.MentorDataPhase0;
}

function memoryStorage(values = {}) {
  const rows = new Map(Object.entries(values).map(([key, value]) => [key, String(value)]));
  const calls = { get: [], set: [], remove: [] };
  return {
    calls,
    getItem(key) {
      calls.get.push(key);
      return rows.has(key) ? rows.get(key) : null;
    },
    setItem(key, value) {
      calls.set.push([key, value]);
      throw new Error("Write attempted by read-only Phase 0 code.");
    },
    removeItem(key) {
      calls.remove.push(key);
      throw new Error("Remove attempted by read-only Phase 0 code.");
    }
  };
}

module.exports = { ROOT, loadPhase0Scripts, memoryStorage };

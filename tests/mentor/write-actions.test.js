"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function fixture() {
  const foods = [{ id: "rice", defaultName: "Pirinač", status: "active" }, { id: "milk", defaultName: "Mleko", status: "active" }];
  const locations = [{ id: "location_pantry", name: "Ostava" }, { id: "location_fridge", name: "Frižider" }];
  const batches = [];
  const calls = { save: 0, restock: 0, cloud: 0 };
  let nextId = 0;
  const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const root = vm.createContext({ console, Date, Map, Set, Promise, Math, crypto: require("node:crypto").webcrypto });
  root.window = root;
  root.MentorI18n = { getLanguage: () => "sr", t: (key, values = {}) => key + " " + JSON.stringify(values) };
  root.MentorLazy = { loadFeature: async () => {} };
  root.MentorFoodRepository = { getAll: () => foods, getById: id => foods.find(item => item.id === id) };
  root.MentorInventoryRepository = { getLocations: () => locations.map(item => ({ ...item })), getBatches: () => batches.map(item => ({ ...item })), getBatchById: id => { const item = batches.find(row => row.id === id); return item ? { ...item } : null; }, getLocationById: id => locations.find(item => item.id === id) };
  root.MentorNutritionRead = { foodCandidates: text => foods.filter(food => normalize(text).includes(normalize(food.defaultName).slice(0, 4))) };
  root.MentorNutritionUnitConversion = { convertForFood: (amount, from, to) => {
    if (from === to) return amount;
    if (from === "kg" && to === "g") return amount * 1000;
    if (from === "g" && to === "kg") return amount / 1000;
    throw new Error("INCOMPATIBLE_UNITS");
  } };
  root.MentorInventoryService = {
    statusForBatch: batch => batch.expiryDate === "2000-01-01" ? "expired" : "available",
    validateDraft: input => ({ valid: Boolean(foods.find(item => item.id === input.foodId) && locations.find(item => item.id === input.locationId) && Number.isFinite(input.quantity) && input.quantity > 0 && ["kg", "g", "l", "ml", "kom"].includes(input.unit)), quantity: input.quantity, unit: input.unit, errors: [{ field: "quantity" }] }),
    async saveBatch(input) { calls.save++; const row = { ...input, id: "batch-" + ++nextId, status: "available", updatedAt: "stamp-1" }; batches.push(row); return row; },
    async restock(id, amount, unit) { calls.restock++; const row = batches.find(item => item.id === id); row.quantity += root.MentorNutritionUnitConversion.convertForFood(amount, unit, row.unit); row.updatedAt = "stamp-2"; return row; }
  };
  root.MentorChatClient = { route: async () => { calls.cloud++; return { capabilityId: "none" }; } };
  for (const file of ["js/mentor/mentor-capability-registry.js", "js/mentor/mentor-nutrition-inventory-resolver.js", "js/mentor/mentor-nutrition-inventory-write.js", "js/mentor/mentor-write-pipeline.js", "js/mentor/mentor-intelligence-router.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), root, { filename: file });
  const conversation = { activeTask: null };
  const repository = {
    async get() { return { activeTask: conversation.activeTask }; },
    async setActiveTask(_id, task, expectedVersion) {
      if ((conversation.activeTask?.version ?? null) !== expectedVersion) throw Object.assign(new Error("STALE_REQUEST"), { code: "STALE_REQUEST" });
      conversation.activeTask = task ? { ...task, version: (conversation.activeTask?.version || 0) + 1 } : null;
      return conversation.activeTask;
    }
  };
  return { root, foods, locations, batches, calls, repository, conversation };
}

function multiFixture() {
  const f = fixture();
  f.foods.push(
    { id: "eggs", defaultName: "Jaja", names: { en: "Eggs" }, status: "active" },
    { id: "bread-whole", defaultName: "Integralni hleb", status: "active" },
    { id: "bread-rye", defaultName: "Ražani hleb", status: "active" },
    { id: "bread-white", defaultName: "Beli hleb", status: "active" },
    { id: "bread-toast", defaultName: "Tost hleb", status: "active" }
  );
  f.root.MentorFoodRepository.query = ({ search }) => f.foods.filter(food => food.defaultName.toLowerCase().includes(search.toLowerCase()));
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor/mentor-nutrition-read.js"), "utf8"), f.root);
  const save = f.repository.setActiveTask;
  f.repository.setActiveTask = async (...args) => JSON.parse(JSON.stringify(await save(...JSON.parse(JSON.stringify(args)))));
  return f;
}

test("original eggs and whole-wheat bread request never mixes another item's quantity or location", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  let prepared = await pipeline.prepare("prazne su, da li možeš da mi dodaš sledeće zalihe, jaja 10 komada, 400 grama integralnog hleba, jaja stavi u frižider a hleb u ostavu", null, "nutrition.inventory.add");
  assert.ok(Array.isArray(prepared.task.items), "Original resolver mixed quantity=" + prepared.task.quantity + ", unit=" + prepared.task.unit + ", location=" + prepared.task.locationId + " into one food choice");
  assert.equal(prepared.task.items.length, 2);
  if (prepared.task.status === "collecting") prepared = await pipeline.prepare("1. Integralni hleb", prepared.task, "nutrition.inventory.add");
  assert.equal(prepared.task.status, "proposed");
  assert.deepEqual(JSON.parse(JSON.stringify(prepared.task.items.map(item => [item.foodId, item.quantity, item.unit, item.locationId]))), [
    ["eggs", 10, "kom", "location_fridge"], ["bread-whole", 400, "g", "location_pantry"]
  ]);
  assert.equal(f.calls.save, 0);
  const persisted = await f.repository.setActiveTask("chat", prepared.task, null);
  await pipeline.confirm(f.repository, "chat", prepared.task.id, persisted.version);
  assert.equal(f.batches.length, 2);
  assert.deepEqual(f.batches.map(item => [item.foodId, item.quantity, item.unit, item.locationId]), [
    ["eggs", 10, "kom", "location_fridge"], ["bread-whole", 400, "g", "location_pantry"]
  ]);
});

const multiText = "Dodaj 6 kom jaja u frižider; 1,5 l mleka u frižider; 2 kg pirinča u ostavu.";
const itemValues = task => JSON.parse(JSON.stringify(task.items.map(item => [item.foodId, item.quantity, item.unit, item.locationId])));

test("location buttons use live Nutrition locations and only prepare the write", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  f.locations.push({ id: "custom-1", name: "Podrum" });
  const first = await pipeline.prepare("Dodaj 2 l mleka", null, "nutrition.inventory.add");
  assert.equal(first.task.status, "collecting");
  const choices = f.root.MentorNutritionInventoryResolver.pendingChoices(first.task);
  assert.deepEqual(Array.from(choices, item => item.name), f.locations.map(item => item.name));
  const selected = await pipeline.prepare(choices[2].value, first.task, "nutrition.inventory.add");
  assert.equal(selected.task.status, "proposed");
  assert.equal(selected.task.locationId, "custom-1");
  assert.equal(f.calls.save, 0);
  f.locations.pop();
  assert.equal(f.root.MentorNutritionInventoryResolver.pendingChoices(first.task).length, 2);
  const missing = await pipeline.prepare(choices[2].value, first.task, "nutrition.inventory.add");
  assert.equal(missing.task.status, "collecting");
  assert.equal(missing.task.locationId, undefined);
});

test("two explicit foods retain independent quantities, units and locations until approval", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const { task } = await pipeline.prepare("Dodaj jaja 10 kom u frižider i mleko 2 l u ostavu", null, "nutrition.inventory.add");
  assert.equal(task.status, "proposed");
  assert.equal(new Set(task.items.map(item => item.id)).size, 2);
  assert.deepEqual(itemValues(task), [["eggs", 10, "kom", "location_fridge"], ["milk", 2, "l", "location_pantry"]]);
  assert.ok(task.items.every(item => item.clarificationStatus === "ready" && item.executionStatus === "notAttempted"));
  assert.equal(f.calls.save, 0);
  const saved = await f.repository.setActiveTask("chat", task, null);
  await pipeline.confirm(f.repository, "chat", task.id, saved.version);
  assert.equal(f.calls.save, 2);
});

test("food choice by number, ordinal, short or full name affects only the pending item", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare("Dodaj jaja 10 kom u frižider; hleb 400 g u ostavu", null, "nutrition.inventory.add");
  const unchanged = JSON.stringify(first.task);
  assert.equal(first.task.pendingItemId, first.task.items[1].id);
  for (const answer of ["1", "prvi", "integralni", "Integralni hleb", "1. Integralni hleb"]) {
    assert.equal(f.root.MentorNutritionInventoryResolver.canContinue(first.task, answer), true);
    const selected = await pipeline.prepare(answer, first.task, "nutrition.inventory.add");
    assert.equal(selected.task.status, "proposed", answer);
    assert.deepEqual(itemValues(selected.task), [["eggs", 10, "kom", "location_fridge"], ["bread-whole", 400, "g", "location_pantry"]]);
    assert.equal(JSON.stringify(first.task), unchanged);
    assert.equal(selected.task.items[1].id, first.task.pendingItemId);
  }
  const ambiguous = await pipeline.prepare("hleb", first.task, "nutrition.inventory.add");
  assert.equal(ambiguous.task.status, "collecting");
  assert.equal(ambiguous.task.items[1].foodId, null);
  assert.deepEqual(itemValues(ambiguous.task)[0], ["eggs", 10, "kom", "location_fridge"]);
  assert.equal(f.root.MentorNutritionInventoryResolver.canContinue(first.task, "Napravi recept za hleb"), false);
  assert.equal(f.root.MentorNutritionInventoryResolver.canContinue(first.task, "make me recipie for arepa"), false);
  assert.equal(f.root.MentorNutritionInventoryResolver.canContinue(first.task, "Dodaj 3 l mleka u frižider"), false);
});

test("three items preserve decimal commas and per-item expiry dates", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const { task } = await pipeline.prepare(multiText.replace("6 kom jaja u frižider", "6 kom jaja u frižider rok 31/12/2030"), null, "nutrition.inventory.add");
  assert.equal(task.status, "proposed");
  assert.deepEqual(itemValues(task), [["eggs", 6, "kom", "location_fridge"], ["milk", 1.5, "l", "location_fridge"], ["rice", 2, "kg", "location_pantry"]]);
  assert.equal(task.items[0].expiryDate, "2030-12-31");
  assert.equal(task.items[1].expiryDate, undefined);
  const saved = await f.repository.setActiveTask("chat", task, null);
  await pipeline.confirm(f.repository, "chat", task.id, saved.version);
  assert.equal(f.calls.save, 3);
});

test("a targeted correction changes only its item; an untargeted correction asks and retains its parameters", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare(multiText, null, "nutrition.inventory.add");
  assert.equal(f.root.MentorNutritionInventoryResolver.canContinue(first.task, "Mleko ipak 3 l u ostavu"), true);
  const corrected = await pipeline.prepare("Mleko ipak 3 l u ostavu", first.task, "nutrition.inventory.add");
  assert.deepEqual(itemValues(corrected.task), [["eggs", 6, "kom", "location_fridge"], ["milk", 3, "l", "location_pantry"], ["rice", 2, "kg", "location_pantry"]]);
  assert.equal(first.task.items[1].quantity, 1.5);
  const question = await pipeline.prepare("Ispravi na 4 l", first.task, "nutrition.inventory.add");
  assert.equal(question.task.status, "collecting");
  const answered = await pipeline.prepare("Mleko", question.task, "nutrition.inventory.add");
  assert.equal(answered.task.items[1].quantity, 4);
  assert.equal(answered.task.items[0].quantity, 6);
  const numbered = await pipeline.prepare("Ispravi stavka 3 na 5 kg", first.task, "nutrition.inventory.add");
  assert.equal(numbered.task.items[2].quantity, 5);
  assert.equal(numbered.task.items[1].quantity, 1.5);
  assert.equal(f.calls.save, 0);
});

test("a correction to a resolved item leaves another food's open question intact", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare("Dodaj jaja 10 kom u frižider; hleb 400 g u ostavu", null, "nutrition.inventory.add");
  const corrected = await pipeline.prepare("Jaja ipak 12 kom", first.task, "nutrition.inventory.add");
  assert.equal(corrected.task.items[0].quantity, 12);
  assert.equal(corrected.task.pendingItemId, first.task.pendingItemId);
  assert.equal(corrected.task.items[1].quantity, 400);
  assert.equal(corrected.task.items[1].foodChoices.length, 4);
});

test("choosing a correction target never redirects it to a different item's open food question", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare("Dodaj jaja 10 kom u frižider; hleb 400 g u ostavu; mleko 1 l u frižider", null, "nutrition.inventory.add");
  const question = await pipeline.prepare("Ispravi na 4 l", first.task, "nutrition.inventory.add");
  const corrected = await pipeline.prepare("Mleko", question.task, "nutrition.inventory.add");
  assert.equal(corrected.task.status, "collecting");
  assert.equal(corrected.task.pendingItemId, first.task.items[1].id);
  assert.equal(corrected.task.items[1].foodId, null);
  assert.equal(corrected.task.items[1].quantity, 400);
  assert.equal(corrected.task.items[1].unit, "g");
  assert.equal(corrected.task.items[2].foodId, "milk");
  assert.equal(corrected.task.items[2].quantity, 4);
  assert.equal(corrected.task.items[2].locationId, "location_fridge");
  assert.equal(f.calls.save, 0);
});

test("unknown foods and invalid units block the whole proposal and preserve other items", async () => {
  for (const [request, answer] of [
    ["Dodaj 4 kom nepoznatica u ostavu; 2 l mleka u frižider", "Jaja"],
    ["Dodaj 2 kutije jaja u ostavu; 2 l mleka u frižider", "Ispravi na 4 kom jaja"]
  ]) {
    const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
    const first = await pipeline.prepare(request, null, "nutrition.inventory.add");
    assert.equal(first.task.status, "collecting");
    const saved = await f.repository.setActiveTask("chat", first.task, null);
    await assert.rejects(pipeline.confirm(f.repository, "chat", first.task.id, saved.version), { code: "STALE_REQUEST" });
    assert.equal(f.calls.save, 0);
    const resolved = await pipeline.prepare(answer, first.task, "nutrition.inventory.add");
    assert.equal(resolved.task.status, "proposed", request + " → " + resolved.reply);
    assert.deepEqual(itemValues(resolved.task), [["eggs", 4, "kom", "location_pantry"], ["milk", 2, "l", "location_fridge"]]);
  }
});

test("a missing quantity is not borrowed from another food", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare("Dodaj 2 kg pirinča u ostavu i mleko u frižider", null, "nutrition.inventory.add");
  assert.equal(first.task.items.length, 2);
  assert.equal(first.task.status, "collecting");
  assert.equal(first.task.items[1].quantity, undefined);
  const next = await pipeline.prepare("1 l", first.task, "nutrition.inventory.add");
  assert.equal(next.task.status, "proposed");
  assert.deepEqual(itemValues(next.task), [["rice", 2, "kg", "location_pantry"], ["milk", 1, "l", "location_fridge"]]);
});

test("food-bearing inventory preamble is retained as an unresolved item, never discarded as boilerplate", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const { task } = await pipeline.prepare("Dodaj u zalihe jaja, 2 kg pirinča u ostavu, 1 l mleka u frižider", null, "nutrition.inventory.add");
  assert.equal(task.items.length, 3);
  assert.equal(task.status, "collecting");
  assert.equal(task.items[0].foodId, "eggs");
  assert.equal(task.items[0].quantity, undefined);
  assert.equal(task.pendingItemId, task.items[0].id);
  assert.deepEqual(itemValues(task).slice(1), [["rice", 2, "kg", "location_pantry"], ["milk", 1, "l", "location_fridge"]]);
  assert.equal(f.calls.save, 0);
});

test("cancel and dismiss never execute any item", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare(multiText, null, "nutrition.inventory.add");
  const cancelled = await pipeline.prepare("Odustani", first.task, "nutrition.inventory.add");
  assert.equal(cancelled.task, null);
  const saved = await f.repository.setActiveTask("chat", first.task, null);
  await pipeline.dismiss(f.repository, "chat", first.task.id, saved.version);
  assert.ok(f.conversation.activeTask.items.every(item => item.executionStatus === "cancelled"));
  await assert.rejects(pipeline.confirm(f.repository, "chat", first.task.id, saved.version), { code: "STALE_REQUEST" });
  assert.equal(f.calls.save, 0);
});

test("stale displayed multi-item preview cannot approve a corrected version", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare(multiText, null, "nutrition.inventory.add");
  const displayed = await f.repository.setActiveTask("chat", first.task, null);
  const correction = await pipeline.prepare("Jaja ipak 12 kom", displayed, "nutrition.inventory.add");
  const current = await f.repository.setActiveTask("chat", correction.task, displayed.version);
  await assert.rejects(pipeline.confirm(f.repository, "chat", current.id, displayed.version), { code: "STALE_REQUEST" });
  await assert.rejects(pipeline.confirm(f.repository, "chat", current.id), { code: "STALE_REQUEST" });
  assert.equal(f.calls.save, 0);
  await pipeline.confirm(f.repository, "chat", current.id, current.version);
  assert.equal(f.calls.save, 3);
});

test("partial adapter failure stops later items and duplicate confirmation cannot replay successful or uncertain writes", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const { task } = await pipeline.prepare(multiText, null, "nutrition.inventory.add");
  const saved = await f.repository.setActiveTask("chat", task, null);
  const add = f.root.MentorInventoryService.saveBatch;
  f.root.MentorInventoryService.saveBatch = async input => {
    if (input.foodId === "milk") { f.calls.save++; throw new Error("simulated storage failure"); }
    return add(input);
  };
  await assert.rejects(pipeline.confirm(f.repository, "chat", task.id, saved.version), /simulated/);
  assert.equal(f.conversation.activeTask.status, "partial");
  assert.deepEqual(f.conversation.activeTask.items.map(item => item.executionStatus), ["succeeded", "uncertain", "notAttempted"]);
  await pipeline.confirm(f.repository, "chat", task.id, saved.version);
  assert.equal(f.calls.save, 2);
  assert.equal(f.batches.length, 1);
});

test("lost item receipt retains earlier successes and never retries the saved-but-unconfirmed item", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const { task } = await pipeline.prepare(multiText, null, "nutrition.inventory.add");
  const saved = await f.repository.setActiveTask("chat", task, null);
  const persist = f.repository.setActiveTask;
  let failed = false;
  f.repository.setActiveTask = async (...args) => {
    if (args[1]?.items?.[1]?.executionStatus === "succeeded" && !failed) { failed = true; throw new Error("item receipt failed"); }
    return persist(...args);
  };
  await assert.rejects(pipeline.confirm(f.repository, "chat", task.id, saved.version), /receipt failed/);
  assert.equal(f.batches.length, 2);
  assert.deepEqual(f.conversation.activeTask.items.map(item => item.executionStatus), ["succeeded", "uncertain", "notAttempted"]);
  await pipeline.confirm(f.repository, "chat", task.id, saved.version);
  assert.equal(f.calls.save, 2);
});

test("every later item is revalidated immediately before its adapter", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  const { task } = await pipeline.prepare(multiText, null, "nutrition.inventory.add");
  const saved = await f.repository.setActiveTask("chat", task, null);
  const add = f.root.MentorInventoryService.saveBatch;
  f.root.MentorInventoryService.saveBatch = async input => { const result = await add(input); f.locations.splice(1, 1); return result; };
  await assert.rejects(pipeline.confirm(f.repository, "chat", task.id, saved.version), { code: "INVENTORY_CHANGED" });
  assert.deepEqual(f.conversation.activeTask.items.map(item => item.executionStatus), ["succeeded", "failed", "notAttempted"]);
  assert.equal(f.calls.save, 1);
});

test("ambiguous assignments, unseparated quantities and more than eight items are not silently truncated or assigned", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  for (const request of [
    "Dodaj 6 kom jaja; 1 l mleka; stavi u frižider ili ostavu",
    "Dodaj 6 kom jaja 1 l mleka u frižider",
    Array.from({ length: 9 }, () => "Dodaj 1 l mleka u frižider").join("; ")
  ]) {
    const { task } = await pipeline.prepare(request, null, "nutrition.inventory.add");
    assert.equal(task.status, "collecting");
    assert.ok(task.parseProblem);
    const saved = await f.repository.setActiveTask("chat", task, f.conversation.activeTask?.version ?? null);
    await assert.rejects(pipeline.confirm(f.repository, "chat", task.id, saved.version), { code: "STALE_REQUEST" });
  }
  assert.equal(f.calls.save, 0);
});

test("duplicate restock targets are rejected before the first write", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  f.batches.push({ id: "milk-1", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available", updatedAt: "stamp-1" });
  const { task } = await pipeline.prepare("Dopuni 1 l mleka u frižider; 2 l mleka u frižider", null, "nutrition.inventory.restock");
  assert.equal(task.status, "proposed");
  const saved = await f.repository.setActiveTask("chat", task, null);
  await assert.rejects(pipeline.confirm(f.repository, "chat", task.id, saved.version), { code: "INVENTORY_CHANGED" });
  assert.equal(f.calls.restock, 0);
});

test("mixed add and restock instructions cannot be reinterpreted under either capability", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  f.batches.push({ id: "milk-1", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available", updatedAt: "stamp-1" }, { id: "rice-1", foodId: "rice", locationId: "location_pantry", quantity: 2, unit: "kg", status: "available", updatedAt: "stamp-1" });
  for (const id of ["nutrition.inventory.add", "nutrition.inventory.restock"]) {
    const { task } = await pipeline.prepare("Dopuni 1 l mleka u frižider; dodaj 2 kg pirinča u ostavu", null, id);
    assert.equal(task.status, "collecting");
    assert.equal(task.parseProblem, "splitItems");
  }
  assert.equal(f.calls.save + f.calls.restock, 0);
});

test("original multi-item request also isolates spans with the existing system food seed", async () => {
  const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/data/foods.seed.js"), "utf8"), f.root);
  f.foods.splice(0, f.foods.length, ...f.root.MentorNutritionFoodSeed.foods);
  let { task } = await pipeline.prepare("prazne su, da li možeš da mi dodaš sledeće zalihe, jaja 10 komada, 400 grama integralnog hleba, jaja stavi u frižider a hleb u ostavu", null, "nutrition.inventory.add");
  if (task.pendingItemId === task.items[0].id) ({ task } = await pipeline.prepare("Jaje, celo, sirovo", task, "nutrition.inventory.add"));
  if (task.pendingItemId === task.items[1].id) ({ task } = await pipeline.prepare("Integralni hleb", task, "nutrition.inventory.add"));
  assert.equal(task.status, "proposed");
  assert.deepEqual(itemValues(task), [["food_egg_whole_raw", 10, "kom", "location_fridge"], ["food_bread_whole_wheat", 400, "g", "location_pantry"]]);
});

test("punctuated inventory suffix never becomes a food and does not supply a missing location", async () => {
  for (const suffix of ["u zalihe.", "u zalihe!", "u zalihe?", "u zalihe", "in inventory."]) {
    const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/data/foods.seed.js"), "utf8"), f.root);
    f.foods.splice(0, f.foods.length, ...f.root.MentorNutritionFoodSeed.foods);
    let { task } = await pipeline.prepare("unesi 400 grama belog pirinca, 500 grama integralnog hleba, " + suffix, null, "nutrition.inventory.add");
    assert.equal(task.items.length, 2, suffix);
    assert.deepEqual(itemValues(task).map(item => item.slice(1)), [[400, "g", null], [500, "g", null]]);
    assert.equal(task.status, "collecting");
    assert.equal(f.calls.save, 0);
    ({ task } = await pipeline.prepare("Ostava", task, "nutrition.inventory.add"));
    if (task.items[1].foodChoices) ({ task } = await pipeline.prepare("Integralni hleb", task, "nutrition.inventory.add"));
    ({ task } = await pipeline.prepare("Ostava", task, "nutrition.inventory.add"));
    assert.equal(task.status, "proposed");
    assert.equal(f.calls.save, 0);
    const saved = await f.repository.setActiveTask("chat", task, null);
    await pipeline.confirm(f.repository, "chat", task.id, saved.version);
    assert.deepEqual(f.batches.map(item => [item.foodId, item.quantity, item.unit, item.locationId]), [["food_rice_white_dry", 400, "g", "location_pantry"], ["food_bread_whole_wheat", 500, "g", "location_pantry"]]);
  }
});

test("a pure trailing location applies to the whole list without creating another item", async () => {
  for (const [suffix, locationId] of [["u frižider.", "location_fridge"], ["frižider!", "location_fridge"], ["u ostavu?", "location_pantry"], ["ostava.", "location_pantry"], ["u zalihe u frižider.", "location_fridge"], ["u Podrum.", "custom-1"]]) {
    const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
    f.locations.push({ id: "custom-1", name: "Podrum" });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/data/foods.seed.js"), "utf8"), f.root);
    f.foods.splice(0, f.foods.length, ...f.root.MentorNutritionFoodSeed.foods);
    let { task } = await pipeline.prepare("unesi 400 grama belog pirinca, 500 grama integralnog hleba, " + suffix, null, "nutrition.inventory.add");
    assert.equal(task.parseProblem, undefined, suffix);
    assert.equal(task.items.length, 2, suffix);
    if (task.items[1].foodChoices) ({ task } = await pipeline.prepare("Integralni hleb", task, "nutrition.inventory.add"));
    assert.equal(task.status, "proposed", suffix);
    assert.deepEqual(itemValues(task), [["food_rice_white_dry", 400, "g", locationId], ["food_bread_whole_wheat", 500, "g", locationId]]);
    assert.equal(f.calls.save, 0);
    const saved = await f.repository.setActiveTask("chat", task, null);
    await pipeline.confirm(f.repository, "chat", task.id, saved.version);
    assert.equal(f.batches.length, 2);
    assert.ok(f.batches.every(item => item.locationId === locationId));
  }
});

test("a shared trailing location never overrides conflicting explicit locations or guesses ambiguous binding", async () => {
  for (const request of ["Dodaj 2 kg pirinča u ostavu, 1 l mleka, u frižider.", "Dodaj 2 kg pirinča, 1 l mleka, u frižider ili ostavu.", "Dodaj 2 kg pirinča, 1 l mleka, u Podrum nepoznatica."]) {
    const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
    f.locations.push({ id: "custom-1", name: "Podrum" });
    const { task } = await pipeline.prepare(request, null, "nutrition.inventory.add");
    assert.equal(task.parseProblem, "itemBinding", request);
    const saved = await f.repository.setActiveTask("chat", task, null);
    await assert.rejects(pipeline.confirm(f.repository, "chat", task.id, saved.version), { code: "STALE_REQUEST" });
    assert.equal(f.calls.save, 0);
  }
});

test("inventory suffix handling retains known and unknown food tails with missing quantities", async () => {
  for (const tail of ["u zalihe jaja.", "u zalihe nepoznatica.", "jaja u frižider."]) {
    const f = multiFixture(), pipeline = f.root.MentorWritePipeline;
    const { task } = await pipeline.prepare("Dodaj 2 kg pirinča u ostavu, 1 l mleka u frižider, " + tail, null, "nutrition.inventory.add");
    assert.equal(task.items.length, 3, tail);
    assert.equal(task.items[2].quantity, undefined);
    assert.equal(task.status, "collecting");
    assert.equal(f.calls.save, 0);
  }
});

test("write capabilities require registration, schema, permission and explicit confirmation", async () => {
  const f = fixture(), api = f.root.MentorCapabilityRegistry;
  for (const id of ["nutrition.inventory.add", "nutrition.inventory.restock"]) {
    const capability = api.get(id);
    assert.equal(capability.type, "write");
    assert.equal(capability.module, "nutrition");
    assert.equal(capability.permissions.localWrite, "nutrition.inventory");
  }
  const input = { foodId: "rice", locationId: "location_pantry", quantity: 2, unit: "kg" };
  await assert.rejects(api.execute("nutrition.inventory.add", input, { authorize: () => true }), { code: "CAPABILITY_CONFIRMATION_REQUIRED" });
  await assert.rejects(api.execute("nutrition.inventory.add", input, { confirmed: true, authorize: () => false }), { code: "CAPABILITY_PERMISSION_DENIED" });
  await assert.rejects(api.execute("nutrition.inventory.add", { ...input, extra: true }, { confirmed: true, authorize: () => true }), { code: "INVALID_CAPABILITY_INPUT" });
  await assert.rejects(api.execute("nutrition.inventory.add", { ...input, quantity: Infinity }, { confirmed: true, authorize: () => true }), { code: "INVALID_CAPABILITY_INPUT" });
  assert.equal(f.calls.save, 0);
});

test("router chooses local inventory writes and leaves existing Mentor actions alone", async () => {
  const f = fixture(), router = f.root.MentorIntelligenceRouter;
  for (const phrase of ["Dodaj 2 kg pirinča u ostavu.", "Kupio sam 10 jaja, stavi ih u frižider."]) assert.equal((await router.decide(phrase)).capability.id, "nutrition.inventory.add");
  for (const phrase of ["Dopuni mleko za dva litra.", "Dodaj još pola kilograma ovsenih pahuljica.", "Imam još tri konzerve pasulja."]) assert.equal((await router.decide(phrase)).capability.id, "nutrition.inventory.restock");
  for (const phrase of ["Napravi recept za palačinke", "add recipie with 200 g onion", "Dodaj obrok u plan", "Kreiraj cilj", "Dodaj ideju"]) assert.equal((await router.decide(phrase)).mode, "chat");
  assert.equal((await router.decide("Oduzmi - 2 kg pirinča i dodaj 2 kutije mleka")).reason, "inventoryMixedWrite");
  assert.equal(f.calls.cloud, 0);
});

test("inventory writer does not intercept Serbian plural recipe creation", async () => {
  const f = fixture();
  assert.equal((await f.root.MentorIntelligenceRouter.decide("Napravi 5 recepata sa piletinom")).mode, "chat");
  assert.equal(f.calls.cloud, 0);
});

test("ambiguous inventory intent needs cloud permission and can only select a registered write", async () => {
  const f = fixture(), router = f.root.MentorIntelligenceRouter;
  let denied = await router.decide("Dodaj pirinač", { authorizeCloud: () => false });
  assert.equal(denied.mode, "clarify");
  assert.equal(f.calls.cloud, 0);
  f.root.MentorChatClient.route = async () => { f.calls.cloud++; return { capabilityId: "nutrition.inventory.add" }; };
  const allowed = await router.decide("Dodaj pirinač", { authorizeCloud: () => true });
  assert.equal(allowed.mode, "write");
  assert.equal(allowed.capability.id, "nutrition.inventory.add");
  assert.equal(f.calls.cloud, 1);
  f.root.MentorChatClient.route = async () => ({ capabilityId: "nutrition.inventory.delete" });
  denied = await router.decide("Dodaj pirinač", { authorizeCloud: () => true });
  assert.equal(denied.mode, "clarify");
});

test("new batch asks for missing location, accepts correction, and persists only after confirmation", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  const first = await pipeline.prepare("Dodaj 2 kg pirinča.", null, "nutrition.inventory.add");
  assert.equal(first.task.status, "collecting");
  const second = await pipeline.prepare("U ostavu.", first.task, "nutrition.inventory.add");
  assert.equal(second.task.status, "proposed");
  const corrected = await pipeline.prepare("Ispravi na 3 kg.", second.task, "nutrition.inventory.add");
  assert.equal(corrected.task.quantity, 3);
  assert.equal(corrected.task.status, "proposed");
  assert.equal(f.batches.length, 0);
  const savedTask = await f.repository.setActiveTask("chat", corrected.task, null);
  const [a, b] = await Promise.all([pipeline.confirm(f.repository, "chat", savedTask.id), pipeline.confirm(f.repository, "chat", savedTask.id)]);
  assert.equal(a.task.status, "succeeded");
  assert.equal(b.task.status, "succeeded");
  assert.equal(f.calls.save, 1);
  assert.equal(f.batches[0].quantity, 3);
  await pipeline.confirm(f.repository, "chat", savedTask.id);
  assert.equal(f.calls.save, 1);
});

test("new batch keeps a stated expiry date in preview, service input and saved result", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  const prepared = await pipeline.prepare("Dodaj 6 kom pirinča u ostavu, rok upotrebe 31/10/2026.", null, "nutrition.inventory.add");
  assert.equal(prepared.task.status, "proposed");
  assert.equal(prepared.task.expiryDate, "2026-10-31");
  assert.equal(prepared.task.preview.includes("2026-10-31"), true);
  await f.repository.setActiveTask("chat", prepared.task, null);
  await pipeline.confirm(f.repository, "chat", prepared.task.id);
  assert.equal(f.batches[0].expiryDate, "2026-10-31");
  const invalid = await pipeline.prepare("Dodaj 6 kom pirinča u ostavu, rok 31/02/2026.", null, "nutrition.inventory.add");
  assert.equal(invalid.task.status, "collecting");
  const multiple = await pipeline.prepare("Dodaj 6 kom pirinča u ostavu, rok 31/10/2026 i 04/11/2026.", null, "nutrition.inventory.add");
  assert.equal(multiple.task.status, "collecting");
  const withoutDate = await pipeline.prepare("Dodaj 6 kom pirinča u ostavu.", null, "nutrition.inventory.add");
  const datedFollowUp = await pipeline.prepare("rok 31.10.2026 godine", withoutDate.task, "nutrition.inventory.add");
  assert.equal(datedFollowUp.task.status, "proposed");
  assert.equal(datedFollowUp.task.quantity, 6);
  assert.equal(datedFollowUp.task.expiryDate, "2026-10-31");
  assert.equal(f.calls.save, 1);
});

test("restock selects an exact batch and verifies updated quantity", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  f.batches.push({ id: "first", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available", updatedAt: "stamp-1" });
  let prepared = await pipeline.prepare("Dopuni mleko za dva litra.", null, "nutrition.inventory.restock");
  assert.equal(prepared.task.status, "proposed");
  assert.equal(prepared.task.preview.includes("first"), false);
  assert.equal(prepared.task.preview.includes("2 l"), true);
  await f.repository.setActiveTask("chat", prepared.task, null);
  const result = await pipeline.confirm(f.repository, "chat", prepared.task.id);
  assert.equal(result.task.status, "succeeded");
  assert.equal(f.batches[0].quantity, 4);
  assert.equal(f.calls.restock, 1);
});

test("concurrent Mentor restocks of one batch serialize and reject the stale second preview", async () => {
  const f = fixture();
  f.batches.push({ id: "first", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available", updatedAt: "stamp-1" });
  let tail = Promise.resolve();
  f.root.navigator = { locks: { request(_name, _options, callback) { const next = tail.then(callback); tail = next.catch(() => {}); return next; } } };
  const input = { foodId: "milk", locationId: "location_fridge", quantity: 1, unit: "l", batchId: "first", expectedQuantity: 2, expectedUpdatedAt: "stamp-1" };
  const outcomes = await Promise.allSettled([
    f.root.MentorCapabilityRegistry.execute("nutrition.inventory.restock", input, { confirmed: true, authorize: () => true }),
    f.root.MentorCapabilityRegistry.execute("nutrition.inventory.restock", input, { confirmed: true, authorize: () => true })
  ]);
  assert.equal(outcomes.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(outcomes.find(item => item.status === "rejected").reason.code, "INVENTORY_CHANGED");
  assert.equal(f.calls.restock, 1);
  assert.equal(f.batches[0].quantity, 3);
});

test("multiple foods or batches require a choice; unknown food never writes", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  f.foods.push({ id: "rice-other", defaultName: "Pirinač integralni", status: "active" });
  const ambiguous = await pipeline.prepare("Dodaj 1 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  assert.equal(ambiguous.task.foodChoices.length, 2);
  const selected = await pipeline.prepare("2", ambiguous.task, "nutrition.inventory.add");
  assert.equal(selected.task.foodId, "rice-other");
  assert.equal(selected.task.quantity, 1);
  assert.equal(selected.task.locationId, "location_pantry");
  assert.equal(selected.task.status, "proposed");
  const clickedFood = await pipeline.prepare(`2. ${ambiguous.task.foodChoices[1].name}`, ambiguous.task, "nutrition.inventory.add");
  assert.equal(clickedFood.task.foodId, "rice-other");
  assert.equal(clickedFood.task.quantity, 1);
  const unknown = await pipeline.prepare("Dodaj 1 kg nepostojeće u ostavu.", null, "nutrition.inventory.add");
  assert.equal(unknown.task.status, "collecting");
  assert.equal(unknown.reply.includes("noCatalogMatch"), true);
  const followUp = await pipeline.prepare("sparkinjona i simtek", unknown.task, "nutrition.inventory.add");
  assert.equal(followUp.reply.includes("noCatalogMatch"), true);
  assert.equal(f.calls.save, 0);
  f.batches.push({ id: "first", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available", updatedAt: "stamp-1" });
  f.batches.push({ id: "second", foodId: "milk", locationId: "location_fridge", quantity: 1, unit: "l", status: "available", updatedAt: "stamp-1" });
  const choices = await pipeline.prepare("Dopuni mleko za 1 l.", null, "nutrition.inventory.restock");
  assert.equal(choices.task.batchChoices.length, 2);
  const chosen = await pipeline.prepare("2", choices.task, "nutrition.inventory.restock");
  assert.equal(chosen.task.batchId, "second");
  assert.equal(chosen.task.status, "proposed");
  assert.equal(chosen.task.preview.includes("second"), false);
  const clickedBatch = await pipeline.prepare(`2. ${choices.task.batchChoices[1].name}`, choices.task, "nutrition.inventory.restock");
  assert.equal(clickedBatch.task.batchId, "second");
  assert.equal(clickedBatch.task.quantity, 1);
  f.batches[1].quantity = 2;
  const indistinguishable = await pipeline.prepare("Dopuni mleko za 1 l.", null, "nutrition.inventory.restock");
  assert.equal(indistinguishable.task.status, "collecting");
  assert.equal(indistinguishable.task.batchChoices, null);
});

test("large or visually indistinguishable candidate sets never silently omit a choice", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  for (let i = 0; i < 9; i++) f.foods.push({ id: "rice-" + i, defaultName: "Pirinač varijanta " + i, status: "active" });
  const tooManyFoods = await pipeline.prepare("Dodaj 1 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  assert.equal(tooManyFoods.task.status, "collecting");
  assert.equal(tooManyFoods.task.foodChoices, undefined);
  f.foods.splice(2);
  f.foods.push({ id: "rice-copy", defaultName: "Pirinač", status: "active" });
  const sameFoods = await pipeline.prepare("Dodaj 1 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  assert.equal(sameFoods.task.foodChoices, null);
  const existing = await pipeline.prepare("Dodaj 1 kg mleka u frižider.", null, "nutrition.inventory.add");
  const ambiguousCorrection = await pipeline.prepare("Ispravi na pirinač.", existing.task, "nutrition.inventory.add");
  assert.equal(ambiguousCorrection.task.foodId, null);
  f.foods.splice(2);
  for (let i = 0; i < 9; i++) f.batches.push({ id: "batch-" + i, foodId: "milk", locationId: "location_fridge", quantity: i + 1, unit: "l", status: "available", updatedAt: "stamp-1" });
  const tooManyBatches = await pipeline.prepare("Dopuni mleko za 1 l.", null, "nutrition.inventory.restock");
  assert.equal(tooManyBatches.task.status, "collecting");
  assert.equal(tooManyBatches.task.batchChoices, undefined);
  assert.equal(f.calls.save + f.calls.restock, 0);
});

test("invalid quantities, unsupported units and package counts stay uncommitted", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  const negative = await pipeline.prepare("Dodaj -2 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  assert.equal(negative.task.status, "collecting");
  assert.equal(negative.reply.includes("quantity"), true);
  const spacedNegative = await pipeline.prepare("Dodaj - 2 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  assert.equal(spacedNegative.task.status, "collecting");
  const unit = await pipeline.prepare("Dodaj 2 kutije pirinča u ostavu.", null, "nutrition.inventory.add");
  assert.equal(unit.task.status, "collecting");
  assert.equal(unit.reply.includes("unit"), true);
  const valid = await pipeline.prepare("Dodaj 2 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  const badCorrection = await pipeline.prepare("Ispravi na 3 kutije.", valid.task, "nutrition.inventory.add");
  assert.equal(badCorrection.task.status, "collecting");
  assert.equal(badCorrection.task.quantity, null);
  const cans = await pipeline.prepare("Imam još tri konzerve mleka.", null, "nutrition.inventory.restock");
  assert.equal(cans.task.packageCount, 3);
  assert.equal(cans.task.status, "collecting");
  assert.equal(f.calls.save + f.calls.restock, 0);
});

test("cancel, dismiss, stale preview and failed execution leave no automatic retry", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  const cancelled = await pipeline.prepare("Odustani", { id: "old", capabilityId: "nutrition.inventory.add", status: "collecting" }, "nutrition.inventory.add");
  assert.equal(cancelled.task, null);
  const proposed = await pipeline.prepare("Dodaj 1 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  await f.repository.setActiveTask("chat", proposed.task, null);
  await pipeline.dismiss(f.repository, "chat", proposed.task.id);
  await assert.rejects(pipeline.confirm(f.repository, "chat", proposed.task.id), { code: "STALE_REQUEST" });
  assert.equal(f.calls.save, 0);
  const next = await pipeline.prepare("Dodaj 1 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  await f.repository.setActiveTask("chat", next.task, f.conversation.activeTask.version);
  f.locations.splice(0, 1);
  await assert.rejects(pipeline.confirm(f.repository, "chat", next.task.id), { code: "INVENTORY_CHANGED" });
  assert.equal(f.calls.save, 0);
  f.locations.unshift({ id: "location_pantry", name: "Ostava" });
  const service = f.root.MentorInventoryService;
  service.saveBatch = async () => { f.calls.save++; throw new Error("storage failed"); };
  await assert.rejects(pipeline.confirm(f.repository, "chat", next.task.id), /storage failed/);
  assert.equal(f.conversation.activeTask.status, "uncertain");
  await pipeline.confirm(f.repository, "chat", next.task.id);
  assert.equal(f.calls.save, 1);
});

test("changed batch before approval is rejected; lost success receipt does not repeat an add", async () => {
  const f = fixture(), pipeline = f.root.MentorWritePipeline;
  f.batches.push({ id: "first", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available", updatedAt: "stamp-1" });
  const restock = await pipeline.prepare("Dopuni mleko za 1 l.", null, "nutrition.inventory.restock");
  await f.repository.setActiveTask("chat", restock.task, null);
  f.batches[0].quantity = 3;
  await assert.rejects(pipeline.confirm(f.repository, "chat", restock.task.id), { code: "INVENTORY_CHANGED" });
  assert.equal(f.calls.restock, 0);
  const add = await pipeline.prepare("Dodaj 1 kg pirinča u ostavu.", null, "nutrition.inventory.add");
  await f.repository.setActiveTask("chat", add.task, f.conversation.activeTask.version);
  const originalSet = f.repository.setActiveTask;
  let failed = false;
  f.repository.setActiveTask = async (...args) => {
    if (args[1]?.status === "succeeded" && !failed) { failed = true; throw new Error("receipt failed"); }
    return originalSet(...args);
  };
  await assert.rejects(pipeline.confirm(f.repository, "chat", add.task.id), /receipt failed/);
  assert.equal(f.calls.save, 1);
  assert.equal(f.conversation.activeTask.status, "uncertain");
  await pipeline.confirm(f.repository, "chat", add.task.id);
  assert.equal(f.calls.save, 1);
});

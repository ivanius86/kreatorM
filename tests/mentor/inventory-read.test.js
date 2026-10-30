const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const protocol = require("../../js/mentor/mentor-protocol.js");

function fixture() {
  const locations = [
    { id: "location_fridge", name: "Frižider", builtInKey: "fridge" },
    { id: "location_freezer", name: "Zamrzivač", builtInKey: "freezer" },
    { id: "location_pantry", name: "Ostava", builtInKey: "pantry" }
  ];
  const batches = [
    { id: "milk", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available" },
    { id: "berries", foodId: "berries", locationId: "location_freezer", quantity: 500, unit: "g", status: "available" },
    { id: "rice", foodId: "rice", locationId: "location_pantry", quantity: 1, unit: "kg", status: "available" },
    { id: "old", foodId: "old", locationId: "location_fridge", quantity: 200, unit: "g", expiryDate: "2020-01-01", status: "available" }
  ];
  const allocations = [{ id: "reservation", inventoryBatchId: "milk", reservedQuantity: 500, unit: "ml", status: "reserved" }];
  let reads = 0; let writes = 0; let loads = 0;
  const context = vm.createContext({ console, Intl, Date, Map, Set });
  context.window = context;
  context.addEventListener = () => {};
  context.MentorI18n = { getLanguage: () => "sr", t: key => key };
  context.MentorLazy = { async loadFeature(name) { assert.equal(name, "nutrition"); loads++; } };
  context.MentorFoodRepository = { getAll: () => [{ id: "milk", defaultName: "Mleko" }, { id: "berries", defaultName: "Bobice" }, { id: "rice", defaultName: "Pirinač" }, { id: "old", defaultName: "Staro" }] };
  context.MentorInventoryRepository = {
    getLocations: () => { reads++; return locations.map(row => ({ ...row })); },
    getBatches: () => { reads++; return batches.map(row => ({ ...row })); },
    getAllocations: () => { reads++; return allocations.map(row => ({ ...row })); },
    getPreferences: () => [],
    updateBatch: () => { writes++; throw new Error("unexpected write"); }
  };
  const files = ["js/nutrition/services/unit-conversion.service.js", "js/nutrition/services/inventory.service.js", "js/mentor/mentor-capability-registry.js", "js/mentor/mentor-nutrition-inventory-read.js"];
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), context);
  return { api: context.MentorCapabilityRegistry, batches, allocations, getReads: () => reads, getWrites: () => writes, getLoads: () => loads };
}

test("registry exposes the bounded Nutrition read capability", () => {
  const { api } = fixture();
  const item = api.get("nutrition.inventory.getSummary");
  assert.equal(item.module, "nutrition");
  assert.equal(item.type, "read");
  assert.equal(item.permissions.localRead, "nutrition.inventory");
  assert.equal(item.permissions.cloudShare, false);
  assert.equal(api.get("nutrition.inventory.write"), null);
});

test("recognizes Serbian and English inventory questions and locations", () => {
  const { api } = fixture();
  for (const [text, location] of [
    ["Koliko namirnica imam u frižideru?", "fridge"],
    ["Šta imam u zamrzivaču?", "freezer"],
    ["Koliko zaliha imam u ostavi?", "pantry"],
    ["What do I have in the freezer?", "freezer"]
  ]) assert.equal(api.resolve(text).input.locationQuery, location);
  assert.equal(api.resolve("Koje namirnice su mi trenutno dostupne?").input.availableOnly, true);
  assert.equal(api.resolve("A u frižideru?", { followUpInventory: true }).input.locationQuery, "fridge");
  assert.equal(api.resolve("A u garaži?", { followUpInventory: true }).input.locationQuery, "garazi");
  assert.equal(api.resolve("Dodaj mleko u frižider"), null);
});

test("reads actual batch quantities, converted reservations, availability and expiry without writes", async () => {
  const f = fixture();
  const before = JSON.stringify([f.batches, f.allocations]);
  const result = await f.api.execute("nutrition.inventory.getSummary", { locationQuery: "fridge", availableOnly: false }, { authorize: async () => true });
  const milk = result.locations[0].items.find(row => row.foodId === "milk");
  assert.equal(milk.quantity, 2);
  assert.equal(milk.reserved, 0.5);
  assert.equal(milk.available, 1.5);
  assert.equal(result.locations[0].items.find(row => row.foodId === "old").available, 0);
  assert.equal(result.locations.length, 1);
  assert.equal(JSON.stringify([f.batches, f.allocations]), before);
  assert.equal(f.getWrites(), 0);
  assert.equal(f.getLoads(), 1);
  const available = await f.api.execute("nutrition.inventory.getSummary", { availableOnly: true }, { authorize: async () => true });
  assert.equal(available.locations[0].foodCount, 1);
  assert.equal(available.locations[1].items[0].name, "Bobice");
});

test("unknown locations, empty locations and denied permission are handled without reads or writes", async () => {
  const f = fixture();
  const unknown = await f.api.execute("nutrition.inventory.getSummary", { locationQuery: "garaži" }, { authorize: () => true });
  assert.equal(unknown.status, "unknown_location");
  f.batches.splice(0);
  const empty = await f.api.execute("nutrition.inventory.getSummary", { locationQuery: "pantry" }, { authorize: () => true });
  assert.equal(empty.locations[0].foodCount, 0);
  const reads = f.getReads();
  await assert.rejects(f.api.execute("nutrition.inventory.getSummary", {}, { authorize: () => false }), { code: "CAPABILITY_PERMISSION_DENIED" });
  assert.equal(f.getReads(), reads);
  assert.equal(f.getWrites(), 0);
  await assert.rejects(f.api.execute("nutrition.inventory.getSummary", { unexpected: true }, { authorize: () => true }), { code: "INVALID_CAPABILITY_INPUT" });
});

test("secondary cloud contexts exclude local inventory turns and preserve the prior plan draft", () => {
  const context = vm.createContext({ console, MentorChatProtocol: protocol });
  context.window = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor/mentor-action-adapters.js"), "utf8"), context);
  const rows = [
    { id: "plan", role: "user", text: "Napravi plan ishrane", sequence: 0 },
    { id: "plan_reply", role: "assistant", replyTo: "plan", text: "Koliko dana?", sequence: 1, mealPlanDraft: { status: "ask" } },
    { id: "private", role: "user", text: "Koliko imam 13 kg namirnica u frižideru, vegan?", sequence: 2 },
    { id: "private_reply", role: "assistant", replyTo: "private", text: "13 kg dostupno", sequence: 3, contextPolicy: "local-only" },
    { id: "failed", role: "user", text: "Privatno 99 kg", sequence: 4, status: "error", contextPolicy: "local-only" },
    { id: "current", role: "user", text: "Plan za dva dana", sequence: 5 }
  ];
  const cloudRows = context.MentorActionAdapters.cloudRows(rows);
  assert.equal(cloudRows.length, 3);
  assert.equal(cloudRows.filter(row => row.role === "assistant").at(-1).mealPlanDraft.status, "ask");
  assert.equal(JSON.stringify(context.MentorActionAdapters.mealPlanContext("Plan za dva dana", rows)).includes("13 kg"), false);
  assert.equal(JSON.stringify(context.MentorActionAdapters.mealPlanContext("Plan za dva dana", rows)).includes("99 kg"), false);
  assert.equal(protocol.conversationConstraints(cloudRows).vegan, false);
});
test("saved plan context exposes only approved slots for a pancake follow-up", () => {
  const context = vm.createContext({ console, MentorChatProtocol: protocol });
  context.window = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor/mentor-action-adapters.js"), "utf8"), context);
  const plan = { days: 3, startDate: "2026-10-29", mealTypes: ["lunch"], servings: 1, includeRecipes: true };
  const rows = [
    { id: "unrelated", role: "user", text: "Privatni detalj iz ranijeg razgovora", sequence: 0 },
    { id: "origin", role: "user", text: "Isplaniraj 3 dana, koristi sacuvane recepte", sequence: 1 },
    { id: "plan", role: "assistant", text: "Predlog plana", sequence: 2, intent: { sourceMessageId: "origin", mealPlan: plan }, proposals: [
      { id: "lunch1", action: "createMealPlanEntry", plannedDate: "2026-10-29", mealType: "lunch" },
      { id: "lunch2", action: "createMealPlanEntry", plannedDate: "2026-10-30", mealType: "lunch" }
    ], actionStates: { lunch1: { status: "approved" }, lunch2: { status: "dismissed" } } },
    { id: "extension", role: "user", text: "napravi mi i za dorucak i veceru", sequence: 3 },
    { id: "question", role: "assistant", text: "Palačinke?", sequence: 4 },
    { id: "answer", role: "user", text: "moze palacinke", sequence: 5 }
  ];
  const previous = context.MentorActionAdapters.lastSavedPlan(rows);
  assert.equal(previous.sourceMessageId, "origin");
  assert.equal(previous.occupiedSlots.length, 1);
  assert.equal(previous.occupiedSlots[0].mealType, "lunch");
  const conversation = context.MentorActionAdapters.mealPlanContext("moze palacinke", rows);
  assert.deepEqual(Array.from(conversation, row => row.id), ["origin", "extension", "answer"]);
});
test("pancake answer refreshes only the saved recipe list for the active plan", async () => {
  const context = vm.createContext({ console, MentorChatProtocol: protocol });
  context.window = context;
  let loads = 0, reads = 0;
  context.MentorLazy = { async loadFeature(name) { assert.equal(name, "nutrition"); loads++; } };
  context.MentorPlanningRepository = { getRecipes() { reads++; return [{ id: "saved-pancakes", name: "Palačinke", servings: 1, mealType: "breakfast" }]; } };
  context.MentorPlanningService = { assertConstraints() {} };
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor/mentor-action-adapters.js"), "utf8"), context);
  const rows = [{ id: "extension", role: "user", text: "napravi mi i za dorucak i veceru" }, { id: "answer", role: "user", text: "moze palacinke" }];
  const recipes = await context.MentorActionAdapters.prepareContext("moze palacinke", rows);
  assert.equal(recipes[0].id, "saved-pancakes");
  assert.equal(loads, 1);
  assert.equal(reads, 1);
  assert.equal((await context.MentorActionAdapters.prepareContext("moze palacinke", [{ id: "answer", role: "user", text: "moze palacinke" }])).length, 0);
  assert.equal(reads, 1);
});

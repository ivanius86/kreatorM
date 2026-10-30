const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function setup() {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  let persisted = { batches:[], locations:[], allocations:[], preferences:[], stores:[], migrations:[] };
  let failSave = false;
  const context = vm.createContext({ console });
  context.window = context;
  context.addEventListener = () => {};
  context.MentorFoodRepository = { getAll:() => [] };
  let sequence = 0;
  context.MentorNutritionId = { create:(prefix) => `${prefix}-${++sequence}` };
  context.MentorData = { repositories:{ nutritionInventoryData:{
    initialize:async () => {}, migrateLegacyIfNeeded:async () => {}, isReady:() => true,
    getEnvelope:() => clone(persisted),
    saveEnvelope:async (envelope) => { if (failSave) throw new Error("SAVE_FAILED"); persisted = clone(envelope); return clone(persisted); }
  } } };
  const load = (file) => vm.runInContext(fs.readFileSync(path.resolve(__dirname,"../../js/nutrition",file),"utf8"), context);
  load("repositories/inventory.repository.js");
  load("services/inventory.service.js");
  await context.MentorInventoryRepository.initialize();
  return { context, reload:async () => { load("repositories/inventory.repository.js"); await context.MentorInventoryRepository.initialize(); }, snapshot:() => clone(persisted), failWrites:() => { failSave = true; } };
}

test("deleting a built-in location persists and initialization does not restore it", async () => {
  const { context, reload, snapshot } = await setup();
  await context.MentorInventoryRepository.removeLocation("location_fridge");
  assert.equal(context.MentorInventoryRepository.getLocationById("location_fridge"), null);
  assert.ok(snapshot().locations.find((location) => location.id === "location_fridge").deletedAt);
  await reload();
  assert.equal(context.MentorInventoryRepository.getLocations().length, 2);
  assert.equal(context.MentorInventoryRepository.getLocationById("location_fridge"), null);
  assert.equal(context.MentorInventoryService.getDefaultsForFood("food").locationId, "location_freezer");
});

test("location deletion protects every inventory batch and the final active location", async () => {
  const { context, snapshot } = await setup();
  const repo = context.MentorInventoryRepository;
  await repo.createBatch({ id:"used", locationId:"location_fridge", quantity:0, status:"consumed" });
  const previous = snapshot();
  assert.throws(() => repo.removeLocation("location_fridge"), /LOCATION_IN_USE/);
  assert.deepEqual(snapshot(), previous);
  await repo.removeLocation("location_freezer");
  await repo.removeLocation("location_pantry");
  await repo.removeBatch("used");
  assert.throws(() => repo.removeLocation("location_fridge"), /LOCATION_LAST_REMAINING/);
  assert.equal(repo.getLocations().length, 1);
});

test("deleting a preferred custom location clears its preference and chooses an active default", async () => {
  const { context, reload } = await setup();
  const repo = context.MentorInventoryRepository;
  const custom = await repo.createLocation({ name:"Travel bag" });
  await repo.setPreference({ foodId:"food", preferredLocationId:custom.id });
  assert.equal(context.MentorInventoryService.getDefaultsForFood("food").locationId, custom.id);
  await repo.removeLocation(custom.id);
  await reload();
  assert.equal(context.MentorInventoryRepository.getPreferences()[0].preferredLocationId, null);
  assert.equal(context.MentorInventoryService.getDefaultsForFood("food").locationId, "location_fridge");
});

test("a failed location deletion leaves the durable location and preferences intact", async () => {
  const { context, snapshot, failWrites } = await setup();
  await context.MentorInventoryRepository.setPreference({ foodId:"food", preferredLocationId:"location_fridge" });
  const previous = snapshot();
  failWrites();
  await assert.rejects(context.MentorInventoryRepository.removeLocation("location_fridge"), /SAVE_FAILED/);
  assert.deepEqual(snapshot(), previous);
  assert.ok(context.MentorInventoryRepository.getLocationById("location_fridge"));
});

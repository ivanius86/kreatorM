(function (root) {
  "use strict";
  const registry = root.MentorCapabilityRegistry;
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase();
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  const stock = /\b(zalih\w*|namirnic\w*|frizider\w*|zamrziva\w*|ostav\w*|inventory|stock|fridge|freezer|pantry)\b/;
  const restockVerb = /\b(dopun\w*|dodaj\s+jos|imam\s+jos|restock|top\s+up|add\s+more)\b/;
  const addVerb = /\b(dodaj\w*|unes\w*|kupio\w*|kupila\w*|stavi\w*|add|bought|put)\b/;
  const forbidden = /\b(recep(?:t\w*|at\w*)|recipe\w*|recipies?|obrok\w*|meal\w*|cilj\w*|goal\w*|idej\w*|idea\w*|plan\w*|obrisi\w*|potrosi\w*|oduzmi\w*|smanji\w*|delete|consume|subtract)\b/;
  function matchAdd(text) { const value = normalize(text); return !forbidden.test(value) && !restockVerb.test(value) && addVerb.test(value) && (stock.test(value) || /\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|kom)\b/.test(value)) ? { text } : null; }
  function matchRestock(text) { const value = normalize(text); return !forbidden.test(value) && restockVerb.test(value) ? { text } : null; }
  async function add(input) {
    await root.MentorLazy.loadFeature("nutrition");
    if (!(Number.isFinite(input.quantity) && input.quantity > 0)) fail("INVALID_QUANTITY");
    const service = root.MentorInventoryService;
    const draft = { foodId: input.foodId, locationId: input.locationId, quantity: input.quantity, unit: input.unit, expiryDate: input.expiryDate || null };
    const validation = service.validateDraft(draft);
    if (!validation.valid) fail("INVENTORY_VALIDATION_FAILED");
    const food = root.MentorFoodRepository.getById(input.foodId);
    if (!food || food.status !== "active") fail("FOOD_NOT_FOUND");
    const saved = await service.saveBatch(draft);
    const verified = root.MentorInventoryRepository.getBatchById(saved.id);
    if (!verified || verified.foodId !== input.foodId || verified.locationId !== input.locationId || verified.quantity !== validation.quantity || verified.unit !== validation.unit || verified.expiryDate !== (input.expiryDate || null)) fail("INVENTORY_VERIFY_FAILED");
    return { id: verified.id, quantity: verified.quantity, unit: verified.unit, foodId: verified.foodId, locationId: verified.locationId };
  }
  async function restock(input) {
    await root.MentorLazy.loadFeature("nutrition");
    if (!(Number.isFinite(input.quantity) && input.quantity > 0)) fail("INVALID_QUANTITY");
    const execute = async () => {
      const repo = root.MentorInventoryRepository, service = root.MentorInventoryService;
      const before = repo.getBatchById(input.batchId);
      if (!before || before.foodId !== input.foodId || before.locationId !== input.locationId || before.quantity !== input.expectedQuantity || before.updatedAt !== input.expectedUpdatedAt) fail("INVENTORY_CHANGED");
      if (service.statusForBatch(before) === "expired" || before.status === "consumed") fail("INVENTORY_BATCH_UNAVAILABLE");
      const food = root.MentorFoodRepository.getById(input.foodId);
      if (!food || food.status !== "active") fail("FOOD_NOT_FOUND");
      const conversion = root.MentorNutritionUnitConversion;
      let amount; try { amount = conversion.convertForFood(input.quantity, input.unit, before.unit, food); } catch (_) { fail("INCOMPATIBLE_UNITS"); }
      if (!(Number.isFinite(amount) && amount > 0)) fail("INVALID_QUANTITY");
      const saved = await service.restock(before.id, input.quantity, input.unit);
      const verified = repo.getBatchById(before.id);
      if (!verified || verified.quantity !== saved.quantity || verified.quantity !== Math.round((before.quantity + amount + Number.EPSILON) * 1000) / 1000) fail("INVENTORY_VERIFY_FAILED");
      return { id: verified.id, quantity: verified.quantity, unit: verified.unit, foodId: verified.foodId, locationId: verified.locationId };
    };
    return root.navigator?.locks?.request ? root.navigator.locks.request("mentor-inventory-batch-" + input.batchId, { mode: "exclusive" }, execute) : execute();
  }
  const basic = { foodId: { type: "string", maxLength: 120 }, locationId: { type: "string", maxLength: 120 }, quantity: { type: "number" }, unit: { type: "string", maxLength: 20 } };
  const resolver = root.MentorNutritionInventoryResolver;
  registry.register({ id: "nutrition.inventory.add", module: "nutrition", type: "write", description: "Add a new inventory batch through Inventory Service.", inputSchema: { type: "object", properties: { ...basic, expiryDate: { type: "string", maxLength: 10 } }, required: Object.keys(basic) }, permissions: { localRead: "nutrition.inventory", localWrite: "nutrition.inventory", cloudShare: false }, match: matchAdd, prepare: (text, prior) => resolver.prepare(text, prior, "nutrition.inventory.add"), preflight: resolver.preflight, inputFor: resolver.inputFor, adapter: add });
  registry.register({ id: "nutrition.inventory.restock", module: "nutrition", type: "write", description: "Add a quantity to one existing inventory batch through Inventory Service.", inputSchema: { type: "object", properties: { ...basic, batchId: { type: "string", maxLength: 120 }, expectedQuantity: { type: "number" }, expectedUpdatedAt: { type: "string", maxLength: 80 } }, required: [...Object.keys(basic), "batchId", "expectedQuantity", "expectedUpdatedAt"] }, permissions: { localRead: "nutrition.inventory", localWrite: "nutrition.inventory", cloudShare: false }, match: matchRestock, prepare: (text, prior) => resolver.prepare(text, prior, "nutrition.inventory.restock"), preflight: resolver.preflight, inputFor: resolver.inputFor, adapter: restock });
})(window);

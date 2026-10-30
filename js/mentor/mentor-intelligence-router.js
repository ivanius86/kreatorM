(function (root) {
  "use strict";
  const registry = root.MentorCapabilityRegistry;
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase();
  const writeVerb = /\b(napravi|kreiraj|dodaj|unesi|izmeni|obrisi|ukloni|potrosi|premesti|sacuvaj|predlozi|generisi|pripremi|planiraj|isplaniraj|zelim|daj|create|make|add|save|edit|delete|remove|consume|move|schedule|suggest|generate|prepare|want|give)\b/;
  const existingAction = /\b(cilj\w*|goal\w*|idej\w*|idea\w*|recep(?:t\w*|at\w*)|recipe\w*|recipies?|obrok\w*|meal\w*|plan\w*|obrisi\w*|potrosi\w*|premesti\w*|delete|consume|move)\b/;
  const inventoryWriteHint = /\b(dodaj\w*|unes\w*|kupio\w*|kupila\w*|stavi\w*|dopun\w*|imam\s+jos|add|bought|put|restock|stock)\b/;
  const nutritionHint = /\b(namirnic\w*|hran\w*|katalog\w*|zalih\w*|frizider\w*|zamrziva\w*|ostav\w*|recept\w*|ishran\w*|obrok\w*|rucak\w*|vecer\w*|dorucak\w*|protein\w*|nutrit\w*|food\w*|catalog|inventory|stock|fridge|freezer|pantry|recipe\w*|meal\w*|lunch|dinner|breakfast)\b/;
  function fallbackInput(capability, text) {
    return capability.extract ? capability.extract(text) : { text };
  }
  function local(capability, input, modelRequired) {
    const missing = capability.missingInfo?.(input);
    return missing ? { mode: "clarify", reason: missing, modelRequired } : { mode: "local", capability, input, modelRequired };
  }
  function continueRead(readTask, answer) {
    if (!["nutrition.inventory.getAvailability", "nutrition.food.getProfile"].includes(readTask?.capabilityId) || !Array.isArray(readTask.candidates) || !readTask.input?.text) return null;
    const capability = registry.get(readTask.capabilityId);
    if (!capability || capability.type !== "read") return null;
    const foodId = root.MentorNutritionRead.resolveFoodChoice(readTask.candidates, answer);
    return foodId ? { mode: "local", capability, input: { ...readTask.input, foodId } } : { mode: "clarify", reason: "chooseFood", readTask };
  }
  async function decide(text, { followUpInventory = false, signal, authorizeCloud } = {}) {
    const normalized = normalize(text);
    if (/\b(oduzmi\w*|smanji\w*|potrosi\w*|consume|subtract)\b/.test(normalized) && /\b(zalih\w*|namirnic\w*|frizider\w*|zamrziva\w*|ostav\w*|inventory|stock|kg|g|ml|l|kom)\b/.test(normalized)) return { mode: "clarify", reason: "inventoryMixedWrite", modelRequired: false };
    const matches = registry.matches(text, { followUpInventory });
    const foodCreation = matches.find(item => item.capability.id === "nutrition.food.create");
    if (foodCreation) return { mode: "write", capability: foodCreation.capability, input: foodCreation.input, modelRequired: false };
    const foodProfile = matches.find(item => item.capability.id === "nutrition.food.getProfile");
    if (foodProfile) return local(foodProfile.capability, foodProfile.input, false);
    const writes = matches.filter(item => item.capability.type === "write");
    if (writes.length === 1) return { mode: "write", capability: writes[0].capability, input: writes[0].input, modelRequired: false };
    if (writes.length > 1) return { mode: "clarify", reason: "ambiguous", modelRequired: false };
    if (existingAction.test(normalized) && writeVerb.test(normalized)) return { mode: "chat", modelRequired: true };
    if (writeVerb.test(normalized) && !inventoryWriteHint.test(normalized) || /\b(?:pronadji|find)\s+(?:mi|me)\s+recept\w*\b/.test(normalized)) return { mode: "chat", modelRequired: true };
    if (matches.length === 1) return local(matches[0].capability, matches[0].input, false);
    if (!matches.length && !nutritionHint.test(normalized) && !inventoryWriteHint.test(normalized)) return { mode: "chat", modelRequired: true };
    if (typeof authorizeCloud !== "function" || await authorizeCloud(text) !== true) return { mode: "clarify", reason: "cloudDenied", modelRequired: false };
    if (signal?.aborted) return { mode: "clarify", reason: "cancelled", modelRequired: false };
    const routed = await root.MentorChatClient.route(text, signal);
    if (!routed || typeof routed !== "object" || typeof routed.capabilityId !== "string") return { mode: "clarify", reason: "ambiguous", modelRequired: true };
    if (routed.capabilityId === "none") return { mode: "chat", modelRequired: true };
    if (routed.capabilityId === "clarify") return { mode: "clarify", reason: "ambiguous", modelRequired: true };
    const capability = registry.get(routed.capabilityId);
    if (!capability || capability.module !== "nutrition") return { mode: "clarify", reason: "ambiguous", modelRequired: true };
    if (capability.type === "write") return { mode: "write", capability, input: { text }, modelRequired: true };
    const matched = matches.find(item => item.capability.id === capability.id);
    return local(capability, matched?.input || fallbackInput(capability, text), true);
  }
  root.MentorIntelligenceRouter = Object.freeze({ decide, continueRead });
})(window);

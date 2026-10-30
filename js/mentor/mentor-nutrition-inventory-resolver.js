(function (root) {
  "use strict";
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase().trim();
  const t = (key, values = {}) => root.MentorI18n.t("mentor.writeInventory." + key, values);
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  const numberWords = { pola: 0.5, jedan: 1, jednu: 1, dva: 2, dve: 2, tri: 3, cetiri: 4, pet: 5, deset: 10, half: 0.5, one: 1, two: 2, three: 3, ten: 10 };
  function quantityFrom(text) {
    const value = normalize(text).replace(/\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g, " ");
    const match = value.match(/\b(\d+(?:[.,]\d+)?|pola|jedan|jednu|dva|dve|tri|cetiri|pet|deset|half|one|two|three|ten)\s*(kilogram\w*|kg|gram\w*|g|litar\w*|litr\w*|l|mililitar\w*|ml|kom\w*|jaj\w*|konzerv\w*|cans?|eggs?)\b/);
    if (!match) return /\b(?:\d+(?:[.,]\d+)?|pola|jedan|jednu|dva|dve|tri|cetiri|pet|deset|half|one|two|three|ten)\s+[a-z]{2,}\b/.test(value) ? { invalidUnit: true } : null;
    if (/(?:-\s*|\bminus\s*)$/.test(value.slice(0, match.index))) return { invalid: true };
    const amount = Number(match[1].replace(",", ".")) || numberWords[match[1]];
    const token = match[2];
    if (/^(konzerv|can)/.test(token)) return { packageCount: amount };
    const unit = /^(kilogram|kg)/.test(token) ? "kg" : /^(gram|g$)/.test(token) ? "g" : /^(mililitar|ml)/.test(token) ? "ml" : /^(litar|litr|l$)/.test(token) ? "l" : "kom";
    return { quantity: amount, unit };
  }
  function locationFrom(text, locations) {
    const selectedId = String(text || "").trim().match(/^__mentor_location__:(.+)$/)?.[1];
    if (selectedId) return locations.find(item => item.id === selectedId) || { unknown: true };
    const value = normalize(text);
    const builtIn = [["location_fridge", /\b(frizider\w*|hladnjak\w*|fridge)\b/], ["location_freezer", /\b(zamrziva\w*|freezer)\b/], ["location_pantry", /\b(ostav\w*|spajz\w*|pantry)\b/]];
    const found = builtIn.filter(([, pattern]) => pattern.test(value));
    if (found.length > 1) return { ambiguous: true };
    const id = found[0]?.[0];
    if (id) return locations.find(item => item.id === id) || { unknown: true };
    const named = locations.filter(item => { const name = normalize(item.name); return name.length > 2 && (value.includes(name) || value.includes(name.slice(0, -1))); });
    return named.length === 1 ? named[0] : named.length > 1 ? { ambiguous: true } : null;
  }
  function expiryFrom(text) {
    const dates = [...String(text).matchAll(/\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g)].map(match => match[0]);
    if (!dates.length) return null;
    if (dates.length > 1) return { problem: "multipleDates" };
    const value = normalize(text);
    if (!/\b(rok\w*|istek\w*|trajan\w*|expiry|expires?|best\s+before)\b/.test(value)) return { problem: "dateMeaning" };
    let year, month, day;
    if (/^\d{4}-/.test(dates[0])) [year, month, day] = dates[0].split("-").map(Number);
    else { [day, month, year] = dates[0].split(/[./-]/).map(Number); if (year < 100) year += 2000; }
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return { problem: "invalidDate" };
    return { value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
  }
  function options(rows) { return rows.map((item, index) => `${index + 1}. ${item.name}`).join("; "); }
  function unknownFoodQuery(text) {
    const ignored = ["dodaj", "unes", "kupio", "kupila", "stavi", "dopun", "imam", "jos", "nov", "namirnic", "paket", "zali", "ostav", "frizider", "zamrzivac", "kolicin", "gram", "kilogram", "litar", "litr", "mililitar", "komad", "konzerv", "jaj", "rok", "trajan", "istek", "upotreb", "datum", "godin", "ispravi", "umesto", "zameni", "nema", "bez", "add", "put", "stock", "inventory", "fridge", "freezer", "pantry", "expiry", "date", "the", "and", "with"];
    return (normalize(text).match(/[a-z]{4,}/g) || []).filter(word => !ignored.some(prefix => word.startsWith(prefix))).join(" ");
  }
  function taskId() { return "write-" + (root.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  const clone = value => JSON.parse(JSON.stringify(value));
  const correction = /\b(ispravi\w*|promeni\w*|umesto|ipak|zameni\w*|correct\w*|change\w*|instead|actually)\b/;
  const cancelRequest = text => /^(?:otkazi|odustani|cancel|stop)\b/.test(normalize(text));
  function selectChoice(rows, text) {
    if (!rows?.length) return null;
    const value = normalize(text);
    const ordinals = { prvi: 1, prva: 1, prvo: 1, first: 1, drugi: 2, druga: 2, drugo: 2, second: 2, treci: 3, treca: 3, third: 3 };
    const numeric = /^([1-8])(?:\s*[.)]\s*(.*))?$/.exec(value);
    const index = numeric ? Number(numeric[1]) : ordinals[value];
    if (index) {
      const item = rows[index - 1];
      return item && (!numeric?.[2] || [normalize(item.name), normalize(item.name.split(" · ")[0])].includes(numeric[2])) ? item : null;
    }
    const id = root.MentorNutritionRead.resolveFoodChoice?.(rows, text);
    return rows.find(item => item.id === id) || rows.find(item => normalize(item.name) === value) || null;
  }
  async function prepareSingle(text, prior, capabilityId) {
    if (/^(?:otkazi|odustani|cancel|stop)\b/.test(normalize(text))) return { task: null, reply: t("cancelled") };
    await root.MentorLazy.loadFeature("nutrition");
    const repo = root.MentorInventoryRepository, service = root.MentorInventoryService;
    const task = prior ? { ...prior, status: "collecting" } : { id: taskId(), capabilityId, status: "collecting", createdAt: new Date().toISOString() };
    const value = normalize(text);
    const ordinalMatch = /^\s*([1-8])(?:\s*[.)]\s*(.*))?\s*$/.exec(String(text));
    const ordinal = ordinalMatch?.[1];
    const choices = task.foodChoices || task.batchChoices;
    const selected = selectChoice(choices, text);
    if (choices?.length && !selected && !correction.test(value)) return { task, reply: t(task.foodChoices ? "chooseFood" : "chooseBatch", { options: options(choices) }) };
    const amount = ordinal || selected ? null : quantityFrom(text);
    if (amount?.invalid || amount?.invalidUnit) { task.quantity = null; task.unit = null; task.packageCount = null; return { task, reply: t("invalid", { field: amount.invalidUnit ? "unit" : "quantity" }) }; }
    if (amount?.packageCount) { task.packageCount = amount.packageCount; task.quantity = null; task.unit = null; }
    else if (amount) { task.quantity = amount.quantity; task.unit = amount.unit; task.packageCount = null; }
    const place = ordinal || selected ? null : locationFrom(text, repo.getLocations());
    if (place?.unknown || place?.ambiguous) return { task, reply: t("unknownLocation") };
    if (place) { task.locationId = place.id; task.batchId = null; }
    const expiry = ordinal || selected ? null : expiryFrom(text);
    if (expiry?.problem) { task.expiryDate = null; return { task, reply: t(expiry.problem) }; }
    if (expiry?.value && task.capabilityId.endsWith("restock")) return { task, reply: t("expiryRestockUnsupported") };
    if (expiry?.value) task.expiryDate = expiry.value;
    let foodResolved = Boolean(selected);
    if (selected && task.foodChoices?.length) {
      const item = selected;
      task.foodId = item.id; task.foodChoices = null;
    }
    else if (selected && task.batchChoices?.length) {
      const item = selected;
      task.batchId = item.id; task.batchChoices = null;
    }
    else {
      const foods = String(text).startsWith("__mentor_location__:") ? [] : root.MentorNutritionRead.foodCandidates(text);
      if (foods.length === 1) { task.foodId = foods[0].id; task.foodChoices = null; task.batchId = null; foodResolved = true; }
      else if (foods.length > 1) {
        task.foodId = null; task.batchId = null;
        if (foods.length > 8) return { task, reply: t("tooManyFoods") };
        task.foodChoices = foods.map(item => ({ id: item.id, name: [item.defaultName, item.names?.en, item.categoryId ? root.MentorI18n.t("nutrition.foodCategories." + item.categoryId) : null].filter(Boolean).join(" · ") }));
        if (new Set(task.foodChoices.map(item => item.name)).size !== task.foodChoices.length) { task.foodChoices = null; return { task, reply: t("indistinguishableFoods") }; }
        return { task, reply: t("chooseFood", { options: options(task.foodChoices) }) };
      }
    }
    const unknownQuery = unknownFoodQuery(text);
    if (!task.foodId && unknownQuery) return { task, reply: t("noCatalogMatch", { query: unknownQuery }) };
    if (task.foodId && !foodResolved && !ordinal && !amount && !place && !expiry && unknownQuery) { task.foodId = null; task.batchId = null; return { task, reply: t("noCatalogMatch", { query: unknownQuery }) }; }
    if (!task.foodId) return { task, reply: t("needFood") };
    const food = root.MentorFoodRepository.getById(task.foodId);
    if (!food || food.status !== "active") return { task, reply: t("unknownFood") };
    if (!task.quantity || !task.unit) return { task, reply: t(task.packageCount ? "needPackageSize" : "needQuantity") };
    if (task.capabilityId === "nutrition.inventory.add") {
      if (!task.locationId) return { task, reply: t("needLocation") };
      const validation = service.validateDraft(inputFor(task));
      if (!validation.valid) return { task, reply: t("invalid", { field: validation.errors[0]?.field || "?" }) };
    } else {
      const batches = repo.getBatches().filter(item => item.foodId === task.foodId && (!task.locationId || item.locationId === task.locationId) && item.status !== "consumed" && service.statusForBatch(item) !== "expired");
      if (batches.length > 8 && !task.batchId) return { task, reply: t("tooManyBatches") };
      const label = item => {
        const date = item.expiryDate ? t("batchExpiry", { date: item.expiryDate }) : item.addedAt || item.createdAt ? t("batchAdded", { date: new Date(item.addedAt || item.createdAt).toLocaleString(root.MentorI18n.getLanguage() === "sr" ? "sr-Latn-RS" : "en-GB") }) : t("batchNoDate");
        return `${item.quantity} ${item.unit} · ${repo.getLocationById(item.locationId)?.name || "?"} · ${date}`;
      };
      if (!task.batchId && batches.length > 1) {
        task.batchChoices = batches.map(item => ({ id: item.id, name: label(item) }));
        if (new Set(task.batchChoices.map(item => item.name)).size !== task.batchChoices.length) { task.batchChoices = null; return { task, reply: t("indistinguishableBatches") }; }
        return { task, reply: t("chooseBatch", { options: options(task.batchChoices) }) };
      }
      if (!task.batchId && batches.length === 1) task.batchId = batches[0].id;
      const batch = batches.find(item => item.id === task.batchId);
      if (!batch) return { task, reply: t("noBatch") };
      task.locationId = batch.locationId;
      try { if (!(root.MentorNutritionUnitConversion.convertForFood(task.quantity, task.unit, batch.unit, food) > 0)) return { task, reply: t("invalid", { field: "quantity" }) }; }
      catch (_) { return { task, reply: t("invalid", { field: "unit" }) }; }
      task.expectedQuantity = batch.quantity; task.expectedUnit = batch.unit; task.expectedUpdatedAt = batch.updatedAt; task.batchLabel = label(batch);
    }
    task.status = "proposed";
    const location = repo.getLocationById(task.locationId);
    task.preview = t(task.capabilityId.endsWith("restock") ? "previewRestock" : "previewAdd", { food: food.defaultName, quantity: task.quantity, unit: task.unit, location: location?.name || "?", batch: task.batchLabel || "", expiry: task.expiryDate ? t("expiryPreview", { date: task.expiryDate }) : t("expiryNotSet") });
    return { task, reply: t("ready") };
  }
  const MAX_ITEMS = 8;
  const subjectNoise = /^(dod|unes|kupi|stavi|dopun|ispravi|promeni|zameni|ipak|umesto|sledec|zalih|namirnic|kolicin|kilogram|gram|litar|litr|mililitar|komad|frizider|hladnjak|ostav|spajz|zamrziva|rok|istek|expiry|best|before|add|put|stock|inventory|fridge|freezer|pantry|correct|change|instead|actually|the|and|item|stavk)/;
  const subjectWords = text => (normalize(text).match(/[a-z]{3,}/g) || []).filter(word => !subjectNoise.test(word)).map(word => word.slice(0, Math.max(3, word.length - 2)));
  function matchesItem(item, text) {
    const words = subjectWords(text);
    const subject = subjectWords((item.foodName || "") + " " + item.sourceText);
    return words.some(word => subject.includes(word));
  }
  function itemTarget(items, text) {
    const numbered = normalize(text).match(/\b(?:stavk\w*|item)\s*([1-8])\b/);
    if (numbered) return items[Number(numbered[1]) - 1] || null;
    const matches = items.filter(item => matchesItem(item, text));
    return matches.length === 1 ? matches[0] : null;
  }
  function locationClauseOnly(text, location) {
    const value = normalize(text).replace(/[.!?]+$/, "").trim().replace(/^(?:(?:u|in|into|the|zalihe|stock|inventory|stavi|stavite|dodaj|dodajte|unesi|put|add)\s+)+/, "");
    if (value === normalize(location.name)) return true;
    const aliases = {
      location_fridge: /^(?:frizider(?:a|u|om)?|hladnjak(?:a|u|om)?|fridge)$/,
      location_freezer: /^(?:zamrzivac(?:a|u|em)?|freezer)$/,
      location_pantry: /^(?:ostav[auie]|spajz(?:a|u|om)?|pantry)$/
    };
    return aliases[location.id]?.test(value) || false;
  }
  function splitRequest(text, locations) {
    const parts = String(text).split(/(?<!\d),|,(?!\d)|[;\n]+|\s+(?:i|a|and)\s+/i).map(part => part.trim()).filter(Boolean);
    const entries = [], other = [];
    let problem = null;
    for (const part of parts) {
      const withoutDates = normalize(part).replace(/\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g, "");
      const quantities = [...withoutDates.matchAll(/\b(?:\d+(?:[.,]\d+)?|pola|jedan|jednu|dva|dve|tri|cetiri|pet|deset|half|one|two|three|ten)\s*[a-z]+\b/g)];
      if (quantities.length > 1) problem = "splitItems";
      if (quantityFrom(part)) entries.push({ sourceText: part, order: parts.indexOf(part) });
      else other.push(part);
    }
    // Keep food-bearing fragments without quantities, while named location and
    // expiry continuations remain attached to their existing item.
    for (const part of other) {
      if (!expiryFrom(part) && root.MentorNutritionRead.foodCandidates(part).length && (!locationFrom(part, locations) || !itemTarget(entries, part))) entries.push({ sourceText: part, order: parts.indexOf(part) });
    }
    if (entries.length < 2 && !problem) return null;
    for (const part of other) {
      if (entries.some(item => item.sourceText === part)) continue;
      const value = normalize(part).replace(/[.!?]+$/, "").trim();
      if (/^(?:(?:prazn\w*|su|je|molim|te|da|li|mozes|mozete|mi|dodas|dodaj|dodajte|sledece|ove|zalihe|namirnice|u|in|into|please|add|the|following|stock|inventory|can|you|these)\s*)+$/.test(value)) continue;
      const place = locationFrom(part, locations), expiry = expiryFrom(part);
      if (place || expiry) {
        const target = itemTarget(entries, part);
        // A pure location after the list is shared by its items. Require the
        // whole clause so unknown foods/custom-name substrings cannot vanish.
        if (!target && place?.id && !expiry && parts.indexOf(part) > Math.max(...entries.map(item => item.order)) && locationClauseOnly(part, place)) {
          if (entries.some(item => { const priorPlace = locationFrom(item.sourceText, locations); return priorPlace && priorPlace.id !== place.id; })) problem = "itemBinding";
          else for (const item of entries) if (!locationFrom(item.sourceText, locations)) item.sourceText += ", " + part;
          continue;
        }
        if (!target || place?.ambiguous || place?.unknown || expiry?.problem) { problem = "itemBinding"; continue; }
        const priorPlace = locationFrom(target.sourceText, locations);
        if (place && priorPlace && priorPlace.id !== place.id) { problem = "itemBinding"; continue; }
        target.sourceText += ", " + part;
      } else entries.push({ sourceText: part, order: parts.indexOf(part) });
    }
    if (entries.length > MAX_ITEMS) problem = "tooManyItems";
    return { entries: entries.sort((a, b) => a.order - b.order), problem };
  }
  function pendingItem(task) { return task?.items?.find(item => item.id === task.pendingItemId) || task; }
  function pendingChoices(task) {
    if (task?.pendingCorrectionText && task.items) return task.items.map((item, index) => ({ id: item.id, name: item.foodName || item.sourceText, value: "item " + (index + 1) }));
    const item = pendingItem(task);
    if (item?.foodChoices || item?.batchChoices) return item.foodChoices || item.batchChoices;
    const needsLocation = task?.status === "collecting" && task.capabilityId === "nutrition.inventory.add" && item?.foodId && item.quantity && item.unit && !item.locationId && (item.clarificationStatus === "location" || !task.items);
    if (needsLocation) return root.MentorInventoryRepository.getLocations().map(location => ({ id: location.id, name: location.name, value: "__mentor_location__:" + location.id }));
    return null;
  }
  function canContinue(task, text) {
    if (!task?.items || !["collecting", "proposed"].includes(task.status)) return false;
    const value = normalize(text);
    if (cancelRequest(text)) return true;
    if (/\b(recept\w*|recipe\w*|recipies?|obrok\w*|meal\w*|cilj\w*|goal\w*|idej\w*|idea\w*|plan\w*|potrosi\w*|obrisi\w*|consume|delete|remove|finans\w*|finance|potrosnj\w*|spend\w*|transakc\w*|transaction\w*|budzet\w*|budget\w*)\b/.test(value)) return false;
    if (correction.test(value)) return true;
    if (/\b(dod\w*|unes\w*|add|put|imam|have|pokazi|show|koliko|what|how|find|pronadji)\b/.test(value)) return false;
    if (task.pendingCorrectionText && itemTarget(task.items, text)) return true;
    const pending = task.items.find(item => item.id === task.pendingItemId);
    if (pendingChoices(task)?.length && value.split(/\s+/).length <= 6) return true;
    if (pending && value.split(/\s+/).length <= 5 && ["food", "quantity", "location", "invalid"].includes(pending.clarificationStatus)) return true;
    if (itemTarget(task.items, text) && quantityFrom(text)) return true;
    return false;
  }
  function completeItems(task) {
    const pending = task.items.find(item => item.status !== "proposed");
    task.pendingItemId = pending?.id || null;
    task.status = pending ? "collecting" : "proposed";
    task.preview = task.items.map((item, index) => `${index + 1}. ${item.preview || t("multi.pending", { name: item.foodName || item.sourceText })}`).join("\n");
    return { task, reply: pending ? t("multi.question", { index: task.items.indexOf(pending) + 1, name: pending.foodName || pending.sourceText, question: pending.question }) : t("multi.ready", { count: task.items.length }) };
  }
  async function resolveItem(item, text, capabilityId) {
    const result = await prepareSingle(text, item, capabilityId);
    const next = { ...result.task, id: item.id, sourceText: item.sourceText, executionStatus: "notAttempted", question: result.reply };
    const named = root.MentorNutritionRead.foodCandidates(item.sourceText);
    next.foodName = root.MentorFoodRepository.getById(next.foodId)?.defaultName || item.foodName || (named.length === 1 ? named[0].defaultName : null) || unknownFoodQuery(item.sourceText) || item.sourceText;
    next.clarificationStatus = next.status === "proposed" ? "ready" : next.foodChoices ? "food" : next.batchChoices ? "batch" : !next.foodId ? "food" : !next.quantity ? "quantity" : !next.locationId ? "location" : "invalid";
    return next;
  }
  async function prepare(text, prior, capabilityId) {
    if (cancelRequest(text)) return { task: null, reply: t("cancelled") };
    await root.MentorLazy.loadFeature("nutrition");
    const parsed = prior?.items && !prior.parseProblem ? null : splitRequest(text, root.MentorInventoryRepository.getLocations());
    if (!prior?.items && prior && !parsed) return prepareSingle(text, prior, capabilityId);
    if (prior?.items && !prior.parseProblem) {
      const task = clone(prior);
      if (!["collecting", "proposed"].includes(task.status) || task.items.some(item => item.executionStatus !== "notAttempted")) fail("STALE_REQUEST");
      let target = task.pendingItemId ? task.items.find(item => item.id === task.pendingItemId) : null;
      if (task.pendingCorrectionText || correction.test(normalize(text)) || !target) {
        target = itemTarget(task.items, text);
        if (!target) {
          task.pendingCorrectionText ||= text; task.status = "collecting";
          return { task, reply: t("multi.chooseItem", { items: task.items.map((item, index) => `${index + 1}. ${item.foodName}`).join("; ") }) };
        }
      }
      const answer = task.pendingCorrectionText ? task.pendingCorrectionText + ", " + text : text;
      delete task.pendingCorrectionText;
      task.items[task.items.indexOf(target)] = await resolveItem(target, answer, capabilityId);
      return completeItems(task);
    }
    if (!parsed) return prepareSingle(text, null, capabilityId);
    const task = { id: prior?.id || taskId(), capabilityId, status: "collecting", createdAt: prior?.createdAt || new Date().toISOString(), items: [], pendingItemId: null };
    if (parsed.problem) return { task: { ...task, parseProblem: parsed.problem }, reply: t("multi." + parsed.problem) };
    // One task contains one operation kind. Never reinterpret a mixed mutation.
    const normalized = normalize(text);
    const mixed = capabilityId.endsWith("add") ? /\b(dopun\w*|restock)\b/.test(normalized) : /\b(?:dodaj(?!\s+jos\b)|add(?!\s+more\b)|stavi|put|unesi|kupio|kupila|bought)\b/.test(normalized);
    if (/\b(potrosi\w*|obrisi\w*|oduzmi\w*|consume|delete|remove|subtract)\b/.test(normalized) || mixed) return { task: { ...task, parseProblem: "splitItems" }, reply: t("multi.splitItems") };
    for (const entry of parsed.entries) {
      const place = locationFrom(entry.sourceText, root.MentorInventoryRepository.getLocations());
      const item = { id: taskId(), capabilityId, sourceText: entry.sourceText, status: "collecting", executionStatus: "notAttempted", ...(place?.id ? { locationId: place.id } : {}) };
      task.items.push(await resolveItem(item, entry.sourceText, capabilityId));
    }
    return completeItems(task);
  }
  function inputFor(task) {
    if (Array.isArray(task.items)) fail("INVALID_CAPABILITY_INPUT");
    const base = { foodId: task.foodId, locationId: task.locationId, quantity: task.quantity, unit: task.unit };
    return task.capabilityId.endsWith("restock") ? { ...base, batchId: task.batchId, expectedQuantity: task.expectedQuantity, expectedUpdatedAt: task.expectedUpdatedAt } : { ...base, ...(task.expiryDate ? { expiryDate: task.expiryDate } : {}) };
  }
  async function preflight(task) {
    if (Array.isArray(task.items)) {
      if (task.status !== "proposed" || task.parseProblem || task.pendingItemId || task.items.length < 2 || task.items.length > MAX_ITEMS || task.items.some(item => item.status !== "proposed" || item.clarificationStatus !== "ready" || item.executionStatus !== "notAttempted" || item.capabilityId !== task.capabilityId)) fail("STALE_REQUEST");
      if (new Set(task.items.map(item => item.id)).size !== task.items.length) fail("STALE_REQUEST");
      if (task.capabilityId.endsWith("restock") && new Set(task.items.map(item => item.batchId)).size !== task.items.length) fail("INVENTORY_CHANGED");
      for (const item of task.items) await preflight(item);
      return;
    }
    await root.MentorLazy.loadFeature("nutrition");
    const food = root.MentorFoodRepository.getById(task.foodId), location = root.MentorInventoryRepository.getLocationById(task.locationId);
    if (!food || food.status !== "active" || !location) fail("INVENTORY_CHANGED");
    if (task.capabilityId.endsWith("restock")) {
      const batch = root.MentorInventoryRepository.getBatchById(task.batchId);
      if (!batch || batch.quantity !== task.expectedQuantity || batch.updatedAt !== task.expectedUpdatedAt || root.MentorInventoryService.statusForBatch(batch) === "expired") fail("INVENTORY_CHANGED");
    } else if (!root.MentorInventoryService.validateDraft(inputFor(task)).valid) fail("INVENTORY_CHANGED");
  }
  root.MentorNutritionInventoryResolver = Object.freeze({ prepare, inputFor, preflight, pendingChoices, canContinue });
})(window);

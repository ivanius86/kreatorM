(function (root) {
  "use strict";
  const registry = root.MentorCapabilityRegistry;
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const t = (key, values) => root.MentorI18n.t("mentor.foods." + key, values);
  const nt = key => root.MentorI18n.t("nutrition." + key);
  const fail = code => { throw Object.assign(new Error(code), { code }); };
  const number = value => new Intl.NumberFormat(root.MentorI18n.getLanguage() === "sr" ? "sr-Latn-RS" : "en-GB", { maximumFractionDigits: 6 }).format(value);
  const amountText = (amount, unit) => amount == null ? t("unknown") : number(amount) + " " + (unit === "ug" ? "µg" : unit);
  function matchCreate(text) {
    const value = normalize(text);
    if (/\b(?:ne|nemoj\w*|don't|do not|what if|sta ako)\b/.test(value) || /["“”«»]/.test(value)) return false;
    const verb = /\b(?:dodaj\w*|unesi|kreiraj\w*|napravi\w*|uvezi|import|add|create|save)\b/.test(value);
    const catalog = /\b(?:baz\w*\s+(?:namirnic\w*|hran\w*)|katalog\w*|food\s+(?:database|catalog)|nov\w*\s+namirnic\w*|new\s+food)\b/.test(value);
    const namedFood = /\b(?:dodaj|unesi|kreiraj|napravi)\s+(?:mi\s+)?(?:novu\s+)?namirnicu\b|\b(?:add|create)\s+(?:a\s+)?(?:new\s+)?food\b/.test(value);
    const inventory = /\b(?:zalih\w*|frizider\w*|ostav\w*|zamrziv\w*|inventory|stock|fridge|freezer|pantry)\b/.test(value);
    const recipe = /\b(?:recept\w*|recipe\w*|obrok\w*|meal\w*)\b/.test(value);
    return verb && !recipe && (catalog || namedFood && !inventory);
  }
  function rowsFor(snapshot, grams = 100) {
    const values = new Map((snapshot.nutrients || []).map(row => [row.nutrientId, row]));
    return root.MentorNutrientRepository.getAll().map(def => {
      const row = values.get(def.id);
      return { ...def, amount: Number.isFinite(row?.amount) ? row.amount * grams / 100 : null, dataStatus: row?.dataStatus || "unknown" };
    });
  }
  function metadataLines(snapshot, grams = 100) {
    const food = snapshot.food, source = snapshot.source;
    const lines = [t("name") + ": " + food.defaultName, t("englishName") + ": " + (food.names?.en || source?.sourceDescription || t("none")),
      t("category") + ": " + nt("foodCategories." + food.categoryId), t("preparation") + ": " + nt("foodForm.states." + food.preparationState),
      t("type") + ": " + nt("foodForm.types." + food.foodType), t("basis", { grams: number(grams) })];
    if (food.brand) lines.push(t("brand") + ": " + food.brand);
    lines.push(t("serving") + ": " + amountText(food.defaultServingGrams, "g"), t("edible") + ": " + amountText(food.ediblePortionPercent, "%"));
    if (source) lines.push(t("source") + ": " + source.provider + " · " + source.dataType + " · " + source.sourceDescription, source.sourceUrl);
    const profile = root.MentorFoodFilterProfile.normalize(food.filterProfile);
    for (const group of ["dietary", "fasting", "allergens"]) lines.push(t(group) + ": " + Object.entries(profile[group]).map(([key, status]) => nt("foodForm.filterProfile.labels." + key) + " — " + t(status)).join("; "));
    return lines;
  }
  function formatProfile(snapshot, grams = 100) {
    const rows = rowsFor(snapshot, grams), lines = metadataLines(snapshot, grams);
    const food = snapshot.food;
    for (const key of ["id", "slug", "status", "origin", "updatedAt", "description"])
      if (food[key]) lines.push(t({ id: "identity", updatedAt: "updated" }[key] || key) + ": " + food[key]);
    if (food.tags?.length) lines.push(t("tags") + ": " + food.tags.join(", "));
    lines.push(t("coverage", { known: rows.filter(row => row.amount != null).length, total: rows.length }));
    let group;
    for (const row of rows) {
      if (group !== row.group) { group = row.group; lines.push("\n" + t("groups." + group)); }
      lines.push(root.MentorI18n.t(row.nameKey) + ": " + amountText(row.amount, row.unit) + " · " + t(row.amount == null ? "unknown" : ["measured", "estimated", "calculated"].includes(row.dataStatus) ? row.dataStatus : "estimated"));
    }
    lines.push("\n" + t("portions"));
    for (const row of snapshot.portions || []) lines.push(row.name + ": " + number(row.amount) + " " + nt("portionUnits." + row.unit) + " = " + amountText(row.equivalentGrams, "g"));
    if (!snapshot.portions?.length) lines.push(t("noPortions"));
    return lines.join("\n");
  }
  function existing(snapshot) {
    const sources = root.MentorFoodRepository.getAllSources().filter(row => row.provider === "USDA FoodData Central" && row.fdcId === snapshot.fdcId);
    const ids = new Set(sources.map(row => row.id));
    return root.MentorFoodRepository.getAll().find(row => ids.has(row.sourceId) || row.id === "user_food_usda_" + snapshot.fdcId);
  }
  async function verifyTask(task) {
    if (!task?.snapshot || typeof task.token !== "string") fail("FOOD_PROFILE_CHANGED");
    const verified = await root.MentorChatClient.food("verify", task.token);
    if (JSON.stringify(verified) !== JSON.stringify(task.snapshot)) fail("FOOD_PROFILE_CHANGED");
    return verified;
  }
  const create = {
    id: "nutrition.food.create", module: "nutrition", type: "write", description: "Find a USDA food and save its source nutrition profile only after review and approval.",
    inputSchema: { type: "object", properties: { token: { type: "string", maxLength: 50000 }, snapshotJson: { type: "string", maxLength: 40000 } }, required: ["token", "snapshotJson"] },
    permissions: { localRead: "nutrition.food", localWrite: "nutrition.food", cloudShare: "requested-food-only" },
    permissionKey: "foods.permission", match: text => matchCreate(text) ? { text } : null,
    pendingChoices: task => task.foodChoices || [], canContinue: (task, text) => task?.capabilityId === "nutrition.food.create" && !/\b(?:recept\w*|recipe\w*|zalih\w*|stock|inventory)\b/.test(normalize(text)),
    async prepare(text, prior, { signal } = {}) {
      await root.MentorLazy.loadFeature("nutrition");
      if (/^(?:otkazi|odustani|cancel|stop)\b/.test(normalize(text))) return { task: null, reply: t("cancelled") };
      const task = prior ? { ...prior } : { id: "food-" + root.crypto.randomUUID(), capabilityId: create.id, status: "collecting", createdAt: new Date().toISOString() };
      const selected = (task.foodChoices || []).find((row, index) => text === `${index + 1}. ${row.name}` || normalize(text) === normalize(row.name)) || (/^[1-8][.)]?\s*$/.test(text.trim()) ? task.foodChoices?.[Number(text.trim().match(/\d+/)[0]) - 1] : null);
      if (selected) {
        const result = await root.MentorChatClient.food("details", selected.id, signal);
        if (!result?.snapshot?.food || result.snapshot.source?.fdcId !== Number(selected.id) || typeof result.token !== "string") fail("INVALID_RESPONSE");
        const found = existing(result.snapshot);
        if (found) return { task: { ...task, status: "succeeded", foodChoices: [], foodName: found.defaultName, preview: t("existing", { name: found.defaultName }), result: { foodId: found.id, name: found.defaultName, alreadyExists: true } }, reply: t("existing", { name: found.defaultName }) };
        return { task: { ...task, status: "proposed", foodChoices: [], foodName: result.snapshot.food.defaultName, preview: result.snapshot.food.defaultName, snapshot: result.snapshot, token: result.token }, reply: t("review") };
      }
      if (task.status === "proposed" && /^(?:da|ok|yes|approve|potvrdi|sacuvaj)\b/.test(normalize(text))) return { task, reply: t("review") };
      const result = await root.MentorChatClient.food("search", text.slice(0, 400), signal);
      const choices = (result.candidates || []).slice(0, 8).map(row => ({ id: row.id, name: [row.name,
        t("type") + ": " + nt("foodForm.types." + (row.foodType === "product" ? "product" : "generic")),
        t("preparation") + ": " + (row.preparation || nt("foodForm.states.other")),
        t("brand") + ": " + (row.brand || t("none")), row.dataType].filter(Boolean).join(" · ") }));
      const warning = result.warnings?.find(row => ["FOOD_GEMINI_QUOTA", "FOOD_GEMINI_UNAVAILABLE"].includes(row.code));
      const question = (warning ? t("errors." + warning.code) + "\n" : "") + t(choices.length ? "choose" : "notFound");
      return { task: { ...task, status: "collecting", foodChoices: choices, snapshot: null, token: null, foodName: result.query || text, question }, reply: question };
    },
    async preflight(task) { await root.MentorLazy.loadFeature("nutrition"); await verifyTask(task); },
    inputFor: task => ({ token: task.token, snapshotJson: JSON.stringify(task.snapshot) }),
    async adapter(input) {
      const snapshot = await verifyTask({ token: input.token, snapshot: JSON.parse(input.snapshotJson) });
      const found = existing(snapshot); if (found) return { foodId: found.id, name: found.defaultName, alreadyExists: true };
      const id = "user_food_usda_" + snapshot.fdcId, source = snapshot.source;
      const form = { ...snapshot.food, id, slug: "usda-fdc-" + snapshot.fdcId, sourceId: source.id, origin: "usda", status: "active",
        description: [source.sourceDescription, snapshot.food.brand].filter(Boolean).join(" · "), filterProfile: root.MentorFoodFilterProfile.empty(),
        nutrients: snapshot.nutrients, portions: snapshot.portions, image: { imageType: "none", imageUrl: null, localImageId: null, thumbnailId: null } };
      const saved = await root.MentorNutritionFoodFormService.createVerified(form, source);
      return { foodId: saved.id, name: saved.defaultName, ...(saved.alreadyExists ? { alreadyExists: true } : {}) };
    }
  };
  const profile = {
    id: "nutrition.food.getProfile", module: "nutrition", type: "read", description: "Read all stored food details and all supported nutrient values locally, including unknown values and units.",
    inputSchema: { type: "object", properties: { text: { type: "string", maxLength: 4000 }, foodId: { type: "string", maxLength: 150 } }, required: ["text"] },
    permissions: { localRead: "nutrition.food", cloudShare: false },
    match(text) {
      const value = normalize(text);
      if (/\b(?:dodaj\w*|unesi|napravi\w*|kreiraj\w*|add|create|make|save|promeni\w*|izmeni\w*|update|edit|recept\w*|recipe\w*|obrok\w*|meal\w*|zalih\w*|frizider\w*|inventory|stock)\b/.test(value)) return null;
      const detail = /\b(?:nutritiv\w*|nutrient\w*|nutrition\w*|profil\w*|profile|detalj\w*|details?|vitamin\w*|mineral\w*|alergen\w*|allergen\w*|kalorij\w*|calori\w*|kcal|energi\w*|energy|protein\w*|masti|masnoc\w*|fat\w*|ugljen\w*|carb\w*|vlak\w*|fib(?:er|re)|magnez\w*|magnes\w*|kalcij\w*|calcium|gvozd\w*|iron|cink\w*|zinc|selen\w*|natrij\w*|sodium|kalij\w*|potassium|fosfor\w*|phosphor\w*|bakar|bakr\w*|copper|mangan\w*|jod\w*|iodin\w*|tiamin\w*|thiamin\w*|riboflavin\w*|niacin\w*|pantoten\w*|pantothen\w*|biotin\w*|folat\w*|folic\w*|holin\w*|cholin\w*|holesterol\w*|cholesterol\w*|zasic\w*|saturat\w*|secer\w*|sugar\w*|skrob\w*|starch|soli|salt|voda|vode|vodu|water|pepeo|ash|alkohol\w*|alcohol|kofein\w*|caffein\w*|izvor\w*)\b/.test(value);
      const serbianSalt = /\bso\b/.test(value) && /\b(?:koliko|sadrz\w*|kolicin\w*|namirnic\w*|hran\w*|nutrit\w*)\b/.test(value);
      return detail || serbianSalt ? { text } : null;
    },
    async adapter(input) {
      await root.MentorLazy.loadFeature("nutrition");
      const found = input.foodId ? [root.MentorFoodRepository.getById(input.foodId)].filter(Boolean) : root.MentorNutritionRead.foodCandidates(input.text);
      if (!found.length) return { status: "no_food" };
      if (found.length > 1) return { status: "ambiguous_food", rows: found.slice(0, 8).map(food => ({ id: food.id, name: food.defaultName })), total: found.length };
      const food = found[0];
      const grams = Number(normalize(input.text).match(/\b(\d+(?:[.,]\d+)?)\s*(?:g|gram\w*)\b/)?.[1]?.replace(",", ".") || 100);
      if (!(grams > 0 && grams <= 10000)) fail("INVALID_REQUEST");
      return { status: "known", grams, snapshot: { food, source: root.MentorFoodRepository.getSource(food.sourceId), nutrients: root.MentorFoodRepository.getNutrients(food.id), portions: root.MentorFoodRepository.getPortions(food.id) } };
    },
    format(value) {
      if (value.status === "no_food") return t("noFood");
      if (value.status === "ambiguous_food") return root.MentorI18n.t("mentor.nutritionRead.chooseFood", { options: value.rows.map((row, index) => `${index + 1}. ${row.name}`).join("; ") });
      return formatProfile(value.snapshot, value.grams);
    }
  };
  function renderPreview(task) {
    const snapshot = task.snapshot, host = document.createElement("div"); host.className = "mentor-food-preview";
    const add = (tag, text) => { const node = document.createElement(tag); node.textContent = text; host.append(node); return node; };
    for (const line of metadataLines(snapshot)) {
      if (line === snapshot.source.sourceUrl) { const link = add("a", line); link.href = snapshot.source.sourceUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; }
      else add("p", line);
    }
    add("p", t("metadataNote")); add("p", t("profileNote"));
    const rows = rowsFor(snapshot);
    add("p", t("coverage", { known: rows.filter(row => row.amount != null).length, total: rows.length }));
    const table = document.createElement("table"); table.className = "mentor-food-nutrients";
    const head = document.createElement("tr");
    for (const key of ["nutrient", "amount", "quality"]) { const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = t(key); head.append(cell); }
    const thead = document.createElement("thead"); thead.append(head); table.append(thead);
    const body = document.createElement("tbody"); let group;
    for (const row of rows) {
      if (group !== row.group) { group = row.group; const tr = document.createElement("tr"), th = document.createElement("th"); th.colSpan = 3; th.scope = "rowgroup"; th.textContent = t("groups." + group); tr.append(th); body.append(tr); }
      const tr = document.createElement("tr");
      for (const value of [root.MentorI18n.t(row.nameKey), amountText(row.amount, row.unit), t(row.amount == null ? "unknown" : ["measured", "estimated", "calculated"].includes(row.dataStatus) ? row.dataStatus : "estimated")]) { const cell = document.createElement("td"); cell.textContent = value; tr.append(cell); }
      body.append(tr);
    }
    table.append(body); host.append(table); add("h4", t("portions"));
    for (const row of snapshot.portions) add("p", row.name + ": " + number(row.amount) + " " + nt("portionUnits." + row.unit) + " = " + amountText(row.equivalentGrams, "g"));
    if (!snapshot.portions.length) add("p", t("noPortions"));
    return host;
  }
  registry.register(create); registry.register(profile);
  root.MentorNutritionFood = Object.freeze({ matchCreate, formatProfile, renderPreview, rowsFor });
})(window);

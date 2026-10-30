(function (root) {
  "use strict";
  const registry = root.MentorCapabilityRegistry;
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase().trim();
  const words = value => normalize(value).match(/[a-z0-9]+/g) || [];
  const stem = value => value.slice(0, Math.max(3, value.length - 2));
  const n = value => new Intl.NumberFormat(root.MentorI18n.getLanguage() === "sr" ? "sr-Latn-RS" : "en-GB", { maximumFractionDigits: 3 }).format(value);
  const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll("{{" + name + "}}", String(value)), root.MentorI18n.t("mentor.nutritionRead." + key));
  const guarded = text => /\b(napravi|kreiraj|dodaj|unesi|izmeni|obrisi|ukloni|potrosi|premesti|sacuvaj|predlozi|generisi|pripremi|planiraj|isplaniraj|zelim|daj|create|make|add|save|edit|delete|remove|consume|move|schedule|suggest|generate|prepare|want|give)\b/.test(normalize(text));
  const locations = { fridge: /\b(frizider\w*|hladnjak\w*|fridge|refrigerator)\b/, freezer: /\b(zamrziva\w*|freezer)\b/, pantry: /\b(ostav\w*|spajz\w*|pantry)\b/ };
  function locationIn(text) { return Object.keys(locations).find(key => locations[key].test(normalize(text))) || null; }
  function requestedLocation(text, repository) {
    const builtIn = locationIn(text);
    if (builtIn) {
      const id = { fridge: "location_fridge", freezer: "location_freezer", pantry: "location_pantry" }[builtIn];
      return repository.getLocations().some(item => item.id === id) ? { id, name: builtIn } : { unknown: builtIn };
    }
    const query = normalize(text).match(/\b(?:u|in)\s+(?:the\s+)?([\p{L}\p{N}][\p{L}\p{N} _-]{1,60}?)(?:\s*[?.!,]|$)/u)?.[1]?.trim();
    if (!query || /^(?:zalih\w*|stock|inventory|kuc\w*|kuh\w*)$/.test(query)) return null;
    const place = repository.getLocations().find(item => {
      const name = normalize(item.name);
      return name === query || (words(name).length === 1 && words(query).length === 1 && (query.startsWith(name) || stem(name) === stem(query)));
    });
    return place ? { id: place.id, name: place.name } : { unknown: query };
  }
  function nameOf(food) { return food?.names?.[root.MentorI18n.getLanguage()] || food?.defaultName || food?.slug || ""; }
  function foodCandidates(text) {
    const repo = root.MentorFoodRepository;
    const active = repo.getAll().filter(food => food.status !== "archived");
    const ignored = new Set(["pronadji", "pretrazi", "namirnica", "namirnice", "katalogu", "katalog", "koliko", "proteina", "protein", "koje", "vrste", "imam", "dovoljno", "frizideru", "zamrzivacu", "ostavi", "search", "find", "foods", "food", "catalog", "have", "much", "many", "enough", "the", "for", "what", "with", "100g"]);
    const tokens = [...new Set(words(text).filter(word => word.length >= 4 && !ignored.has(word) && !/^\d/.test(word)))];
    if (!tokens.length) return [];
    const scored = active.map(food => {
      const names = [nameOf(food), food.defaultName, food.names?.sr, food.names?.en, food.slug].filter(Boolean);
      const score = Math.max(0, ...names.map(name => tokens.filter(token => words(name).some(part => token === part || stem(token) === stem(part))).length));
      return { food, score };
    });
    const maximum = Math.max(0, ...scored.map(row => row.score));
    if (maximum) return scored.filter(row => row.score === maximum).map(row => row.food);
    return tokens.length === 1 ? repo.query({ search: tokens[0] }).filter(food => food.status !== "archived") : [];
  }
  function resolveFoodChoice(candidates, answer) {
    if (!Array.isArray(candidates) || !candidates.length || typeof answer !== "string") return null;
    const ordinalMatch = /^\s*([1-8])(?:\s*[.)]\s*(.*))?\s*$/.exec(answer);
    const ordinal = Number(ordinalMatch?.[1]);
    if (ordinal) {
      const candidate = candidates[ordinal - 1];
      return candidate && (!ordinalMatch[2] || normalize(ordinalMatch[2]) === normalize(candidate.name)) ? candidate.id : null;
    }
    const tokens = [...new Set(words(answer).filter(word => word.length >= 3))];
    if (!tokens.length) return null;
    const ranked = candidates.map(item => ({ id: item.id, score: tokens.filter(token => words(item.name).some(part => token === part || stem(token) === stem(part))).length }));
    const maximum = Math.max(...ranked.map(item => item.score));
    const winners = ranked.filter(item => item.score === maximum);
    return maximum > 0 && winners.length === 1 ? winners[0].id : null;
  }
  function result(status, rows = [], extra = {}) { return { status, rows, ...extra }; }

  const food = {
    id: "nutrition.food.search", module: "nutrition", type: "read", description: "Search the existing food catalog and known nutrients.",
    inputSchema: { type: "object", properties: { text: { type: "string", maxLength: 4000 } }, required: ["text"] },
    permissions: { localRead: "nutrition.food", cloudShare: false },
    match(text) {
      const value = normalize(text);
      if (guarded(text) || /\b(recept\w*|recipe\w*|obrok\w*|meal\w*|plan\w*)\b/.test(value)) return null;
      if (!/\b(katalog\w*|catalog)\b/.test(value) && /\b(zalih\w*|inventory|stock|frizider\w*|zamrziva\w*|ostav\w*|dostup\w*|raspoloz\w*)\b/.test(value)) return null;
      if (/\b(katalog\w*|catalog|namirnic\w*|food\w*)\b/.test(value) || (/\b(protein\w*|nutrient\w*|nutrit\w*)\b/.test(value) && /\b(koliko|how much)\b/.test(value)) || /^\s*(pronadji|pretrazi|find|search)\b/.test(value)) return { text };
      return null;
    },
    async adapter(input) {
      await root.MentorLazy.loadFeature("nutrition");
      const found = foodCandidates(input.text);
      if (!found.length) return result("no_food");
      const wantsProtein = /\b(protein\w*)\b/.test(normalize(input.text));
      const grams = Number(normalize(input.text).match(/\b(\d{1,4})(?:\s*)(?:g|gram\w*)\b/)?.[1] || 100);
      const rows = found.slice(0, 20).map(item => {
        let protein = null;
        if (wantsProtein) {
          const details = root.MentorFoodNutritionService.details(item.id);
          const nutrient = details?.byCode?.get("protein");
          const scaled = nutrient ? root.MentorFoodNutritionService.scale(item.id, grams) : null;
          const value = scaled?.nutrients?.find(row => row.nutrientId === nutrient.nutrientId)?.amount;
          if (Number.isFinite(value)) protein = value;
        }
        return { id: item.id, name: nameOf(item), protein };
      });
      return result("known", rows, { total: found.length, wantsProtein, grams });
    },
    format(value) {
      if (value.status === "no_food") return t("noFood");
      const lines = [t("foodCount", { count: n(value.total) })];
      for (const row of value.rows) lines.push(value.wantsProtein ? t("foodProtein", { name: row.name, grams: n(value.grams), amount: row.protein == null ? t("unknown") : n(row.protein) + " g" }) : "• " + row.name);
      if (value.total > value.rows.length) lines.push(t("moreResults", { shown: value.rows.length, total: value.total }));
      return lines.join("\n");
    }
  };

  const availability = {
    id: "nutrition.inventory.getAvailability", module: "nutrition", type: "read", description: "Read availability of a named food using Inventory and Planning services.",
    inputSchema: { type: "object", properties: { text: { type: "string", maxLength: 4000 }, foodId: { type: "string", maxLength: 120 } }, required: ["text"] },
    permissions: { localRead: "nutrition.inventory", cloudShare: false },
    match(text) {
      const value = normalize(text);
      if (guarded(text) || /\b(recept\w*|recipe\w*|plan\w*|obrok\w*|meals?|protein\w*|nutrit\w*|kalorij\w*)\b/.test(value)) return null;
      if (/\b(zalih\w*|namirnic\w*|inventory|stock)\b/.test(value) && !/\b(dovoljno|enough)\b/.test(value)) return null;
      if (/\b(koliko|how much|how many|dovoljno|enough|do i have)\b/.test(value) && /\b(imam|imamo|ima|have|dovoljno|enough)\b/.test(value)) return { text };
      return null;
    },
    async adapter(input) {
      await root.MentorLazy.loadFeature("nutrition");
      const chosen = input.foodId ? root.MentorFoodRepository.getById(input.foodId) : null;
      const found = input.foodId ? (chosen && chosen.status !== "archived" ? [chosen] : []) : foodCandidates(input.text);
      if (!found.length) return result("no_food");
      if (found.length > 1) return result("ambiguous_food", found.slice(0, 8).map(item => ({ id: item.id, name: nameOf(item) })), { total: found.length });
      const item = found[0], repo = root.MentorInventoryRepository, service = root.MentorInventoryService;
      const place = requestedLocation(input.text, repo);
      if (place?.unknown) return result("unknown_location", [], { location: place.unknown });
      const locationId = place?.id || null;
      const batches = repo.getBatches().filter(batch => batch.foodId === item.id && (!locationId || batch.locationId === locationId) && Number(batch.quantity) > 0 && batch.status !== "consumed");
      const grouped = new Map();
      for (const batch of batches) {
        const status = service.statusForBatch(batch), unit = batch.unit;
        const row = grouped.get(unit) || { unit, total: 0, reserved: 0, expired: 0, available: 0 };
        row.total += Number(batch.quantity);
        row.reserved += service.reservedForBatch(batch.id, unit);
        if (status === "expired") row.expired += Number(batch.quantity);
        else row.available += service.availableForBatch(batch);
        grouped.set(unit, row);
      }
      const requested = normalize(input.text).match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|kom)\b/);
      let enough = null;
      if (requested) {
        const quantity = Number(requested[1].replace(",", "."));
        const unit = requested[2];
        const free = place ? batches.reduce((sum, batch) => {
          if (service.statusForBatch(batch) === "expired") return sum;
          const conversion = root.MentorNutritionUnitConversion;
          if (!conversion.isCompatibleForFood(batch.unit, unit, item)) return sum;
          return sum + conversion.convertForFood(service.availableForBatch(batch), batch.unit, unit, item);
        }, 0) : root.MentorPlanningService.available(item.id, unit);
        enough = { quantity, unit, available: free, yes: free >= quantity };
      }
      return result("known", [...grouped.values()], { name: nameOf(item), place, enough, asksEnough: /\b(dovoljno|enough)\b/.test(normalize(input.text)) });
    },
    format(value) {
      if (value.status === "no_food") return t("noFood");
      if (value.status === "unknown_location") return t("unknownLocation", { location: value.location });
      if (value.status === "ambiguous_food") return t("ambiguousFood", { names: value.rows.map(row => row.name).join(", ") });
      const lines = [t("availabilityTitle", { name: value.name, location: value.place ? (Object.hasOwn(locations, value.place.name) ? t("location." + value.place.name) : value.place.name) : t("allLocations") })];
      if (!value.rows.length) lines.push(t("noStock"));
      for (const row of value.rows) lines.push(t("availabilityRow", { unit: row.unit, total: n(row.total), reserved: n(row.reserved), expired: n(row.expired), available: n(row.available) }));
      if (value.enough) lines.push(t(value.enough.yes ? "enoughYes" : "enoughNo", { quantity: n(value.enough.quantity), unit: value.enough.unit, available: n(value.enough.available) }));
      else if (value.asksEnough) lines.push(t("quantityNeeded"));
      lines.push(t("availabilityMeaning"));
      return lines.join("\n");
    }
  };

  const recipe = {
    id: "nutrition.recipe.search", module: "nutrition", type: "read", description: "Search saved recipes and verified dietary profile.",
    inputSchema: { type: "object", properties: { text: { type: "string", maxLength: 4000 } }, required: ["text"] },
    permissions: { localRead: "nutrition.recipes", cloudShare: false },
    match(text) { const value = normalize(text); return !guarded(text) && /\b(recept\w*|recipe\w*)\b/.test(value) ? { text } : null; },
    async adapter(input) {
      await root.MentorLazy.loadFeature("nutrition");
      const recipes = root.MentorPlanningRepository.getRecipes();
      const value = normalize(input.text), vegan = /\b(vegansk\w*|vegan)\b/.test(value);
      const subject = value.match(/\b(?:recept\w*|recipe\w*)\s+(?:za|for)\s+([\p{L}\p{N} -]{2,80})/u)?.[1]?.trim() || "";
      const found = recipes.filter(item => {
        if (subject && !words(subject).every(token => words(item.name).some(name => token === name || stem(token) === stem(name)))) return false;
        if (!vegan) return true;
        const profile = root.MentorRecipeProfileService.deriveRecipeProfile(item);
        return profile.dietaryPatterns.includes("vegan") && root.MentorRecipeFilterService.matches(item, { dietaryPatterns: ["vegan"] }, { derivedProfile: profile });
      });
      return result("known", found.slice(0, 20).map(item => ({ id: item.id, name: item.name, mealType: item.mealType })), { total: found.length, vegan, searched: subject });
    },
    format(value) {
      if (!value.total) return value.vegan ? t("noVerifiedVeganRecipes") : t("noRecipes");
      const lines = [t("recipeCount", { count: n(value.total) })];
      value.rows.forEach(row => lines.push("• " + row.name + " (" + t("meal." + row.mealType) + ")"));
      if (value.total > value.rows.length) lines.push(t("moreResults", { shown: value.rows.length, total: value.total }));
      return lines.join("\n");
    }
  };

  const dateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  function dateRange(text) {
    const value = normalize(text), today = new Date(), base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const explicit = value.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (explicit) {
      const [year, month, day] = explicit[1].split("-").map(Number), parsed = new Date(year, month - 1, day);
      return dateKey(parsed) === explicit[1] ? { startDate: explicit[1], endDate: explicit[1] } : null;
    }
    if (/\b(sutra|tomorrow)\b/.test(value)) { const date = dateKey(addDays(base, 1)); return { startDate: date, endDate: date }; }
    if (/\b(danas|today)\b/.test(value)) { const date = dateKey(base); return { startDate: date, endDate: date }; }
    if (/\b(ov\w*\s+nedelj\w*|this week)\b/.test(value)) { const monday = addDays(base, -((base.getDay() + 6) % 7)); return { startDate: dateKey(monday), endDate: dateKey(addDays(monday, 6)) }; }
    if (/\b(naredn\w*\s+(?:sedam|7)\s+dan\w*|next (?:seven|7) days)\b/.test(value)) return { startDate: dateKey(base), endDate: dateKey(addDays(base, 6)) };
    return null;
  }
  const meal = {
    id: "nutrition.mealPlan.get", module: "nutrition", type: "read", description: "Read saved meals in a local-date range using Planning Repository and selectors.",
    inputSchema: { type: "object", properties: { text: { type: "string", maxLength: 4000 } }, required: ["text"] },
    permissions: { localRead: "nutrition.mealPlan", cloudShare: false },
    missingInfo: input => dateRange(input.text) ? null : "date",
    match(text) {
      const value = normalize(text);
      if (guarded(text)) return null;
      if (/\b(plan\w*\s+(?:za\s+)?(?:ishran\w*|obrok\w*)|planiran\w*\s+obrok\w*|meal plan|planned meals?)\b/.test(value) || (/\bobrok\w*\b/.test(value) && /\b(koliko|planiran\w*|how many)\b/.test(value))) return { text };
      if (/\b(danas|sutra|today|tomorrow)\b/.test(value) && /\b(rucak\w*|vecer\w*|dorucak\w*|uzin\w*|lunch|dinner|breakfast|snack)\b/.test(value)) return { text };
      return null;
    },
    async adapter(input) {
      const range = dateRange(input.text);
      if (!range) return result("need_date");
      await root.MentorLazy.loadFeature("nutrition");
      const value = normalize(input.text);
      const mealType = /\b(rucak\w*|lunch)\b/.test(value) ? "lunch" : /\b(vecer\w*|dinner)\b/.test(value) ? "dinner" : /\b(dorucak\w*|breakfast)\b/.test(value) ? "breakfast" : /\b(uzin\w*|snack)\b/.test(value) ? "snack" : null;
      const dates = [], start = range.startDate.split("-").map(Number), first = new Date(start[0], start[1] - 1, start[2]);
      for (let index = 0; index < 7; index++) { const key = dateKey(addDays(first, index)); if (key > range.endDate) break; dates.push(key); }
      const entries = root.MentorPlanningRepository.getMealPlanEntries().filter(item => dates.includes(item.plannedDate) && (!mealType || item.mealType === mealType));
      const recipes = root.MentorPlanningRepository.getRecipes(), names = new Map(recipes.map(item => [item.id, item.name]));
      const days = root.MentorMealPlanSelectors.groupByDay(entries, recipes, dates);
      return result("known", days.map(day => ({ date: day.date, count: day.mealCount, meals: day.rows.map(row => ({ mealType: row.entry.mealType, recipe: names.get(row.entry.recipeId) || null, servings: row.entry.servings, completed: row.entry.status === "completed" || Boolean(row.entry.completedAt) })) })), { range, mealType, countOnly: /\b(koliko|how many)\b/.test(value) });
    },
    format(value) {
      if (value.status === "need_date") return t("needDate");
      const count = value.rows.reduce((sum, day) => sum + day.count, 0);
      if (value.countOnly) return t("planCount", { count: n(count), start: value.range.startDate, end: value.range.endDate });
      if (!count) return t("noMeals", { start: value.range.startDate, end: value.range.endDate });
      const lines = [t("planCount", { count: n(count), start: value.range.startDate, end: value.range.endDate })];
      for (const day of value.rows) for (const entry of day.meals) lines.push(t("planRow", { date: day.date, meal: t("meal." + entry.mealType), recipe: entry.recipe || t("missingRecipe"), servings: n(entry.servings), status: entry.completed ? t("completed") : t("planned") }));
      lines.push(t("plannedMeaning"));
      return lines.join("\n");
    }
  };

  [food, availability, recipe, meal].forEach(capability => registry.register(capability));
  root.MentorNutritionRead = Object.freeze({ dateRange, foodCandidates, resolveFoodChoice });
})(window);

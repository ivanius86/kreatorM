(function (root) {
  "use strict";
  const registry = root.MentorCapabilityRegistry;
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase().trim();
  const builtIn = { fridge: /\b(fri(?:z|ž)ider\w*|hladnjak\w*|fridge|refrigerator)\b/, freezer: /\b(zamrziva\w*|freezer)\b/, pantry: /\b(ostav\w*|spajz\w*|pantry)\b/ };
  const aliases = { fridge: "location_fridge", freezer: "location_freezer", pantry: "location_pantry" };
  function extract(text) {
    const value = normalize(text);
    const place = Object.keys(builtIn).find(key => builtIn[key].test(value));
    const custom = !place && value.match(/\b(?:u|iz|in|from)\s+([\p{L}\p{N} _-]{2,60}?)(?:\s*\?|\s*$)/u);
    const locationQuery = place || (custom && !/^(?:zalih\w*|kuh\w*|kuc\w*|stock|inventory|general)$/i.test(custom[1]) ? custom[1].trim() : null);
    return { ...(locationQuery ? { locationQuery } : {}), availableOnly: /\b(dostup\w*|raspoloz\w*|available|usable|free)\b/.test(value) };
  }
  function match(text, context = {}) {
    const value = normalize(text);
    const inventory = /\b(zalih\w*|namirnic\w*|hran\w*|sastoj\w*|inventory|stock|foods?|ingredients?)\b/.test(value);
    const place = Object.keys(builtIn).find(key => builtIn[key].test(value));
    const question = /\b(koliko|sta|koje|imam|ima\w*|dostup\w*|pokazi|prikazi|what|how many|have|available|show|list)\b/.test(value) || /\?$/.test(value);
    if ((!inventory && !(place && /\b(sta|what)\b/.test(value)) && !(context.followUpInventory && /^(?:a|and|what about)\s+(?:u|in|iz|from)\b/.test(value))) || !question) return null;
    if (/\b(dodaj|unesi|kupi|premesti|obrisi|potrosi|izmeni|add|buy|move|delete|consume|update)\b/.test(value)) return null;
    return extract(text);
  }
  const n = (value, language) => new Intl.NumberFormat(language === "sr" ? "sr-Latn-RS" : "en-GB", { maximumFractionDigits: 3 }).format(value);
  function label(key, language) {
    return root.MentorI18n.t("mentor.inventoryRead." + key);
  }
  async function adapter(input, { signal } = {}) {
    await root.MentorLazy.loadFeature("nutrition");
    if (signal?.aborted) { const error = new Error("CANCELLED"); error.code = "CANCELLED"; throw error; }
    const repo = root.MentorInventoryRepository, service = root.MentorInventoryService;
    const locations = repo.getLocations();
    const requested = normalize(input.locationQuery);
    const location = requested ? locations.find(item => item.id === aliases[requested] || normalize(item.name) === requested || normalize(item.builtInKey) === requested) : null;
    if (requested && !location) return { status: "unknown_location", locationQuery: input.locationQuery, locations: locations.map(item => ({ id: item.id, name: item.name })) };
    const selected = location ? [location] : locations;
    const batches = repo.getBatches();
    const result = selected.map(item => {
      const items = batches.filter(batch => batch.locationId === item.id && Number(batch.quantity) > 0 && batch.status !== "consumed").map(batch => {
        const status = service.statusForBatch(batch);
        const reserved = service.reservedForBatch(batch.id, batch.unit);
        const available = status === "expired" || status === "consumed" ? 0 : service.availableForBatch(batch);
        const food = service.getFood(batch.foodId);
        return { foodId: batch.foodId, name: food?.names?.[root.MentorI18n.getLanguage()] || food?.defaultName || batch.legacyFoodName || null, quantity: Number(batch.quantity), reserved, available, unit: batch.unit, status };
      }).filter(row => !input.availableOnly || row.available > 0);
      return { id: item.id, name: item.name, batchCount: items.length, foodCount: new Set(items.map(row => row.foodId)).size, items };
    });
    return { status: "known", asOf: new Date().toISOString(), availableOnly: Boolean(input.availableOnly), locations: result };
  }
  function format(result, language) {
    if (result.status === "unknown_location") return label("unknownLocation", language).replace("{{location}}", result.locationQuery);
    const readAt = new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(result.asOf));
    const lines = [label("asOf", language).replace("{{time}}", readAt)];
    let shown = 0;
    let total = 0;
    let chars = lines[0].length;
    for (const location of result.locations) {
      const summary = label("locationSummary", language).replace("{{location}}", location.name).replace("{{foods}}", n(location.foodCount, language)).replace("{{batches}}", n(location.batchCount, language));
      lines.push(summary); chars += summary.length + 1;
      if (!location.items.length) { const empty = label("empty", language); lines.push(empty); chars += empty.length + 1; continue; }
      total += location.items.length;
      for (const row of location.items) {
        const name = row.name || label("unlinkedFood", language);
        const detail = label("item", language).replace("{{name}}", name).replace("{{quantity}}", n(row.quantity, language)).replace("{{reserved}}", n(row.reserved, language)).replace("{{available}}", n(row.available, language)).replaceAll("{{unit}}", row.unit);
        const expired = row.status === "expired" ? label("expired", language) : "";
        if (shown >= 60 || chars + detail.length + expired.length > 9500) continue;
        shown += 1;
        lines.push(detail); chars += detail.length + 1;
        if (expired) { lines.push(expired); chars += expired.length + 1; }
      }
    }
    if (shown < total) lines.push(label("truncated", language).replace("{{shown}}", n(shown, language)).replace("{{total}}", n(total, language)));
    lines.push(label("meaning", language));
    return lines.join("\n");
  }
  registry.register({
    id: "nutrition.inventory.getSummary", module: "nutrition", type: "read",
    description: "Read inventory quantities by requested location through the Nutrition repository and service.",
    inputSchema: { type: "object", properties: { locationQuery: { type: "string", maxLength: 60 }, availableOnly: { type: "boolean" } } },
    permissions: { localRead: "nutrition.inventory", cloudShare: false },
    match, extract, adapter, format
  });
  root.MentorNutritionInventoryRead = Object.freeze({ format });
})(window);

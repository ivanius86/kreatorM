(function () {
  "use strict";
  const seed = () => window.MentorNutritionFoodSeed || {};
  const dataRepository = () => window.MentorData?.repositories?.nutritionFoodData;
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const user = () => dataRepository().getEnvelope();
  const rawSystemFoods = () => seed().foods || [];
  const normalizeFood = (item) => {
    const seeded = window.MentorNutritionFoodFilterProfilesSeed?.[item.id]
      || window.MentorNutritionFoodFilterProfilesSeed?.[item.sourceFoodId]
      || window.MentorNutritionFoodFilterProfilesSeed?.[item.derivedFromFoodId];
    return { ...item, filterProfile: window.MentorFoodFilterProfile.normalize(item.filterProfile || seeded) };
  };
  const systemFoods = () => rawSystemFoods().map(normalizeFood);
  const getAll = () => {
    const rows = new Map(systemFoods().map((item) => [item.id, item]));
    user().userFoods.map(normalizeFood).forEach((item) => rows.set(item.id, item));
    return clone([...rows.values()]);
  };
  const getById = (id) => getAll().find((item) => item.id === id) || null;
  const sourceRows = (envelope) => [...(seed().sources || []), ...(envelope || user()).userSources];
  const nutrientRows = (envelope = user()) => {
    const overridden = new Set(envelope.userFoods.map((item) => item.id).filter((id) => systemFoods().some((item) => item.id === id)));
    return [...(seed().foodNutrients || []).filter((item) => !overridden.has(item.foodId)), ...envelope.userFoodNutrients];
  };
  const portionRows = (envelope = user()) => {
    const overridden = new Set(envelope.userFoods.map((item) => item.id).filter((id) => systemFoods().some((item) => item.id === id)));
    return [...(seed().portions || []).filter((item) => !overridden.has(item.foodId)), ...envelope.userFoodPortions];
  };
  const uniqueId = (prefix) => window.MentorNutritionId.create(prefix);
  const uniqueSlug = (base, envelope) => {
    const taken = new Set([...getAll(), ...envelope.userFoods].map((item) => item.slug));
    let slug = base, index = 2;
    while (taken.has(slug)) slug = `${base}-${index++}`;
    return slug;
  };

  function query(options = {}) {
    const needle = String(options.search || "").trim().toLocaleLowerCase();
    let rows = getAll().filter((food) =>
      (!needle || `${food.defaultName} ${food.slug}`.toLocaleLowerCase().includes(needle)) &&
      (!options.categoryId || food.categoryId === options.categoryId) &&
      (!options.status || food.status === options.status) &&
      (!options.ownership || food.ownership === options.ownership)
    );
    return rows.sort((a, b) => String(a.defaultName).localeCompare(String(b.defaultName)));
  }

  function createUserFood(record, related = {}) {
    return dataRepository().mutateEnvelope(envelope => {
      const stamp = new Date().toISOString();
      const food = normalizeFood({ ...clone(record), id: record.id || uniqueId("user_food"), ownership: "user", status: record.status || "active", createdAt: record.createdAt || stamp, updatedAt: stamp });
      food.slug = uniqueSlug(food.slug || food.id, envelope);
      envelope.userFoods.push(food);
      (related.nutrients || []).forEach((item) => envelope.userFoodNutrients.push({ ...clone(item), foodId: food.id, amount: item.amount === null ? null : item.amount }));
      (related.portions || []).forEach((item) => envelope.userFoodPortions.push({ ...clone(item), id: item.id || uniqueId("portion"), foodId: food.id }));
      (related.sources || []).forEach((item) => envelope.userSources.push({ ...clone(item), id: item.id || uniqueId("source") }));
      return clone(food);
    });
  }

  function createUserFoodIfAbsent(record, related = {}) {
    // Read current data inside the storage transaction, including other tabs' imports.
    return dataRepository().mutateEnvelope(envelope => {
      const all = [...rawSystemFoods(), ...envelope.userFoods];
      const source = (related.sources || []).find(row => row.id === record.sourceId);
      const sameSource = source ? new Set(sourceRows(envelope).filter(row => row.provider === source.provider && row.fdcId === source.fdcId).map(row => row.id)) : new Set();
      const existing = all.find(row => row.id === record.id || sameSource.has(row.sourceId));
      if (existing) return { ...clone(normalizeFood(existing)), alreadyExists: true };
      const stamp = new Date().toISOString();
      const food = normalizeFood({ ...clone(record), ownership: "user", createdAt: stamp, updatedAt: stamp });
      food.slug = uniqueSlug(food.slug || food.id, envelope);
      envelope.userFoods.push(food);
      (related.nutrients || []).forEach(row => envelope.userFoodNutrients.push({ ...clone(row), foodId: food.id }));
      (related.portions || []).forEach(row => envelope.userFoodPortions.push({ ...clone(row), id: row.id || uniqueId("portion"), foodId: food.id }));
      for (const row of related.sources || []) if (!sourceRows(envelope).some(item => item.id === row.id)) envelope.userSources.push(clone(row));
      return clone(food);
    });
  }

  function createUserCopy(systemFoodId) {
    const original = systemFoods().find((item) => item.id === systemFoodId);
    if (!original) throw new Error("Only a system food can be copied.");
    return dataRepository().mutateEnvelope(envelope => {
      const stamp = new Date().toISOString(), id = uniqueId("user_food");
      const copy = normalizeFood({ ...clone(original), id, slug: uniqueSlug(`${original.slug}-copy`, envelope), ownership: "user", sourceFoodId: original.id, derivedFromFoodId: original.id, createdAt: stamp, updatedAt: stamp });
      envelope.userFoods.push(copy);
      (seed().foodNutrients || []).filter((item) => item.foodId === original.id).forEach((item) => envelope.userFoodNutrients.push({ ...clone(item), foodId: id, amount: item.amount === null ? null : item.amount }));
      (seed().portions || []).filter((item) => item.foodId === original.id).forEach((item) => envelope.userFoodPortions.push({ ...clone(item), id: uniqueId("portion"), foodId: id }));
      return clone(copy);
    });
  }

  function updateUserFood(id, patch, related) {
    return dataRepository().mutateEnvelope(envelope => {
      const index = envelope.userFoods.findIndex((item) => item.id === id), systemFood = systemFoods().find((item) => item.id === id);
      if (index < 0 && !systemFood) throw new Error("Food does not exist.");
      const current = index >= 0 ? envelope.userFoods[index] : systemFood;
      const next = normalizeFood({ ...current, ...clone(patch), id: current.id, ownership: "user", sourceFoodId: index >= 0 ? current.sourceFoodId : systemFood.id, derivedFromFoodId: index >= 0 ? current.derivedFromFoodId : systemFood.id, createdAt: current.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
      if (next.slug !== current.slug) next.slug = uniqueSlug(next.slug, { ...envelope, userFoods: envelope.userFoods.filter((item) => item.id !== id) });
      if (index >= 0) envelope.userFoods[index] = next;
      else envelope.userFoods.push(next);
      if (related?.nutrients) envelope.userFoodNutrients = [...envelope.userFoodNutrients.filter((item) => item.foodId !== id), ...related.nutrients.map((item) => ({ ...clone(item), foodId: id, amount: item.amount === null ? null : item.amount }))];
      if (related?.portions) envelope.userFoodPortions = [...envelope.userFoodPortions.filter((item) => item.foodId !== id), ...related.portions.map((item) => ({ ...clone(item), id: item.id || uniqueId("portion"), foodId: id }))];
      return clone(next);
    });
  }

  const archiveUserFood = (id) => updateUserFood(id, { status: "archived" });
  function deleteUserFood(id) {
    return dataRepository().mutateEnvelope(envelope => {
      if (!envelope.userFoods.some((item) => item.id === id)) throw new Error("Food cannot be deleted.");
      if (window.MentorInventoryRepository?.getBatches?.().some((item) => item.foodId === id)) {
      const error = new Error("Food is used by inventory."); error.code = "FOOD_IN_USE_BY_INVENTORY"; throw error;
      }
      if (window.MentorPlanningRepository?.getRecipes?.().some((recipe) => recipe.ingredients?.some((item) => item.foodId === id))) {
      const error = new Error("Food is used by a recipe."); error.code = "FOOD_IN_USE_BY_PLANNING"; throw error;
      }
      envelope.userFoods = envelope.userFoods.filter((item) => item.id !== id);
      envelope.userFoodNutrients = envelope.userFoodNutrients.filter((item) => item.foodId !== id);
      envelope.userFoodPortions = envelope.userFoodPortions.filter((item) => item.foodId !== id);
      return true;
    });
  }

  window.MentorFoodRepository = {
    query, getAll, getSystemFoods: () => clone(systemFoods()), getUserFoods: () => clone(user().userFoods), getById,
    getNutrients: (id) => clone(nutrientRows().filter((item) => item.foodId === id)),
    getSource: (id) => clone(sourceRows().find((item) => item.id === id) || null),
    getPortions: (id) => clone(portionRows().filter((item) => item.foodId === id)),
    getAllNutrients: () => clone(nutrientRows()),
    getAllSources: () => clone(sourceRows()),
    getAllPortions: () => clone(portionRows()),
    createUserFood, createUserFoodIfAbsent, createUserCopy, updateUserFood, archiveUserFood, deleteUserFood
  };
})();

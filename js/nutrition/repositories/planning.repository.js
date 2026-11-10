(function () {
  "use strict";
  const repo = () => window.MentorInventoryRepository;
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const all = (key) => clone(repo().read()[key]);
  function save(collection, prefix, value, id) {
    return repo().mutate((envelope) => {
      const stamp = new Date().toISOString(), index = id ? envelope[collection].findIndex((item) => item.id === id) : -1;
      if (id && index < 0) throw new Error(`${prefix.toUpperCase()}_NOT_FOUND`);
      const current = index >= 0 ? envelope[collection][index] : null;
      const record = { ...clone(value), id: id || window.MentorNutritionId.create(prefix), createdAt: current?.createdAt || stamp, updatedAt: stamp };
      if (index >= 0) envelope[collection][index] = record; else envelope[collection].push(record);
      return record;
    });
  }
  window.MentorPlanningRepository = {
    getIntakeEntries:()=>all("intakeEntries") || [],
    getIntakeEntryById:(id)=>(all("intakeEntries") || []).find((item)=>item.id===id)||null,
    getIntakeEntryForMealPlanEntry:(id)=>(all("intakeEntries") || []).find((item)=>item.mealPlanEntryId===id)||null,
    getRecipeFavoriteIds:()=>all("recipeFavoriteIds"),
    toggleRecipeFavorite(id){
      if (!all("recipes").some((recipe)=>recipe.id===id)) return Promise.resolve(false);
      return repo().mutate((envelope)=>{
        const favorites = new Set(envelope.recipeFavoriteIds || []);
        if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
        envelope.recipeFavoriteIds = [...favorites];
        return favorites.has(id);
      });
    },
    getRecipes:()=>all("recipes"), getRecipeById:(id)=>all("recipes").find((item)=>item.id===id)||null,
    saveRecipe:(value,id)=>save("recipes","recipe",value,id),
    getMealPlanEntries:()=>all("mealPlanEntries"), getMealPlanEntryById:(id)=>all("mealPlanEntries").find((item)=>item.id===id)||null,
    saveMealPlanEntry:(value,id)=>save("mealPlanEntries","meal_plan_entry",value,id),
    removeMealPlanEntry(id){ return repo().mutate((envelope)=>{ const exists=envelope.mealPlanEntries.some((item)=>item.id===id); if(!exists)throw new Error("MEAL_PLAN_ENTRY_NOT_FOUND"); envelope.mealPlanEntries=envelope.mealPlanEntries.filter((item)=>item.id!==id); return true; }); },
    getShoppingItems:()=>all("shoppingItems"),
    addShoppingItems(items){ return repo().mutate((envelope)=>{
      envelope.shoppingItems = Array.isArray(envelope.shoppingItems) ? envelope.shoppingItems : [];
      const stamp = new Date().toISOString(), saved = [];
      (Array.isArray(items) ? items : []).forEach((item)=>{
        if (!item?.foodId || !item?.recipeId || !(Number(item.quantity) > 0) || !item.unit) return;
        const index = envelope.shoppingItems.findIndex((row)=>row.sourceType==="recipe" && row.status!=="done" && row.recipeId===item.recipeId && row.foodId===item.foodId && row.unit===item.unit);
        const current = index >= 0 ? envelope.shoppingItems[index] : null;
        const record = {
          ...clone(current || {}),
          id: current?.id || window.MentorNutritionId.create("shopping_item"),
          foodId:item.foodId,
          recipeId:item.recipeId,
          quantity:Number(item.quantity),
          requiredQuantity:Number(item.requiredQuantity || item.quantity),
          availableQuantity:Number(item.availableQuantity || 0),
          unit:item.unit,
          sourceType:"recipe",
          sourceRecipeName:item.sourceRecipeName || null,
          status:current?.status || "open",
          createdAt:current?.createdAt || stamp,
          updatedAt:stamp
        };
        if (index >= 0) envelope.shoppingItems[index] = record; else envelope.shoppingItems.push(record);
        saved.push(clone(record));
      });
      return saved;
    }); }
  };
})();

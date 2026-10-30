(function(){
  "use strict";
  let cache = null;
  const by = (rows, key) => {
    const map = new Map();
    rows.forEach((row) => map.set(row[key], row));
    return map;
  };
  const groupedBy = (rows, key) => {
    const map = new Map();
    rows.forEach((row) => {
      const id = row[key];
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    });
    return map;
  };
  function readCache(){
    if(cache)return cache;
    const nutrients = window.MentorFoodRepository.getAllNutrients?.() || [];
    cache = {
      foods: by(window.MentorFoodRepository.getAll(), "id"),
      sources: by(window.MentorFoodRepository.getAllSources?.() || [], "id"),
      portions: groupedBy(window.MentorFoodRepository.getAllPortions?.() || [], "foodId"),
      nutrients: groupedBy(nutrients, "foodId"),
      nutrientDefinitions: by(window.MentorNutrientRepository.getAll(), "id")
    };
    return cache;
  }
  function details(foodId){const index=readCache(),food=index.foods.get(foodId);if(!food)return null;const values=index.nutrients.get(foodId)||[],byCode=new Map();values.forEach(value=>{const definition=index.nutrientDefinitions.get(value.nutrientId);if(definition)byCode.set(definition.code,{definition,...value});});return{food,source:index.sources.get(food.sourceId)||null,portions:index.portions.get(foodId)||[],nutrients:values,byCode};}
  function scale(foodId,grams){if(!Number.isFinite(grams)||grams<0)throw new Error("Količina mora biti nenegativna.");const result=details(foodId);if(!result)return null;return{...result,grams,nutrients:result.nutrients.map(value=>({...value,amount:value.amount===null?null:value.amount*grams/100}))};}
  function formTemplate(foodId){const result=details(foodId);if(!result)return null;const groups={};window.MentorNutrientRepository.getAll().forEach(definition=>{groups[definition.group]=groups[definition.group]||[];const value=result.byCode.get(definition.code);groups[definition.group].push({definition,amount:value?.amount??null,available:Boolean(value)});});return{food:{...result.food},source:result.source,groups};}
  window.addEventListener?.("mentor:nutrition-foodschange",()=>{cache=null;});
  window.MentorFoodNutritionService={details,scale,formTemplate};
})();

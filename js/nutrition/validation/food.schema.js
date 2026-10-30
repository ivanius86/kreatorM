(function(){
  "use strict";
  const states=new Set(["raw","dry","cooked","boiled","baked","fried","roasted","drained","other"]), categories=()=>new Set((window.MentorNutritionFoodCategories||[]).map(x=>x.id));
  function validate(food,context={}){const errors=[];if(!food||typeof food!=="object")return ["food.invalid"];
    if(!food.id)errors.push("food.id.required");if(!food.slug)errors.push("food.slug.required");if(!categories().has(food.categoryId))errors.push("food.category.invalid");
    if(!states.has(food.preparationState))errors.push("food.preparationState.invalid");if(food.referenceAmount!==100)errors.push("food.referenceAmount.mustBe100");if(food.referenceUnit!=="g")errors.push("food.referenceUnit.mustBeG");
    if(food.sourceId&&context.sources&&!context.sources.has(food.sourceId))errors.push("food.source.invalid");
    const normalized=window.MentorFoodFilterProfile.normalize(food.filterProfile),source=food.filterProfile||{};
    ["dietary","fasting","allergens"].forEach((group)=>Object.keys(source[group]||{}).forEach((key)=>{if(normalized[group]?.[key]!==source[group][key])errors.push(`food.filterProfile.${group}.invalid`);}));return errors;}
  function validateCollection(foods,context={}){const errors=[],ids=new Set(),slugs=new Set();for(const food of foods){for(const code of validate(food,context))errors.push({foodId:food?.id||null,code});if(ids.has(food.id))errors.push({foodId:food.id,code:"food.id.duplicate"});if(slugs.has(food.slug))errors.push({foodId:food.id,code:"food.slug.duplicate"});ids.add(food.id);slugs.add(food.slug);}return errors;}
  window.MentorNutritionValidation=window.MentorNutritionValidation||{};window.MentorNutritionValidation.food={validate,validateCollection};
})();

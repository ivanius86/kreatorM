(function(){
  "use strict";
  function validate(value,context={}){const errors=[];if(!context.foodIds?.has(value.foodId))errors.push("foodNutrient.food.invalid");const definition=context.nutrients?.get(value.nutrientId);if(!definition)errors.push("foodNutrient.nutrient.invalid");if(value.amount!==null&&(!Number.isFinite(value.amount)||value.amount<0))errors.push("foodNutrient.amount.invalid");if(value.basisAmount!==100)errors.push("foodNutrient.basisAmount.mustBe100");if(value.basisUnit!=="g")errors.push("foodNutrient.basisUnit.mustBeG");return errors;}
  function validateCollection(values,context){const errors=[],keys=new Set();for(const value of values){for(const code of validate(value,context))errors.push({foodId:value.foodId,nutrientId:value.nutrientId,code});const key=`${value.foodId}:${value.nutrientId}`;if(keys.has(key))errors.push({foodId:value.foodId,nutrientId:value.nutrientId,code:"foodNutrient.duplicate"});keys.add(key);}return errors;}
  window.MentorNutritionValidation=window.MentorNutritionValidation||{};window.MentorNutritionValidation.foodNutrient={validate,validateCollection};
})();

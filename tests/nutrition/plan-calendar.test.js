const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("meal-plan calendar renders three flexible bands with every meal in its day", () => {
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const date = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const entries = [
    { id:"breakfast-1", recipeId:"recipe-1", plannedDate:date, mealType:"breakfast", servings:1 },
    { id:"breakfast-2", recipeId:"recipe-1", plannedDate:date, mealType:"breakfast", servings:1 },
    { id:"breakfast-3", recipeId:"recipe-1", plannedDate:date, mealType:"breakfast", servings:1 },
    { id:"snack-1", recipeId:"recipe-1", plannedDate:date, mealType:"snack", servings:1 }
  ];
  const recipe = { id:"recipe-1", name:"Jogurt i voće", servings:1 };
  const win = {
    localStorage:{ getItem:()=>"[]" }, MentorI18n:{ locale:"sr" },
    MentorNutritionComponents:{ t:(_, fallback)=>fallback, esc:(value)=>String(value), foodIcon:()=>"" },
    MentorNutritionInventoryFormUI:{ foodName:()=>"" },
    MentorNutritionIcons:{ icon:()=>"" },
    MentorMealPlanSelectors:{
      recipeNutrition:()=>({ known:{ energyKcal:true, protein:false }, values:{ energyKcal:250 } }),
      dailyGoals:()=>({ energyKcal:2000, protein:100 }),
      groupByDay:()=>Array.from({ length:7 }, (_, index)=>({ date:index ? "" : date, known:{ energyKcal:false, protein:false }, values:{} })),
      missingIngredients:()=>[]
    },
    MentorPlanningRepository:{ getMealPlanEntries:()=>entries, getMealPlanEntryById:()=>null, getRecipes:()=>[recipe], getRecipeFavoriteIds:()=>[] },
    MentorInventoryRepository:{ getAllocations:()=>[] },
    MentorInventoryService:{ getFood:()=>null }
  };
  const context = vm.createContext({ window:win });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/tabs/plan-ishrane.js"), "utf8"), context);
  const html = win.MentorNutritionTabs.plan({ weekOffset:0, selectedDay:0, planDayTouched:true });
  assert.equal((html.match(/class="nutrition-plan-segment nutrition-plan-segment-/g) || []).length, 3);
  assert.equal((html.match(/data-plan-meal-segment="morning"/g) || []).length, 3);
  assert.equal((html.match(/data-plan-meal-segment="daytime"/g) || []).length, 1);
  assert.match(html, /data-plan-drop-segment="daytime" data-plan-drop-meal-type="lunch"/);
  assert.match(html, /data-meal-type="snack" data-plan-drop-meal-type="snack"/);
  assert.equal((html.match(/class="nutrition-plan-segment-day /g) || []).length, 21);
});

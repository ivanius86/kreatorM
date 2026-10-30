const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
function setup() {
  const foods = [
    { id:"apple", defaultName:"Apple", categoryId:"fruits", ownership:"system", status:"active" },
    { id:"pear", defaultName:"Pear", categoryId:"fruits", ownership:"user", status:"active" },
    { id:"rice", defaultName:"Rice", categoryId:"grains", ownership:"system", status:"active" }
  ];
  const locations = [
    { id:"cold", name:"Fridge", builtInKey:"fridge", icon:"fridge" },
    { id:"frozen", name:"Freezer", builtInKey:"freezer", icon:"snowflake" },
    { id:"dry", name:"Pantry", builtInKey:"pantry", icon:"box" },
    { id:"custom", name:"Travel bag", icon:"box" }
  ];
  const today = new Date();
  const iso = (offset) => { const date = new Date(today); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; };
  const batches = [
    { id:"first", foodId:"apple", locationId:"cold", quantity:250, unit:"g", expiryDate:iso(1) },
    { id:"second", foodId:"pear", locationId:"custom", quantity:100, unit:"g", expiryDate:iso(2) },
    { id:"third", foodId:"rice", locationId:"dry", quantity:400, unit:"g", expiryDate:iso(30) }
  ];
  let locale = "en";
  const resources = {};
  const context = vm.createContext({ console, Intl, Date });
  context.window = context;
  context.MentorI18n = {
    resources,
    getLanguage:() => locale,
    registerResources:(lang, namespace, values) => { resources[lang] ||= {}; resources[lang][namespace] = values; },
    t:(key, params, fallback) => {
      if (typeof params === "string") { fallback = params; params = {}; }
      const value = key.split(".").reduce((obj, part) => obj?.[part], resources[locale]);
      return String(value ?? fallback ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => params?.[name] ?? "");
    }
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  context.MentorNutritionComponents = {
    esc,
    t:(key, fallback, params) => context.MentorI18n.t(`nutrition.${key}`, params, fallback),
    panel:(title, body, className) => `<section class="nutrition-panel ${className}"><div class="nutrition-panel-head"><h2>${esc(title)}</h2></div>${body}</section>`,
    badge:(label) => `<span class="nutrition-badge">${esc(label)}</span>`,
    summary:(label, value) => `<div class="nutrition-summary"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`
  };
  context.MentorFoodRepository = { getAll:() => foods, getById:(id) => foods.find((food) => food.id === id), getPortions:() => [], getSource:() => null };
  context.MentorNutrientRepository = { getById:() => null };
  context.MentorFoodNutritionService = { details:(id) => ({ food:foods.find((food) => food.id === id), nutrients:[], portions:[], byCode:new Map([["energyKcal", { amount:52 }], ["protein", { amount:null }]]) }) };
  context.MentorNutritionInventoryFormUI = { foodName:(food) => food?.defaultName || "" };
  context.MentorInventoryRepository = { initialize:() => {}, getBatches:() => batches, getLocations:() => locations, getLocationById:(id) => locations.find((location) => location.id === id) };
  context.MentorInventoryService = {
    ALLOWED_PACKAGE_TYPES:[], getFood:context.MentorFoodRepository.getById,
    statusForBatch:() => "available", reservedForBatch:() => 0, availableForBatch:(batch) => batch.quantity,
    getBatchesForFood:(id) => batches.filter((batch) => batch.foodId === id), getLinkedAllocationsForFood:() => []
  };
  context.MentorNutritionUnitConversion = { isCompatible:(a,b) => a === b, convert:(amount) => amount };
  for (const file of ["data/food-categories.js", "components/nutrition-icons.js", "nutrition-foods-i18n.js", "nutrition-inventory-i18n.js", "nutrition-storage.js", "tabs/namirnice.js", "tabs/frizider.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "js/nutrition", file), "utf8"), context, { filename:file });
  }
  return { context, foods, batches, state:context.MentorNutritionStorage.createState(), setLanguage:(lang) => { locale = lang; } };
}

test("category strip counts the repository, keeps all categories and filters the same food table", () => {
  const { context, foods, state } = setup();
  state.filters.foodCategory = "fruits";
  let html = context.MentorNutritionTabs.foods(state);
  assert.match(html, /data-category="fruits" aria-pressed="true"[^>]*>[\s\S]*?<strong>2<\/strong>/);
  assert.match(html, /data-category="" aria-pressed="false"[^>]*>[\s\S]*?<strong>3<\/strong>/);
  assert.match(html, /data-category="legumes"/);
  assert.match(html, /assets\/nutrition\/fruit.png/);
  assert.match(html, /data-action="food-quick-fridge"/);
  const table = html.split("<tbody>")[1].split("</tbody>")[0];
  assert.match(table, /Apple/);
  assert.doesNotMatch(table, /Rice/);
  assert.equal(state.selectedFood, "apple");
  foods.push({ id:"plum", defaultName:"Plum", categoryId:"fruits", status:"active" });
  html = context.MentorNutritionTabs.foodResults(state);
  assert.match(html, /data-category="fruits" aria-pressed="true"[^>]*>[\s\S]*?<strong>3<\/strong>/);
});

test("search, selection, nutrient sections and the system copy action survive the food layout", () => {
  const { context, state, setLanguage } = setup();
  state.search = "rice";
  const html = context.MentorNutritionTabs.foods(state);
  assert.equal(state.selectedFood, "rice");
  assert.match(html, /data-action="food-edit" data-id="rice"/);
  assert.match(html, /Create user copy/);
  assert.match(html, /data-nutrient-panel="vitamin"/);
  assert.match(html, /data-nutrient-panel="mineral"[^>]*hidden/);
  assert.match(html, /data-nutrient-panel="other"[^>]*hidden/);
  assert.match(html, /No data/);
  setLanguage("sr");
  assert.match(context.MentorNutritionTabs.foods(state), /Detalji namirnice/);
  assert.doesNotMatch(context.MentorNutritionTabs.foods(state), /nutrition-library-header/);
});

test("inventory cards keep custom locations; expiry selections resolve from the filtered list", () => {
  const { context, state } = setup();
  state.inventoryFilters.locationId = "custom";
  const html = context.MentorNutritionTabs.fridge(state);
  assert.match(html, /Travel bag/);
  assert.match(html, /data-action="inventory-location-delete" data-location-id="custom"/);
  assert.doesNotMatch(html, /nutrition-library-header/);
  for (const asset of ["fridge", "freezer", "pantry"]) assert.match(html, new RegExp(`assets/nutrition/${asset}\\.png`));
  assert.match(html, /data-location-id="custom" aria-pressed="true"/);
  assert.equal(state.selectedStock, "second");
  const expiry = html.split('class="nutrition-inventory-expiring-list"')[1].split("</section>")[0];
  assert.match(expiry, /data-id="second"/);
  assert.match(expiry, /Travel bag/);
  assert.doesNotMatch(expiry, /data-id="first"/);
  const details = html.split('data-panel="inventory-details"')[1];
  for (const action of ["consume", "edit", "move", "remove"]) assert.match(details, new RegExp(`data-action="inventory-${action}" data-id="second"`));
  assert.match(details, /52 kcal/);
  assert.match(details, /No data/);
  assert.match(details, /Reserved/);
});

test("inventory remaining column shows stored quantity even when all units are reserved", () => {
  const { context, state, batches } = setup();
  state.inventoryFilters.locationId = "";
  context.MentorInventoryService.reservedForBatch = batchId => batchId === "second" ? batches.find(row => row.id === batchId).quantity : 0;
  context.MentorInventoryService.availableForBatch = batch => batch.id === "second" ? 0 : batch.quantity;
  const table = context.MentorNutritionTabs.fridge(state).split("<tbody>")[1].split("</tbody>")[0];
  const selected = table.match(/<tr[^>]*data-id="second"[\s\S]*?<\/tr>/)?.[0];
  assert.ok(selected);
  assert.match(selected, new RegExp(`<td>${batches.find(row => row.id === "second").quantity} [^<]+<\\/td>`));
  assert.doesNotMatch(selected, /<td>0 [^<]+<\/td>/);
});

test("empty inventory renders safely and the supplied PNG assets retain alpha channels", () => {
  const { context, state, batches } = setup();
  batches.length = 0;
  const html = context.MentorNutritionTabs.fridge(state);
  assert.equal(state.selectedStock, null);
  assert.match(html, /Inventory is empty/);
  assert.match(html, /No items expiring soon/);
  for (const name of ["fridge", "freezer", "pantry", "vegetables", "fruit", "meat", "fish-seafood", "dairy", "grains"]) {
    const bytes = fs.readFileSync(path.join(root, "assets/nutrition", `${name}.png`));
    assert.equal(bytes.subarray(1,4).toString(), "PNG");
    assert.ok([4,6].includes(bytes[25]), `${name} must retain its PNG alpha channel`);
  }
});

test("nutrient detail sections omit unknown amounts while preserving known zero values", () => {
  const { context, state } = setup();
  const definitions = {
    missingVitamin:{ group:"vitamin", defaultName:"Missing vitamin", unit:"mg" },
    zeroVitamin:{ group:"vitamin", defaultName:"Zero vitamin", unit:"mg" },
    missingMineral:{ group:"mineral", defaultName:"Missing mineral", unit:"mg" },
    knownMineral:{ group:"mineral", defaultName:"Known mineral", unit:"mg" },
    missingOther:{ group:"macro", defaultName:"Missing other", unit:"g" }
  };
  Object.entries(definitions).forEach(([id, definition]) => { definition.nameKey = `test.${id}`; });
  context.MentorNutrientRepository.getById = (id) => definitions[id];
  context.MentorFoodNutritionService.details = () => ({ portions:[], byCode:new Map(), nutrients:[
    { nutrientId:"missingVitamin", amount:null }, { nutrientId:"zeroVitamin", amount:0 },
    { nutrientId:"missingMineral" }, { nutrientId:"knownMineral", amount:4.5 }, { nutrientId:"missingOther", amount:null }
  ] });
  const html = context.MentorNutritionTabs.foods(state);
  assert.doesNotMatch(html, /Missing vitamin|Missing mineral|Missing other/);
  assert.match(html, /Zero vitamin/);
  assert.match(html, /0 mg/);
  assert.match(html, /Known mineral/);
  assert.match(html, /4.5 mg/);
});

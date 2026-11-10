(function () {
  "use strict";
  const sr = {
    inventory: {
      title:"Zalihe", add:"Dodaj u zalihe", overview:"Pregled zaliha", remaining:"Preostalo", reserved:"Rezervisano", available:"Slobodno dostupno", consumed:"Potrošeno",
      location:"Lokacija", createLocation:"Kreiraj novu lokaciju", createLocationOption:"+ Kreiraj novu lokaciju", expiryDate:"Rok trajanja", purchaseDate:"Datum nabavke", addedAt:"Datum dodavanja", openedDate:"Datum otvaranja",
      store:"Prodavnica", price:"Cena", package:"Pakovanje", consume:"Potroši", restock:"Dopuni", move:"Premesti", edit:"Izmeni", remove:"Ukloni", linkedMealPlan:"Povezano sa planom ishrane",
      missing:"Nedostaje", required:"Potrebno", partiallyReserved:"Delimično rezervisano", noExpiry:"Bez roka", expired:"Isteklo", food:"Namirnica", category:"Kategorija", status:"Stanje", actions:"Akcije",
      search:"Pretraži zalihe", allLocations:"Sve lokacije", allCategories:"Sve kategorije", allStatuses:"Svi statusi", allExpiries:"Svi rokovi", today:"Ističe danas", next3:"U naredna 3 dana", next7:"U narednih 7 dana", next30:"U narednih 30 dana",
      emptyTitle:"Zalihe su prazne", emptyText:"Dodaj prvu namirnicu i prati količinu, lokaciju i rok trajanja.", selectHint:"Izaberi stavku da vidiš detalje.", batches:"Broj serija", total:"Ukupna količina", free:"Slobodno", minimum:"Minimalna zaliha",
      locations:{fridge:"Frižider",freezer:"Zamrzivač",pantry:"Ostava"}, statuses:{available:"Dostupno",low:"Pri kraju",expiring_soon:"Ističe uskoro",expires_today:"Ističe danas",expired:"Isteklo",consumed:"Potrošeno",opened:"Otvoreno",reserved:"Rezervisano"},
      form:{titleAdd:"Dodaj u zalihe",titleEdit:"Izmeni stavku zalihe",foodSection:"Namirnica",quantitySection:"Količina",storageSection:"Čuvanje",datesSection:"Datumi",more:"Više detalja",foodSearch:"Pretraži namirnice",chooseFood:"Izaberi namirnicu",quantity:"Količina",unit:"Jedinica",packageCount:"Broj pakovanja",packageSize:"Sadržaj pakovanja",packageUnit:"Jedinica pakovanja",packageType:"Tip pakovanja",storageState:"Način čuvanja",sourceType:"Izvor nabavke",storeName:"Naziv prodavnice",totalPrice:"Ukupna cena",currency:"Valuta",note:"Napomena",cancel:"Otkaži",saveAdd:"Sačuvaj i dodaj novu",submit:"Dodaj u zalihe",save:"Sačuvaj izmene",saving:"Čuvanje…",openDatePicker:"Otvori kalendar"},
      packageTypes:{package:"Pakovanje",box:"Kutija",bag:"Kesa",jar:"Tegla",can:"Konzerva",bottle:"Boca"}, storageStates:{chilled:"Rashlađeno",frozen:"Zamrznuto",room:"Sobna temperatura"}, sourceTypes:{store:"Kupovina",home:"Domaće",gift:"Poklon",other:"Drugo"},
      locationForm:{title:"Nova lokacija",name:"Naziv lokacije",icon:"Ikona",submit:"Kreiraj lokaciju"}, actionForm:{amount:"Količina",titleConsume:"Potroši količinu",titleRestock:"Dopuni zalihu",titleMove:"Premesti stavku",confirm:"Potvrdi"},
      confirm:{title:"Ukloni stavku?",text:"Stavka će biti uklonjena, a aktivne rezervacije oslobođene.",confirm:"Ukloni"},
      validation:{required:"Polje je obavezno.",positive:"Unesi količinu veću od nule.",unit:"Izaberi podržanu jedinicu.",foodMissing:"Namirnica više ne postoji.",locationMissing:"Lokacija više ne postoji.",expiryBeforePurchase:"Rok ne može biti pre datuma nabavke.",negative:"Vrednost ne može biti negativna.",number:"Unesi ispravan broj.",date:"Unesi ispravan datum.",activeReservation:"Jedinica se ne može promeniti dok postoje rezervacije.",reservedMinimum:"Količina ne može biti manja od aktivno rezervisane.",saveFailed:"Čuvanje nije uspelo. Podaci nisu izgubljeni.",quantityExceeds:"Količina je veća od slobodno dostupne.",incompatibleUnits:"Jedinice nisu kompatibilne."},
      notices:{saved:"Stavka je sačuvana.",deleted:"Stavka je uklonjena.",consumed:"Količina je umanjena.",restocked:"Zaliha je dopunjena.",moved:"Stavka je premeštena.",locationCreated:"Nova lokacija je kreirana."},
      orphan:"Nepovezana namirnica", needsLink:"Potrebno je ručno povezivanje", noLinks:"Nema aktivnih rezervacija.", meal:"Obrok", plannedDate:"Datum obroka", reservationStatus:"Status rezervacije"
    },
    planning:{recipes:"Recepti",addRecipe:"Dodaj recept",editRecipe:"Izmeni recept",recipeName:"Naziv recepta",description:"Opis",servings:"Porcije",mealType:"Tip obroka",ingredients:"Sastojci",addIngredient:"Dodaj sastojak",saveRecipe:"Sačuvaj recept",noRecipes:"Još nema sačuvanih recepata.",mealPlan:"Plan ishrane",addMeal:"Dodaj obrok",editMeal:"Izmeni",copyMeal:"Kopiraj",copyTargetRequired:"Za kopiju izaberite drugi datum ili tip obroka.",chooseRecipe:"Izaberi recept",plannedDate:"Datum obroka",saveMeal:"Sačuvaj obrok",removeMeal:"Ukloni obrok",completeMeal:"Potvrdi pripremu",markPrepared:"Označi kao pripremljeno",noMeals:"Nema planiranih obroka za ovu nedelju.",shopping:"Potrebno kupiti",allAvailable:"Svi sastojci su obezbeđeni.",required:"Potrebno",available:"Dostupno",reserved:"Rezervisano",missing:"Nedostaje",missingIngredients:"Nedostajuće namirnice",breakfast:"Doručak",lunch:"Ručak",dinner:"Večera",snack:"Užina",planned:"Planirano",completed:"Pripremljeno",cancel:"Otkaži",remove:"Ukloni",validation:"Proveri obavezna polja i količine.",savedRecipe:"Recept je sačuvan.",savedMeal:"Obrok je sačuvan i zalihe su ponovo izračunate.",removedMeal:"Obrok je uklonjen, a rezervacije oslobođene.",completedMeal:"Obrok je pripremljen i zalihe su umanjene.",plannedMeals:"Planirano obroka",averageKcal:"Prosečno kcal",averageProtein:"Prosečni proteini",daysInGoal:"Dani u cilju",today:"Danas",previousWeek:"Prethodna sedmica",nextWeek:"Sledeća sedmica",dailySummary:"Dnevni rezime",dayOverview:"Pregled dana",mealDetails:"Detalji obroka",plannedMealCount:"planiranih obroka",estimatedCost:"procenjena cena",calories:"Kalorije",protein:"Proteini",carbohydrates:"Ugljeni hidrati",fat:"Masti",fiber:"Vlakna",availability:"Dostupnost",availabilityAvailable:"Dostupno",availabilityPartial:"Delimično dostupno",availabilityMissing:"Nedostaje",reservedIngredients:"Rezervacije namirnica",noReservations:"Nema rezervacija.",selectMealPrompt:"Izaberite planirani obrok za prikaz detalja.",notAvailable:"N/A",noNutritionData:"Nema nutritivnih podataka",calorieGoalRange:"90–110% cilja",uniqueIngredients:"jedinstvenih namirnica"}
  };
  const en = {
    inventory: {
      title:"Inventory", add:"Add to inventory", overview:"Inventory overview", remaining:"Remaining", reserved:"Reserved", available:"Available", consumed:"Consumed",
      location:"Location", createLocation:"Create new location", createLocationOption:"+ Create new location", expiryDate:"Expiry date", purchaseDate:"Purchase date", addedAt:"Date added", openedDate:"Opened date",
      store:"Store", price:"Price", package:"Package", consume:"Consume", restock:"Restock", move:"Move", edit:"Edit", remove:"Remove", linkedMealPlan:"Linked to meal plan",
      missing:"Missing", required:"Required", partiallyReserved:"Partially reserved", noExpiry:"No expiry", expired:"Expired", food:"Food", category:"Category", status:"Status", actions:"Actions",
      search:"Search inventory", allLocations:"All locations", allCategories:"All categories", allStatuses:"All statuses", allExpiries:"All expiry dates", today:"Expires today", next3:"Next 3 days", next7:"Next 7 days", next30:"Next 30 days",
      emptyTitle:"Inventory is empty", emptyText:"Add your first food and track quantity, location and expiry.", selectHint:"Select an item to see details.", batches:"Batches", total:"Total quantity", free:"Available", minimum:"Minimum stock",
      locations:{fridge:"Fridge",freezer:"Freezer",pantry:"Pantry"}, statuses:{available:"Available",low:"Low stock",expiring_soon:"Expiring soon",expires_today:"Expires today",expired:"Expired",consumed:"Consumed",opened:"Opened",reserved:"Reserved"},
      form:{titleAdd:"Add to inventory",titleEdit:"Edit inventory item",foodSection:"Food",quantitySection:"Quantity",storageSection:"Storage",datesSection:"Dates",more:"More details",foodSearch:"Search foods",chooseFood:"Choose a food",quantity:"Quantity",unit:"Unit",packageCount:"Package count",packageSize:"Package size",packageUnit:"Package unit",packageType:"Package type",storageState:"Storage state",sourceType:"Source",storeName:"Store name",totalPrice:"Total price",currency:"Currency",note:"Note",cancel:"Cancel",saveAdd:"Save and add another",submit:"Add to inventory",save:"Save changes",saving:"Saving…",openDatePicker:"Open calendar"},
      packageTypes:{package:"Package",box:"Box",bag:"Bag",jar:"Jar",can:"Can",bottle:"Bottle"}, storageStates:{chilled:"Chilled",frozen:"Frozen",room:"Room temperature"}, sourceTypes:{store:"Purchase",home:"Home produced",gift:"Gift",other:"Other"},
      locationForm:{title:"New location",name:"Location name",icon:"Icon",submit:"Create location"}, actionForm:{amount:"Quantity",titleConsume:"Consume quantity",titleRestock:"Restock inventory",titleMove:"Move item",confirm:"Confirm"},
      confirm:{title:"Remove item?",text:"The item will be removed and active reservations released.",confirm:"Remove"},
      validation:{required:"This field is required.",positive:"Enter a quantity greater than zero.",unit:"Choose a supported unit.",foodMissing:"The food no longer exists.",locationMissing:"The location no longer exists.",expiryBeforePurchase:"Expiry cannot be before the purchase date.",negative:"The value cannot be negative.",number:"Enter a valid number.",date:"Enter a valid date.",activeReservation:"The unit cannot change while reservations are active.",reservedMinimum:"Quantity cannot be lower than the active reservation.",saveFailed:"Saving failed. Your existing data is safe.",quantityExceeds:"The quantity exceeds the available amount.",incompatibleUnits:"The units are not compatible."},
      notices:{saved:"Inventory item saved.",deleted:"Inventory item removed.",consumed:"Quantity consumed.",restocked:"Inventory restocked.",moved:"Item moved.",locationCreated:"New location created."},
      orphan:"Unlinked food", needsLink:"Manual linking required", noLinks:"No active reservations.", meal:"Meal", plannedDate:"Meal date", reservationStatus:"Reservation status"
    },
    planning:{recipes:"Recipes",addRecipe:"Add recipe",editRecipe:"Edit",recipeName:"Recipe name",description:"Description",servings:"Servings",mealType:"Meal type",ingredients:"Ingredients",addIngredient:"Add ingredient",saveRecipe:"Save recipe",noRecipes:"No saved recipes yet.",mealPlan:"Meal plan",addMeal:"Add meal",editMeal:"Edit",copyMeal:"Copy",copyTargetRequired:"Choose a different date or meal type for the copy.",chooseRecipe:"Choose a recipe",plannedDate:"Meal date",saveMeal:"Save meal",removeMeal:"Remove meal",completeMeal:"Confirm preparation",markPrepared:"Mark as prepared",noMeals:"No meals planned for this week.",shopping:"Shopping needed",allAvailable:"All ingredients are covered.",required:"Required",available:"Available",reserved:"Reserved",missing:"Missing",missingIngredients:"Missing ingredients",breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",snack:"Snack",planned:"Planned",completed:"Prepared",cancel:"Cancel",remove:"Remove",validation:"Check required fields and quantities.",savedRecipe:"Recipe saved.",savedMeal:"Meal saved and inventory recalculated.",removedMeal:"Meal removed and reservations released.",completedMeal:"Meal prepared and inventory consumed.",plannedMeals:"Planned meals",averageKcal:"Average kcal",averageProtein:"Average protein",daysInGoal:"Days in goal",today:"Today",previousWeek:"Previous week",nextWeek:"Next week",dailySummary:"Daily summary",dayOverview:"Day overview",mealDetails:"Meal details",plannedMealCount:"planned meals",estimatedCost:"estimated cost",calories:"Calories",protein:"Protein",carbohydrates:"Carbohydrates",fat:"Fat",fiber:"Fiber",availability:"Availability",availabilityAvailable:"Available",availabilityPartial:"Partially available",availabilityMissing:"Missing",reservedIngredients:"Ingredient reservations",noReservations:"No reservations.",selectMealPrompt:"Select a planned meal to see details.",notAvailable:"N/A",noNutritionData:"No nutrition data",calorieGoalRange:"90–110% of goal",uniqueIngredients:"unique ingredients"}
  };
  sr.inventory.expiryStatus = { today:"Ističe danas", tomorrow:"Ističe sutra", inDays:"Ističe za {{count}} dana", expiredYesterday:"Isteklo juče", expiredDays:"Isteklo pre {{count}} dana" };
  sr.inventory.formQuantity = { grams:"Gramaža (g)", kilograms:"Težina (kg)", milliliters:"Zapremina (ml)", liters:"Zapremina (l)", pieces:"Količina (kom)", packages:"Broj pakovanja", generic:"Količina ({{unit}})" };
  Object.assign(sr.inventory.form, { packageSizeWithUnit:"Sadržaj jednog pakovanja ({{unit}})", packageTotal:"Ukupno: {{quantity}} {{unit}}" });
  sr.inventory.locationPanel = { title:"Lokacije", create:"Kreiraj lokaciju", products:"{{count}} proizvoda", expiring:"{{count}} ističe uskoro", allGood:"Sve u redu" };
  sr.inventory.expiringPanel = { title:"Uskoro ističe", empty:"Nema stavki koje uskoro ističu." };
  Object.assign(sr.planning, {
    markPlanned:"Označi kao planirano",
    ingredientsLower:"sastojka", servingsLower:"porcija", canPrepare:"Možeš pripremiti", missingOne:"Nedostaje 1 sastojak", missingMany:"Nedostaje {{count}} sastojaka",
    caloriesUnknown:"kcal nepoznato", plannedCount:"{{count}} u planu", highProtein:"Visok protein", totalRecipes:"Ukupno recepata", canPrepareNow:"Mogu odmah", plannedThisWeek:"Za ovu nedelju",
    needsInventory:"Traži zalihe", selectedRecipeDetails:"Detalji izabranog recepta", available:"Dostupno", calories:"Kalorije", protein:"Proteini", carbs:"Ugljeni hidrati", fat:"Masti", unknownShort:"N/A",
    availableQty:"Slobodno", requiredQty:"Potrebno", missingQty:"Nedostaje", availabilityAvailable:"Dostupno", availabilityPartial:"Delimično dostupno", availabilityMissing:"Nedostaje", missingIngredients:"Namirnice koje nedostaju", noMissingIngredients:"Svi sastojci su dostupni.", nutritionIncomplete:"Nedostaje podatak", atLeastValue:"≥ {{value}} {{unit}}", servingsControl:"Broj porcija", decreaseServings:"Smanji broj porcija", increaseServings:"Povećaj broj porcija", minutesShort:"{{count}} min",
    notPlanned:"Još nije u planu.", openRecipe:"Otvori recept", planRecipe:"Planiraj obrok", noInventorySuggestions:"Još nema recepata koje zalihe potpuno pokrivaju.",
    noMatchingRecipes:"Nijedan recept ne odgovara filterima.", clearFilters:"Očisti filtere", searchRecipes:"Pretraži recepte...", allMeals:"Svi obroci", availability:"Dostupnost",
    allAvailability:"Sva dostupnost", readyOnly:"Mogu da pripremim", missingOnly:"Nedostaju sastojci", allCalories:"Sve kalorije", under400:"Ispod 400 kcal", over400:"400+ kcal",
    recipeImage:"Slika recepta", imageNone:"Bez slike", imageUrl:"Link slike", imageLocal:"Upload slike", uploadImage:"Izaberi sliku", imageHint:"JPG, PNG ili WEBP, do 5 MB", noImage:"Nema slike", imageUrlError:"Unesi ispravan HTTP ili HTTPS link slike.", imageTypeError:"Podržani su samo JPG, PNG i WEBP fajlovi.", imageSizeError:"Slika može imati najviše 5 MB.", imageRequiredError:"Izaberi sliku za upload.", videoUrl:"Video link", videoUrlError:"Unesi ispravan HTTP ili HTTPS video link.", recipeVideo:"Video recepta", openVideo:"Otvori video"
  });
  en.inventory.expiryStatus = { today:"Expires today", tomorrow:"Expires tomorrow", inDays:"Expires in {{count}} days", expiredYesterday:"Expired yesterday", expiredDays:"Expired {{count}} days ago" };
  en.inventory.formQuantity = { grams:"Weight / grams (g)", kilograms:"Weight (kg)", milliliters:"Volume (ml)", liters:"Volume (l)", pieces:"Quantity / pieces", packages:"Package count", generic:"Quantity ({{unit}})" };
  Object.assign(en.inventory.form, { packageSizeWithUnit:"Contents per package ({{unit}})", packageTotal:"Total: {{quantity}} {{unit}}" });
  en.inventory.locationPanel = { title:"Locations", create:"Create location", products:"{{count}} products", expiring:"{{count}} expiring soon", allGood:"All good" };
  en.inventory.expiringPanel = { title:"Expiring soon", empty:"No items expiring soon." };

  Object.assign(en.planning, {
    markPlanned:"Mark as planned",
    ingredientsLower:"ingredients", servingsLower:"servings", canPrepare:"Can prepare", missingOne:"Missing 1 ingredient", missingMany:"Missing {{count}} ingredients",
    caloriesUnknown:"kcal unknown", plannedCount:"{{count}} planned", highProtein:"High protein", totalRecipes:"Total recipes", canPrepareNow:"Can prepare now", plannedThisWeek:"Planned this week",
    needsInventory:"Need inventory", selectedRecipeDetails:"Selected recipe details", available:"Available", calories:"Calories", protein:"Protein", carbs:"Carbs", fat:"Fat", unknownShort:"N/A",
    availableQty:"Unreserved", requiredQty:"Needed", missingQty:"Missing", availabilityAvailable:"Available", availabilityPartial:"Partially available", availabilityMissing:"Missing", missingIngredients:"Missing ingredients", noMissingIngredients:"All ingredients are available.", nutritionIncomplete:"Missing data", atLeastValue:"≥ {{value}} {{unit}}", servingsControl:"Servings", decreaseServings:"Decrease servings", increaseServings:"Increase servings", minutesShort:"{{count}} min",
    notPlanned:"Not planned yet.", openRecipe:"Open recipe", planRecipe:"Plan meal", noInventorySuggestions:"No recipes are fully covered by inventory yet.",
    noMatchingRecipes:"No recipes match these filters.", clearFilters:"Clear filters", searchRecipes:"Search recipes...", allMeals:"All meals", availability:"Availability",
    allAvailability:"All availability", readyOnly:"Can prepare", missingOnly:"Missing ingredients", allCalories:"All calories", under400:"Under 400 kcal", over400:"400+ kcal",
    recipeImage:"Recipe image", imageNone:"No image", imageUrl:"Image link", imageLocal:"Upload image", uploadImage:"Choose image", imageHint:"JPG, PNG or WEBP, up to 5 MB", noImage:"No image", imageUrlError:"Enter a valid HTTP or HTTPS image URL.", imageTypeError:"Only JPG, PNG and WEBP files are supported.", imageSizeError:"The image can be up to 5 MB.", imageRequiredError:"Choose an image to upload.", videoUrl:"Video link", videoUrlError:"Enter a valid HTTP or HTTPS video link.", recipeVideo:"Recipe video", openVideo:"Open video"
  });

  Object.assign(sr.planning, {
    recipeMetadata:"Oznake i filteri recepta", preparation:"Priprema", preparationMinutes:"Vreme pripreme (minuti)",
    filters:{
      all:"Svi filteri", meal:"Obrok", diet:"Način ishrane", fastingLabel:"Post", allergens:"Alergeni", nutrition:"Nutritivne oznake", time:"Vreme", availability:"Dostupnost",
      search:"Pretraži recepte...", searchLabel:"Pretraži recepte", selected:"Izabrani filteri", reset:"Resetuj filtere", remove:"Ukloni filter",
      options:{
        breakfast:"Doručak", lunch:"Ručak", dinner:"Večera", snack:"Užina",
        vegan:"Vegansko", vegetarian:"Vegetarijansko", pescatarian:"Pesketarijansko", mediterranean:"Mediteranska", lowCarb:"Low-carb", keto:"Keto",
        fasting:"Posno", waterFasting:"Posno na vodi", oilFasting:"Posno na ulju", fishFasting:"Posno sa ribom",
        glutenFree:"Bez glutena", dairyFree:"Bez mleka", lactoseFree:"Bez laktoze", eggFree:"Bez jaja", nutFree:"Bez orašastih plodova", soyFree:"Bez soje", sesameFree:"Bez sezama",
        highProtein:"Visok protein", lowCalorie:"Niskokalorično", highFiber:"Visok unos vlakana", noAddedSugar:"Bez dodatog šećera", healthyFats:"Zdrave masti", lowCarbNutrition:"Nizak unos ugljenih hidrata",
        15:"Do 15 min", 30:"Do 30 min", 45:"Do 45 min", 60:"Do 60 min",
        ready:"Mogu odmah", missingOne:"Nedostaje 1 sastojak", missingMany:"Nedostaje više sastojaka", expiring:"Iskoristi pre isteka", shopping:"Potrebna kupovina"
      }
    }
  });
  Object.assign(en.planning, {
    recipeMetadata:"Recipe tags and filters", preparation:"Preparation", preparationMinutes:"Preparation time (minutes)",
    filters:{
      all:"All filters", meal:"Meal", diet:"Diet", fastingLabel:"Fasting", allergens:"Allergens", nutrition:"Nutrition tags", time:"Time", availability:"Availability",
      search:"Search recipes...", searchLabel:"Search recipes", selected:"Selected filters", reset:"Reset filters", remove:"Remove filter",
      options:{
        breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", snack:"Snack",
        vegan:"Vegan", vegetarian:"Vegetarian", pescatarian:"Pescatarian", mediterranean:"Mediterranean", lowCarb:"Low-carb", keto:"Keto",
        fasting:"Fasting", waterFasting:"Water fasting", oilFasting:"Oil fasting", fishFasting:"Fish fasting",
        glutenFree:"Gluten-free", dairyFree:"Dairy-free", lactoseFree:"Lactose-free", eggFree:"Egg-free", nutFree:"Nut-free", soyFree:"Soy-free", sesameFree:"Sesame-free",
        highProtein:"High protein", lowCalorie:"Low calorie", highFiber:"High fiber", noAddedSugar:"No added sugar", healthyFats:"Healthy fats", lowCarbNutrition:"Low carbohydrate",
        15:"Up to 15 min", 30:"Up to 30 min", 45:"Up to 45 min", 60:"Up to 60 min",
        ready:"Can prepare now", missingOne:"Missing 1 ingredient", missingMany:"Missing multiple ingredients", expiring:"Use before expiry", shopping:"Shopping required"
      }
    }
  });

  Object.assign(sr.planning, {
    openShoppingList:"Lista namirnica za kupovinu", shoppingListTitle:"Nedeljna lista za kupovinu", shoppingListEmpty:"Sve nedostajuće namirnice su pokrivene.",
    shoppingQuantity:"Količina", shoppingPrice:"Cena", shoppingStore:"Prodavnica", shoppingCurrency:"Valuta", shoppingBought:"Kupljeno",
    shoppingDataSource:"Lista obuhvata nedostajuće količine samo za planirane obroke u izabranoj nedelji. Cena i prodavnica se predlažu iz poslednje kupovine u Zalihama, kada podatak postoji.",
    shoppingAlreadyCovered:"Ova namirnica je već pokrivena.", shoppingAddedToInventory:"Namirnica je dodata u zalihe.",
    shoppingExportPdf:"PDF", shoppingExportImage:"Slika", shoppingExportEmpty:"Lista za kupovinu je prazna.", shoppingExportBlocked:"Browser je blokirao export prozor."
  });
  Object.assign(en.planning, {
    openShoppingList:"Open shopping list", shoppingListTitle:"Weekly shopping list", shoppingListEmpty:"All missing ingredients are covered.",
    shoppingQuantity:"Quantity", shoppingPrice:"Price", shoppingStore:"Store", shoppingCurrency:"Currency", shoppingBought:"Bought",
    shoppingDataSource:"This list includes missing quantities only for meals planned in the selected week. Price and store are suggested from the last purchase saved in Inventory, when available.",
    shoppingAlreadyCovered:"This ingredient is already covered.", shoppingAddedToInventory:"Ingredient added to inventory.",
    shoppingExportPdf:"PDF", shoppingExportImage:"Image", shoppingExportEmpty:"Shopping list is empty.", shoppingExportBlocked:"The browser blocked the export window."
  });

  Object.assign(sr.planning, {
    shoppingPanelTitle:"Nedeljna lista kupovine", filterAll:"Sve", filterVegan:"Veganski", filterVegetarian:"Vegetarijanski",
    filterHighProtein:"Visokoproteinski", filterLowCarb:"Low Carb", filterMealPrep:"Meal Prep", filterQuick:"Brzo",
    filterDrinks:"Voda / Napici", filterFavorites:"Omiljeni", moreRecipeFilters:"Više filtera", searchRecipeNames:"Pretraži nazive recepata",
    recipeFilters:"Filteri recepata", dragRecipeHint:"Prevuci recept u polje obroka", proteinUnit:"proteina",
    addFavorite:"Dodaj u omiljene", removeFavorite:"Ukloni iz omiljenih",
    filterMealPrepHint:"Recepti za najmanje dve porcije", filterQuickHint:"Recepti sa upisanim vremenom pripreme do 30 minuta",
    filterDrinksHint:"Recepti čiji su svi sastojci napici"
  });
  Object.assign(en.planning, {
    shoppingPanelTitle:"Weekly shopping list", filterAll:"All", filterVegan:"Vegan", filterVegetarian:"Vegetarian",
    filterHighProtein:"High protein", filterLowCarb:"Low Carb", filterMealPrep:"Meal Prep", filterQuick:"Quick",
    filterDrinks:"Water / Drinks", filterFavorites:"Favorites", moreRecipeFilters:"More filters", searchRecipeNames:"Search recipe names",
    recipeFilters:"Recipe filters", dragRecipeHint:"Drag recipe to a meal slot", proteinUnit:"protein",
    addFavorite:"Add to favorites", removeFavorite:"Remove from favorites",
    filterMealPrepHint:"Recipes for at least two servings", filterQuickHint:"Recipes with a recorded preparation time of up to 30 minutes",
    filterDrinksHint:"Recipes whose ingredients are all drinks"
  });

  Object.assign(sr.planning, {
    morningSegment:"Jutarnji", daySegment:"Dnevni", eveningSegment:"Večernji",
    reorderFailed:"Redosled obroka nije sačuvan."
  });
  Object.assign(en.planning, {
    morningSegment:"Morning", daySegment:"Daytime", eveningSegment:"Evening",
    reorderFailed:"Meal order could not be saved."
  });
  Object.assign(sr.planning, {
    availableIngredients:"Namirnice dostupne", clickToSeeMissing:"Kliknite za pregled",
    validation:"Proveri obavezna polja, datum, tip obroka i pozitivne brojčane količine."
  });
  Object.assign(en.planning, {
    availableIngredients:"Ingredients available", clickToSeeMissing:"Click to view",
    validation:"Check required fields, the date, meal type and positive numeric quantities."
  });

  Object.assign(sr.inventory, { allFoods:"Sve namirnice", details:"Detalji namirnice", subtitle:"Pregledaj i upravljaj svojim zalihama. Prati rok trajanja, izbegni bacanje hrane i uvek imaj pregled šta ti je dostupno." });
  Object.assign(en.inventory, { allFoods:"All foods", details:"Food details", subtitle:"Manage your inventory. Track expiry dates, avoid food waste and always know what is available." });
  function merge(language, values) {
    const current = window.MentorI18n?.resources?.[language]?.nutrition || {};
    window.MentorI18n?.registerResources(language, "nutrition", { ...current, ...values });
  }
  Object.assign(sr.inventory.locationPanel, { remove:"Izbriši lokaciju", removeNamed:"Izbriši lokaciju: {{name}}", removeText:"Izbrisati lokaciju „{{name}}“? Ako ima namirnica, prvo ih premesti u drugu lokaciju.", removed:"Lokacija je izbrisana.", inUse:"Lokacija sadrži namirnice. Prvo ih premesti ili ukloni iz te lokacije.", lastRemaining:"Poslednja lokacija ne može da se izbriše. Prvo kreiraj drugu lokaciju.", removeFailed:"Lokacija nije izbrisana. Pokušaj ponovo." });
  Object.assign(en.inventory.locationPanel, { remove:"Delete location", removeNamed:"Delete location: {{name}}", removeText:"Delete location “{{name}}”? Move any items to another location first.", removed:"Location deleted.", inUse:"This location contains inventory. Move or remove its items first.", lastRemaining:"The last location cannot be deleted. Create another location first.", removeFailed:"Location could not be deleted. Please try again." });
  merge("sr", sr); merge("en", en);
})();

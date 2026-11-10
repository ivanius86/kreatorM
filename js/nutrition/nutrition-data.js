(function () {
  "use strict";
  window.MentorNutritionData = {
    meals: [
      { id: 1, type: "Doručak", time: "08:00", name: "Zobena kaša sa bananom", done: true },
      { id: 2, type: "Užina", time: "11:00", name: "Grčki jogurt sa orasima", done: true },
      { id: 3, type: "Ručak", time: "14:00", name: "Piletina sa pirinčem", done: false },
      { id: 4, type: "Užina 2", time: "17:00", name: "Jabuka i bademi", done: false },
      { id: 5, type: "Večera", time: "20:00", name: "Salata sa tunjevinom", done: false }
    ],
    nutrients: [
      ["Kalorije", 1480, 2200, "kcal"], ["Proteini", 96, 140, "g"], ["Ugljeni hidrati", 172, 260, "g"],
      ["Masti", 48, 73, "g"], ["Vlakna", 21, 30, "g"], ["Vitamini", 72, 100, "%"], ["Minerali", 64, 100, "%"]
    ],
    foods: [
      [1,"Ovsene pahuljice","Žitarice",389,16.9,66.3,6.9,"Aktivno"], [2,"Jaja","Proteini",155,13,1.1,11,"Aktivno"],
      [3,"Pileća prsa","Meso",165,31,0,3.6,"Aktivno"], [4,"Pirinač","Žitarice",130,2.7,28,0.3,"Aktivno"],
      [5,"Brokoli","Povrće",34,2.8,7,0.4,"Aktivno"], [6,"Tunjevina","Riba",132,29,0,1,"Aktivno"],
      [7,"Maslinovo ulje","Masti i ulja",884,0,0,100,"Aktivno"]
    ],
    stock: [
      [1,"Jaja","Frižider","8 kom","18. jul","Dostupno"], [2,"Pileća prsa","Zamrzivač","600 g","02. avg","Dostupno"],
      [3,"Brokoli","Frižider","250 g","14. jul","Ističe uskoro"], [4,"Pirinač","Ostava","900 g","12. dec","Dostupno"],
      [5,"Grčki jogurt","Frižider","1 kom","13. jul","Ističe danas"], [6,"Maslinovo ulje","Ostava","120 ml","21. nov","Pri kraju"]
    ],
    recipes: [
      [1,"Omlet sa spanaćem",15,360,1,"Doručak","Možeš pripremiti"], [2,"Piletina sa pirinčem",35,620,2,"Ručak","Možeš pripremiti"],
      [3,"Salata sa tunjevinom",12,410,1,"Večera","Nedostaje jedan sastojak"], [4,"Zobena kaša sa bananom",10,390,1,"Doručak","Možeš pripremiti"],
      [5,"Pasta sa povrćem",30,540,2,"Ručak","Nedostaje više sastojaka"], [6,"Grčki jogurt sa orasima",5,280,1,"Užina","Možeš pripremiti"]
    ],
    week: ["Ponedeljak","Utorak","Sreda","Četvrtak","Petak","Subota","Nedelja"],
    mealPlan: ["Zobena kaša","Omlet","Jogurt i voće","Ovsene palačinke","Jaja i tost","Smoothie bowl","Kaša sa orasima","Piletina i pirinač","Pasta sa povrćem","Tunjevina salata","Ćuretina i krompir","Rižoto","Losos i povrće","Pileća supa","Salata sa tunom","Grilovano povrće","Omlet sa sirom","Piletina salata","Integralna pasta","Riba i blitva","Povrtna čorba","Jabuka i bademi","Jogurt","Banana","Proteinski šejk","Voćna salata","Orašasti plodovi","Humus i povrće"]
  };
})();

(function () {
  "use strict";
  const sr = {
    title:"Ishrana", tabs:{overview:"Pregled",foods:"Namirnice",fridge:"Zalihe",recipes:"Recepti",plan:"Plan ishrane",statistics:"Statistika"},
    search:"Pretraži", add:"Dodaj", edit:"Izmeni", view:"Pregled", all:"Sve", close:"Zatvori", placeholder:"Ova akcija je spremna za povezivanje u sledećoj fazi.",
    overview:{nutritionState:"Nutritivno stanje",silhouetteAlt:"Silueta osobe sa nutritivnim simbolom",dailyPlan:"Dnevni plan ishrane",statistics:"Statistika",inventoryState:"Stanje zaliha",mentorSuggestion:"Mentor predlog",detailedStatistics:"Detaljna statistika",viewMealPlan:"Pogledaj plan ishrane",viewInventory:"Pregled zaliha",previousDay:"Prethodni dan",nextDay:"Sledeći dan",toggleMeal:"Označi obrok {{meal}}",completeMeal:"Označi obrok {{meal}} kao pripremljen",mealCompleted:"Obrok {{meal}} je pripremljen",emptyPlan:"Nema planiranih obroka za izabrani datum.",missingRecipe:"Recept nije dostupan",dailyGoal:"dnevnog nutritivnog cilja",mealsCompleted:"{{completed}} od {{total}} obroka završeno",available:"dostupno",expiring:"ističe uskoro",low:"pri kraju",mentorProtein:"Fokus ove nedelje: povećaj unos proteina.",mentorProteinReason:"Proteini su trenutno na {{percent}}% dnevnog cilja.",mentorBalanced:"Fokus ove nedelje: zadrži trenutni balans.",mentorBalancedReason:"Dnevni nutritivni ciljevi su u dobrom balansu.",nutrients:{calories:"Kalorije",protein:"Proteini",carbohydrates:"Ugljeni hidrati",fat:"Masti",fiber:"Vlakna",micronutrients:"Vitamini / minerali"},meals:{1:{type:"Doručak",name:"Zobena kaša sa bananom"},2:{type:"Užina",name:"Grčki jogurt sa orasima"},3:{type:"Ručak",name:"Piletina sa pirinčem"},4:{type:"Užina 2",name:"Jabuka i bademi"},5:{type:"Večera",name:"Salata sa tunjevinom"}}},
    sections:{dailyPlan:"Dnevni plan ishrane",dailyStats:"Dnevna nutritivna statistika",fridgeState:"Stanje zaliha",canCook:"Šta možeš pripremiti",summary:"Dnevni rezime",foodBase:"Baza namirnica",categories:"Kategorije",details:"Detalji",quick:"Brze akcije",stock:"Stanje zaliha",locations:"Lokacije",expires:"Uskoro ističe",recipeList:"Lista recepata",recipeOverview:"Pregled recepata",suggestions:"Predlozi iz zaliha",weeklyPlan:"Nedeljni plan ishrane",smallStats:"Mala statistika",balance:"Dnevni balans",shopping:"Lista za kupovinu",intake:"Pregled unosa",values:"Osnovne vrednosti",vitamins:"Vitamini",minerals:"Minerali",calorieTrend:"Trend unosa kalorija",macros:"Raspodela makronutrijenata",sources:"Najčešći izvori kalorija",goals:"Dnevni ciljevi",progress:"Napredak"}
  };
  const en = {
    title:"Nutrition", tabs:{overview:"Overview",foods:"Foods",fridge:"Inventory",recipes:"Recipes",plan:"Meal plan",statistics:"Statistics"},
    search:"Search", add:"Add", edit:"Edit", view:"View", all:"All", close:"Close", placeholder:"This action is ready to be connected in the next phase.",
    overview:{nutritionState:"Nutrition status",silhouetteAlt:"Person silhouette with a nutrition symbol",dailyPlan:"Daily meal plan",statistics:"Statistics",inventoryState:"Inventory status",mentorSuggestion:"Mentor suggestion",detailedStatistics:"Detailed statistics",viewMealPlan:"View meal plan",viewInventory:"View inventory",previousDay:"Previous day",nextDay:"Next day",toggleMeal:"Mark meal {{meal}}",completeMeal:"Mark meal {{meal}} as prepared",mealCompleted:"Meal {{meal}} is prepared",emptyPlan:"No meals are planned for the selected date.",missingRecipe:"Recipe is unavailable",dailyGoal:"of the daily nutrition goal",mealsCompleted:"{{completed}} of {{total}} meals completed",available:"available",expiring:"expiring soon",low:"running low",mentorProtein:"This week's focus: increase your protein intake.",mentorProteinReason:"Protein is currently at {{percent}}% of the daily goal.",mentorBalanced:"This week's focus: maintain your current balance.",mentorBalancedReason:"Daily nutrition goals are well balanced.",nutrients:{calories:"Calories",protein:"Protein",carbohydrates:"Carbohydrates",fat:"Fat",fiber:"Fiber",micronutrients:"Vitamins / minerals"},meals:{1:{type:"Breakfast",name:"Oatmeal with banana"},2:{type:"Snack",name:"Greek yogurt with walnuts"},3:{type:"Lunch",name:"Chicken with rice"},4:{type:"Snack 2",name:"Apple and almonds"},5:{type:"Dinner",name:"Tuna salad"}}},
    sections:{dailyPlan:"Daily meal plan",dailyStats:"Daily nutrition",fridgeState:"Inventory status",canCook:"What you can prepare",summary:"Daily summary",foodBase:"Food database",categories:"Categories",details:"Details",quick:"Quick actions",stock:"Inventory status",locations:"Locations",expires:"Expiring soon",recipeList:"Recipe list",recipeOverview:"Recipe overview",suggestions:"Inventory suggestions",weeklyPlan:"Weekly meal plan",smallStats:"Quick statistics",balance:"Daily balance",shopping:"Shopping list",intake:"Intake overview",values:"Core values",vitamins:"Vitamins",minerals:"Minerals",calorieTrend:"Calorie intake trend",macros:"Macro distribution",sources:"Top calorie sources",goals:"Daily goals",progress:"Progress"}
  };
  Object.assign(sr.overview, {
    nutritionState:"Planirani nutritivni sastav",
    dailyGoal:"dnevne referentne vrednosti u planu",
    mentorProtein:"Planirani proteini su ispod referentne vrednosti.",
    mentorProteinReason:"Planirani proteini su na {{percent}}% dnevne referentne vrednosti.",
    mentorBalanced:"Planirani proteini dostižu referentnu vrednost.",
    mentorBalancedReason:"Podaci se odnose na planirane obroke za izabrani dan.",
    dateLabel:"Datum nutritivnog pregleda",
    notAvailable:"N/A",
    noNutritionData:"Nema nutritivnih podataka",
    uncompleteMeal:"Ukloni oznaku pripremljeno za obrok {{meal}}",
    mealUncompleted:"Obrok je vraćen u planirano stanje.",
    micronutrientStatus:{deficit:"Ispod reference",low:"Niže od reference",optimal:"Oko reference",high:"Iznad reference",excessive:"Znatno iznad reference",unknown:"Nema podataka"},
    mentorNoData:"Nema dovoljno podataka za dnevnu preporuku.",
    mentorNoDataReason:"Dodaj nutritivno kompletne recepte u plan za izabrani dan.",
    silhouetteAlt:"Nutrition profil korisnika"
  });
  Object.assign(en.overview, {
    nutritionState:"Planned nutrition",
    dailyGoal:"of the daily reference in the plan",
    mentorProtein:"Planned protein is below the reference value.",
    mentorProteinReason:"Planned protein is at {{percent}}% of the daily reference.",
    mentorBalanced:"Planned protein reaches the reference value.",
    mentorBalancedReason:"These values reflect meals planned for the selected day.",
    dateLabel:"Nutrition overview date",
    notAvailable:"N/A",
    noNutritionData:"No nutrition data",
    uncompleteMeal:"Remove the prepared status from meal {{meal}}",
    mealUncompleted:"The meal was returned to planned status.",
    micronutrientStatus:{deficit:"Below reference",low:"Lower than reference",optimal:"Near reference",high:"Above reference",excessive:"Well above reference",unknown:"No data"},
    mentorNoData:"There is not enough data for a daily recommendation.",
    mentorNoDataReason:"Add nutritionally complete recipes to the plan for the selected day.",
    silhouetteAlt:"User nutrition profile"
  });
  sr.statistics = {
    mode:"Izvor statistike", modes:{plan:"Plan",recorded:"Zabeleženo"},
    recordedNotice:"Vrednosti su iz ručno zabeleženih obroka. Nepotpuna evidencija ne predstavlja sav pojedeni sadržaj.",
    recordedValues:"Zabeležene nutritivne vrednosti", recordedMacros:"Udeo makronutrijenata u zabeleženom unosu",
    recordedMeals:"Zabeleženi obroci", noIntake:"Nema zabeleženog unosa za ovaj period.",
    servings:"porcija", editIntake:"Izmeni", removeIntake:"Obriši",
    periods:{day:"Dan",week:"Nedelja",month:"Mesec",year:"Godina"}, period:"Period", date:"Datum statistike",
    plannedNotice:"Vrednosti su izračunate iz planiranih obroka.",
    values:"Planirane nutritivne vrednosti", vitamins:"Vitamini", minerals:"Minerali", macros:"Udeo makronutrijenata u planu",
    meals:"Planirani obroci", coverage:"Potpunost podataka", coverageValue:"Poznato {{known}} od {{total}} glavnih vrednosti.",
    calories:"Kalorije", protein:"Proteini", carbohydrates:"Ugljeni hidrati", fat:"Masti", fiber:"Vlakna",
    unknown:"Nema podataka", noMeals:"Nema planiranih obroka za ovaj period.", missingRecipe:"Recept nije dostupan"
  };
  en.statistics = {
    mode:"Statistics source", modes:{plan:"Plan",recorded:"Recorded intake"},
    recordedNotice:"Values come from manually recorded meals. An incomplete log does not represent everything eaten.",
    recordedValues:"Recorded nutrition values", recordedMacros:"Macro share of recorded intake",
    recordedMeals:"Recorded meals", noIntake:"No recorded intake for this period.",
    servings:"servings", editIntake:"Edit", removeIntake:"Delete",
    periods:{day:"Day",week:"Week",month:"Month",year:"Year"}, period:"Period", date:"Statistics date",
    plannedNotice:"Values are calculated from planned meals.",
    values:"Planned nutrition values", vitamins:"Vitamins", minerals:"Minerals", macros:"Macro share in the plan",
    meals:"Planned meals", coverage:"Data completeness", coverageValue:"{{known}} of {{total}} main values are known.",
    calories:"Calories", protein:"Protein", carbohydrates:"Carbohydrates", fat:"Fat", fiber:"Fiber",
    unknown:"No data", noMeals:"No meals planned for this period.", missingRecipe:"Recipe is unavailable"
  };
  sr.intake = {
    record:"Zabeleži pojedeno", edit:"Izmeni unos", title:"Zabeleži pojedeno", eatenDate:"Datum unosa",
    servings:"Pojedene porcije", inventoryNote:"Evidencija pojedenog ne menja zalihe.",
    validation:"Unesi ispravan datum i pozitivan broj porcija.", cancel:"Otkaži", save:"Sačuvaj unos",
    saved:"Unos je sačuvan.", removed:"Unos je obrisan.", error:"Unos nije sačuvan. Proveri podatke i pokušaj ponovo.",
    removeTitle:"Obrisati zabeleženi unos?", removeText:"Ova radnja ne menja zalihe niti status pripreme.", remove:"Obriši"
  };
  en.intake = {
    record:"Record eaten meal", edit:"Edit recorded intake", title:"Record food intake", eatenDate:"Date eaten",
    servings:"Servings eaten", inventoryNote:"Recording food intake does not change inventory.",
    validation:"Enter a valid date and a positive number of servings.", cancel:"Cancel", save:"Save intake",
    saved:"Intake saved.", removed:"Intake deleted.", error:"Could not save intake. Check the values and try again.",
    removeTitle:"Delete recorded intake?", removeText:"This does not change inventory or preparation status.", remove:"Delete"
  };
  window.MentorI18n?.registerResources("sr", "nutrition", sr);
  window.MentorI18n?.registerResources("en", "nutrition", en);
})();

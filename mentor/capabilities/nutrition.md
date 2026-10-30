# Mentor Nutrition capability specification

Status: predlog integracije, zasnovan na statičkom čitanju postojećeg koda. Ovaj dokument ne aktivira nove AI akcije. „Postoji“ znači da je pronađen odgovarajući tok u kodu, a ne da je ceo razgovorni scenario prošao izvršavanje. „Predlog“ označava ugovor ili ponašanje koje tek treba implementirati.

## Granica sistema i izvori istine

Nutrition je trenutno skup vanilla JavaScript modula. `js/nutrition/nutrition.js` upravlja prikazom šest tabova; `tabs/` i `components/` su UI, `services/` sadrži poslovna pravila, a `repositories/` pristup domenskim podacima. Mentor ne treba da automatizuje klikove u UI niti da direktno menja DOM.

`MentorData.repositories.nutritionFoodData` čuva korisničke namirnice, nutrijente, porcije i izvore; sistemski katalog je u `js/nutrition/data/foods.seed.js`. `nutritionInventoryData` čuva pakete zaliha (`batches`), lokacije, alokacije, preferencije, prodavnice, recepte, obroke, `shoppingItems`, favorite i migracije. Adapter se bira kroz `js/data/index.js`: postoji lokalni storage i migracioni put na `kreatorm_app_db` IndexedDB, sa tabelama `nutritionFoodData`, `nutritionInventoryData` i `media` (`js/data/database/schema-v1.js`). To su envelope zapisi, ne tabela za svaki recept ili paket. Pre čitanja je potrebna hidratacija Nutrition funkcije (`MentorLazy.loadFeature("nutrition")` / `MentorFeatureHydration.initializeFeature("nutrition")`).

Trenutni Mentor ima samo četiri vrste upisnih predloga: `createGoal`, `createIdea`, `createRecipe`, `createMealPlanEntry` (`js/mentor/mentor-protocol.js`). Nutrition predloge prikazuje, proverava nameru i broj akcija, zahteva korisničko odobrenje i zatim izvršava kroz `js/mentor/mentor-action-adapters.js`. Recepti i obroci imaju stabilne ID-jeve; postojeći adapter ponovni pokušaj vezuje za istu akciju. Ostale Nutrition operacije iz ovog dokumenta **nisu dostupne Mentoru** dok se ne dodaju novi protokol, adapter i korisnički tok.

### Zajednička pravila integracije

1. Namera korisnika nije dozvola za neograničen pristup podacima. Lokalni adapter čita samo traženi opseg, a pre slanja ličnih Nutrition podataka modelu korisnik vidi šta se deli: npr. nazivi namirnica, slobodne količine, jedinice i rokovi za konkretan plan. ID-jevi, nutritivni profili i recepti mogu se slati samo kada su potrebni. Ne slati cenu, prodavnicu, beleške, slike ili istoriju kupovina po podrazumevanom pravilu.
2. Svako kreiranje, izmena, arhiviranje, brisanje, trošenje zaliha ili završavanje obroka zahteva pregled strukturisanog predloga i eksplicitnu potvrdu. Dozvola za čitanje ne odobrava upis. Za brisanje i potrošnju prikazati konkretnu posledicu.
3. Model ne dobija direktan pristup repozitorijumskim `mutate`, `saveEnvelope`, IndexedDB tabelama ni DOM-u. Orkestrator poziva postojeći domenski servis, čuva vezu sa izvornom porukom i koristi stabilan ID za ponovljeni pokušaj. Gde servis nema bezbedan idempotentan ulaz, to je nova integraciona obaveza, ne razlog za direktan upis u bazu.
4. Provere iz UI forme nisu jedina zaštita. Validirati predlog na granici protokola, zatim domenskim servisom neposredno pre upisa; posle upisa ponovo pročitati zapis i povezane alokacije. Vratiti status svake stavke (`approved`, `failed`, `skipped`, `dismissed`) i stvarni razlog neuspeha. Ne tvrditi da je nešto sačuvano na osnovu modelovog teksta.
5. Koristiti postojeći `MentorI18n` za nove poruke. Datumi, jedinice i oznake ne smeju zavisiti od položaja panela ili DOM redosleda. Nepoznate nutritivne vrednosti i dijetetski profili ostaju „nepoznato“; model ne sme da ih dopuni nagađanjem.

## Pregled

**Postoji.** `js/nutrition/tabs/pregled.js` čita stvarne pakete zaliha, obroke izabranog datuma i recepte. `MentorMealPlanSelectors.aggregateEntries(entries, recipes, overrides?)` vraća broj obroka, vrednosti, oznake poznatih vrednosti i redove; `micronutrientSummary(entries, recipes, overrides?)` vraća status, pokrivenost i pojedinačne mikroelemente. `dailyGoals(overrides?)` vraća referentne vrednosti, uključujući neutralnih 2.000 kcal, a ne personalizovan cilj. `MentorInventoryService.statusForBatch(batch)` vraća stanje paketa. Ekran računa i broj završenih obroka; nije dnevnik stvarno pojedenog. Tekst „Mentor predlog“ na ovom tabu je lokalno pravilo, ne odgovor AI chata.

**Namera i operacije.** „Šta mi je planirano danas?“, „Šta nedostaje?“ i „Prikaži nutritivni pregled za datum“ su čitanja. Odgovor treba da navede datum i razlikuje planirane vrednosti od stvarnog unosa. Pregled sam ne kreira, ne menja i ne briše podatke; zahtevi „označi obrok pripremljenim“ i „promeni plan“ idu na servise Plan ishrane.

**Dozvole, validacija i ishod.** Lokalni pregled traži validan datum i pročitane recept/obrok/zalihe. Slanje detalja modelu traži dozvolu za konkretan opseg. Rezultat se proverava ponovnim čitanjem odgovarajućih obroka i selektora; `known=false`, nepotpun nutritivni profil ili nedostajući recept prikazuju se kao nepoznati, bez izmišljene nule. **Mentoru sada nije dostupan** namenski Nutrition pregled kao strukturisan kontekst ili akcija.

## Namirnice

**Postoji.** `MentorFoodRepository.query(options = {})` filtrira po `search`, `categoryId`, `status`, `ownership` i vraća niz; `getAll()`, `getById(id)`, `getNutrients(id)`, `getPortions(id)` i `getSource(id)` čitaju katalog. `MentorFoodNutritionService.details(foodId)` vraća namirnicu, izvor, porcije i nutrijente ili `null`; `scale(foodId, grams)` preračunava poznate vrednosti. `MentorFoodFilterProfile.normalize(profile)` normalizuje dijetetske i alergenske oznake.

Za upis koristiti `MentorNutritionFoodFormService.validate(form, options?)`, `create(form, options?)`, `update(id, form, options?)`, `copySystem(id)`, `archive(id)` i `remove(id)` (`js/nutrition/services/food-form.service.js`). Forma obuhvata ime, engleski naziv, kategoriju, stanje pripreme, nutritivne stavke, porcije, profil i opcionu sliku. Validacija proverava obavezna polja, duplikat `slug`, pozitivne/numeričke vrednosti, dozvoljene jedinice porcija i tip/veličinu slike. Brisanje korisničke namirnice je blokirano ako je koriste zalihe ili recept; sistemska namirnica se kopira ili menja kao korisnički zapis (`food.repository.js`).

**Namera i CRUD.** „Pronađi namirnicu“ i „koliko proteina ima“ → čitanje/pretraga. „Dodaj namirnicu sa ovim nutritivnim podacima“ → kreiranje; „ispravi naziv/profil“ → izmena; „arhiviraj“ i „obriši“ → zasebne potvrđene akcije. Nepotpuni ili neprovereni nutritivni podaci ne smeju se izmisliti; za kreiranje se traže obavezna polja i poreklo podataka.

**Dozvole, greške i ishod.** Čitanje korisnički dodatih namirnica za model zahteva dozvolu; svaka izmena zahteva potvrdu. Obraditi `FOOD_FORM_INVALID`, storage/medija greške i blokadu brisanja zbog referenci. Posle upisa proveriti `getById(id)` i relevantne nutrijente/porcije. **Mentor danas ne dobija korisničke namirnice za generisanje:** `server/public-food-catalog.js` nudi modelu najviše 100 aktivnih sistemskih namirnica sa poznatim profilom. Dodavanje, izmena, arhiviranje, brisanje i CSV/JSON import nisu AI funkcije; import dugme u UI je placeholder.

## Zalihe

**Postoji.** `MentorInventoryRepository.getBatches()`, `getBatchById(id)`, `getAllocations()`, `getLocations()`, `getPreferences()` čitaju stanje. `MentorInventoryService.getBatchesForFood(foodId)`, `availableForBatch(batch)`, `reservedForBatch(batchId, unit)`, `statusForBatch(batch)` i `getDefaultsForFood(foodId)` služe za raspoloživost i prikaz. `MentorPlanningService.available(foodId, unit)` sabira slobodne kompatibilne količine. Jedinice i konverzije dolaze iz `MentorNutritionUnitConversion`.

`MentorInventoryService.validateDraft(value, existingId?)` vraća `{valid, errors, quantity, unit, food}`. `saveBatch(value, id?)` kreira ili menja paket i vraća sačuvani paket; `consume(batchId, amount, unit?)`, `restock(batchId, amount, unit?)`, `move(id, locationId)`, `remove(id)` i `createLocation(value)` menjaju zalihe. Provere obuhvataju poznatu namirnicu/lokaciju, pozitivnu količinu, kompatibilne jedinice, valjane datume/cenu i zabranu promene rezervisane jedinice ili smanjenja ispod rezervisane količine. Rezervacije vezuju pakete za planirane obroke; dovršavanje obroka troši rezervisano. Stanje `expired`, `missing` ili `partially_reserved` ne sme se prikazati kao raspoloživo.

**Namera i CRUD.** „Šta imam?“, „koliko je slobodno?“ i „šta ističe?“ → čitanje; „dodaj 500 g…“ → kreiranje paketa; „ispravi količinu/rok“ → izmena; „potrošio sam…“/„dopuni“/„premesti“ → zasebne izmene; „ukloni paket“ → brisanje. Pre pretrage po lokaciji razlikovati katalog namirnica od stvarnog paketa u zalihama.

**Dozvole, greške i ishod.** Za slanje modelu dovoljan je ograničen snapshot (`foodId`, naziv, slobodna količina, jedinica, rok i status), uz dozvolu. Upis traži potvrdu konkretnog paketa i količine. Obraditi `INVENTORY_VALIDATION_FAILED`, `INVENTORY_BATCH_NOT_FOUND`, `QUANTITY_EXCEEDS_AVAILABLE`, `INCOMPATIBLE_UNITS`, nepostojeću lokaciju i storage greške. Posle promene pročitati paket **i** alokacije, jer `saveBatch` može vratiti uspešan paket čak i ako naknadna sinhronizacija rezervacija prijavi grešku samo u konzoli (`inventory.service.js:46-49`). **Mentor trenutno ne čita stvarne pakete niti ima bilo koju od ovih upisnih akcija.**

## Recepti

**Postoji.** `MentorPlanningRepository.getRecipes()` i `getRecipeById(id)` čitaju recepte; `getRecipeFavoriteIds()` i `toggleRecipeFavorite(id)` čitaju/menjaju favorite. `MentorRecipeFilterService.matches(recipe, filters, context?)` i `MentorRecipeProfileService.deriveRecipeProfile(recipe)` podržavaju pretragu i dijetetsku procenu. `MentorMealPlanSelectors.recipeNutrition(recipe, plannedServings, overrides?)` vraća `values` i `known` za nutrijente.

`MentorPlanningService.validateRecipe(value, options?)` vraća `{valid, errors}`; `assertConstraints(recipe, constraints, foodEnvelope?)` baca grešku ako sastojak nije prihvatljiv, uključujući veganski i alergenski uslov. `saveRecipe(value, id?, options?)` kreira ili menja recept i, pri izmeni, osvežava rezervacije aktivnih obroka. `createRecipeIfAbsent(value, id, constraints?, options?)` je postojeći idempotentan put za Mentorovo kreiranje. Recept čuva ime, opis, porcije, tip obroka, sastojke, profil/filter metapodatke, sliku i izvor. Za AI recepte postojeća politika zahteva verifikovan javni izvor, dozvoljene food ID-jeve i razrešene sastojke; odobravanje preuzima i čuva sliku. Nedostupna slika ili nerazrešen sastojak zaustavljaju kreiranje (`js/mentor/mentor-action-adapters.js`).

**Namera i CRUD.** „Pronađi veganski recept“, „izračunaj nutrijente“ → čitanje; „napravi recept“ → predlog za kreiranje; „izmeni sastojke/porcije“ → izmena. **Brisanje recepta nije pronađeno kao domenski servis ili UI tok** i ne sme se nuditi kao gotova akcija. Favorit je posebna potvrđena promena, ne upis recepta.

**Dozvole, greške i ishod.** Korisnik odobrava recept sa sastojcima, količinama, izvorom i upozorenjem ako je prilagođen. Obraditi `INVALID_RECIPE`, `DIET_CONFLICT`, `UNRESOLVED_RECIPE`, `RECIPE_IMAGE` i media/storage greške. Posle čuvanja pročitati recept, izvor/sliku i, po potrebi, osvežene alokacije. **Mentor sada ume da kreira recept uz potvrdu**, ali ne da ga menja, briše ili pretražuje ceo korisnički katalog u razgovoru.

## Plan ishrane

**Postoji.** `MentorPlanningRepository.getMealPlanEntries()` i `getMealPlanEntryById(id)` čitaju obroke. `MentorPlanningService.validateEntry(value)` vraća `{valid, errors, recipe}`; `saveMealPlanEntry(value, id?)` kreira/menja i vraća `{entry, reservations}`. `createMealPlanEntryIfAbsent(value, id, constraints?)` je postojeći idempotentan Mentor put: proverava datum (`YYYY-MM-DD`), tip (`breakfast|lunch|dinner|snack`), 1–20 porcija, postojanje recepta, dijetetska ograničenja i opciono `exclusiveSlot`; upisuje obrok i alokacije. `removeMealPlanEntry(id)` uklanja obrok i oslobađa rezervacije; `completeMealPlanEntry(id)` troši rezervisane pakete; `uncompleteMealPlanEntry(id)` vraća količine i ponovo rezerviše; `reorderCalendarSegment(plannedDate, segment, orderedIds)` menja redosled. `allocations(entryId)`, `summary(entryId)` i `resyncActiveReservations()` služe za proveru. `MentorMealPlanSelectors.groupByDay(entries, recipes, dates, overrides?)`, `missingIngredients(entries, allocations, {recipes})`, `weeklySummary(days, missing, goals?)` i `estimatedCost(entries, allocations, batches, overrides?)` daju izvedene prikaze; cena može biti `null`.

**Namera i CRUD.** „Šta je planirano?“, „koliko mi nedostaje?“ → čitanje; „isplaniraj sedam dana“/„dodaj obrok“ → kreiranje; „zameni/pomeri obrok“, „promeni porcije“ → izmena; „ukloni obrok“ → brisanje; „pripremio sam obrok“ → završavanje sa trošenjem zaliha. Za nejasan broj dana, obroka, datum ili porcije tražiti samo nedostajuće informacije. `server/meal-planning.js` već prepoznaje do sedam dana i do četiri vrste obroka; tri neimenovana obroka mapira na doručak, ručak i večeru. Najviše sedam novih recepata i do 28 obroka čini sadašnji prošireni plan.

**Dozvole, greške i ishod.** Deljenje relevantnih zaliha i recepata sa modelom zahteva dozvolu. Svaki plan prikazuje datume, termine, porcije, recepte, očekivani manjak i granicu procene pre potvrde. Postojeći batch odobrava recepte pa obroke **redom**; nije atomaran preko svih stavki. Obraditi `INVALID_MEAL_PLAN`, `MEAL_SLOT_OCCUPIED`, `RECIPE_PREREQUISITE`, `DIET_CONFLICT`, `ACTION_STALE` i pojedinačne neuspehe. Posle upisa pročitati sve očekivane termine, recepte i alokacije; izveštaj mora razlikovati sačuvano, preskočeno i neuspešno. **Mentor sada može da predloži i upiše plan uz potvrdu, ali ga ne pravi prema stvarnoj zalihi:** pre generisanja dobija najviše 20 sačuvanih recepata, samo sa `id`, `name`, `servings`, `mealType` (`mentor-action-adapters.js:41-49`).

**Lista za kupovinu.** Nutrition trenutno računa manjak iz sačuvanog plana i alokacija kroz `missingIngredients` i prikazuje ga za izabranu kalendarsku nedelju, uz PDF/PNG izvoz (`nutrition.js:249-425`). „Bought“ dodaje paket zaliha preko `saveBatch`. `MentorPlanningRepository.getShoppingItems/addShoppingItems` postoje, ali u pregledanom toku nema poziva `addShoppingItems`; trajna shopping lista nije završena AI sposobnost. Plan od sedam dana koji prelazi granicu kalendarske nedelje nema jedan objedinjeni prikaz manjka za ceo traženi opseg. Ne potvrđivati da je trajna lista „napravljena“ dok to nije stvarno implementirano i provereno.

## Statistika — nedovršeno

`js/nutrition/tabs/statistika.js` prikazuje fiksne brojeve, fiksni datum, grafikone i tekst iz `nutrition-data.js`; promena perioda menja prikaz, ne računa stvarnu istoriju. Nasuprot tome, Pregled i Plan koriste stvarne selektore. Ne postoji potvrđen pouzdan API za istorijski stvarni unos hrane, vode, trend kalorija ili personalizovani dnevni cilj.

**Namera i CRUD.** „Prikaži statistiku/trend/unos“ treba prepoznati, ali Mentor mora objasniti ograničenje i može ponuditi stvarni pregled **planiranih** obroka za dati datum ili period. Čitanje fiksnih vrednosti kao korisničkih činjenica, kreiranje/izmena/brisanje statistike i AI savet zasnovan na njima nisu dozvoljeni. Za buduću funkciju prvo su potrebni stvarni podaci o unosu, proveren obračun i jasno odvajanje planiranog od pojedenog. Do tada nema dozvole za deljenje demonstracionih brojeva, nema validnog rezultata koji bi se mogao proveriti i nema upisne akcije.

## Mapa korisničkih komandi

| Primer korisničke komande | Namera / postojeći servis | Status Mentor integracije |
| --- | --- | --- |
| „Šta sam planirao danas?“ | `getMealPlanEntries`, `getRecipes`, `aggregateEntries` | Predlog: ograničeno čitanje; razgovorni rezultat još nije povezan. |
| „Pronađi veganske namirnice sa proteinima“ | `MentorFoodRepository.query`, profil i `MentorFoodNutritionService.details` | Predlog; ne slati ceo korisnički katalog bez dozvole. |
| „Dodaj namirnicu…“ / „Ispravi njene nutrijente“ | `MentorNutritionFoodFormService.create/update` | Nije dostupno; traži validirana polja i potvrdu. |
| „Šta imam u frižideru i šta uskoro ističe?“ | `getBatches`, `getLocations`, `statusForBatch`, `availableForBatch` | Predlog; ograničen snapshot uz dozvolu. |
| „Dodaj 500 g…“ / „Potrošio sam 100 g…“ | `MentorInventoryService.saveBatch/consume` | Nije dostupno; potvrda i naknadna provera zaliha/alokacija. |
| „Predloži veganski recept“ | javni izvori, `assertConstraints`, `recipeNutrition`, `createRecipeIfAbsent` | Kreiranje već postoji uz potvrdu, ograničeno na postojeću politiku izvora. |
| „Izmeni recept“ / „Obriši recept“ | `saveRecipe(value, id)` / nema potvrđenog servisa za brisanje | Izmena nije AI akcija; brisanje nije podržano. |
| „Napravi plan za sedam dana, tri obroka, iz mojih zaliha“ | parser plana, `getRecipes`, inventory čitanje, `createMealPlanEntryIfAbsent` | Plan već postoji; planiranje *prema* zalihama tek treba povezati. |
| „Šta treba da kupim za taj plan?“ | `missingIngredients` nad sačuvanim obrocima/alokacijama | Izvedeni pregled postoji; razgovorni odgovor i objedinjeni opseg su predlog. |
| „Označi ručak pripremljenim“ / „Ukloni ga“ | `completeMealPlanEntry` / `removeMealPlanEntry` | Nije AI akcija; menja zalihe/rezervacije i traži potvrdu. |
| „Pokaži moj trend unosa kalorija“ | nema stvarnog statističkog izvora | Nedovršeno; ne koristiti demonstracione vrednosti. |

## Predlog ugovora strukturisanih akcija

Ovo je **predlog novog ugovora**, ne opis sadašnjeg `MentorChatProtocol` API-ja. Trenutni protokol i dalje prihvata samo `createGoal`, `createIdea`, `createRecipe` i `createMealPlanEntry`. Novi ugovor bi morao da dobije verziju, validatore, i18n tekstove, dozvole, adaptere i proveru trajnog stanja pre uključivanja bilo koje nove akcije.

```json
{
  "version": 1,
  "kind": "nutrition.meal.create",
  "sourceMessageId": "message-id",
  "scope": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" },
  "payload": {
    "recipeId": "existing-recipe-id-or-approved-proposal-ref",
    "plannedDate": "YYYY-MM-DD",
    "mealType": "breakfast",
    "servings": 1
  },
  "preconditions": { "dataRevision": "local-snapshot-token", "exclusiveSlot": true }
}
```

Model sme da predloži samo `kind`, ograničen `scope` i domenski `payload`. Aplikacija, ne model, dodeljuje stabilan `actionId`, autorizacioni budžet, `sourceMessageId`, reviziju podataka i status potvrde. Primer iznad prikazuje ciljnu strukturu; polja `dataRevision` i opšti sistem revizija **ne postoje danas**. Reference na nov recept moraju se razrešiti iz odobrenih akcija, nikada tretirati kao slobodan ID koji model može da izmisli.

| Predložena vrsta akcije | Minimalni payload | Izvršilac / status |
| --- | --- | --- |
| `nutrition.food.create`, `.update`, `.archive`, `.remove` | Forma ili `foodId` + dozvoljena izmena | `MentorNutritionFoodFormService`; novo AI povezivanje. |
| `nutrition.inventory.batch.create`, `.update`, `.consume`, `.restock`, `.move`, `.remove` | `batchId` gde treba; `foodId`, količina/jedinica, lokacija, datum samo za relevantnu operaciju | `MentorInventoryService`; novo AI povezivanje i zaštita od duplog izvršenja. |
| `nutrition.recipe.create` | Ime, opis, porcije, tip, stvarni food ID-jevi/količine, verifikovan izvor | Postojeći Mentor `createRecipe` → `createRecipeIfAbsent`; već povezano. |
| `nutrition.recipe.update` | `recipeId` i kompletan validiran nacrt | `saveRecipe(value, id, options?)`; novo AI povezivanje. Brisanje recepta nije predloženo bez domenskog servisa. |
| `nutrition.meal.create` | `recipeId`, datum, tip, porcije | Postojeći Mentor `createMealPlanEntry` → `createMealPlanEntryIfAbsent`; već povezano. |
| `nutrition.meal.update`, `.remove`, `.complete`, `.uncomplete` | `mealId` i samo polja potrebna operaciji | Odgovarajući `MentorPlanningService` metod; novo AI povezivanje. |
| `nutrition.plan.prepare` | Početni datum, dani ≤ 7, tipovi obroka, porcije, ograničenja, želja za upotrebom zaliha | Nova **read-only orkestracija**; vraća predloge, procenu i nepoznanice, ne upisuje. |
| `nutrition.shopping.preview` | Tačan opseg planiranih obroka | `missingIngredients` posle upisa; novi razgovorni adapter. Nije trajna shopping lista. |

Čitalačke namere mogu vratiti strukturisan `answer` sa `asOf`, `scope`, `dataStatus` (`known|partial|unknown`) i izvorom podataka, bez kreiranja akcije. Za upisne akcije orkestrator treba da vrati `proposed → approved/dismissed → executing → approved/failed` i `entityId` samo posle proverenog upisa. Ponavljanje mora proveriti već sačuvani zapis i vratiti isti ishod, bez duplog trošenja ili dopune.

## Višekoračno planiranje prema stvarnim zalihama

1. **Razumevanje.** Postojeći `server/meal-planning.js` izvlači datum, broj dana, vrste obroka i porcije; `MentorChatProtocol.conversationConstraints` izvlači vegan/alergenske uslove iz razgovora. Korisniku tražiti samo informacije koje nedostaju. Sačuvati opseg plana i osnov za dozvolu; ne pretpostaviti da „koristi moje zalihe“ znači „koristi isključivo moje zalihe“.
2. **Dozvola i snimak.** Posle dozvole lokalno pročitati recepte, food/profile podatke i samo relevantne slobodne pakete, rokove i jedinice. Ograničiti broj, vreme i polja; prikazati korisniku sažetak podataka koji će otići modelu. Trenutni `prepareContext` šalje samo do 20 recepata sa četiri polja i može ponovo koristiti prethodni kontekst u kasnijem zahtevu; pre proširenja treba uskladiti trajanje tog konteksta i tekst o privatnosti (`js/mentor/mentor-action-adapters.js`, `js/i18n/mentor.js`).
3. **Predlog.** Model predlaže do sedam novih recepata i tačno po jedan obrok za svaki traženi termin. Postojeći recepti imaju prednost kada ispunjavaju ograničenja. Nutritivne vrednosti računa lokalni `recipeNutrition`/`groupByDay`; model ne upisuje brojeve kao činjenice. Nepoznati nutrijenti, nedostupna javna receptna baza ili nerazrešeni sastojci moraju biti vidljivi pre potvrde.
4. **Lokalna provera.** `assertConstraints`, `validateRecipe`, `validateEntry` i protokol proveravaju predloge. Raspoloživost i rok moraju se računati za **datum svakog obroka** i uz već postojeće rezervacije. Sadašnji `reserveInto` isključuje paket istekao danas, ali ne paket koji će isteći pre kasnijeg obroka (`planning.service.js:26-30`). Ta pravila treba ispraviti u Nutrition domenu, ne kopirati u Mentor. Za tačan read-only pregled budućih alokacija trenutno nema potvrđenog javnog servisa; potrebna je domenska preview metoda koja koristi ista pravila rezervacije, ne druga implementacija u adapteru.
5. **Potvrda.** Prikazati svih 7×3 termina, izvore recepata, porcije, dijetetske oznake, procenjenu upotrebu zaliha i moguće kupovine. Pre upisa ponovo pročitati trenutno stanje i upozoriti ako je predlog zastareo ili je termin zauzet. Korisnik potvrđuje konkretne upise; jedna potvrda za čitanje nije potvrda za menjanje.
6. **Izvršavanje i provera.** Koristiti postojeći redosled: sačuvati odobrene recepte pa obroke preko idempotentnih `create*IfAbsent`. Pročitati nazad ID-jeve, obroke i aktivne alokacije; `missingIngredients` računati za **ceo traženi opseg**, ne samo trenutno prikazanu kalendarsku nedelju. Ako neki korak ne uspe, prikazati tačne uspešne i neuspešne stavke i omogućiti bezbedan retry. Lista je izveden pregled dok se ne napravi poseban trajni model i njegov potvrđeni servis.

## Redosled implementacije i otvorena provera

1. Ispraviti tekst i trajanje deljenog Nutrition konteksta; definisati dozvole za ograničeno čitanje. Ovo je uslov za širenje podataka ka modelu.
2. Napraviti read-only Nutrition adapter za namirnice, postojeće recepte, slobodne zalihe i rokove. Ne menjati postojeći storage format.
3. U Nutrition domenu rešiti rok za budući obrok i dodati preview koji deli pravila sa stvarnom rezervacijom. Tek tada obećati plan „prema zalihama“.
4. Povezati predlog plana, potvrdu, postojeći idempotentan upis i proveru svake stavke; dodati objedinjeni izvedeni spisak za traženi opseg.
5. Zasebno dodavati AI kreiranje/izmenu namirnica i zaliha, izmenu/uklanjanje obroka i recepata. Svaka vrsta akcije zahteva svoj validator, potvrdu, idempotentnost i proveru ishoda.
6. Statistiku povezati tek posle stvarnog modela unosa i validiranih obračuna. Fiksne demonstracione vrednosti nikada ne uključivati u AI kontekst.

Dokument je pregled koda i ciljna specifikacija. End-to-end izvršavanje plana, dozvole za deljenje zaliha, read-only preview, razgovorni spisak za ceo opseg i nove upisne akcije ostaju **neimplementirani ili netestirani**, kako je označeno po odeljcima.

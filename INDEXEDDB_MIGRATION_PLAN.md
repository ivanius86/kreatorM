# Mentor IndexedDB Migration Plan

Status: Faze 0–3 implementirane i tehnički potvrđene; release candidate `1.0.0+build.20260730.1` je zaključan, ali `releasedAt`, production backup dokaz i početak 30-dnevnog perioda su `TBD`  
Opseg: jedna aktivna IndexedDB baza, eksplicitni repository/cutover tokovi i bezbedan post-cutover administrativni sloj; legacy cleanup nije implementiran  
Cilj: bezbedan prelazak sa postojećih `localStorage` i IndexedDB izvora na jednu lokalnu bazu, uz očuvanje svih korisničkih podataka i kompatibilnost sa kasnijim React i cloud slojem

## 1. Odluke i ograničenja ovog plana

Ovaj dokument usvaja sledeće osnovne odluke:

1. Migracija neće biti urađena kao jednokratna direktna zamena `localStorage` poziva IndexedDB pozivima.
2. Faza 1 prvo uvodi repository granicu i asinhroni bootstrap, ali repository implementacije i dalje koriste postojeći `localStorage`.
3. Tek kada UI i feature moduli više ne zavise direktno od storage tehnologije uvodi se IndexedDB adapter i migrator.
4. IndexedDB v1 čuva sadašnje agregate tamo gde ih aplikacija danas učitava i upisuje kao agregate. V1 ne normalizuje unapred svaku transakciju, nutritivnu vezu, research direction ili test u poseban store.
5. Postojeći ID-jevi se čuvaju. Novi ID-jevi se generišu samo kada je to neophodno i moraju biti deterministički tokom migracije.
6. Legacy izvori ostaju netaknuti sve dok backup, migracija i verifikacija ne budu završeni. Njihovo kasnije brisanje nije deo automatske migracije.
7. IndexedDB nakon cutover-a postaje jedini aktivni izvor istine. Ne uvodi se trajni dual-write.
8. Goals i calendar persistence nisu migracija legacy podataka. Njihov zaseban persistence plan je odobren pre prvog kreiranja baze, pa početna structural v1 šema rezerviše aggregate store-ove bez izmišljanja legacy podataka.
9. Buduća verzija Brainstorming-a ne sme automatski trajno sačuvati sample ideje kada je korisnička baza prazna. Sample sadržaj može biti prikazan samo kao privremeni demo/empty-state sadržaj dok ga korisnik eksplicitno ne sačuva.
10. Postojeći zapisi koji liče na sample ideje ne smeju biti automatski izbrisani, jer trenutno ne postoji pouzdan marker koji razlikuje neizmenjen sample od korisnički izmenjenog zapisa.

## Architecture Decision Record

### ADR-IDB-001 — Jedna trajna lokalna baza

- Status: accepted
- Odluka: nova trajna baza se zove `kreatorm_app_db`.
- Obrazloženje: ime odgovara identitetu aplikacije i trenutno ne postoji implementirana ili objavljena baza `mentor_app_db` koju bi trebalo očuvati.
- Posledica: ime baze se smatra trajnim javnim storage identifikatorom i ne menja se bez posebne migracije.
- Sigurnosna ograda: ako se pre implementacije pronađe dokaz da je `mentor_app_db` već korišćen u objavljenoj verziji, implementacija se zaustavlja i prvo se dokumentuje migracija između imena. To je jedini trenutno poznat tehnički razlog da se razmotri zadržavanje starog predloga.

### ADR-IDB-002 — Dexie.js preko lokalne npm zavisnosti

- Status: accepted
- Odluka: IndexedDB adapter koristi Dexie.js instaliran kroz npm i zaključan u package lock-u.
- Ograničenje: nema CDN importa, runtime preuzimanja ili oslanjanja na globalni Dexie objekat sa mreže.
- Granica odgovornosti: Dexie upravlja IndexedDB konekcijom, schema deklaracijom i transakcijama. Legacy discovery, source priority, transformacije, backup, checksum, migration checkpoint-i, verification i recovery ostaju eksplicitni KreatorM servisi.
- Faza: Dexie se ne instalira niti koristi u Fazi 0 ili Fazi 1. Dependency se dodaje na početku Faze 2, nakon potvrde tačne verzije i načina lokalnog učitavanja u sadašnjem vanilla build-u.

### ADR-IDB-003 — Kompletan versioned ZIP backup

- Status: accepted
- Odluka: kompletan backup je versioned ZIP paket.
- Obavezni sadržaj: manifest, raw legacy payload-i, normalizovani domeni, record count, SHA-256 checksum-i, migration/validation/conflict report i originalni Nutrition `blob` i `thumbnail` sadržaji.
- Ograničenje: backup bez media binarnih podataka ne sme biti označen kao kompletan.
- Dependency pravilo: ZIP implementacija mora biti lokalna npm zavisnost ili interno održavan lokalni modul; CDN nije dozvoljen.
- Faza 0 tehnička odluka: koristi se tačno zaključan `fflate@0.8.3` iz npm-a i `package-lock.json`; nema CDN-a ni tranzitivnih runtime zavisnosti.

### ADR-IDB-004 — Nevalidan jedini kandidat zahteva recovery

- Status: accepted
- Odluka: ako domen ima podatak, ali je njegov jedini kandidat nevalidan, domen prelazi u `recoveryRequired`.
- Posledica: ne kreira se automatski prazan `active` state i cutover tog domena je blokiran.
- Recovery: raw payload i failure report moraju ostati dostupni za export i kontrolisani oporavak.

### ADR-IDB-005 — Source priority i konfliktni kandidati

- Status: accepted
- Odluka: source priority pravila iz poglavlja 6 su zaključana.
- Posledica: pobednički kandidat ulazi u kanonski model, dok svaki neizabrani konfliktni kandidat ostaje u raw backupu i migration report-u sa checksum-om i primenjenim pravilom.
- Ograničenje: nema proizvoljnog deep merge-a ili tihog odbacivanja konfliktne kopije.

### ADR-IDB-006 — Research cache nije kanonski podatak

- Status: accepted
- Odluka: financial comparison research cache je obrisiv.
- Posledica: nevalidan ili izgubljen cache ne blokira migraciju kanonskih ideas, comparison options ili snapshots podataka.
- Ograničenje: cache failure se prijavljuje, a cache se ponovo izračunava ili ostaje prazan.

### ADR-IDB-007 — Legacy retention i ručni cleanup

- Status: accepted
- Odluka: legacy izvori ostaju sačuvani dok istovremeno ne budu ispunjena sva tri uslova:
  1. objavljena je najmanje jedna stabilna verzija koja koristi IndexedDB;
  2. postoji najmanje 30 dana potvrđenog stabilnog korišćenja;
  3. napravljen je i verifikovan najmanje jedan kompletan IndexedDB ZIP backup.
- Posledica: ispunjenje uslova samo dozvoljava da se cleanup ponudi. Cleanup se nikada ne izvršava automatski i zahteva eksplicitnu korisničku akciju i potvrdu.

### ADR-IDB-008 — Sample-like ideas

- Status: accepted
- Odluka: postojeći sample-like idea zapisi se ne brišu bez pouzdanog markera porekla.
- Posledica: budući kod prekida automatsko trajno čuvanje sample ideja, ali migrator ne zaključuje poreklo samo iz ID-ja, naslova, slike ili sadržaja.

### ADR-IDB-009 — Goals i Calendar redosled

- Status: accepted
- Odluka: Goals i Calendar ostaju poseban novi persistence zadatak, ne deo legacy migracije.
- Redosled: njihov plan se izrađuje odmah nakon završetka Faze 1 repository i async bootstrap osnove, pre IndexedDB cutover-a domena, osim ako zasebna procena rizika preporuči drugačiji raspored.
- Ograničenje: postojeća IndexedDB v1 migracija ne izmišlja legacy podatke za ova dva modula.

### ADR-IDB-010 — Pre-create dopuna structural v1 za Goals i Calendar

- Status: accepted
- Datum: 2026-07-30
- Kontekst: ADR-IDB-009 je Goals i Calendar odvojio od legacy migracije. Njihov zaseban persistence plan i durable modeli odobreni su nakon Faze 1, ali pre prvog produkcionog kreiranja baze `kreatorm_app_db`.
- Odluka: početna IndexedDB structural v1 šema uključuje aggregate store `goals` sa key path-om `id` i aggregate store `calendarEvents` sa key path-om `id` i indeksima `goalId`, `date` i compound `[goalId+date]`.
- Granica modela: postojeći nested `actions` i `notesList` ostaju u goal agregatu. V1 ih ne normalizuje u zasebne store-ove.
- Migraciona granica: ovo je pre-create izmena šeme, a ne migracija postojećih legacy podataka. Goals/Calendar activation, backup/import i cutover ostaju zasebno odobren persistence tok.
- Posledica: nije potreban structural upgrade niti migracija imena baze, jer produkciona IndexedDB baza još nije kreirana.

## 2. Trenutna storage arhitektura

Postoje četiri paralelna storage toka:

1. `storageService.js` čuva kompletan `mentor_database` kao jedan JSON dokument u `localStorage`.
2. Brainstorming, Finance, Research, Dashboard i i18n i dalje koriste zasebne legacy ključeve.
3. Nutrition čuva dva odvojena versioned JSON envelope-a u `localStorage`: food podatke i inventory/planning podatke.
4. Nutrition slike se već čuvaju u posebnoj IndexedDB bazi `mentor_nutrition_images`, store `foodImages`.

`storageService.js` trenutno sinhronizuje `mentor_database` nazad u deo legacy ključeva. Zbog toga isti podatak može imati više kopija koje nisu nužno identične.

Postojeći centralni `tests` i `references` nizovi nisu pouzdan kanonski izvor. `storageService.js` pokušava da ih izvede preko `idea.research.tests` i `idea.research.directions`, dok aktuelni Brainstorming model koristi prvenstveno `idea.pathData.tests` i `idea.pathData.researchDirections`. V1 zato čuva kompletan `pathData` unutar kanonskog idea zapisa i ne migrira centralne izvedene `tests`/`references` kolekcije kao samostalni autoritet.

## 3. Kompletan registar izvora

### 3.1 `localStorage` izvori

| Ključ | Format | Vlasnički modul | Uloga |
|---|---|---|---|
| `mentor_database` | JSON objekat, version 1 | Shared storage | Centralna kopija ideas, finances, tests, comparisons, assets, references i settings |
| `mentor_brainstorming_ideas` | JSON niz | Brainstorming / Research | Idea agregati, uključujući nested `pathData` |
| `mentorFinanceStateV1` | JSON objekat | Finance | Transactions, budgets, cashflow nizovi, import fingerprints/files, category rules/categories |
| `mentorTransactionImportTemplatesV1` | JSON niz | Finance Import | Korisnički import template-i |
| `mentorFinanceAssetsV1` | JSON objekat | Finance Assets | `{ assets, debts, savedAt }` |
| `mentorFinancialComparisonSnapshotsV1` | JSON niz | Financial Comparison | Sačuvani comparison snapshot-i |
| `mentorFinancialComparisonOptionsV1` | JSON niz | Financial Comparison | Comparison opcije |
| `mentorFinancialComparisonResearchCacheV1` | JSON objekat | Finance / Research | Izvedeni research cache; nije trajni korisnički autoritet |
| `mentor_language` | string `sr` ili `en` | i18n | Trenutni jezik |
| `mentorPlanner.language` | string `sr` ili `en` | Legacy i18n | Stariji language ključ |
| `mentor_nutrition_foods_v1` | JSON envelope, version 1 | Nutrition Foods | `userFoods`, `userFoodNutrients`, `userFoodPortions`, `userSources` |
| `mentor_nutrition_foods_v1_backup` | JSON envelope | Nutrition Foods | Poslednja prethodna validna kopija primarnog food envelope-a |
| `mentor_nutrition_foods_v1_staging` | JSON envelope | Nutrition Foods | Nedovršeni privremeni zapis; nije automatski autoritet |
| `mentor_nutrition_inventory_v1` | JSON envelope, version 1 | Nutrition Inventory/Planning | Batches, locations, allocations, preferences, stores, recipes, meal plans, shopping i migration markeri |
| `mentor_nutrition_inventory_v1_backup` | JSON envelope | Nutrition Inventory/Planning | Poslednja prethodna kopija inventory envelope-a |
| `mentor_nutrition_inventory_v1_staging` | JSON envelope | Nutrition Inventory/Planning | Nedovršeni privremeni zapis; nije automatski autoritet |
| `mentor_nutrition_inventory_v1_legacy_backup` | raw string | Nutrition Legacy Migration | Sačuvana kopija prvog pronađenog starog fridge/stock payload-a |
| `mentor_nutrition_fridge_v1` | JSON niz ili objekat sa `items`/`stock` | Legacy Nutrition | Stariji fridge podaci |
| `mentor_nutrition_stock_v1` | JSON niz ili objekat sa `items`/`stock` | Legacy Nutrition | Stariji stock podaci |

Dinamički izvedeni ključevi `_backup`, `_staging` i `_legacy_backup` deo su registra i moraju ući u raw backup čak i kada nisu validan migracioni kandidat.

### 3.2 Postojeći IndexedDB izvori

| Baza | Version | Store | Key path | Vlasnički modul | Sadržaj |
|---|---:|---|---|---|---|
| `mentor_nutrition_images` | 1 | `foodImages` | `id` | Nutrition Media | `blob`, `thumbnail`, MIME metadata, `entityType`, `entityId`, optional `foodId`, ime, veličina i `updatedAt` |

`foodImages` danas podržava generički entity ključ oblika `<entityType>-image:<entityId>`, iako je istorijski nazvan po food slikama.

## 4. Legacy ključ → kanonski model → ciljni IndexedDB v1 store

V1 šema namerno ostaje bliska postojećim podacima. Normalizacija unutar velikih agregata je moguća u kasnijoj data-schema migraciji nakon stabilnog cutover-a.

| Legacy izvor | Vlasnički modul | Kanonski v1 model | Ciljni store | Ciljni ključ |
|---|---|---|---|---|
| `mentor_database.settings.language` | Shared/i18n | Setting record | `settings` | `language` |
| `mentor_language` | i18n | Setting record | `settings` | `language` |
| `mentorPlanner.language` | Legacy i18n | Setting record | `settings` | `language` |
| `mentor_database.ideas` | Brainstorming | Idea aggregate sa nested `pathData` | `ideas` | postojeći `idea.id` |
| `mentor_brainstorming_ideas` | Brainstorming | Idea aggregate sa nested `pathData` | `ideas` | postojeći `idea.id` |
| `mentor_database.finances` record `finance-state` | Finance | Finance state document | `financeDocuments` | `finance-state` |
| `mentorFinanceStateV1` | Finance | Finance state document | `financeDocuments` | `finance-state` |
| `mentor_database.finances` record `transaction-import-templates` | Finance Import | Import templates document | `financeDocuments` | `transaction-import-templates` |
| `mentorTransactionImportTemplatesV1` | Finance Import | Import templates document | `financeDocuments` | `transaction-import-templates` |
| `mentor_database.assets` | Finance Assets | Asset/debt record sa `recordType` | `assets` | postojeći asset/debt `id` |
| `mentorFinanceAssetsV1.assets` | Finance Assets | Asset record, `recordType: "asset"` | `assets` | postojeći `asset.id` |
| `mentorFinanceAssetsV1.debts` | Finance Assets | Debt record, `recordType: "debt"` | `assets` | postojeći `debt.id` |
| `mentor_database.comparisons` snapshot records | Financial Comparison | Comparison record, `recordType: "snapshot"` | `comparisons` | postojeći `id` |
| `mentorFinancialComparisonSnapshotsV1` | Financial Comparison | Comparison record, `recordType: "snapshot"` | `comparisons` | postojeći `id` |
| `mentor_database.comparisons` option records | Financial Comparison | Comparison record, `recordType: "option"` | `comparisons` | postojeći `id` |
| `mentorFinancialComparisonOptionsV1` | Financial Comparison | Comparison record, `recordType: "option"` | `comparisons` | postojeći `id` |
| `mentor_database.comparisons` cache records | Finance/Research | Obrisiv cache dokument | `cache` | `financial-comparison-research` |
| `mentorFinancialComparisonResearchCacheV1` | Finance/Research | Obrisiv cache dokument | `cache` | `financial-comparison-research` |
| `mentor_nutrition_foods_v1` | Nutrition Foods | Postojeći versioned food envelope | `nutritionFoodData` | `current` |
| validni food backup fallback | Nutrition Foods | Postojeći versioned food envelope | `nutritionFoodData` | `current` |
| food staging payload | Nutrition Foods | Raw recovery kandidat, ne automatski kanonski podatak | `legacyBackups` | originalni ključ |
| `mentor_nutrition_inventory_v1` | Nutrition Inventory/Planning | Postojeći versioned inventory envelope | `nutritionInventoryData` | `current` |
| validni inventory backup fallback | Nutrition Inventory/Planning | Postojeći versioned inventory envelope | `nutritionInventoryData` | `current` |
| inventory staging payload | Nutrition Inventory/Planning | Raw recovery kandidat, ne automatski kanonski podatak | `legacyBackups` | originalni ključ |
| `mentor_nutrition_fridge_v1` | Legacy Nutrition | Redovi transformisani postojećim legacy pravilima u inventory envelope | `nutritionInventoryData` | `current` |
| `mentor_nutrition_stock_v1` | Legacy Nutrition | Redovi transformisani postojećim legacy pravilima u inventory envelope | `nutritionInventoryData` | `current` |
| `mentor_nutrition_inventory_v1_legacy_backup` | Nutrition recovery | Raw backup, nije dodatni kanonski kandidat | `legacyBackups` | originalni ključ |
| `mentor_nutrition_images/foodImages` | Nutrition Media | Postojeći media record bez promene blob sadržaja | `media` | postojeći `id` |
| svi registrovani raw ključevi | Migration/Recovery | Raw source record sa checksum-om | `legacyBackups` | storage key |
| migration/checkpoint podaci | Shared storage | Meta record | `meta` | semantički `key` |

`mentor_database.tests` i `mentor_database.references` ulaze u raw backup, ali se ne aktiviraju kao kanonski v1 zapisi. Kanonski research/test podaci ostaju u `idea.pathData`.

Uploaded idea i research-reference slike koje su trenutno Data URL unutar idea JSON-a ostaju u idea agregatu u v1. Njihovo izdvajanje u `media` je kasnija normalizacija i ne sme biti spojeno sa prvom storage migracijom.

## 5. Mesta u kodu koja čitaju i upisuju izvore

Linije su dokumentovane prema stanju projekta u trenutku nastanka plana. Pre implementacije treba ih ponovo proveriti sa `rg`.

### 5.1 Centralni `mentor_database`

| Operacija | Mesto |
|---|---|
| Deklaracija ključa | `storageService.js:4` |
| Generičko čitanje JSON-a | `storageService.js:49` |
| Generički upis JSON-a | `storageService.js:58` |
| Učitavanje ili kreiranje centralne baze | `storageService.js:189-194` |
| Čuvanje centralne baze i legacy sync | `storageService.js:238-245` |
| Reset/brisanje centralnog ključa | `storageService.js:321-323` |
| Brainstorming čitanje preko `MentorStorage` | `brainstorming.js:241` |
| Brainstorming upis preko `MentorStorage` | `brainstorming.js:254`, `brainstorming.js:261` |
| Finance comparisons čitanje preko facade-a | `finansije.js:1983`, `finansije.js:1997` |
| Finance ideas čitanje preko facade-a | `finansije.js:2050` |
| Finance state čitanje preko facade-a | `finansije.js:3217` |
| Finance templates čitanje preko facade-a | `finansije.js:3804` |
| Assets čitanje/upis preko facade-a | `finansije.js:4854`, `finansije.js:4882` |
| Dashboard finance/assets čitanje preko facade-a | `financeDashboard.js:58`, `financeDashboard.js:73` |
| i18n čitanje/update settings preko facade-a | `js/i18n/provider.js:65`, `js/i18n/provider.js:182` |

### 5.2 Ideas

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentor_brainstorming_ideas` | `storageService.js:157`; `brainstorming.js:243`; `finansije.js:2052` | `storageService.js:199`; `brainstorming.js:253`; `brainstorming.js:260` |

`brainstorming.js:253` je postojeće automatsko trajno čuvanje sample ideja. U budućoj Fazi 1 ovo ponašanje mora biti uklonjeno iz persistence toka: prazan repository vraća prazan kanonski skup, dok UI eventualno prikazuje neperzistentni demo/empty state.

### 5.3 Language/settings

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentor_language` | `storageService.js:158`; `js/i18n/provider.js:58` | `storageService.js:201`; `js/i18n/provider.js:62`; `js/i18n/provider.js:181` |
| `mentorPlanner.language` | `storageService.js:158`; `js/i18n/provider.js:60` | Nema aktuelnog direktnog upisa; provider kopira vrednost u `mentor_language` na `js/i18n/provider.js:62` |

### 5.4 Finance state i import templates

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentorFinanceStateV1` | `storageService.js:105`; `financeDashboard.js:44` preko helper-a; `finansije.js:3234` | `storageService.js:207` ili remove `:209`; `finansije.js:3265` |
| `mentorTransactionImportTemplatesV1` | `storageService.js:106`; `finansije.js:3808` | `storageService.js:213` ili remove `:215`; `finansije.js:3816` |

### 5.5 Assets

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentorFinanceAssetsV1` | `storageService.js:126`; `financeDashboard.js:44` preko helper-a; `finansije.js:4861` | `storageService.js:219`; `finansije.js:4881` |

### 5.6 Financial comparisons i research cache

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentorFinancialComparisonSnapshotsV1` | `storageService.js:135`; `finansije.js:1988`; `brainstorming.js:1504` | `storageService.js:226`; `finansije.js:2011` |
| `mentorFinancialComparisonOptionsV1` | `storageService.js:136`; `finansije.js:2002` | `storageService.js:227`; `finansije.js:2020` |
| `mentorFinancialComparisonResearchCacheV1` | `storageService.js:137`; `finansije.js:2032`; `brainstorming.js:1513`; `research.js:515` | `storageService.js:232`; `finansije.js:4943` |

### 5.7 Nutrition food envelope

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentor_nutrition_foods_v1` | `js/nutrition/nutrition-storage.js:71`, primarni kandidat na `:74` | `:96`; reset `:108` |
| `mentor_nutrition_foods_v1_backup` | `js/nutrition/nutrition-storage.js:75` | prethodna primarna kopija na `:92-93`; reset `:108` |
| `mentor_nutrition_foods_v1_staging` | implicitno preko helper-a `:71` samo kada se eksplicitno prosledi ključ; save verifikacija `:94-95` | upis `:94`; remove `:97`, recovery cleanup `:99`; reset `:108` |

Aktuelni `load()` ne promoviše staging u kanonski podatak. Migrator mora zadržati isto bezbedno ponašanje.

### 5.8 Nutrition inventory/planning envelope

| Ključ | Čitanje | Upis/brisanje |
|---|---|---|
| `mentor_nutrition_inventory_v1` | `js/nutrition/inventory-storage.js:38`, primarni kandidat `:48` | `:74`; fallback direct write `:83`; staging remove `:76`, `:78` |
| `mentor_nutrition_inventory_v1_backup` | `js/nutrition/inventory-storage.js:50` | prethodna primarna kopija `:70-71` |
| `mentor_nutrition_inventory_v1_staging` | save verifikacija `:72-73` | upis `:72`; remove `:76`, `:78` |
| `mentor_nutrition_inventory_v1_legacy_backup` | provera `js/nutrition/inventory-storage.js:115` | jednokratni raw upis `:115` |
| `mentor_nutrition_fridge_v1` | iteracija legacy kandidata `js/nutrition/inventory-storage.js:107-112` | Nema aktuelnog upisa |
| `mentor_nutrition_stock_v1` | iteracija legacy kandidata `js/nutrition/inventory-storage.js:107-112` | Nema aktuelnog upisa |

### 5.9 Postojeći Nutrition IndexedDB

| Operacija | Mesto |
|---|---|
| Ime baze/store-a/version | `js/nutrition/services/food-image-storage.service.js:3` |
| Otvaranje baze | `js/nutrition/services/food-image-storage.service.js:12-18` |
| Kreiranje `foodImages` store-a | `js/nutrition/services/food-image-storage.service.js:15` |
| Transakcije i pristup store-u | `js/nutrition/services/food-image-storage.service.js:21-31` |
| Upis media record-a | `js/nutrition/services/food-image-storage.service.js:43-51` |
| Čitanje | `js/nutrition/services/food-image-storage.service.js:52` |
| Brisanje | `js/nutrition/services/food-image-storage.service.js:53` |
| Restore/rollback pojedinačne slike | `js/nutrition/services/food-image-storage.service.js:54` |

## 6. Pravila prioriteta i konflikta

### 6.1 Opšti algoritam

Pre izbora pobedničkog izvora migrator radi sledeće:

1. Čita i snapshotuje raw vrednosti svih registrovanih izvora.
2. Za svaki raw payload beleži prisustvo, byte size, SHA-256 checksum, parse status i validation status.
3. Nevalidan kandidat ne ulazi automatski u kanonski model, ali ostaje u backupu i conflict/recovery izveštaju.
4. Identical normalized checksum znači da nema konflikta bez obzira na izvor.
5. Kada zapisi imaju stabilan `id`, skupovi se porede po ID-ju. Zapisi koji postoje samo u jednom validnom izvoru mogu se sačuvati union-om.
6. Za isti ID bira se novija validna record vrednost kada oba zapisa imaju pouzdan `updatedAt` ili ekvivalent.
7. Agregatni timestamp se koristi samo za taj agregat. `mentor_database.updatedAt` se nikada ne koristi kao globalni dokaz da su svi nested domeni noviji.
8. Ako nema pouzdanog timestamp-a, primenjuje se domen-specifični source priority iz sledeće tabele.
9. Svaki nerešiv konflikt se beleži u migration report-u sa checksum-ovima oba kandidata i primenjenim pravilom.
10. Migracija nikada ne radi proizvoljan deep merge dva različita agregata ili dva id-less niza.

### 6.2 Prioritet po domenu

| Domen | Pravilo |
|---|---|
| Language | `mentor_language` → `mentorPlanner.language` → `mentor_database.settings.language`, uz prihvatanje samo podržanih vrednosti `sr`/`en` |
| Ideas | Po istom ID-ju noviji validan `idea.updatedAt`; bez timestamp-a `mentor_database.ideas` ima prednost jer ga aktuelni runtime prvi čita. ID-jevi prisutni samo u legacy nizu se dodaju. Nested `pathData` ostaje uz izabranu ideju. |
| Finance state | Noviji validan `financeState.savedAt`; bez `savedAt`, centralni `finance-state` record ima prednost nad `mentorFinanceStateV1`, jer je to aktuelni read redosled. Ne koristiti `mentor_database.updatedAt`. |
| Import templates | Kada template-i imaju stabilan ID, union po ID-ju i record timestamp ako postoji. Bez timestamp-a za konfliktni ID prednost ima centralni document. Id-less konfliktni niz se ne spaja; bira se centralni validan dokument. |
| Assets/debts | Po ID-ju noviji `updatedAt`, zatim `lastUpdatedAt`; ako oba nedostaju, centralni record ima prednost. Zapisi koji postoje samo u jednom izvoru se čuvaju. Aggregate `savedAt` služi samo kao tie-breaker između kompletnih legacy asset envelope-a. |
| Comparison snapshots | Po ID-ju noviji `updatedAt`, zatim `createdAt`; bez timestamp-a centralni record ima prednost. Unique ID zapisi se union-uju. |
| Comparison options | Po ID-ju noviji `updatedAt`; bez njega centralni record ima prednost. Unique ID zapisi se union-uju. |
| Research cache | Direktni `mentorFinancialComparisonResearchCacheV1` ima prednost nad centralno izvedenom kopijom. Cache je obrisiv; invalid payload se može odbaciti nakon raw backupa i ponovo izračunati. |
| Nutrition foods | Validan primarni envelope → validan backup → prazan validan envelope. Staging se nikada automatski ne promoviše; prikazuje se kao recovery kandidat. |
| Nutrition inventory | Validan primarni envelope → validan backup. Legacy fridge/stock se transformišu samo ako odgovarajući `legacy-fridge-v1` migration marker nije već uspešno evidentiran. Staging se ne promoviše automatski. |
| Nutrition media | Postojeći record iz `mentor_nutrition_images/foodImages` je jedini izvor. Record se kopira sa istim ID-jem i blobovima. |
| Centralni tests/references | Ne koriste se kao kanonski autoritet. Raw kopija se čuva; aktivni podaci dolaze iz izabrane ideje i njenog `pathData`. |

### 6.3 Podaci bez `updatedAt` ili `savedAt`

Za podatke bez pouzdanog timestamp-a važe sledeća pravila:

1. Ne izmišljati istorijski timestamp. Tokom migracije se može dodati `migratedAt`, ali ne sme biti predstavljen kao originalni `updatedAt`.
2. Ako su normalized vrednosti jednake, zapis se deduplikuje.
3. Ako različiti izvori imaju različite ID-jeve, čuva se union.
4. Ako isti ID ima različit sadržaj, koristi se gore navedeni source priority i konflikt se evidentira.
5. Ako niz nema ID-jeve, ne radi se spajanje po poziciji, naslovu ili iznosu. Bira se ceo validni niz prema source priority-ju.
6. Deterministički ID se sme generisati samo kada ciljni store zahteva ključ, a source ga nema. ID treba izvesti iz stabilnog namespace-a, source ključa i canonical payload checksum-a, ne iz `Date.now()` ili `Math.random()`.
7. `createdAt`/`updatedAt` se ne dodaju masovno u v1 samo radi buduće normalizacije. Originalni agregat ostaje kompatibilan sa današnjim UI-jem.

## 7. Minimalna IndexedDB v1 šema

Zaključano ime nove baze: `kreatorm_app_db`.  
Početna structural version: `1`.

Bazu će u Fazi 2 deklarisati Dexie.js. Dexie schema version predstavlja IndexedDB structural version, dok `meta` store i dalje vodi odvojenu app data-schema i migration verziju. Dexie nije zamena za domenske migracione servise.

IndexedDB structural version i data/schema migration version nisu ista stvar:

- IndexedDB version služi samo za kreiranje/izmenu store-ova i indeksa u `onupgradeneeded`.
- `meta` zapisi vode app data verzije, migracione checkpointe i cutover status.

### 7.1 Store-ovi i indeksi

| Store | Key path | Vrednost | Minimalni indeksi | Razlog |
|---|---|---|---|---|
| `meta` | `key` | schema version, migration/cutover status, verification report reference | nema | Direktno čitanje po poznatom ključu |
| `legacyBackups` | `key` | raw payload, source type, checksum, capturedAt, byteSize, parse/validation status | `capturedAt` | Recovery i audit; ne koristi se za aktivni UI |
| `settings` | `key` | `{ key, value, updatedAt? }` | nema | Trenutno samo direktan language lookup |
| `ideas` | `id` | Kompletan postojeći idea aggregate sa nested `pathData` | `status`, `type`, `updatedAt` | Postojeći podaci i realni filteri; bez prerane research normalizacije |
| `financeDocuments` | `id` | `finance-state` i `transaction-import-templates` dokumenti | `type` | Finance danas učitava i čuva kompletan state |
| `assets` | `id` | Asset/debt record sa `recordType` | `recordType`, `type`, `updatedAt` | Već odgovara centralnoj kolekciji i realnim prikazima |
| `comparisons` | `id` | Snapshot ili option record sa `recordType` | `recordType`, `ideaId`, `updatedAt` | Realni upiti su po tipu i ideji |
| `cache` | `key` | Obrisivi cache dokument sa optional `expiresAt` | `expiresAt` | Cache nije autoritativni korisnički podatak |
| `nutritionFoodData` | `id` | Postojeći food envelope kao record `current` | nema | Repository danas učitava ceo validirani envelope |
| `nutritionInventoryData` | `id` | Postojeći inventory/planning envelope kao record `current` | nema | Repository danas radi nad celim envelope-om i cross-collection validacijom |
| `media` | `id` | Postojeći blob/thumbnail media record | `entityType`, `entityId`, compound `[entityType, entityId]`, `updatedAt` | Direktno entity lookup i kasnije proširenje van food slika |
| `goals` | `id` | Kompletan odobreni goal aggregate sa nested `actions` i `notesList` | nema | Durable aggregate model postoji pre prvog kreiranja baze; bez prerane normalizacije |
| `calendarEvents` | `id` | Kompletan odobreni calendar event aggregate | `goalId`, `date`, compound `[goalId+date]` | Realni prikazi i povezivanje događaja sa ciljem |

V1 namerno ne uvodi posebne store-ove za:

- finance transactions, budgets i cashflow;
- research directions, references i tests;
- food nutrients, portions i sources;
- inventory batches, recipes, meal plans i shopping items;
- asset history;
- uploaded idea/reference Data URL slike.

Ti store-ovi mogu nastati u kasnijoj data-schema verziji tek kada repository ugovor, React state i cloud sync imaju realnu korist od record-level sinhronizacije. V1 prvenstveno uklanja ograničenja i dupliranje `localStorage`-a bez istovremenog redizajna svih modela.

### 7.2 Transakcione granice

- Jedan settings update: `settings`.
- Jedna ideas mutacija: `ideas`, a eventualna cache invalidacija može obuhvatiti i `cache`.
- Finance state save: `financeDocuments`.
- Assets save: `assets`.
- Comparison save: `comparisons` i po potrebi `cache`.
- Nutrition food save: `nutritionFoodData`; media akcija se koordinira kroz service sa eksplicitnim rollback-om dok oba zapisa ne budu u istoj budućoj transakciji.
- Nutrition inventory/planning save: `nutritionInventoryData`.
- Migracioni checkpoint: ciljni domen store + `meta` u istoj transakciji kada su svi podaci za domen pripremljeni.

Čitanje, parsiranje i validacija legacy podataka rade se pre otvaranja target write transakcije. Unutar IndexedDB transakcije ne čekaju se mreža, File API, canvas obrada ili druga baza.

## 8. Kompletan backup format

Preporučeni korisnički format je verzionisani ZIP paket, na primer:

```text
kreatorm-backup-2026-07-29T120000Z.zip
  manifest.json
  localstorage/
    raw.json
  data/
    settings.json
    ideas.json
    finance-documents.json
    assets.json
    comparisons.json
    cache.json
    nutrition-food-data.json
    nutrition-inventory-data.json
  indexeddb/
    mentor_nutrition_images/
      foodImages.json
  media/
    <safe-record-id>-blob
    <safe-record-id>-thumbnail
  reports/
    validation.json
    conflicts.json
```

### 8.1 `manifest.json`

Minimalna struktura:

```json
{
  "backupFormat": "kreatorm-backup",
  "backupVersion": 1,
  "createdAt": "ISO-8601",
  "appVersion": "unknown-or-build-id",
  "sourceMode": "legacy-pre-indexeddb",
  "database": {
    "name": null,
    "structuralVersion": null,
    "dataVersion": 1
  },
  "entries": [
    {
      "path": "data/ideas.json",
      "contentType": "application/json",
      "byteSize": 0,
      "sha256": "...",
      "recordCount": 0
    }
  ],
  "media": {
    "recordCount": 0,
    "blobCount": 0,
    "totalBytes": 0
  }
}
```

Backup mora sadržati:

1. Raw string vrednost svakog prisutnog registrovanog `localStorage` ključa.
2. Parse/validation status čak i za nevalidne payload-e.
3. Normalizovani pregled domena, ali raw kopija ostaje obavezna.
4. Metadata indeks svih `foodImages` zapisa.
5. Originalni `blob` i `thumbnail` kao binarne ZIP stavke, uz MIME type, size i SHA-256 u indeksu.
6. Conflict i validation report.
7. Record count i checksum za svaku strukturiranu stavku.

Jedan JSON sa base64 slikama nije preporučen zato što povećava veličinu, memorijsku potrošnju i rizik od neuspelog exporta. Ako ZIP implementacija ne bude odobrena u prvoj safety fazi, privremeni fallback mora biti najmanje strukturirani JSON plus odvojeni media export; ne sme se nazivati kompletnim backupom ako slike nisu uključene.

### 8.2 Pravila restore/import-a

1. Paket se prvo u potpunosti validira bez izmene aktivnih podataka.
2. Proveravaju se `backupVersion`, obavezne datoteke, byte size i checksum.
3. Media metadata se proverava prema stvarnim binarnim stavkama.
4. Import se upisuje u staging novu bazu ili u prazne target store-ove unutar kontrolisanih transakcija.
5. Posle read-back verifikacije menja se aktivni data version/cutover marker.
6. Postojeći aktivni podaci dobijaju novi backup pre replace importa.
7. Nevalidan ili nepotpun paket ne sme delimično prepisati aktivne podatke.

## 9. Faza 1 repository ugovori sa `localStorage` adapterom

Faza 1 menja zavisnosti i asinhronu inicijalizaciju, ali ne menja storage engine niti postojeće durable shape-ove.

### 9.1 Zajednički ugovor

```js
/**
 * initialize() se poziva jednom pre prvog feature rendera.
 * getSnapshot()/query metode su sinhrone tek nakon hydrate-a.
 * Sve mutacije vraćaju Promise, čak i dok adapter koristi localStorage.
 */
interface Repository {
  initialize(): Promise<void>;
  isReady(): boolean;
  getSnapshot(): unknown;
  subscribe(listener): () => void;
}

interface StorageAdapter {
  read(key): Promise<unknown>;
  write(key, value): Promise<void>;
  remove(key): Promise<void>;
  readRaw(key): Promise<string | null>;
}
```

`LocalStorageAdapter` u Fazi 1 može interno raditi sinhrono, ali njegov javni ugovor vraća Promise. Time UI i repository sloj postaju kompatibilni sa budućim IndexedDB adapterom bez trenutne promene storage engine-a.

### 9.2 Settings repository

```js
interface SettingsRepository {
  initialize(): Promise<void>;
  getLanguage(): "sr" | "en" | null;
  setLanguage(language): Promise<void>;
  getSnapshot(): { language: "sr" | "en" | null };
  subscribe(listener): () => void;
}
```

U Fazi 1 koristi postojeće language prioritete i nastavlja da piše trenutno važeće legacy izvore kroz jedan repository, ne iz i18n UI-ja.

### 9.3 Ideas repository

```js
interface IdeasRepository {
  initialize(): Promise<void>;
  getAll(): Idea[];
  getById(id): Idea | null;
  replaceAll(ideas): Promise<Idea[]>;
  upsert(idea): Promise<Idea>;
  remove(id): Promise<void>;
  subscribe(listener): () => void;
}
```

Repository vraća prazan niz kada nema korisničkih ideja. Sample ideje se ne upisuju automatski. Ako UI želi demo prikaz, on je odvojen od `getAll()` i nema persistence poziv.

### 9.4 Finance repository

```js
interface FinanceRepository {
  initialize(): Promise<void>;
  getState(): FinanceState;
  saveState(state): Promise<FinanceState>;
  getImportTemplates(): ImportTemplate[];
  saveImportTemplates(templates): Promise<ImportTemplate[]>;
  subscribe(listener): () => void;
}
```

Faza 1 zadržava postojeći aggregate `FinanceState`. Dashboard i puna Finance stranica moraju koristiti isti repository snapshot.

### 9.5 Assets repository

```js
interface AssetsRepository {
  initialize(): Promise<void>;
  getAssets(): Asset[];
  getDebts(): AssetDebt[];
  saveState({ assets, debts }): Promise<{ assets, debts }>;
  subscribe(listener): () => void;
}
```

### 9.6 Comparisons repository

```js
interface ComparisonsRepository {
  initialize(): Promise<void>;
  getSnapshots(ideaId?): ComparisonSnapshot[];
  getOptions(ideaId?): ComparisonOption[];
  saveSnapshots(items): Promise<ComparisonSnapshot[]>;
  saveOptions(items): Promise<ComparisonOption[]>;
  getResearchCache(): object;
  saveResearchCache(cache): Promise<void>;
  invalidateResearchCache(ideaId?): Promise<void>;
  subscribe(listener): () => void;
}
```

Brainstorming, Research i Finance moraju koristiti isti repository; nijedan od njih ne sme direktno čitati comparison ključeve.

### 9.7 Nutrition repositories

```js
interface NutritionFoodDataRepository {
  initialize(): Promise<void>;
  getEnvelope(): NutritionFoodEnvelope;
  saveEnvelope(envelope): Promise<NutritionFoodEnvelope>;
  validate(envelope): ValidationError[];
  subscribe(listener): () => void;
}

interface NutritionInventoryDataRepository {
  initialize(): Promise<void>;
  getEnvelope(): NutritionInventoryEnvelope;
  saveEnvelope(envelope): Promise<NutritionInventoryEnvelope>;
  validate(envelope): ValidationError[];
  migrateLegacyIfNeeded(): Promise<NutritionInventoryEnvelope>;
  subscribe(listener): () => void;
}

interface MediaRepository {
  initialize(): Promise<void>;
  getEntity(entityType, entityId): Promise<MediaRecord | null>;
  put(record): Promise<MediaMetadata>;
  removeEntity(entityType, entityId): Promise<void>;
  exportAll(): Promise<MediaRecord[]>;
}
```

Postojeći Nutrition domain repository-ji mogu zadržati sync selector metode nad hidriranim envelope-om. Njihove write/mutate metode postaju Promise i moraju sačekati trajni upis pre prikaza uspeha.

### 9.8 Greške i state

Svaki repository mora razlikovati:

- `notInitialized`;
- `loading`;
- `ready`;
- `saving`;
- `failed`;
- `recoveryRequired`.

Storage greška ne sme biti pretvorena u tihi prazan state. Ako postoji raw payload koji nije moguće validirati, UI mora ponuditi backup/recovery put pre nastavka sa praznom bazom.

## 10. Asinhroni bootstrap i hydrate redosled

### 10.1 Core bootstrap

Predloženi redosled:

1. Prikaži minimalni app loading shell; feature UI još ne renderuje korisničke podatke.
2. Kreiraj registry, `LocalStorageAdapter` i repository instance.
3. `await settingsRepository.initialize()`.
4. Inicijalizuj i18n iz settings snapshot-a; tek tada postavi `lang`, `dir` i prevedi shell.
5. Inicijalizuj core app state koji ne zavisi od lazy feature podataka.
6. Registruj lazy feature loader.
7. Označi `MentorData.coreReady` i prikaži app shell.

Ako settings ne može da se učita, dozvoljen je browser-language fallback samo za prikaz. To ne sme automatski prepisati nevalidan raw settings payload.

### 10.2 Lazy feature hydrate

| Feature | Obavezni redosled pre prvog rendera |
|---|---|
| Brainstorming | Učitati scripts → `await ideasRepository.initialize()` → `await comparisonsRepository.initialize()` kada workspace prikazuje comparison podatke → render |
| Research | Koristi već hidrirani Ideas repository; zatim Comparisons/Cache repository → render |
| Finance Dashboard | `await Promise.all(financeRepository.initialize(), assetsRepository.initialize())` → render read-only snapshot |
| Finance | Ideas repository zbog povezanih ideja → Finance → Assets → Comparisons/Cache → render aktivnog taba |
| Nutrition | Učitati seed/model/validation skripte → Food Data repository → Inventory Data repository → kontrolisana legacy inventory migracija → Media repository → services/components → render |
| Calendar/Goals | Trenutno samo postojeći in-memory `appState`; nema storage hydrate-a u okviru ove migracije |

`lazyLoader.js` ne sme smatrati feature spremnim samo zato što je poslednja skripta učitana. Feature readiness uključuje uspešan repository hydrate ili eksplicitni recovery state.

### 10.3 Mutacije

Za svaki save tok:

1. Validirati input i poslovna pravila.
2. Formirati sledeći canonical snapshot.
3. Prikazati saving state.
4. `await repository` mutaciju.
5. Tek nakon uspešnog durable upisa objaviti success event i rerender.
6. Kod greške vratiti prethodni in-memory snapshot ili jasno označiti nesinhronizovano stanje.

## 11. Migracioni state machine i checkpoint-i

Globalni i domen statusi:

```text
not_started
  → backup_in_progress
  → backed_up
  → import_in_progress
  → imported
  → verification_in_progress
  → verified
  → active

Bilo koji korak može preći u failed, uz sačuvan lastSuccessfulCheckpoint.
```

Predloženi `meta` ključevi:

- `database-schema-version`;
- `data-schema-version`;
- `migration:legacy-to-idb-v1`;
- `migration:settings`;
- `migration:ideas`;
- `migration:finance`;
- `migration:assets`;
- `migration:comparisons`;
- `migration:nutrition-food-data`;
- `migration:nutrition-inventory-data`;
- `migration:media`;
- `cutover:active-adapter`.

Svaki checkpoint beleži:

- status;
- `startedAt`, `completedAt` ili `failedAt`;
- source checksum-e;
- target checksum;
- record counts;
- migration code version;
- error code bez privatnog payload sadržaja.

Ponovljena migracija sa istim source checksum-om mora biti no-op ili kontrolisani replace istog domena, nikada append koji pravi duplikate.

Media migracija između stare i nove IndexedDB baze ne može biti jedna atomska transakcija. Ona mora:

1. Enumerisati source record-e i zabeležiti manifest.
2. Kopirati record po record u target `media`.
3. Beležiti checkpoint po ID-ju ili batch-u.
4. Proveriti metadata, blob size i checksum.
5. Označiti media domen `verified` tek kada su svi manifest record-i potvrđeni.
6. Ostaviti staru bazu netaknutu.

## 12. Test plan

Testovi moraju koristiti izolovan storage po testu. Za automatizovane repository/migration testove poželjan je `fake-indexeddb` ili browser test harness koji podržava stvarne IndexedDB evente i transakcije. Pored unit testova obavezni su browser smoke testovi.

### 12.1 Osnovna migracija

| ID | Scenario | Očekivanje |
|---|---|---|
| MIG-001 | Svi izvori prazni | Kreiraju se prazni validni target dokumenti; ne čuvaju se sample ideje |
| MIG-002 | Samo validan `mentor_database` | Svi podržani domeni migrirani; centralni tests/references nisu autoritet |
| MIG-003 | Samo legacy module ključevi | Kanonski store-ovi imaju ekvivalentne podatke i sačuvane ID-jeve |
| MIG-004 | Centralni i legacy izvori identični | Nema duplikata; report označava deduplikaciju |
| MIG-005 | Nutrition primarni envelope validan | Primarni se migrira sa istim version/data shape-om |
| MIG-006 | Nutrition primarni invalidan, backup validan | Backup postaje kanonski; primary raw ostaje u backup/report-u |
| MIG-007 | Stari fridge/stock bez migration markera | Legacy redovi se transformišu jednom sa stabilnim `legacyId` |
| MIG-008 | Postojeća Nutrition images baza | Svi record-i, blobovi i thumbnail-i kopirani sa istim ID-jem |

### 12.2 Prekid i ponavljanje

| ID | Scenario | Očekivanje |
|---|---|---|
| MIG-101 | Reload tokom raw backupa | Ponovni start nastavlja ili bezbedno ponavlja backup bez gubitka |
| MIG-102 | Abort tokom domain write transakcije | Domen nije `imported`; target nema delimično potvrđeno stanje |
| MIG-103 | Prekid posle `imported`, pre `verified` | Sledeći start prvo radi verifikaciju, ne duplira upis |
| MIG-104 | Prekid na polovini media kopiranja | Nastavak preskače već checksum-verifikovane media record-e |
| MIG-105 | Migracija pokrenuta dva puta | Isti source checksum daje identičan target i record count |
| MIG-106 | Nova tab instanca tokom migracije | Samo jedan migrator ima lock; druga instanca čeka ili prikazuje migration state |
| MIG-107 | IndexedDB `onblocked` zbog stare otvorene veze | Nema fallback upisa u praznu bazu; korisnik dobija instrukciju da zatvori druge tabove |

### 12.3 Konflikti i podaci bez timestamp-a

| ID | Scenario | Očekivanje |
|---|---|---|
| MIG-201 | Isti idea ID, različit `updatedAt` | Noviji validan record pobeđuje; oba raw kandidata ostaju u backupu |
| MIG-202 | Isti idea ID, bez timestamp-a | Centralni record pobeđuje prema source priority-ju; konflikt evidentiran |
| MIG-203 | Unique idea ID samo u legacy nizu | Zapis se dodaje union-om |
| MIG-204 | Finance centralni record stariji po `savedAt` | Noviji legacy aggregate pobeđuje; globalni DB timestamp se ignoriše |
| MIG-205 | Finance kandidati bez `savedAt` | Centralni validan dokument pobeđuje; nema deep merge-a |
| MIG-206 | Id-less import template nizovi se razlikuju | Bira se ceo niz prema source priority-ju; ne spaja se po indeksu |
| MIG-207 | Cache konflikt | Direktni cache ključ pobeđuje ili se cache invalidira; korisnički kanonski podaci ostaju netaknuti |
| MIG-208 | Centralni tests/references različiti od `pathData` | `pathData` ostaje autoritet; centralne izvedene kolekcije samo u raw backupu |

### 12.4 Nevalidan payload

| ID | Scenario | Očekivanje |
|---|---|---|
| MIG-301 | Nevalidan JSON u jednom ključu | Raw string sačuvan; kandidat označen `parseFailed`; ostali domeni mogu nastaviti |
| MIG-302 | Validan JSON, pogrešan shape/version | Kandidat označen `validationFailed`; ne postaje kanonski |
| MIG-303 | Svi kandidati domena nevalidni | Domen prelazi u `recoveryRequired`, ne u automatski prazan `active` state |
| MIG-304 | Media metadata bez blob-a | Media domen nije verified; problem evidentiran |
| MIG-305 | Blob checksum/size mismatch | Kopija se ponavlja ili migration fail; stara baza ostaje netaknuta |
| MIG-306 | Quota exceeded | Transakcija abortuje, status je failed/retryable, legacy podaci netaknuti |

### 12.5 Backup, import i rollback

| ID | Scenario | Očekivanje |
|---|---|---|
| BAK-001 | Kompletan pre-migration export | Manifest obuhvata sve prisutne ključeve i sve media record-e |
| BAK-002 | Backup ZIP checksum provera | Svaka datoteka i media blob prolaze checksum |
| BAK-003 | Import nepotpunog ZIP-a | Import se odbija pre prvog target upisa |
| BAK-004 | Import sa nepoznatim backup version | Import se odbija ili vodi kroz eksplicitni migrator |
| RB-001 | Verifikacija domena ne uspe | Cutover marker ostaje legacy; UI ne čita polumigrirani target |
| RB-002 | App restart posle failed migracije | Repository koristi poslednji potvrđeni adapter i prikazuje recovery status |
| RB-003 | Povratak na legacy pre cutover-a | Podaci su identični originalnom raw source-u |
| RB-004 | Greška nakon IndexedDB cutover-a i novih IDB upisa | Nema tihog fallback-a na zastareli localStorage; aktivira se recovery/export tok |
| RB-005 | Destructive import/reset | Pre akcije postoji novi kompletan backup i eksplicitna potvrda |

### 12.6 Regression i parity

- Ideas broj, ID skup, statusi i nested `pathData` ostaju jednaki.
- Finance totals, budget veze, cashflow i import duplicate detection daju iste rezultate.
- Assets/debts vrednosti i history nizovi ostaju jednaki.
- Comparison snapshots/options ostaju vezani za iste idea/direction/reference ID-jeve.
- Nutrition validator daje isti rezultat pre i posle migracije.
- Inventory/planning cross-reference provere ostaju validne.
- Sve Nutrition slike se prikazuju nakon reload-a i object URL lifecycle ostaje ispravan.
- Export → reset test baza → import daje isti canonical checksum.
- Višestruki reload i zatvaranje/otvaranje browsera ne menjaju record count.

## 13. Rollback strategija

### 13.1 Pre cutover-a

- `localStorage` i stara images baza ostaju autoritativni.
- Target IndexedDB može biti obrisan i migracija ponovljena jer legacy izvori nisu menjani.
- Failed domen ne postaje `active`.
- Feature ne čita target store dok njegov domen nije `verified`.

### 13.2 Posle cutover-a

Automatski fallback na stari `localStorage` nije bezbedan, jer bi zanemario nove IndexedDB izmene. Posle prvog uspešnog IDB upisa rollback mora biti eksplicitan recovery postupak:

1. Zamrznuti nove mutacije.
2. Napraviti kompletan IDB backup.
3. Dijagnostikovati target grešku.
4. Vratiti poslednji verifikovani IDB backup ili pokrenuti odobrenu reverse transformaciju.
5. Ne aktivirati stari legacy snapshot bez jasnog upozorenja da je stariji.

Legacy adapter može postojati kao emergency read-only recovery alat, ali ne kao tihi runtime fallback nakon cutover-a.

## 14. Kriterijumi spremnosti modula za cutover

Modul je spreman za IndexedDB cutover samo kada su ispunjeni svi kriterijumi:

### 14.1 Arhitektonski kriterijumi

- Modul i svi njegovi cross-module potrošači nemaju direktan `localStorage` ili direktan legacy IndexedDB poziv.
- Svi storage pristupi idu kroz vlasnički repository.
- Repository ima Promise-based `initialize` i mutacije.
- Feature render čeka repository hydrate.
- UI čita iz jednog hidriranog snapshot-a, ne iz više storage izvora.
- Storage greške imaju vidljiv `failed` ili `recoveryRequired` tok.

### 14.2 Data kriterijumi

- Kanonski v1 model i validator su dokumentovani i testirani.
- Legacy source priority i no-timestamp pravila su implementirana.
- Migracija čuva postojeće ID-jeve i veze.
- Raw backup postoji i checksum je potvrđen.
- Source i target record counts/ID skupovi prolaze parity proveru.
- Ponovljena migracija je idempotentna.
- Invalid payload ne proizvodi tihi prazan active state.

### 14.3 Operativni kriterijumi

- Domain migration može biti prekinuta i nastavljena.
- `onblocked`, quota i transaction abort scenariji imaju kontrolisan rezultat.
- Backup/export i restore tog domena rade u okviru kompletnog backup formata.
- Reload, hard refresh i lazy reactivation prolaze smoke test.
- Domena verifikacija upisuje `verified` checkpoint pre promene adaptera.
- Postoji dokumentovan recovery/rollback postupak.
- Produkcioni smoke test potvrđuje da nema automatskog trajnog sample upisa.

### 14.4 Dodatni kriterijumi po modulu

| Modul | Dodatni uslov |
|---|---|
| Settings/i18n | Jezik je poznat pre prvog prevedenog rendera; nema flash-a koji trajno prepisuje izbor |
| Ideas/Research | Nested `pathData`, directions, references i tests imaju parity; centralni derived nizovi nisu autoritet |
| Finance Dashboard/Finance | Oba ekrana koriste isti Finance/Assets snapshot; totals i import duplicate detection su isti |
| Comparisons | Finance, Brainstorming i Research koriste isti repository i cache invalidation |
| Nutrition Foods | Svi postojeći validatori prolaze i user/system ownership ostaje isto |
| Nutrition Inventory/Planning | Legacy migration marker i cross-reference validacija prolaze; nema duplih batch-eva |
| Media | Broj record-a, blob/thumbnail size i checksum su jednaki; stara baza ostaje netaknuta |

## 15. Predloženi redosled rada

### Faza 0 — dokumentacija, fixtures i safety baseline

1. Evidentirati zaključane ADR odluke i završiti pre-implementation tehničke provere iz poglavlja 18.
2. Zamrznuti centralni registry legacy ključeva.
3. Definisati backup manifest i izabrati tačnu lokalnu ZIP implementaciju.
4. Napraviti anonymized fixtures: empty, valid, divergent, timestamp-less, invalid i media.
5. Dodati read-only storage audit koji ništa ne menja.

### Faza 1 — repository granica na postojećem storage-u

1. Uvesti `LocalStorageAdapter` sa Promise API-jem.
2. Uvesti repositories iz poglavlja 9.
3. Prebaciti core bootstrap i lazy feature hydrate.
4. Ukloniti direktne storage pozive iz feature modula.
5. Ukloniti buduće automatsko trajno čuvanje sample ideja; ne brisati postojeće zapise.
6. Zadržati postojeće durable shape-ove i postojeći storage engine.

### Posle Faze 1 — zaseban Goals/Calendar plan (završen pre Faze 2)

1. Kanonski Goals i Calendar aggregate modeli, repository ugovori, veze i testovi analizirani su i odobreni kao zaseban persistence zadatak.
2. Zadatak se ne predstavlja kao legacy migracija.
3. Pošto je plan odobren pre prvog kreiranja baze, njihovi aggregate store-ovi ulaze u structural v1 prema ADR-IDB-010.
4. Njihova aktivacija i cutover nisu implicitni deo Faze 2 infrastrukture.

### Faza 2 — IndexedDB infrastruktura

1. Dodati i zaključati Dexie.js kao lokalnu npm zavisnost; bez CDN-a.
2. Kreirati minimalnu v1 šemu baze `kreatorm_app_db` kroz jednu Dexie database klasu.
3. Implementirati adapter iznad Dexie-ja, uključujući transakcione helper-e i kontrolisani `versionchange`/`blocked` handling.
4. Implementirati backup, verification i migration state machine.
5. Ne menjati aktivni adapter dok testovi i backup nisu spremni.

### Faza 3 — migracija i cutover po domenima

Preporučeni redosled:

1. Settings/i18n.
2. Ideas + Research + Comparisons/Cache kao povezana celina.
3. Finance + Finance Dashboard + Assets.
4. Nutrition food i inventory/planning envelope-i.
5. Nutrition media.
6. Database Viewer, import/export i reset.

Svaki domen prolazi `backed_up → imported → verified → active` nezavisno, ali konačno uklanjanje legacy read/write koda dolazi tek kada su svi domeni aktivni.

### Faza 4 — stabilizacija i legacy retirement

1. Najmanje jedna stabilna objavljena verzija bez aktivnog legacy čitanja/pisanja.
2. Najmanje 30 dana potvrđenog stabilnog korišćenja.
3. Najmanje jedan kompletan i verifikovan ZIP backup iz IndexedDB-a.
4. Tek nakon sva tri uslova može se ponuditi ručni cleanup UI.
5. Bez automatskog brisanja legacy ključeva ili stare images baze.

## 16. Goals i calendar: novi persistence zadatak

Goals i Calendar nisu deo legacy registra koji migrator prenosi. Njihov zaseban persistence plan je u međuvremenu odobren i durable modeli postoje pre prvog kreiranja baze.

Zato:

- `goals` i `calendarEvents` nisu deo legacy migration registra;
- structural v1 unapred kreira njihove minimalne aggregate store-ove prema ADR-IDB-010;
- `actions` i `notesList` ostaju nested u goal agregatu;
- njihov backup/import i aktivacija ostaju odvojeni od legacy migracije;
- Faza 2 infrastruktura ne menja njihove aktivne save/load putanje.

## 17. Šta nije deo v1

- React refactor.
- Backend API i cloud sync.
- Multi-user/workspace ownership.
- Outbox/change journal za sinhronizaciju.
- Enkripcija lokalne baze.
- Record-level normalizacija svih finance i Nutrition agregata.
- Izdvajanje idea/reference Data URL slika u `media`.
- Record-level normalizacija Goals/Calendar `actions` i `notesList`.
- Automatsko brisanje legacy podataka.
- Trajni dual-write.

## 18. Status odluka i pre-implementation provere

Sve proizvodne i data-safety odluke iz prethodne verzije plana su zaključane u ADR sekciji.

Pre prve implementacije ostaju samo tehničke provere koje ne menjaju odobrenu arhitekturu:

1. Potvrditi da ni u jednoj ranije objavljenoj verziji ne postoji baza `mentor_app_db`; ako postoji, dokumentovati name migration pre kreiranja `kreatorm_app_db`.
2. Izabrati i zaključati tačnu Dexie.js verziju kompatibilnu sa podržanim browserima i lokalnim npm/build načinom rada.
3. Izabrati i zaključati lokalnu ZIP biblioteku koja podržava streaming ili dovoljno kontrolisanu memorijsku obradu originalnih blobova.
4. Potvrditi package manager i lockfile politiku za projekat pre dodavanja prve npm zavisnosti.
5. Izmeriti realnu veličinu najvećeg očekivanog backupa kako bi se potvrdilo da ZIP implementacija ne duplira sve blobove u memoriji.

## 19. Konačan predlog folder strukture za Fazu 0 i Fazu 1

Ovo je ciljna struktura za naredne dve faze. Ovaj dokument je ne kreira; svaki folder/fajl nastaje tek kroz odobren implementacioni korak.

Struktura ostaje u postojećem `js/` stablu da ne bi uvodila paralelni `src/` projekat pre vremena. Data sloj je UI-agnostičan, koristi plain JavaScript podatke i Promise ugovore, pa se kasnije može direktno koristiti iz React hook/service sloja ili premestiti mehanički bez promene domenskih interfejsa.

### 19.1 Faza 0 — safety baseline, registry i backup

```text
KreatorM/
├─ INDEXEDDB_MIGRATION_PLAN.md
├─ package.json                         # uvodi se kada počne odobrena npm/tooling faza
├─ package-lock.json                    # obavezan lockfile; bez CDN dependency-ja
├─ js/
│  └─ data/
│     ├─ legacy/
│     │  ├─ legacy-storage.registry.js  # jedini registar ključeva, formata i owner domena
│     │  ├─ legacy-storage.reader.js    # read-only localStorage snapshot
│     │  └─ legacy-media.reader.js      # read-only mentor_nutrition_images reader
│     ├─ audit/
│     │  └─ storage-audit.service.js    # presence/size/parse/validation izveštaj bez upisa
│     ├─ backup/
│     │  ├─ backup-format.constants.js
│     │  ├─ backup-manifest.schema.js
│     │  ├─ backup-checksum.service.js
│     │  ├─ backup-export.service.js
│     │  ├─ backup-validation.service.js
│     │  └─ nutrition-media-export.service.js
│     ├─ validation/
│     │  ├─ legacy-payload.validators.js
│     │  └─ backup.validators.js
│     ├─ migration/
│     │  ├─ migration-status.constants.js
│     │  └─ migration-report.model.js   # model/report, bez IDB migracije u Fazi 0
│     └─ recovery/
│        └─ recovery-report.service.js
└─ tests/
   └─ storage/
      ├─ fixtures/
      │  ├─ empty/
      │  ├─ valid/
      │  ├─ conflicts/
      │  ├─ timestamp-less/
      │  ├─ invalid/
      │  └─ media/
      ├─ legacy-storage.registry.test.js
      ├─ storage-audit.service.test.js
      ├─ backup-manifest.test.js
      ├─ backup-checksum.test.js
      ├─ backup-export.test.js
      └─ backup-validation.test.js
```

Pravila Faze 0:

- nijedan servis nije priključen na postojeće save tokove;
- legacy reader-i su strogo read-only;
- audit ne kreira prazne podatke i ne popravlja payload;
- raw vrednosti se čuvaju pre parsiranja/normalizacije;
- ZIP servis zavisi od lokalne npm biblioteke i generiše `kreatorm-backup` format;
- test fixture-i moraju biti anonimizovani i ne smeju sadržati stvarne privatne korisničke podatke;
- Dexie još nije dependency Faze 0, jer nema IndexedDB target implementacije.

### 19.2 Faza 1 — repository i async bootstrap na postojećem storage-u

Faza 1 zadržava celu strukturu Faze 0 i dodaje:

```text
KreatorM/
├─ js/
│  └─ data/
│     ├─ index.js                         # jedini javni MentorData/data-layer entry point
│     ├─ adapters/
│     │  └─ local-storage.adapter.js       # Promise API, jedini direktni localStorage pristup
│     ├─ bootstrap/
│     │  ├─ data-bootstrap.js              # core settings/i18n readiness
│     │  └─ feature-hydration.js           # lazy feature repository readiness
│     ├─ contracts/
│     │  ├─ storage-adapter.contract.js
│     │  └─ repository.contract.js
│     ├─ repositories/
│     │  ├─ settings.repository.js
│     │  ├─ ideas.repository.js
│     │  ├─ finance.repository.js
│     │  ├─ assets.repository.js
│     │  ├─ comparisons.repository.js
│     │  ├─ nutrition-food-data.repository.js
│     │  ├─ nutrition-inventory-data.repository.js
│     │  └─ media.repository.js
│     ├─ state/
│     │  ├─ repository-state.constants.js
│     │  └─ data-event-bus.js
│     ├─ errors/
│     │  └─ data-error.js
│     └─ compatibility/
│        └─ mentor-storage.facade.js       # privremeni most; ima eksplicitni removal kriterijum
└─ tests/
   └─ storage/
      ├─ adapters/
      │  └─ local-storage.adapter.test.js
      ├─ bootstrap/
      │  ├─ data-bootstrap.test.js
      │  └─ feature-hydration.test.js
      └─ repositories/
         ├─ settings.repository.test.js
         ├─ ideas.repository.test.js
         ├─ finance.repository.test.js
         ├─ assets.repository.test.js
         ├─ comparisons.repository.test.js
         ├─ nutrition-food-data.repository.test.js
         ├─ nutrition-inventory-data.repository.test.js
         └─ media.repository.test.js
```

Pravila Faze 1:

- `local-storage.adapter.js` je jedino novo mesto sa direktnim `localStorage` pozivima;
- repository-ji poseduju hydrate/cache/mutation tok, ali ne sadrže DOM, HTML ili feature render logiku;
- feature servisi ne znaju koji adapter je aktivan;
- `data-bootstrap.js` rešava settings/i18n pre core rendera;
- `feature-hydration.js` rešava lazy module readiness pre feature rendera;
- compatibility facade je privremen i ne dobija novu poslovnu logiku;
- postojeći durable shape-ovi ostaju isti;
- nema Dexie-ja, IndexedDB target store-ova ili cutover-a u Fazi 1;
- zaseban Goals/Calendar persistence plan završen je pre početka Faze 2; ADR-IDB-010 beleži pre-create dopunu šeme.

### 19.3 Folderi koji se dodaju tek u Fazi 2

Radi jasne granice, sledeće se ne kreira u Fazi 0 ili Fazi 1:

```text
js/data/
├─ database/
│  ├─ kreatorm.database.js              # Dexie klasa za kreatorm_app_db
│  ├─ schema-v1.js
│  └─ transaction.helper.js
├─ adapters/
│  └─ dexie.adapter.js
├─ migration/
│  ├─ legacy-to-indexeddb.service.js
│  ├─ migration-state-machine.js
│  ├─ migration-checkpoint.service.js
│  └─ migration-verification.service.js
└─ recovery/
   └─ indexeddb-recovery.service.js
```

Dexie.js se instalira i zaključava u `package-lock.json` na početku Faze 2. Ovim Faza 1 dokazuje repository i async granicu pre nego što storage engine postane dodatna promenljiva.

## 20. Definicija uspeha

Migracija je završena kada:

- svi registrovani legacy izvori postoje u potvrđenom kompletnom backupu;
- svi kanonski domeni su `verified` i `active`;
- aplikacioni kod više ne čita niti upisuje `localStorage`;
- stara Nutrition images baza više nije aktivni izvor;
- reload, lazy activation, import/export i recovery testovi prolaze;
- source/target parity i referential integrity provere prolaze;
- nema automatskog trajnog čuvanja sample ideja;
- legacy podaci ostaju dostupni za eksplicitni recovery dok ne bude doneta posebna cleanup odluka.

## 21. Implementacioni status posle Faze 3

Datum preseka: 2026-07-30.

### 21.1 Završeno

- Structural v1 baze `kreatorm_app_db` postoji kao jedna Dexie baza sa svih 13 store-ova iz poglavlja 8.
- Migracija i nezavisan `backed_up → imported → verified → active` cutover završeni su za Settings, Goals/Calendar, Ideas/Comparisons/Cache, Finance/Assets, Nutrition envelope-e i Nutrition media.
- Svi aktivni repository write tokovi postavljaju first-write marker; automatski legacy fallback posle prvog IndexedDB upisa je zabranjen.
- Nutrition media koristi kanonski `media` repository; stara baza `mentor_nutrition_images` ostaje read-only legacy izvor i ne briše se.
- Post-cutover backup ima `sourceMode: "indexeddb"` i sadrži kompletan snapshot svih canonical store-ova, `meta`, `legacyBackups`, raw legacy izvore, migration/validation/conflict report-e i sve binarne vrednosti.
- Nutrition originalni blobovi i thumbnailovi imaju pojedinačne SHA-256, size i MIME deskriptore; backup manifest beleži count/ID/binary parity.
- Import prvo u celosti validira ZIP bez upisa, zatim pravi i validira kompletan backup trenutne baze. Replace svih store-ova i read-back parity izvršavaju se u jednoj Dexie transakciji.
- Restore/recovery je isključivo eksplicitan. Posle first-write markera nema automatskog vraćanja iz legacy izvora.
- Mutation freeze zaustavlja nove repository mutacije i čeka već započete mutacije pre backup/import/reset operacije.
- Database Viewer čita read-only IndexedDB snapshot. Export i import prolaze kroz admin facade.
- Destruktivni IndexedDB reset nije povezan sa UI dugmetom. API zahteva tačan confirmation token, eksplicitnu destructive zastavicu i potvrdu pre-action kompletnog backupa.
- Legacy cleanup API ne postoji. Dostupan je samo eligibility status: stabilna verzija, najmanje 30 dana, potvrđen kompletan IndexedDB backup i ručna potvrda.

### 21.2 Granica Faze 4

Faza 4 ne menja data model. Tehnički pre-release baseline je potvrđen: Node test suite prolazi 51/51, IndexedDB cutover smoke u Microsoft Edge-u je uspešan, a završni reviewer nema high ni medium nalaze.

Operativni koraci, release evidencija, obavezni production complete ZIP export, izolovani restore/parity i 30-dnevno praćenje definisani su u [IndexedDB Stabilization Runbook-u](./INDEXEDDB_STABILIZATION_RUNBOOK.md).

Release candidate version `1.0.0`, build `20260730.1` i runtime release ID `1.0.0+build.20260730.1` su zaključani. `releasedAt`, release commit i operator su i dalje `TBD`; 30-dnevni period nije označen kao započet. Cleanup nije eligible niti implementiran. Postojeći legacy `localStorage` izvori i baza `mentor_nutrition_images` ostaju netaknuti. Ispunjenje retention kriterijuma može samo omogućiti predlog zasebnog, budućeg i eksplicitno odobrenog ručnog cleanup zadatka.

### 21.3 Stvarna folder struktura dodata kroz Faze 2 i 3

```text
js/data/
├─ admin/
│  └─ indexeddb-admin.facade.js
├─ backup/
│  ├─ indexeddb-backup.service.js
│  └─ ... Phase 0 backup/ZIP/checksum servisi
├─ database/
│  ├─ kreatorm.database.js
│  ├─ schema-v1.js
│  └─ transaction.helper.js
├─ migration/
│  ├─ legacy-to-indexeddb.service.js
│  ├─ migration-state-machine.js
│  ├─ migration-checkpoint.service.js
│  └─ migration-verification.service.js
├─ recovery/
│  ├─ indexeddb-recovery.service.js
│  └─ indexeddb-restore.service.js
├─ repositories/
│  ├─ indexeddb-core.repositories.js
│  └─ ... legacy adapter-backed repository granice iz Faze 1
└─ services/
   ├─ mutation-freeze.service.js
   └─ cross-tab-coordination.service.js
```

`storageService.js` ostaje compatibility/UI host, ali pri aktivnom IndexedDB cutover-u ne sme direktno da exportuje, importuje ili resetuje legacy `mentor_database`. Te administrativne operacije prelaze na `MentorIndexedDbAdmin`.

## 22. Final review data-safety dopune

### 22.1 Legacy capture pre bilo kakvog materijalizovanja

`storageService.js` nema eager `loadDatabase()` poziv i read putanja nikada ne upisuje izvedeni/default `mentor_database`. Ako je ključ prisutan ali nije validan JSON objekat, raw vrednost ostaje netaknuta i dobija `LEGACY_DATABASE_RECOVERY_REQUIRED`. Samo eksplicitni potvrđeni legacy import može da zameni takav payload.

### 22.2 Persisted data epoch i cross-tab koordinacija

- `meta/data:epoch` je persisted revision aktivnog IndexedDB snapshot-a.
- Repository selection pamti epoch sa kojim su snapshot-i hidrirani.
- Svaki repository write uzima shared Web Lock i u istoj write transakciji proverava da persisted epoch odgovara hydrate epoch-u.
- Migracija, kompletan restore/import, reset i recovery retry uzimaju exclusive Web Lock.
- Ako Web Locks nisu dostupni, koordinisana migracija i destruktivne operacije se blokiraju.
- Restore i reset u istoj replace transakciji povećavaju epoch.
- Promena epoch-a emituje `BroadcastChannel` i DOM event signal, postavlja `reloadRequired` i sprečava svaki sledeći write starog tab-a.
- Admin restore/reset/recovery podrazumevano zakazuju reload; čak i kada ga caller eksplicitno odloži, epoch guard ne dozvoljava stare mutacije.

### 22.3 Eksplicitni recovery retry

`MentorIndexedDbAdmin.retryRecovery()` je jedina komanda za ponavljanje `recoveryRequired` domena/grupe. Zahteva confirmation token, novi kompletan backup sa raw izvorima i callback potvrdu da je backup preuzet/sačuvan. Popravljeni source overlay validira se pre bilo kakve izmene checkpoint-a. Pojedinačni target resetuje samo svoj `recoveryRequired` checkpoint; atomic pair target resetuje sve bezbedne članove grupe zajedno, nakon čega se ponavlja postojeći migracioni tok. Stari `legacyBackups` zapisi se ne brišu niti prepisuju praznim stanjem.

Atomic pair target-i su `goals-calendar`, `ideas-comparisons`, `finance-assets` i `nutrition-envelopes`. Cela grupa može kontrolisano da se vrati na `not_started` kada važe svi uslovi:

- najmanje jedan član je `recoveryRequired`;
- nijedan član niti njegov cutover marker nije `active`;
- globalni adapter marker ne bira nijedan član grupe kao aktivan IndexedDB domen;
- nijedan član nema `hasIndexedDbWrites`;
- svi popravljeni kandidati grupe validiraju se zajedno pre resetovanja checkpoint-a;
- Goals i Calendar dodatno prolaze zajedničku Goals↔Calendar reference validaciju.

Partner koji je `verified`, `backed_up` ili dependency-blocked može biti deo atomic retry-ja samo dok nije aktiviran i nema IndexedDB write marker. Ako je bilo koji partner aktivan ili je već imao IndexedDB write, retry se odbija. Novi kompletan backup se validira i isporučuje pre meta reset-a, a svi raniji backup zapisi ostaju netaknuti.

### 22.4 Durable promena jezika

Promena jezika prvo čeka uspešan `settingsRepository.setLanguage()`. Tek nakon durable write-a menja UI state i emituje `mentor:languagechange`. Greška zadržava prethodni jezik i emituje `mentor:languagechangeerror`, bez false-success događaja.

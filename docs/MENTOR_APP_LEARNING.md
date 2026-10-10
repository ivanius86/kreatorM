# Mentor — radna beležnica za Codex

Poslednje ažuriranje: 10.10.2026.

## Svrha i način korišćenja

Ovaj dokument čuva proverena saznanja o aplikaciji kako bi buduće sesije mogle da nastave rad sa manje ponovnog istraživanja. Pročitati ga zajedno sa `../AGENTS.md` na početku rada na Mentoru. Beležnica ne zamenjuje projektna pravila niti proveru trenutnog koda.

Razlikovati: potvrđeno u kodu, provereno u pregledaču, planirano i još neprovereno. Pri novom saznanju ažurirati odgovarajući odeljak i dnevnik. Kada je problem rešen, zabeležiti proveru i promeniti njegov status.

Ovo je dokumentacija u projektu, a ne automatsko treniranje modela ili garancija da će svaka buduća sesija sama učitati fajl. Ne unositi lozinke, tokene, izvoze baze ili privatne finansijske i zdravstvene podatke.

## Šta je Mentor

Mentor / KreatorM je aplikacija za ideje, istraživanje, ciljeve i organizovanje ličnog života. Dugoročni cilj je modularan mentor i lični operativni sistem, uz bezbedno čuvanje podataka i mogućnost budućeg backend-a.

Navigacija viđena u pregledaču: Dashboard, Brainstorming, Goal Creator, Calendar, Finance, Journal, Nutrition, Body and Energy i Settings. Prisustvo stavke u navigaciji nije dokaz da je ceo modul završen. U ovoj sesiji detaljno je korišćen tok Brainstorming → Research.

## Trenutna implementacija — potvrđeno u kodu

Aktuelni lokalni ulaz je `index.html`, sa običnim JavaScript skriptama i globalnim API-jima. Projektna dokumentacija opisuje buduću React arhitekturu; ovu verziju ne treba tretirati kao već migriranu React aplikaciju.

| Oblast | Glavni fajlovi i direktorijumi | Saznanje |
| --- | --- | --- |
| Ulaz i zajednički UI | `../index.html`, `../script.js` | HTML, navigacija i zajedničke UI funkcije |
| Učitavanje modula | `../lazyLoader.js` | Skripte modula učitavaju se po potrebi i određenim redosledom |
| Ideje | `../brainstorming.js` | Kartice ideja, unos, detalji i prelazak u istraživanje |
| Istraživanje | `../research.js`, `../js/research/` | Tabla, kartice, selekcija, geometrija, grupe, organizacija i čuvanje |
| Prilozi | `../research-attachments.js` | Podrška za istraživačke priloge |
| Finansije i kalendar | `../financeDashboard.js`, `../finansije.js`, `../kalendar.js` | Postojeći moduli; tokovi nisu provereni u ovoj sesiji |
| Ishrana | `../js/nutrition/` | Modeli, validacija, servisi, repozitorijumi, forme i tabovi |
| Jezik | `../js/i18n/`, `../I18N_GUIDE.md` | Srpski i engleski resursi; aktuelni provider je `window.MentorI18n` |
| Podaci | `../js/data/`, `../storageService.js` | Repozitorijumi, adapteri, migracija, backup, recovery i kompatibilnost |
| Testovi | `../tests/`, `../package.json` | Postoje grupe testova za storage, nutrition i research |

`package.json` navodi Dexie 4.4.4 i fflate 0.8.3 kao zavisnosti, kao i fake-indexeddb za testove. `index.html` učitava lokalne vendor kopije Dexie i fflate.

## Čuvanje podataka — ispravka ranije pretpostavke

IndexedDB podrška je već implementirana; nije samo budući plan. `js/data/index.js` pravi početne repozitorijume, pokreće migraciju i bira IndexedDB repozitorijume prema rezultatu izbora storage-a. Zato se aktivni adapter proverava u runtime-u, a ne zaključuje iz starijih planova.

Provereno 10.10.2026. u Playwright sesiji:

- `window.MentorData.coreReady` je bio `true`.
- `window.MentorData.storageSelectionError` je bio `null`.
- `window.MentorData.adapterSelection` je navodio `indexeddb` za settings, goals, calendar, ideas, comparisons, cache, finance, assets, nutritionFoodData, nutritionInventoryData i media.
- `js/release.js` navodi bazu `kreatorm_app_db` i structural version 1.

Prethodna tvrdnja da je kreirana ideja u localStorage-u bila je neproverena; runtime nalaz je ispravlja. Opstanak podataka posle ponovnog otvaranja proverava čuvanje u toj sesiji, ali sam ne dokazuje koji adapter je korišćen.

Podaci pripadaju origin-u i profilu pregledača. Playwright profil može biti odvojen od korisnikovog običnog pregledača. `localhost` i `127.0.0.1`, drugi port ili drugi protokol mogu imati odvojene podatke. Proveriti profil i origin pre zaključka da su podaci izgubljeni. Nikada ne brisati storage ili bazu radi rutinske provere.

## Pravila koja treba nositi u svaki zadatak

Merodavan izvor je `../AGENTS.md`; sledeće je podsetnik:

- Sačuvati postojeće funkcije, korisničke podatke i vizuelnu temu.
- Ne dodavati mock podatke bez zahteva korisnika. Primer trčanja u ovoj sesiji je izričito tražen unos kroz aplikaciju.
- UI tekst držati u i18n sistemu. Korisnički sadržaj beleške je odvojen od ugrađenog UI teksta.
- Klik i fokus na `input`, `textarea`, `select` ili `[contenteditable]` ne smeju aktivirati selekciju roditelja, navigaciju, drag ili rerender. Koristiti `window.MentorUIEvents.isTextEditingEvent(event)` / `isTextEditingTarget(target)`.
- Delegirane događaje vezivati za stvarnu kontrolu, npr. `button.language-option[data-language]`, ne širok selector koji može pogoditi `body`.
- Za novo ponašanje koristiti stabilne ID-jeve i semantičke `data-panel` / `data-action` atribute; ne vezivati funkcije za položaj, izgled ili `nth-of-type`.
- Theme sistem je odložen dok MVP funkcije nisu stabilne. Postojeće zavisnosti od izgleda beležiti u `THEME_READINESS_BACKLOG.md`.
- Veće i rizične izmene prvo analizirati i planirati; male izmene zadržati ograničenim.
- Birati jednog odgovarajućeg projektnog agenta prema routing pravilima. Ne dozvoliti da više agenata istovremeno menja source.
- Posle implementacije navesti promenjene fajlove i odgovarajuću proveru.

## Proveren tok: ideja → istraživanje

Lokalna adresa u ovoj sesiji: `http://127.0.0.1:5500/index.html`. Server je odgovorio HTTP 200; naslov stranice je Mentor Planer. Dostupni su Playwright alati.

1. Otvoriti Brainstorming → All ideas → New idea.
2. Uneti naslov, kratak opis, tip, sliku/inspiraciju, linkove i tagove, pa Save. Forma ima i energy i priority kontrole.
3. Kliknuti karticu ideje i izabrati Research idea.
4. Na Research tabli dodati direction: naziv, kategoriju i oblast koju pokriva.
5. Kroz Add sticker dodavati sadržaj. Viđene opcije: Note, A/V note, File / Source, Reference / Link, Image, Video i Finance. U ovoj sesiji provereni su Note, Reference / Link i Image.
6. Reference / Link omogućava izvor i povezanu belešku. Unos reference sa beleškom je napravio roditeljsku karticu i jednu povezanu karticu.
7. Ponovo otvoriti stranicu, zatim Brainstorming → Research, i potvrditi sačuvani sadržaj.

Kreirana je ideja „Početi sa trčanjem — od šetnje do 30 minuta“, tip Lifestyle, sa direction-om „Trčanje za početnika“ (Health / Training). Nakon ponovnog otvaranja ostalo je pet istraživačkih kartica:

- „Kako početi: prvi trening i ritam nedelje“ — Note.
- „Priprema: oprema, ruta i praćenje navike“ — Note.
- „NHS Couch to 5K — izvor za početnički plan“ — Reference / Link.
- „Zašto koristiti ovaj izvor“ — povezana Note.
- „Inspiracija: lagano trčanje u parku“ — Image.

Ovim nije potvrđen završetak Research procesa, izvršavanje treninga ili tok Execution. Ideja je ostavljena u statusu In research. Izvorni kod nije menjan prilikom tog unosa.

Izvori korišćeni za traženi primer:

- [NHS Couch to 5K](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/).
- [Pexels fotografija — Ketut Subiyanto](https://www.pexels.com/photo/young-ethnic-sportswoman-running-in-park-4428986/) — slika ideje.
- [Pexels fotografija — MART PRODUCTION](https://www.pexels.com/photo/couple-running-together-at-park-7879946/) — Image kartica istraživanja.

## Otvoreni nalazi i ograničenja

| Nalaz | Dokaz / kontekst | Status i sledeća provera |
| --- | --- | --- |
| `ReferenceError: idea is not defined` | Playwright konzola tokom interakcije sa karticom; `brainstorming.js:1353`, pointermove handler poziva `setIdeaRatiosFromPosition(idea, nextPosition, card)` | Otvoreno. Pre popravke proveriti scope promenljive i ponoviti tačnu interakciju. Prelazak u Research i čuvanje su ipak uspeli. |
| Spoljne slike nisu prikazane u proveravanoj sesiji | `net::ERR_BLOCKED_BY_CLIENT.Inspector` za Pexels URL-ove; slike imaju `naturalWidth === 0` | Linkovi sačuvani. Proveriti u korisnikovom pregledaču; ne proglašavati link nevažećim samo na osnovu blokade. |
| Google Fonts zahtev je blokiran | Isti tip greške u Playwright konzoli | Ograničenje sesije; nema potvrde da je uzrok u aplikaciji. |
| Lokalni folder nema Git metapodatke | `git status` prijavljuje da folder nije Git repozitorijum | Pronađen odgovarajući javni repozitorijum [ivanius86/kreatorM](https://github.com/ivanius86/kreatorM), grana `main`. Objavljivanje fajla preko API-ja ne uspostavlja automatski lokalnu Git vezu. |

## Praktična provera u budućim sesijama

Za istraživanje UI-ja koristiti Playwright snapshot i stvarne kontrole. Posle rerendera uzeti novi snapshot: stari reference ID-jevi mogu prestati da važe. Menu opcije poput Note mogu postojati na više mesta; selector ograničiti na odgovarajući toolbar ili karticu. DOM može sadržati skrivene druge ekrane, pa read-only DOM provere ograničiti na aktivni modul.

Za ovu Markdown izmenu nisu potrebni funkcionalni testovi aplikacije. Za buduće izmene koristiti relevantnu postojeću grupu iz `package.json`: `npm run test:storage`, `npm run test:nutrition` ili `npm run test:research`. `npm test` pokreće sve tri. Ove komande nisu pokrenute u ovoj dokumentacionoj sesiji; ne tvrditi da prolaze bez izvršavanja.

Korisni postojeći dokumenti:

- [Pravila za agente](../AGENTS.md).
- [Engineering foundation](ENGINEERING_FOUNDATION.md).
- [Mentor foundation blueprint](MENTOR_FOUNDATION_BLUEPRINT_V1.md).
- [i18n vodič](../I18N_GUIDE.md).
- [IndexedDB migration plan](../INDEXEDDB_MIGRATION_PLAN.md).
- [IndexedDB stabilization runbook](../INDEXEDDB_STABILIZATION_RUNBOOK.md).
- [Poznati test nalazi](../tests/PRE_EXISTING_TEST_ISSUES.md) — čitati trenutne statuse, ne pretpostavljati da su svi problemi još otvoreni.

## Dnevnik učenja

### 10.10.2026.

- Potvrđen pristup lokalnom projektu, serveru i Playwright-u.
- Prođen unos jedne tražene ideje i kreiranje direction-a, beleški, reference i image kartice.
- Potvrđen opstanak sadržaja nakon ponovnog otvaranja stranice.
- Zabeležena otvorena JavaScript greška i blokade spoljnih resursa.
- Pregledani ulaz, lazy loader, i18n dokumentacija i data bootstrap; proverena stvarna IndexedDB selekcija u runtime-u.
- Napravljena ova beležnica kao trajni dokument u projektu. Status GitHub objave potvrditi zasebno po završetku upisa.

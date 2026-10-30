# Tok B — Conversation Context revizija, bez implementacije

Datum: 29. oktobar 2026.

Ovo je pregled stvarnih fajlova i postojećih tehničkih testova. Postojanje koda nije potvrda stvarnog modela ili celog UI scenarija. Tok A menja samo prezentaciju/lifecycle; ovaj dokument ne uvodi Task Context Manager, Recovery, summary ili Application Context Bridge i ne menja njihov storage.

## Postojeće i funkcionalno

### Istorija, transport i retry

`js/mentor/mentor-conversations.repository.js` — `create`, `list`, `get`, `messages` čuvaju razgovore i uređene poruke u posebnoj Dexie bazi `kreatorm_mentor_chat_db`. `reserve`, `complete`, `release` transakciono vode poruku i ishod; `withConversationLock` koristi Web Locks kada su dostupni. `setRequestSnapshot` trajno beleži jedan validirani request snapshot. `setActionState` i `setRecipeChoice` čuvaju status predloga i izabrane sastojke. `export` daje poseban chat JSON; glavni app backup ne uključuje ovu bazu.

`js/mentor/mentor-chat.js` — `send`, `switchConversation`, `cancelActive` koriste taj repository. Retry zadržava ID poruke i snapshot. To je oporavak zahteva, ne opšti nastavak poslovnog zadatka.

`tests/mentor/conversations.test.js` pokriva close/reopen, redosled, retry bez dupliranja, lease, odbacivanje kasnih odgovora posle brisanja i rollback neuspele transakcije.

### Usko strukturirano stanje zadatka

`MentorConversationsRepository.setActiveTask` čuva jedan `activeTask` po razgovoru, uz očekivanu verziju i odbijanje zastarelog upisa.

`js/mentor/mentor-nutrition-inventory-resolver.js:prepare` prikuplja vrstu sposobnosti, namirnicu, količinu, jedinicu, lokaciju, rok, konkretan paket za dopunu, ponuđene izbore, očekivanu količinu/`updatedAt`, preview i status. `preflight` proverava aktuelnost pre upisa.

`js/mentor/mentor-write-pipeline.js` — `prepare`, `confirm`, `dismiss` vode potvrdu i izvršavanje. `executing`/`uncertain` blokiraju automatsko ponavljanje nepoznatog ishoda. `tests/mentor/write-actions.test.js` pokriva dopunu parametara, izbor paketa, potvrdu, zastareli preview, konkurentne dopune i izgubljeno beleženje uspeha.

### Određeni nastavci i parametri plana

`js/mentor/mentor-intelligence-router.js:continueRead` nastavlja nejasan upit o raspoloživosti izborom imena ili broja. `MentorNutritionRead.resolveFoodChoice` bira samo iz prethodno ponuđenih kandidata. `mentor-chat.js:send` razlikuje novu prepoznatu nameru od određenih kratkih nastavaka inventory zadatka. Testovi `intelligence-router.test.js` i `conversations.test.js` pokrivaju izbor i trajnost kandidata.

`server/meal-planning.js` ima `analyze` (dani, datum, obroci, porcije, postojeći/novi recepti), `answersDraft` (odgovor na otvoreno pitanje), `slots` (datumi i vrste obroka), `recover` (rekonstrukcija jednog plana iz konteksta) i `extend` (ograničene dopune nezauzetih termina).

`server/action-policy.js:deriveCandidate` povezuje plan sa eksplicitnom namerom; `constrainIntent` ograničava akcije i broj predloga. `tests/mentor/action-policy.test.js` i `mentor-core.test.js` proveravaju i tri dana sa tri dnevna obroka, sačuvane recepte i određene nastavke plana.

### Relevantan, ograničen kontekst

`MentorConversationsRepository.context` bira završene user/assistant parove iz izabranog razgovora i trenutnu poruku. Isključuje neuspele i `local-only` razmene.

`js/mentor/mentor-action-adapters.js` sadrži ponovo upotrebljive delove:

- `cloudRows`: lokalne Nutrition razmene isključene i iz sekundarnih cloud konteksta.
- `history`: ledger autorizovanih predloga/statusa.
- `mealPlanContext`: dodatni ograničeni kontekst korisničkih poruka za planiranje.
- `lastSavedPlan`: poslednji plan sa odobrenim obrocima i zauzetim terminima.
- `prepareContext`: ograničen spisak sačuvanih recepata.
- `prepareFoodContext`: ograničen korisnički food katalog posle dozvole.

`js/mentor/mentor-protocol.js:conversationConstraints` izvlači određena dijetetska/trening ograničenja iz korisničkih poruka i kada originalna poruka izađe iz redovne istorije. Ovo je izvlačenje strukturiranih pravila, bez automatskog sažimanja.

## Postojeće, ali nepotpuno

### Šest traženih funkcionalnosti

| Funkcija | Postojeća podrška | Granica |
| --- | --- | --- |
| Pamćenje aktivnog zahteva | `state.run`, snapshot, lease, inventory `activeTask`, meal-plan draft | Nema opšteg zadatka kroz domene. |
| Razumevanje nastavka | Inventory parametri/izbori, `continueRead`, plan `answersDraft/recover/extend` | Uska heuristička pravila. |
| Pamćenje parametara | Inventory task, meal-plan draft, snapshot, ograničenja | Nema jedinstvenog Task modela. |
| Promena teme/povratak | Nova prepoznata namera i ograničena rekonstrukcija plana | Nema eksplicitne pauze, liste ili pouzdanog izbora prethodnog zadatka. |
| Reference | Izbor konkretne ponuđene namirnice/paketa/sastojka, `$recipe:n`, određene dopune plana | Nema opšteg „drugi recept“ / „prethodni obrok“ razrešavanja. |
| Izbor konteksta | Ograničena istorija, lokalni filteri, izdvojeni kontekst/ograničenja | Nema opšteg summary ili semantičkog selektora. |

### Više zadataka i povratak teme

Jedan `activeTask` nije Task Context Manager. Novi inventory zadatak može zameniti prethodni aktivni; poruke ostaju, ali istorija nije indeks više pauziranih zadataka. Nedostaju kolekcija zadataka, pauzirani status, izbor aktivnog zadatka i domenski nezavisna otvorena pitanja.

`mealPlanContext` koristi tekstualne okidače i granicu poslednjeg sačuvanog plana. `deriveCandidate` preseca određeni kontekst posle kreiranja cilja/ideje. `recover` pokušava jedan plan i naknadne odgovore. Više prekinutih planova nema garantovano jednoznačan nastavak. `send` uzima draft iz prethodnog relevantnog assistant odgovora; druga cloud tema može pomeriti taj draft van neposrednog nastavka.

Broj izabrane namirnice je referenca na konkretne kandidate; `$recipe:n` povezuje novi recept sa obrokom unutar predloga; `lastSavedPlan` opisuje odobrene termine. Nijedan od njih ne dozvoljava proizvoljno menjanje prethodnog zapisa. Postojeći AI allowlist nema zamenu sačuvane večere ili izmenu recepta.

Nema zasebnog opšteg Dialogue Manager-a: postojeća dijaloška odgovornost raspoređena je između `mentor-chat.js:send`, Intelligence Router-a, inventory resolver-a, action policy-ja i meal-planning modula. Nutrition servisi ostaju izvor domenskih pravila, ne deo modelovog slobodnog izvršavanja.

### Veličina payload-a i privatnost

Izvori: `mentor-protocol.js:LIMITS/limitContext/validateRequest`, `mentor-action-adapters.js`, `server.js`.

| Deo | Granica |
| --- | --- |
| Korisnička poruka | 4.000 znakova |
| Assistant reply | 12.000 znakova |
| Redovna istorija | Konfiguracija 24 poruke; praktično do 23 zbog celih parova i završne user poruke |
| Tekst redovne istorije | 24.000 znakova |
| Dodatni meal-plan kontekst | Do 16 user poruka / 16.000 znakova |
| Action ledger | Do 100 stavki |
| Sačuvani recepti | Do 20: ID, naziv, porcije, vrsta obroka |
| Odobreni korisnički foods | Do 20: ID, nazivi, kategorija i dijetetski/alergenski profil |
| Prethodni plan | Do 28 zauzetih termina |
| HTTP telo | 98.304 bajta |

24.000 znakova nije granica celog payload-a: dodatni konteksti i JSON ga uvećavaju, uz zasebnu serversku kontrolu tela.

`prepareContext` može ponovo koristiti raniji recipe snapshot. Buduće proširenje mora razjasniti relevantnost, svežinu i trajanje dozvole. Retry namerno koristi istorijski snapshot; domenske provere pre upisa moraju ostati aktuelne.

### Ponovno pokretanje i scenario podrška

Razgovori i inventory task traju u bazi. Po inicijalizaciji bira se poslednji ažurirani razgovor; nema posebne trajne preference poslednjeg izabranog razgovora. `state.drafts` čuva neposalati tekst samo u memoriji taba. Lease/retry nisu automatsko nastavljanje generisanja.

**Scenario A:** Ograničeni tok tri dana / tri obroka / sačuvani recepti ima srodne automatizovane provere za devet termina. Stvarni model/UI ostaje za ručnu proveru. „Promeni večeru drugog dana“ nema podržanu akciju zamene postojećeg obroka.

**Scenario B:** Prepoznavanje promene teme delimično postoji. Finance čitanje potrošnje nije registrovana sposobnost, a eksplicitna pauza/nastavak plana ne postoji. Rekonstrukcija iz istorije nije dokaz pouzdanog scenarija.

**Scenario C:** Tri zadatka, završen treći i podsetnik za dva po povratku nisu podržan sistem. Postoje istorija i jedan inventory task, bez kolekcije/brojanja/recovery podsetnika. Ponovno pokretanje ne odobrava niti izvršava predlog automatski.

## Nedostaje

1. Opšti verzionisani Task model za više domena sa statusom, parametrima, otvorenim pitanjima, napretkom i referencama.
2. Pauziranje, izbor, nastavak i jednoznačno razrešavanje više zadataka.
3. Recovery pregled, jedan podsetnik po sesiji, odlaganje/isključivanje i Dashboard indikator.
4. Opšte stabilne reference na prikazane rezultate.
5. Application Context Bridge za modul i izabrani zapis.
6. Finance read capability za konkretan zahtev o transakcijama/potrošnji.
7. Summary i semantički izbor relevantnog konteksta.
8. Automatski testovi celog budućeg višezadatkovnog toka.

`document.body.dataset.activeView` je navigaciono stanje, bez autorizovanog mosta ka Mentoru ili konteksta izabranog poslovnog zapisa. Otvaranje modula ne predstavlja dozvolu za poslovnu akciju ili cloud deljenje podataka.

## Preporučene izmene — bez implementacije

1. Prvo definisati mali Task ugovor: stabilan ID, razgovor, domen, vrsta, status, parametri, otvoreno pitanje, reference. Ne kopirati recepte, zalihe ili transakcije.
2. Ponovo koristiti inventory parametre i meal-plan draft; postepeno dodavati domene uz backward compatibility i zaseban migracioni plan.
3. Uvesti eksplicitni izbor aktivnog zadatka; kod više kandidata pitati korisnika.
4. Recovery graditi posle pouzdanih statusa. Pending potvrda se čuva, ali nastavak zahteva svež preflight i odgovarajuću potvrdu; ne ponavljati `uncertain` operacije automatski.
5. Context Bridge početi lokalnim read-only `{module, entityType, entityId}` ugovorom. Sam ulazak u ekran ne pokreće akciju ili slanje modelu.
6. Reference vezati za stabilne ID-jeve rezultata. Zamena obroka traži novu potvrđivanu akciju kroz postojeći `MentorPlanningService`.
7. Razlikovati istorijski retry snapshot od svežeg konteksta novog zahteva; precizirati dozvole i svežinu recepata.
8. Zasebno uskladiti `mentor/capabilities/nutrition.md`, čiji delovi prethode sadašnjim read/write adapterima.

Rizici su pre svega pogrešan nastavak zadatka, zastareli parametri, nejasne reference, nenamerno cloud deljenje i ponovljen upis. Zavisnosti su postojeći protokol, domenski validatori, conversation locks/statusi i backup ugovor. Ne treba menjati provider sloj ili duplirati domenske servise da bi se ovo rešilo.

### Predloženi budući Black-Box testovi — nisu isporučene funkcije toka A

1. Plan tri dana + odgovor „tri obroka, sačuvani recepti“ → devet tačnih termina bez novih recepata.
2. Zamena večere drugog dana → tačan preview i promena tek nakon potvrde.
3. Pauza plana Finance upitom, zatim „nastavi plan“ → nastavak otvorenog pitanja.
4. Dva nezavršena plana + zahtev za nastavak → izbor plana umesto nagađanja.
5. Tri zadatka, jedan završen, restart → jedan podsetnik sa dva nezavršena.
6. Odlaganje podsetnika → bez ponavljanja u istoj sesiji prema ugovorenom pravilu.
7. Restart dok predlog čeka potvrdu → bez automatskog izvršavanja.
8. Izmena zaliha posle preview-a → novi preflight i obnovljen pregled.
9. „Drugi recept“ posle liste/promene teme → tačan stabilni rezultat ili pitanje.
10. Otvaranje Finance zapisa → bez poslovne akcije ili automatskog cloud slanja.
11. Lokalni inventory upit pa cloud poruka → privatni lokalni rezultat ostaje van cloud konteksta.
12. Razgovor duži od prozora istorije → relevantni task parametri ostaju tačni uz ograničen payload.

### Granice dokaza

Postojeće unit/integration provere podržavaju uske funkcije navedene iznad. Ne potvrđuju nedostajuće funkcije ili stvarni model. Tok B nije implementiran niti su kompletni scenariji B/C predstavljeni kao uspešno testirani. Konačne rezultate suite-a i proveru toka A videti u `MENTOR_FLOATING_CHAT_V1.md`.

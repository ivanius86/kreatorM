# Intelligence Router v2 — read-only revizija (2026-10-30)

Status: analiza završena; Router v2 nije implementiran. Nije poslat Gemini zahtev.

## Postojeći tok

`mentor-chat.js:send` prvo proverava izbor i nastavak `activeTask` zadatka, pa zove `mentor-intelligence-router.js:decide`. Router koristi `MentorCapabilityRegistry.matches`: poznata lokalna čitanja idu u adapter, upisi u `MentorWritePipeline`, a ostalo u `/api/mentor/chat`. Nejasan Nutrition upit može pozvati `/api/mentor/route`, koji server klasifikuje preko Gemini-ja bez istorije. Cloud predlozi prolaze zaseban `action-policy.js` i `mentor-action-adapters.js` pre potvrde i upisa.

Capability Registry već ima ID, modul, read/write tip, schema, dozvole, `match`, adapter i za upise `prepare`/`preflight`/`inputFor`. Registruje Nutrition katalog/profil, zalihe, recepte i plan, plus kreiranje namirnice i dodavanje/dopunu zaliha. Ne postoji zaseban Command Registry. Goals, Ideas, Recipe i Meal Plan stvaranje koriste cloud proposal tok; Finance čitanje potrošnje, Calendar zadaci i opšti Research adapter nisu registrovani u lokalnom Routeru.

Razgovori čuvaju istoriju i jedan verzionisani `activeTask` po razgovoru. Postoje `readTask` izbori i uski nastavci inventory/food/planning toka. Ne postoji opšti menadžer više pauziranih zadataka. `executing` i `uncertain` se ne ponavljaju automatski.

## Dijagnostička matrica

| Komanda | Trenutni put | Problem |
| --- | --- | --- |
| Dodaj novu namirnicu. | lokalni `nutrition.food.create` | Bez naziva vraća opšti USDA `notFound`, umesto pitanja za naziv. |
| Pršuta. | nastavak aktivnog food zadatka ili chat | Radi kao odgovor samo dok je aktivan odgovarajući zadatak. |
| Nemoj da dodaš pršutu. | chat ili nastavak aktivnog food zadatka | Negacija ne otkazuje pouzdano čekajući zadatak; može izazvati pretragu. |
| Prikaži mi sve recepte. | lokalni `nutrition.recipe.search` | Ispravno lokalno čitanje. |
| Daj mi listu recepata. | `/api/mentor/chat` | Nepotreban Gemini put za isti lokalni zahtev. |
| Napravi mi plan iz sačuvanih recepata. | `/api/mentor/chat` | `meal-planning.detectPlan` i `prepareContext` ne prepoznaju pouzdano ovu formulaciju, naročito „recepata”; sačuvani recepti se možda ne šalju. |
| Koliko sam potrošio ovog meseca? | `/api/mentor/chat` | Nema Finance read capability ni pouzdanih lokalnih podataka za odgovor. |
| Dodaj zadatak za sutra. | cloud route, zatim potencijalno chat | Nema Calendar/task capability. |
| Odustani. | lokalno samo uz određeni aktivni zadatak; inače chat | Nema jedinstvenog otkazivanja plan-drafta i opštih zadataka. |
| Nastavi gde smo stali. | chat ili uski nastavak aktivnog zadatka | Nema opšteg resume; aktivni food tok može rečenicu tretirati kao naziv namirnice. |

Matrica je dobijena čitanjem koda i lokalnim Router pozivom sa simuliranim cloud klasifikatorom. Ne potvrđuje stvarni Gemini odgovor ili UI ishod.

## Predlog minimalnih faza

1. U postojećim `mentor-capability-registry.js` i `mentor-intelligence-router.js` dodati SR/EN sinonime, varijante padeža, razliku pitanja i komandi, i prioritet negacije. Ne uvoditi drugi Registry. Semantički score nikad ne autorizuje upis.
2. U `mentor-chat.js` objediniti odluku o novoj nameri i nastavku jednog aktivnog zadatka; vezati nastavak za `taskId`, verziju i otvoreno pitanje. Postojeći permission, preflight, potvrda i Domain Service ostaju izvršni sloj. Ne ponavljati `executing`/`uncertain`.
3. U `mentor-nutrition-read.js` izjednačiti „prikaži” i „daj listu” za sačuvane recepte. U prepoznavanju namere plana (`server/meal-planning.js`) i pripremi konteksta (`mentor-action-adapters.js`) obuhvatiti „plan iz sačuvanih recepata” bez promene Nutrition poslovne logike.
4. Tek posle merenja lokalnih promašaja razmotriti dodatnu SR/EN NLP obradu; Transformers.js ili lokalni semantički model ostaviti za zasebnu evaluaciju preciznosti, latencije, veličine modela i offline rada.

Automatizovani testovi treba da pokriju svih deset komandi, SR/EN parafraze, negaciju, broj Gemini poziva, kontekst/izbor/verziju, bezbedno otkazivanje i zabranu upisa bez potvrde. Korisnički UI testovi treba da prođu iste komande u novom i postojećem razgovoru, naročito povezane parove 1→2 i 1→3.

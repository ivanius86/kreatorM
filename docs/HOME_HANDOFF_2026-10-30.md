# Nastavak rada kod kuće — 2026-10-30

## Pokretanje

1. Klonirati repozitorijum `https://github.com/ivanius86/kreatorM.git`.
2. Instalirati Node.js 22 ili noviji, pa pokrenuti `npm ci`.
3. Kopirati `.env.example` u `.env` i uneti sopstvene server-side ključeve. `.env` nije u Git-u. USDA radi i sa ograničenim `DEMO_KEY`, ali za stvarni rad koristi privatni USDA ključ. Ne unositi ključeve u frontend.
4. Pokrenuti `npm start` i otvoriti `http://127.0.0.1:3000`.
5. Pokrenuti `npm test` za postojeće automatizovane provere.

## Stanje projekta

- Mentor ima lokalne Nutrition read/write capability-je, zaseban cloud Action & Safety tok za ciljeve, ideje, recepte i planove, razgovore u IndexedDB i postojeći tok potvrde.
- Nutrition dodavanje namirnica je USDA-first: lokalni SR/EN rečnik, USDA Food Search i Food Details, izbor FDC zapisa, pregled 45 nutritivnih polja i potpisana potvrda. Gemini je opcion samo za nerazjašnjen naziv bez USDA kandidata. Nepoznate vrednosti ostaju `null`.
- Poslednja automatizovana provera Nutrition/Mentor/Storage bila je 268/268. Research test grupa trenutno ima 139/148 prolaznih testova: pet pada u izboru/prevlačenju stikera i četiri u podešavanjima accordion sekcija (`sections.renderIcon is not a function`). To je otvoren problem za zasebnu popravku. Za sada nema izmena Intelligence Router v2 koda.
- Read-only Router v2 revizija je u `docs/INTELLIGENCE_ROUTER_V2_AUDIT.md`. Prvi preporučeni korak je proširenje postojećeg Capability Registry/Router prepoznavanja: sinonimi SR/EN, negacija ispred sličnosti, pitanja naspram upisa, siguran nastavak jednog aktivnog zadatka. Ne uvoditi drugi Registry niti lokalni model bez merenja promašaja.
- Konkretan problem za prvu iteraciju: „Prikaži mi sve recepte” koristi lokalnu bazu, a „Daj mi listu recepata” ide u AI chat. „Napravi mi plan iz sačuvanih recepata” ne prepoznaje se pouzdano kao plan i ne dobija pouzdano sačuvane recepte. „Nastavi gde smo stali” nema opšti mehanizam oporavka.
- Detalji arhitekture i ranijih promena su u `docs/MENTOR_CHAT.md`, `docs/MENTOR_CONVERSATION_CONTEXT_AUDIT.md`, `docs/MENTOR_NUTRITION_MULTI_ITEM_FIX.md` i ostalim dokumentima u `docs/`.

## Podaci koji nisu u Git-u

- `.env`, API ključevi, `node_modules`, lokalni alati, log i privremeni smoke fajl nisu uploadovani.
- Browser `IndexedDB` i `localStorage` nisu deo izvornog koda. Za iste lične podatke kod kuće treba zasebno izvesti backup iz aplikacije i uvesti ga na kućnom računaru. Mentor razgovori imaju zaseban export; glavni backup ih ne obuhvata. Sačuvati oba izvoza privatno.
- Ne ponavljati automatski zadatke sa statusom `executing` ili `uncertain`; prvo proveriti stvarno stanje podataka. Pending predlog zahteva novu proveru i vidljivu potvrdu.

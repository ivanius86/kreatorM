# Višednevni plan ishrane iz Mentora

Primer zahteva: „Isplaniraj mi vegansku ishranu za 7 dana, uključi potrebne recepte i dodaj obroke u Ishranu.”

Ako broj obroka nije naveden, Mentor prvo pita. Tri obroka znače doručak, ručak i večeru; četiri uključuju užinu. Za jedan ili dva obroka pita koje vrste obroka korisnik želi. Izabrani broj i započeti plan ostaju sačuvani u razgovoru, uključujući posle ponovnog učitavanja stranice. Nov zahtev ili otkazivanje prekida razjašnjavanje prethodnog plana.

Plan koristi navedene datume ili današnji lokalni datum uhvaćen u sačuvanom zahtevu. Kada početak ili porcije nisu navedeni, pregled jasno prikazuje datum i jednu porciju po obroku. Neispravan ili neprepoznat izričito naveden datum zahteva razjašnjenje. Broj obroka nema podrazumevanu vrednost, po izboru korisnika.

Jedan zahtev podržava do 7 dana, 4 vrste obroka dnevno i 7 novih recepata: najviše 28 planiranih obroka i 35 ukupnih stavki. Recept može biti korišćen više dana; svi obroci imaju vidljivu vezu sa svojim receptom. Uobičajeni zahtevi i dalje imaju limit od pet predloga. Višednevni plan ne odobrava stvaranje ciljeva ili ideja.

Model dobija tačan skup termina datum × obrok. Server prihvata samo potpun raspored sa svakim dogovorenim terminom tačno jednom. Nedostajući, neispravni ili duplirani termini blokiraju prikaz nepotpune nedelje za odobravanje. Nepotrebni recepti se uklanjaju, a reference ostaju vezane za pravi recept posle filtriranja. Novi recepti imaju javni izvor, originalnu fotografiju i označene adaptacije. Nutritivne vrednosti i veganska ograničenja proverava postojeći lokalni modul.

Pregled prikazuje datume, obroke po danu, porcije, broj novih recepata, recepte i raspored grupisan po datumima. „Potvrdi i sačuvaj ceo plan” čuva prvo recepte, zatim obroke. Pojedinačno odobravanje i odbacivanje ostaju dostupni. Obrok koji zavisi od novog recepta može se pojedinačno potvrditi posle čuvanja tog recepta.

Svaka stavka ima stabilan identitet i sačuvan status. Ako stavka ne uspe, prethodno sačuvane ostaju, prikazuje se napredak, a ponovna potvrda ne pravi duplikate. Ovo nije atomska transakcija preko svih baza. Postojeći obroci se ne zamenjuju: zauzet datum i vrsta obroka blokiraju dupli upis, uključujući proveru u aktuelnoj transakciji. Plan rezerviše raspoložive sastojke i beleži nedostatke; ne označava obroke kao pojedene i ne troši zalihe.

Izmena je pregledana čitanjem koda. Testovi, browser scenariji, provere sintakse i stvarni API pozivi nisu pokretani, po zahtevu korisnika. Korisnička proba ostaje korisniku.

## Ispravka prepoznavanja stvarnog razgovora

Zahtev „sedmodnevni plan, počev od danas, ishrane ... 3 puta dnevno, sa malim snakom” ranije nije aktivirao planer zbog previše uskih obrazaca. Sada prepoznaje zareze između plana i ishrane, reč „sedmodnevni”, tri glavna obroka uz užinu i frazu „nemoj više postavljati pitanja” koja ne otkazuje traženo pravljenje plana.

Kada korisnik nastavi stari razgovor u kome nisu stvorene kartice, planer može oporaviti dogovorene detalje iz do 16 poslednjih korisničkih poruka (najviše 16.000 znakova). To su poruke samo iz izabranog razgovora; tuđe poruke i drugi moduli nisu izvor tih detalja. Poruke se obrađuju hronološki, pa najnovije „od danas” menja ranije „od sutra”. Potvrda već prikazanog predloga ne pokreće ponovno generisanje; stvarni upis se odobrava njegovim dugmetom.

Ograničenje „meso samo piletina i riba” čuva se kao ograničena vrednost `meatPolicy`, filtrira javni katalog i proverava se ponovo pri lokalnom upisu. Biljna hrana, jaja i mlečni proizvodi nisu time isključeni. Druge vrste mesa i neprepoznate mešavine ne prolaze automatski.

Tekst uz stvarne predloge sada generiše aplikacija iz stvarnog broja kartica i jasno kaže da još nisu sačuvane. Neuspešno dobijanje predloga ishrane daje poruku da nema novih upisa. Tekst modela ne predstavlja potvrdu čuvanja. Nutritivne vrednosti se računaju iz postojeće baze; izmišljene nove namirnice i nutritivne brojke ne dodaju se. Plan ne garantuje održavanje kilaže niti ispunjenje svih potreba bez stvarnih ličnih podataka i potpunih nutritivnih podataka.

Fajlovi iz ove ispravke: `server/meal-planning.js`, `server/action-policy.js`, `server/gemini.js`, `server/public-food-catalog.js`, `server/recipe-sources.js`, `js/mentor/mentor-protocol.js`, `js/mentor/mentor-action-adapters.js`, `js/mentor/mentor-action-cards.js`, `js/mentor/mentor-chat.js`, `js/nutrition/services/planning.service.js`, `js/i18n/mentor-actions.js`, `index.html`, `lazyLoader.js` i ovaj dokument. Izvršene su samo statičke provere koda; korisnički testovi ostaju korisniku.

## Izmenjeni fajlovi

- `js/mentor/mentor-protocol.js`: uslovni limiti, metadata plana, nacrt razjašnjenja i dnevnik akcija.
- `server/meal-planning.js` (nov): dani, datumi, obroci, porcije, pitanja i tačan skup termina.
- `server/action-policy.js`: nastavak plana, ograničeno odobrenje, kompletan raspored i stabilne reference.
- `server/gemini.js`: lokalizovana pitanja, ograničeno generisanje i budžet višednevnog plana.
- `server/recipe-sources.js`: raznovrsniji ograničeni skup izvora.
- `js/i18n/mentor-actions.js`: srpske i engleske poruke, napredak, pitanja i konflikti.
- `js/mentor/mentor-conversations.repository.js`: čuvanje nacrta u razgovoru.
- `js/mentor/mentor-chat.js`: nacrt, lokalni datum, zajedničko čuvanje i napredak.
- `js/mentor/mentor-action-adapters.js`: pregled nesačuvanih recepata, zavisnosti i zauzeti termini.
- `js/mentor/mentor-action-cards.js`: datumi, imena recepata i potvrda celog plana.
- `js/nutrition/services/planning.service.js`: provera zauzetog termina tokom stvarnog upisa.
- `mentor-chat.css`: stilovi pregleda nedelje samo na Mentor stranici.
- `index.html`, `lazyLoader.js`: osvežene verzije resursa.
- `docs/MENTOR_CHAT.md`, `docs/MENTOR_WEEKLY_PLANS.md`: ponašanje, granice i spisak promena.

# Nutrition — faza 1: bezbednost podataka

Datum: 10. novembar 2026.

## Obuhvat

- Domenske izmene zaliha, lokacija, recepata, obroka i favorita koriste postojeći `mutateEnvelope`: stanje se čita unutar serijalizovanog upisa, a IndexedDB koristi postojeću transakciju. Podrazumevane lokacije, migracija starih zaliha i migracija favorita poštuju isti redosled upisa.
- Dodavanje i izmena paketa proveravaju namirnicu, lokaciju i rezervacije prema stanju u trenutku upisa. Dopuna i potrošnja računaju promenu na svežoj količini; dve potrošnje ne mogu potrošiti isti slobodan ostatak. Zadržana je preciznost od tri decimale.
- Mentorova dopuna proverava odobrenu količinu, namirnicu, lokaciju i `updatedAt` u samoj transakciji. Zastareo predlog se odbija pre upisa. Potvrda već trajno sačuvane dopune ostaje uspešna ako je drugi korisnički upis usledio posle nje.
- Greška upisa čuva prethodno trajno stanje, koje ostaje dostupno za čitanje i sledeći pokušaj bez ponovnog učitavanja stranice.
- Ručni i Mentor servisi koriste zajedničke provere pozitivnih konačnih brojeva, postojećih referenci, stvarnog kalendarskog datuma i podržanih tipova obroka. Mentor zadržava postojeće dodatne granice za generisane predloge.
- Poruka validacije u SR/EN sada pominje i datum i tip obroka. Verzije resursa su osvežene da browser preuzme izmene.

## Kompatibilnost i ograničenja

Nema promene storage šeme ili ključeva, brisanja podataka, novog početnog sadržaja, migracije baze, promene dizajna ili React refaktora. Postojeći istorijski i legacy zapisi nisu masovno ponovo validirani niti uklonjeni. Strože provere primenjuju se na nove upise kroz domenske servise; niskonivovski repozitorijumi ostaju kompatibilni sa starim zapisima i namenskim postupcima oporavka.

LocalStorage koordinacija više tabova koristi postojeći Web Locks API; u okruženju bez tog API-ja ostaje serijalizacija unutar jednog repozitorijuma, bez obećanja atomarnosti između tabova. IndexedDB putanja već zahteva Web Locks za koordinaciju baze.

Ručno postavljanje apsolutne količine je i dalje namerna izmena korisnika. Dopuna i potrošnja su zasebne operacije sa kumulativnim promenama. Ova faza ne uvodi opšti sistem verzionisanja svih formi.

Rok prema datumu budućeg obroka, objedinjavanje pravila rezervacija, nutritivni obračuni i oznake nepoznatih vrednosti pripadaju fazi 2. Stvarna evidencija pojedenog i istorijski nutritivni snapshot pripadaju kasnijim fazama. Naknadna sinhronizacija rezervacija posle izmene zaliha zadržava postojeći odvojeni servisni tok; njen puni obračun nije menjan u ovoj fazi.

## Automatske provere

Regresioni testovi su dodati za oba adaptera u izolovanom okruženju: zasebni istovremeni upisi, kumulativne dopune, zaštita od dvostruke potrošnje, interleaving ručnih i Mentor upisa, odbijanje neispravnog ulaza, provera svežih referenci, decimalne rezervacije, neuspešan upis i ponovni pokušaj, kao i zastarela Mentor potvrda i potvrda već trajno sačuvanog upisa.

Testovi su pokrenuti tek nakon završetka celog implementacionog paketa faze 1:

- Nutrition: **35/35**.
- Storage: **55/55**, uključujući **16 novih regresionih scenarija** za oba adaptera.
- Mentor: **194/194**.
- Ukupno u relevantnim skupovima: **284/284**; provera sintakse izmenjenih JavaScript fajlova i `git diff --check` takođe prolaze.

Šira Research provera ima **139/148** uspešnih testova. Istih devet neuspeha ponovljeno je sa izvornim fajlovima iz `HEAD`, sa potpuno jednakim imenima neuspešnih testova. To su prethodno postojeći problemi canvas/designer testova, van Nutrition faze 1; Research fajlovi nisu menjani.

Black-box/browser i korisničke ručne provere nisu izvršavane; ostavljene su korisniku prema dogovoru.

## Kratka lista za korisničku proveru — tek nakon završene faze 1

Koristi privremene stavke koje sam kreiraš; postojeće podatke ne briši. Provere radi u dva taba iste aplikacije/origina. Nakon promene u drugom tabu, za konačan rezultat osveži oba taba; automatsko osvežavanje prikaza među tabovima nije cilj ove faze.

1. **Dva nezavisna dodavanja:** u dva taba unapred otvori dodavanje zaliha i sačuvaj po jedan različit privremeni paket neposredno jedan za drugim. Nakon osvežavanja oba paketa moraju postojati sa svojim količinama.
2. **Kumulativna dopuna:** za privremeni paket od 100 g u oba taba unapred otvori akciju „Dopuni“. Dopuni 10 g u prvom i 20 g u drugom. Posle osvežavanja očekuje se 130 g.
3. **Zaštita količina:** na privremenom paketu od 100 g pokušaj dve potrošnje po 70 g iz unapred otvorenih tabova. Jedna mora biti odbijena, a ostatak 30 g. Ako testni plan rezerviše deo paketa, pokušaj smanjenje količine ispod rezervisanog dela: izmena mora biti odbijena.
4. **Validacija forme:** u novom receptu i obroku pokušaj nulu ili negativnu količinu/porcije; u obroku ostavi prazan datum. Neispravan unos ne sme se sačuvati. Ispravi polja i sačuvaj uspešno bez ponovnog otvaranja aplikacije. Neispravne proizvoljne datume i tipove koje UI ne dopušta pokrivaju automatske servisne provere.
5. **Važeći tok i trajnost:** napravi privremeni recept i planiraj jedan obrok. Dodaj/ukloni njegov favorit, promeni porcije i ponovo učitaj aplikaciju. Recept, obrok i poslednje stanje favorita moraju ostati sačuvani; rezervacije treba da odgovaraju sačuvanom planu.
6. **Zastareo Mentor predlog:** pripremi Mentorovu dopunu privremenog paketa, ali je još ne potvrđuj. U drugom tabu dopuni isti paket. Potvrdi stari predlog u prvom tabu: mora tražiti osvežavanje ili novi predlog i ne sme ponovo dopuniti paket. Prilikom prolaska formi možeš proveriti i SR/EN poruke i da unos ostaje u izabranom polju.

Nutritivne procente, prikaz „deficit“, statistiku i rok namirnice u odnosu na budući obrok proveravati tek posle faze 2 ili kasnije faze koja završi odgovarajuću funkciju.

## Izmenjeni fajlovi i razlog

- `js/data/repositories/nutrition-food-data.repository.js` — čitanje trenutnog trajnog food envelope-a za proveru referenci pod zajedničkim lock-om.
- `js/data/repositories/nutrition-inventory-data.repository.js` — kontekst svežih namirnica i koordinacija legacy migracije.
- `js/nutrition/repositories/inventory.repository.js` — transakcione mutacije, inicijalizacija i bezbedno čitanje posle neuspešnog upisa.
- `js/nutrition/services/inventory.service.js` — provere i količinske promene unutar transakcije.
- `js/nutrition/services/planning.service.js` — zajedničke validacije i ponovne provere referenci pre snimanja.
- `js/mentor/mentor-nutrition-inventory-write.js` — atomarna provera zastarele dopune i pouzdana potvrda trajnog rezultata.
- `js/nutrition/inventory-storage.js` — bezbedno prijavljivanje neispravnog oblika kolekcije.
- `js/nutrition/nutrition-inventory-i18n.js` — jasnija postojeća poruka validacije na oba jezika.
- `index.html`, `lazyLoader.js` — osvežene verzije izmenjenih resursa.
- `tests/storage/nutrition-phase1-safety.test.js` — nove provere stvarnih repozitorijuma i servisa za localStorage i IndexedDB.
- `tests/nutrition/inventory-locations.test.js`, `tests/nutrition/plan-favorites-persistence.test.js` — test dublovi usklađeni sa transakcionim ugovorom.
- `tests/nutrition/planning-completion.test.js` — integracioni fixture sadrži stvarnu lokaciju potrebnu za proveru svežih referenci.
- `docs/NUTRITION_PHASE_1.md` — obuhvat, granice i korisnička lista provera.

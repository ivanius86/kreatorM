# Nutrition višestavčni zahtevi — ispravka konteksta

Datum: 29. oktobar 2026.

## Dopuna — završno „u zalihe“ i zajednička lokacija, 30. oktobar 2026.

Zahtev `unesi 400 grama belog pirinca, 500 grama integralnog hleba, u zalihe.` pravio je treću, nepoznatu stavku zato što prepoznavanje opšte instrukcije nije prihvatalo završnu tačku. Završna `.`, `!` i `?` sada se zanemaruju samo pri proveri takve instrukcije; stvarna namirnica bez količine i nepoznat naziv ostaju stavke za razjašnjenje. Samo „u zalihe“ ne bira lokaciju: ona se i dalje traži za svaku stavku kojoj nedostaje. Eventualni izbor vrste hleba ostaje obavezan kada katalog daje više kandidata.

Zasebno završno `, u frižider.` ili `, u ostavu.` sada predstavlja zajedničku lokaciju spiska. Prihvata se samo cela lokacijska instrukcija, uključujući tačan naziv postojeće prilagođene lokacije. Nejasne lokacije ili sukob sa već navedenom lokacijom traže razjašnjenje; izričito navedena lokacija se ne prepisuje. Imenovane instrukcije za pojedinačne namirnice zadržavaju postojeće ponašanje. Upis i dalje zahteva završnu potvrdu i pravi samo stvarne namirnice.

Promenjeni fajlovi: `js/mentor/mentor-nutrition-inventory-resolver.js` (parser), `tests/mentor/write-actions.test.js` (četiri regresije sa stvarnim seed katalogom i zaštitom potvrde), `index.html` (cache verzija resolvera) i ovaj dokument. Stari test nejasne lokacije sada koristi stvarno nejasno `frižider ili ostava`; jasna završna zajednička lokacija pokrivena je novim testom. Korisnički podaci i storage šeme nisu menjani.

Provere ove dopune: ciljani write suite **37/37**, ceo Mentor suite **142/142**; sintaksa parsera i testova prolazi. Pre ispravke nove regresije su reprodukovale treću stavku `u zalihe.` i odbijanje zajedničke završne lokacije. Browser/UI i stvarni model nisu pokretani ovom proverom.

## Stvarni uzrok i reprodukcija

Greška je reprodukovana automatskim testom sa stvarnim `MentorNutritionRead.foodCandidates`, bez Gemini poziva. Originalna poruka sa jajima i integralnim hlebom dala je jedan ravni zadatak sa `quantity=10`, `unit=kom`, `locationId=location_fridge`, dok se razjašnjavala vrsta hleba.

`js/mentor/mentor-nutrition-inventory-resolver.js:quantityFrom` uzimao je prvo količinsko poklapanje cele poruke; `locationFrom` je birao prvu lokaciju iz fiksnog redosleda. `prepare` je pretraživao namirnice kroz celu poruku i čuvao samo jedan `foodId/quantity/unit/locationId`. Naknadni izbor hleba menjao je samo food ID. `validateDraft` je mogao proveriti tipove i domenska pravila, ali ne i poreklo međusobno pomešanih parametara. `MentorWritePipeline.confirm` izvršavao je samo jedan input.

## Implementirana ispravka

- Postojeći `activeTask` sada može sadržati do osam `items` i `pendingItemId`. Svaka stavka ima stabilan privremeni ID, izvorni tekst, food ID/naziv, sopstvenu količinu/jedinicu/lokaciju/rok, kandidate, status razjašnjenja i izvršavanja. Ravni, ranije sačuvani pojedinačni zadaci ostaju podržani.
- `splitRequest` prvo razdvaja stavke, čuva decimalne zareze i datume i veže naknadne lokacijske klauze samo za jednoznačno imenovanu stavku. Ne uzima globalnu prvu količinu ili lokaciju. Nejasno vezivanje, previše stavki i nerazdvojene količine blokiraju predlog. Namirnica bez količine ne nestaje kao „uvodni tekst“.
- Svaka stavka koristi postojeći `prepareSingle`, `inputFor`, `preflight`, Capability Registry i domenske Inventory servise. Nema drugog izvršnog sistema, izmene Nutrition poslovnih pravila ili IndexedDB šeme.
- Izbor brojem, ordinalom, kratkim ili punim nazivom odnosi se samo na otvorenu stavku. Korekcija identifikuje ciljnu stavku; kada cilj nije jasan, traži izbor i čuva traženu korekciju. Kopije nested stanja sprečavaju promenu starog snapshot-a.
- Controller proverava uski nastavak pre nove namere. Višestavčni zadatak ne koristi stari opšti `followUp` kao dozvolu da upije drugu temu. Lokalni zahtevi i odgovori ostaju `local-only` i ne ulaze u cloud istoriju.
- Pregled prikazuje sve stavke. Potvrda je moguća tek kada je svaka spremna, i vezana je za verziju koju je korisnik video. Stara kartica ne može potvrditi naknadno korigovan predlog.
- Pre prvog upisa proveravaju se sve stavke; svaka se ponovo proverava neposredno pre svog adaptera. Isti restock paket ne može biti dva puta cilj u jednom zahtevu. Mešanje dodavanja, dopune i drugih operacija traži zasebne zahteve.
- Pipeline upisuje redom: prvo trajni `executing`, zatim postojeći adapter, provera rezultata i trajni `succeeded`. Greška posle početka adaptera ili izgubljeno beleženje rezultata daje `uncertain` i prekida grupu. Raniji uspesi i kasnije nepokušane stavke ostaju odvojeni; nema automatskog retry-a cele grupe ili tvrdnje o atomarnosti.
- Repository transakcija odbija zamenu/brisanje aktivnog task objekta ili povratak na prikupljanje dok je izvršavanje u toku. To štiti ishode od zamene zadatka u drugom tabu. Nova baza i Task Manager nisu uvedeni.

Originalni očekivani predlog je sada dve odvojene stavke: **jaja 10 kom → frižider** i **integralni hleb 400 g → ostava**. Ništa se ne čuva pre potvrde. Ranije pogrešno sačuvani korisnički zapisi nisu automatski menjani ili brisani.

## Izmenjeni fajlovi

| Fajl | Razlog |
| --- | --- |
| `js/mentor/mentor-nutrition-inventory-resolver.js` | Razdvajanje, stanje, razjašnjenje, ciljane korekcije i validacija svih stavki. |
| `js/mentor/mentor-write-pipeline.js` | Sekvencijalno izvršavanje, pojedinačni ishodi i verzionisana potvrda. |
| `js/mentor/mentor-conversations.repository.js` | Transakciona zaštita zadatka koji se izvršava, bez izmene šeme. |
| `js/mentor/mentor-chat.js` | Nastavak otvorene stavke, izbor kandidata i prosleđivanje prikazane verzije. |
| `js/mentor/mentor-chat-view.js` | Kompletan pregled, pojedinačni ishodi i kandidati otvorene stavke; postojeći stilovi. |
| `js/i18n/mentor.js` | Novi SR/EN tekstovi pitanja, pregleda, ograničenja i parcijalnih ishoda. |
| `index.html` | Cache verzije promenjenih skripti; kasniji zahtev o četvrtini ekrana dodao je CSS cache verziju i pristupačan naziv Send dugmeta. |
| `tests/mentor/write-actions.test.js` | Originalna reprodukcija i regresije sa stvarnim kandidatskim resolverom i sistemskim seed katalogom. |
| `tests/mentor/conversations.test.js` | Pravi repository sa fake IndexedDB: reload, privatnost, blokiranje zamene i parcijalni ishodi bez replay-a. |
| `tests/mentor/floating-chat.test.js` | Postojeći controller harness: kratki nastavci/korekcije, promena teme i prosleđivanje verzije. Dizajn nije menjan ovim testovima. |
| `docs/MENTOR_NUTRITION_MULTI_ITEM_FIX.md` | Ovaj izveštaj i korisničke provere. |
| `docs/MENTOR_CHAT.md` | Link ka aktuelnoj ispravci. |

Odvojeni, kasnije izričito zatraženi UI zahvat: `mentor-chat.css` postavlja ukupnu širinu na `25vw` na svim rezolucijama; `docs/MENTOR_FLOATING_CHAT_V1.md` opisuje tu doradu. To nije deo Nutrition ispravke.

## Automatizovane provere

Završni suite pre poslednje CSS dorade: **Mentor 125/125**, **Storage 38/38**, **Nutrition 35/35**, **Research 139/148**. Ukupni `npm test` ima devet već poznatih Research neuspeha (pet selekcija/drag, četiri `sections.renderIcon`), kao pre ovog rada. Mentor ima 25 novih provera: 19 write regresija, tri persistence/concurrency provere i tri controller provere.

Pokriveni su originalni slučaj, dve/tri stavke, različite jedinice/lokacije, decimalni zarez, rok, izbor brojem/ordinalom/nazivom, nejasan izbor, očuvanje ostalih stavki, ciljane i neciljane korekcije, otkazivanje, nepoznata namirnica/jedinica, nedostajuća količina, nejasno vezivanje, limit, mešane operacije, stara verzija predloga, delimičan neuspeh, izgubljen receipt, ponovno otvaranje baze i postojeći pojedinačni add/restock tokovi.

Proveru je dopunio read-only review; reprodukovane greške u ciljanju korekcije, mešanim operacijama i izostavljanju stavke popravljene su i pokrivene testovima. Browser Black-Box i stvarni model nisu pokretani; testovi ne koriste korisničku bazu.

## Konkretni Black-Box testovi za korisnika

Priprema: osveži aplikaciju, otvori novi probni razgovor i proveri postojeće stanje zaliha. Nazivi moraju postojati u katalogu; za ovaj primer potrebni su jaja, mleko, pirinač i hleb, plus Frižider/Ostava. Ako katalog nudi više vrsta, izaberi tačan naziv iz prikazane liste. Potvrda zaista pravi zapise; procenjuj promenu u odnosu na početno stanje, ne pretpostavljaj prazne zalihe.

1. **Originalni slučaj.** Unesi: `prazne su, da li možeš da mi dodaš sledeće zalihe, jaja 10 komada, 400 grama integralnog hleba, jaja stavi u frižider a hleb u ostavu`. Razjasni eventualne vrste jaja/hleba po trenutno postavljenom pitanju. Očekivanje: dve stavke — 10 kom jaja u frižideru, 400 g integralnog hleba u ostavi. Pre potvrde nema novih paketa; posle potvrde proveri oba.
2. **Različite jedinice/lokacije.** Unesi: `Dodaj 10 kom jaja u frižider; 2 l mleka u ostavu`. Očekivanje: upravo dve nezavisne stavke, bez prenosa jedinice ili lokacije.
3. **Tri stavke i decimalni zarez.** Unesi: `Dodaj 6 kom jaja u frižider; 1,5 l mleka u frižider; 2 kg pirinča u ostavu`. Očekivanje: tri stavke sa 6 kom / 1,5 l / 2 kg. Ako pirinač ima više vrsta, odgovor menja samo njegov izbor.
4. **Kratak odgovor.** Unesi: `Dodaj 10 kom jaja u frižider; hleb 400 g u ostavu`. Kada je otvoreno pitanje za hleb, odgovori `integralni` ili brojem njegovog stvarnog reda. Očekivanje: hleb ostaje 400 g u ostavi, jaja ostaju nepromenjena. Ako naziv nije jednoznačan, pitanje se ponavlja bez upisa. Ako tvoj katalog ima samo jednu vrstu, ovaj izbor nije potreban.
5. **Ciljana korekcija.** Posle testa 3, pre potvrde unesi: `Mleko ipak 3 l u ostavu`. Očekivanje: menjaju se samo količina/lokacija mleka; ostali food ID-jevi, količine i lokacije ostaju isti.
6. **Korekcija bez cilja uz drugo otvoreno pitanje.** Pripremi jaja, nejasan hleb i mleko; dok je otvoreno pitanje za hleb, unesi `Ispravi na 4 l`, pa na pitanje koju stavku odgovori `Mleko`. Očekivanje: samo mleko postaje 4 l; hleb ostaje nerešen sa svojih 400 g/ostava. Ne sme nastati drugi mlečni zapis umesto hleba.
7. **Otkazivanje.** Pripremi dve stavke i unesi `Odustani`, ili odbaci spreman predlog dugmetom. Očekivanje: nijedna stavka nije upisana.
8. **Nepoznata namirnica.** Unesi: `Dodaj 4 kom nepoznatica u ostavu; 2 l mleka u frižider`. Očekivanje: traži se razjašnjenje prve stavke, mleko se pamti, ali se grupa ne može potvrditi kao kompletna. Odgovori `Jaja` i razjasni vrstu ako se traži; prva stavka zadržava 4 kom/ostava.
9. **Neispravna jedinica.** Unesi: `Dodaj 2 kutije jaja u ostavu; 2 l mleka u frižider`, zatim `Ispravi jaja na 4 kom`. Očekivanje: kutije nisu prihvaćene kao količina zalihe; ispravljaju se samo jaja, mleko ostaje 2 l/frižider.
10. **Nedostajuća količina ne nestaje.** Unesi: `Dodaj u zalihe jaja, 2 kg pirinča u ostavu, 1 l mleka u frižider`. Očekivanje: sva tri proizvoda ostaju u zahtevu; jaja traže količinu/lokaciju, umesto da budu izostavljena iz odobrenog predloga.
11. **Reload pre izbora.** Pokreni test 4 i ostavi otvoreno pitanje. Osveži aplikaciju, ponovo otvori isti razgovor i izaberi ponuđenu namirnicu. Očekivanje: ostale količine, jedinice i lokacije sačuvane su i nema automatskog upisa.
12. **Ponovna potvrda.** Potvrdi jasnu grupu od dve stavke, zatim ponovo otvori istoriju/osveži stranicu. Očekivanje: status svake stavke je sačuvan/proveren; nema drugog upisa iste odobrene grupe.
13. **Stari predlog u drugom tabu.** Otvori isti spreman zahtev u dva taba. U jednom ispravi količinu. Pokušaj odobravanje starog pregleda u drugom. Očekivanje: ili je prikazan osvežen predlog ili zahtev odbija zastarelu verziju; ne odobrava se promena koju stara kartica nije prikazala.
14. **Promena teme.** Dok čeka izbor hrane, unesi `Pokaži potrošnju ovog meseca`. Očekivanje: to ne menja namirnicu/količinu otvorene stavke. Finance čitanje nije implementirano ovim fix-om; ovim se proverava granica teme, ne nova Finance sposobnost.
15. **Jednostavna regresija.** U novom razgovoru unesi `Dodaj 1 kg pirinča u ostavu`, izaberi vrstu i potvrdi. Zatim za postojeći odgovarajući paket probaj `Dopuni mleko za 1 l`. Očekivanje: stari pojedinačni tokovi, pregled i potvrde rade kao ranije.

Delimičan neuspeh i izgubljen receipt provereni su automatizovanim fault-injection testovima. Ne treba namerno kvariti korisnički browser storage da bi se to ručno simuliralo. Ako se stvarni neuspeh pojavi, očekuj odvojene statuse uspešnih, neizvesnih i nepokušanih stavki, bez tvrdnje da je sve sačuvano i bez ponavljanja cele grupe.

## Preostala ograničenja

- Do osam stavki i jedna vrsta operacije po zahtevu. Najpouzdaniji unos je jedna stavka po redu ili jasna lista sa količinom, jedinicom i lokacijom uz naziv.
- Nerazdvojene/kontradiktorne rečenice ne rešavaju se nagađanjem; traži se ponovljen, jasan spisak. Ne kreiraju se nepoznate namirnice ili lokacije automatski.
- Grupa nije jedna transakcija kroz domen i razgovore. Posle `uncertain`/prekinutog `executing` nema automatskog nastavka; prvo proveri stvarne zalihe. Opšti Task Recovery ostaje van obima.
- Ranije pogrešno sačuvani zapisi ostaju korisnički podaci i zahtevaju ručni pregled/ispravku kroz Nutrition UI.

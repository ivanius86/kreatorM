# Nutrition — faza 2: rezervacije i pouzdan nutritivni prikaz

Datum: 10. novembar 2026.

## Obuhvat

- Ručno rezervisanje i planiranje obroka koriste isti obračun paketa u postojećoj transakciji. Količina se odbija od već aktivnih rezervacija; redosled je po najranijem roku (FEFO), uz preciznost od tri decimale.
- Za planirani obrok paket je podoban ako važi bar do datuma obroka, uključujući sam dan isteka. Ako je obrok u prošlosti, granica je današnji lokalni datum. Paket bez roka ostaje podoban, a paket sa neispravnim rokom se ne rezerviše.
- Recepti, Plan i Pregled koriste isti obračun glavnih nutrijenata. Nepoznata vrednost je `null`, a poznata nula ostaje nula. Kada nedostaju direktne kalorije, potpuna procena iz makroelemenata zahteva poznate proteine, ugljene hidrate i ukupne masti. Delimičan zbir može da se prikaže kao najmanje poznata količina, ali ne kao potpuna vrednost.
- Mikronutritivni status je nepoznat ako makar jedan relevantan sastojak nema podatak. Zbirni status ne pravi ocenu iz samo poznatog dela. Pregled ne računa procenat svih glavnih vrednosti iz nepotpunog skupa.
- Statistika sada čita sačuvane planirane obroke za izabrani dan, nedelju, mesec ili godinu. Prikazuje poznate vrednosti, nepoznate označava jasno i više ne prikazuje fiksne demonstracione brojeve. Naslov i objašnjenje jasno navode da se radi o planu.

## Granice

Nema promene storage šeme, migracije postojećih zapisa niti brisanja korisničkih podataka. Oznaka „pripremljeno“ nije evidencija pojedenog. Istorijski nutritivni snapshot, personalizovani ciljevi i stvarni unos ostaju za narednu fazu. Paket bez datuma isteka ima nepoznat rok i ostaje dostupan kao ranije.

Postojeći aktivni planovi dobijaju novo pravilo pri sledećem ponovnom obračunu rezervacija (izmena plana ili zaliha). Samo otvaranje aplikacije ne prepisuje ranije sačuvane rezervacije.

## Kratka ručna provera — tek po završetku faze 2

Koristi privremene stavke i recepte. Ne briši postojeće podatke.

1. Dodaj privremenu namirnicu sa rokom pre budućeg datuma obroka. Planiraj obrok za taj datum: sastojak treba da nedostaje. Pomeri rok tačno na datum obroka: rezervacija treba da se pojavi.
2. Napravi dva buduća obroka koja traže više iste namirnice nego što imaš. Ukupno rezervisano ne sme preći zalihu; drugi obrok treba da pokaže nedostatak. Dopuni zalihu i proveri ponovni obračun.
3. Otvori recept sa nepotpunim nutritivnim podacima. U Receptima, Planu, Pregledu i Statistici nepoznata vrednost treba da bude označena, bez lažnog procenta ili deficita. Poznata nula treba da ostane `0`.
4. U Statistici menjaj dan/nedelju/mesec/godinu i datum. Brojevi treba da prate samo planirane obroke u periodu; prazan period treba da pokaže „Nema podataka“, bez demonstracionih vrednosti.

Automatske provere su pokrenute po završetku cele faze: Nutrition **54/54**, Storage **55/55**, Mentor **194/194**. Provera sintakse izmenjenih JavaScript fajlova i `git diff --check` takođe prolaze. Browser i korisničke black-box provere ostaju korisniku.

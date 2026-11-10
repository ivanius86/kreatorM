# Nutrition — faza 3: evidencija pojedenog

Datum: 10. novembar 2026.

## Obuhvat

- Planirani obrok sada ima zasebnu radnju „Zabeleži pojedeno“. Unose se stvarni lokalni datum i pozitivan broj pojedenih porcija. Jedan planirani obrok ima jedan aktivan zapis, koji može da se ispravi ili obriše.
- „Pripremljeno“ i evidencija pojedenog ostaju nezavisni. Evidencija ne menja zalihe, rezervacije ni status pripreme. Stari pripremljeni obroci se ne pretvaraju automatski u pojedene.
- Pri prvom upisu u istoj transakciji čuva se nutritivni snapshot iz važećeg recepta i namirnica. Ispravke datuma ili porcija koriste isti snapshot. Istorija ostaje čitljiva nakon promene ili uklanjanja izvornog recepta.
- Statistika ima izbor „Plan“ / „Zabeleženo“. Plan ostaje podrazumevani prikaz. Zabeleženi prikaz koristi isključivo snapshot, filtrira po datumu jedenja i jasno prikazuje nepotpune ili prazne podatke.
- Dnevnik je opciono polje `intakeEntries` u postojećem Nutrition v1 zapisu. Stariji zapis bez polja dobija prazan dnevnik; prisutno neispravno polje se odbija bez tihog brisanja. Backup, vraćanje i prelazak na IndexedDB zadržavaju zapis.

## Granice

Ovaj korak beleži samo obroke koji su već u Planu. Ne uključuje samostalan unos namirnice, više događaja jedenja istog planiranog obroka, automatsko popunjavanje iz statusa „pripremljeno“ ni personalizovane ciljeve. Ciljeve treba uvesti kao zaseban korak sa datumom važenja, da kasnija izmena cilja ne prepiše istorijske procente. Ukupan zabeleženi unos znači samo ono što je korisnik ručno uneo.

## Kratka ručna provera — tek po završetku faze 3

Koristi privremeni recept i planirani obrok; postojeće korisničke podatke nemoj brisati.

1. U Planu otvori obrok i izaberi „Zabeleži pojedeno“. Unesi datum i porcije, sačuvaj; u Statistici prebaci na „Zabeleženo“ i proveri period i vrednosti.
2. Ispravi datum i broj porcija. Unos treba da pređe u novi datum, a vrednosti da prate porcije. Ponovno otvaranje ne sme da napravi duplikat.
3. Promeni recept ili nutritivne podatke namirnice nakon upisa. Stari zabeleženi unos treba da zadrži prethodnu nutritivnu osnovu.
4. Označi obrok „pripremljeno“ i vrati ga na planirano; proveri da zapis pojedenog ostaje. Obriši zabeleženi unos i proveri da se zalihe i status pripreme ne menjaju.
5. Osveži aplikaciju i proveri da unos ostaje; prazan period u režimu „Zabeleženo“ treba da pokaže „Nema zabeleženog unosa“ i „Nema podataka“.

Automatske provere su pokrenute po završetku cele faze: Nutrition **56/56**, Storage **62/62**, Mentor **194/194**. Provera sintakse izmenjenih JavaScript fajlova je prošla. Browser i korisničke black-box provere ostaju korisniku.

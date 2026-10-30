# Namirnice i Zalihe — izmena rasporeda

## Naknadne izmene — 5. oktobar 2026.

Velika zaglavlja „Zalihe” i „Baza namirnica” uklonjena su zajedno sa uvodnim tekstom, pa se filteri i paneli prikazuju više. Dugme „Kreiraj lokaciju” sada je uspravno desno od kartica lokacija. Tabela zaliha ima nižu maksimalnu visinu i scroll, da traka „Uskoro ističe” bude bliže vrhu.

Svaka lokacija ima zasebno dugme za brisanje. Brisanje zahteva potvrdu u aplikaciji i dozvoljeno je za prazne lokacije, uključujući podrazumevane. Lokacija sa bilo kojim batch zapisom prvo mora da se isprazni/prebaci; poslednja aktivna lokacija ne može da se izbriše. Obrisani zapisi dobijaju `deletedAt` u postojećem envelope-u da se podrazumevane lokacije ne vrate pri inicijalizaciji. Nema nove storage šeme ili ključeva. Preference ka obrisanoj lokaciji se uklanjaju; dodavanje zaliha bira postojeću preferiranu lokaciju, aktivni frižider ili prvu aktivnu lokaciju.

Odeljak „Povezano sa planom ishrane” više se ne prikazuje u detaljima zaliha. U Namirnicama vitamini, minerali i ostale nutritivne vrednosti prikazuju samo poznate iznose: `null` i nedostajuće vrednosti su izostavljene; poznata nula ostaje vidljiva. Podaci i nutritivni obračuni nisu menjani.

Izmenjeni fajlovi u ovom koraku: `js/nutrition/tabs/frizider.js`, `js/nutrition/tabs/namirnice.js`, `js/nutrition/nutrition.css`, `js/nutrition/nutrition.js`, `js/nutrition/nutrition-inventory-i18n.js`, `js/nutrition/repositories/inventory.repository.js`, `js/nutrition/services/inventory.service.js`, `lazyLoader.js`, `index.html`, `tests/nutrition/library-layout.test.js`, novi `tests/nutrition/inventory-locations.test.js` i ovaj izveštaj.

Prošla su sva **64 testa** ishrane i storage-a. Nove provere pokrivaju brisanje/reload podrazumevane lokacije, zaštitu batch zapisa i poslednje lokacije, preference/default fallback, neuspešan upis i poznate nulte nutritivne vrednosti. Ručno proveriti dugme korpe na praznoj lokaciji, poruku na zauzetoj lokaciji, položaj uspravnog dugmeta i vidljivost trake rokova pri trenutnoj veličini browsera.

Prethodni odeljci ispod opisuju početnu izmenu rasporeda; naknadne izmene iz ovog odeljka imaju prednost.

## Promene i fajlovi

- `js/nutrition/tabs/namirnice.js`: zaglavlje, horizontalne kategorije sa stvarnim brojačima, tabela levo, detalji desno, četiri postojeće brze akcije i odeljci za nutritivne podatke. Šest primarnih kategorija koristi dostavljene slike; sve druge kategorije ostaju dostupne horizontalnim pomeranjem.
- `js/nutrition/tabs/frizider.js`: kartice lokacija iznad tabele, detalji desno, horizontalna traka rokova ispod tabele, nutritivni pregled iz povezane baze namirnica. Prilagođene lokacije i njihovo kreiranje su sačuvani.
- `js/nutrition/nutrition.css`: stilovi novog rasporeda ograničeni na `#nutritionView`, prilagođavanje širini sadržaja, bez promena pozadine, bočne navigacije ili drugih modula. Uklonjeno poziciono skrivanje/širine kolona namirnica i skrivanje rezervacija/dostupnih količina u detaljima zaliha.
- `js/nutrition/nutrition.js`: postojeći delegirani click handler dobio je akciju za promenu nutritivnog odeljka bez rerenderovanja; dodato čuvanje horizontalnog scroll položaja lokacija i rokova; ažurirana verzija CSS resursa.
- `js/nutrition/components/nutrition-icons.js`: dodate mreža za „Sve” i oznaka potvrde za lokacije.
- `js/nutrition/nutrition-foods-i18n.js`, `js/nutrition/nutrition-inventory-i18n.js`: nova zaglavlja i prateći tekst na srpskom i engleskom.
- `lazyLoader.js`, `index.html`: verzije resursa da browser učita izmenjene prikaze i stilove.
- `tests/nutrition/library-layout.test.js`: četiri regresione provere prikaza i podataka.
- `docs/THEME_READINESS_BACKLOG.md`: zabeležene preostale pozicione zavisnosti prikaza.
- `docs/NUTRITION_LIBRARY_LAYOUT.md`: ovaj izveštaj i ručne provere.

## Kopirane slike

Originali su ostali netaknuti u `C:\Users\Ivan Stefanovic\Downloads\Zalihe i namirnice`.
Kopije su PNG fajlovi sa očuvanom providnošću i proporcijama; prikaz koristi `object-fit: contain`.
Stvarna imena originala koriste `Frizider` i `Zamrzivac`, bez dijakritike.

| Original | Putanja u projektu | Prikaz |
| --- | --- | --- |
| `Frizider.png` | `assets/nutrition/fridge.png` | Frižider |
| `Zamrzivac.png` | `assets/nutrition/freezer.png` | Zamrzivač |
| `Ostava.png` | `assets/nutrition/pantry.png` | Ostava |
| `Povrce.png` | `assets/nutrition/vegetables.png` | Povrće |
| `Voce.png` | `assets/nutrition/fruit.png` | Voće |
| `Meso.png` | `assets/nutrition/meat.png` | Meso |
| `Riba i morski plodovi.png` | `assets/nutrition/fish-seafood.png` | Riba i morski plodovi |
| `Mlecni Proizvod.png` | `assets/nutrition/dairy.png` | Mlečni proizvodi |
| `Zitarice.png` | `assets/nutrition/grains.png` | Žitarice |

## Očuvano ponašanje

Nisu menjani repozitorijumi, modeli, storage ključevi, IndexedDB šema, obračun nutritivnih vrednosti, količine, rezervacije, serije ili CRUD logika. Nema novih demo podataka u aplikaciji. Testovi koriste izolovane test fixture podatke.

Novi raspored ponovo koristi `food-category`, `food-select`, `food-edit`, `food-add`, reset, sve filtere i sva četiri postojeća quick-action handlera. Sistemska namirnica koristi postojeći tok korisničke kopije. Import i kreiranje iz recepta ostaju postojeći placeholder tokovi.

Lokacije ponovo koriste `inventory-location-filter`. Tabela i traka rokova koriste `inventory-select`; dugmad i meniji koriste postojeće consume/edit/move/remove/restock akcije. Traka rokova koristi postojeću filtriranu listu, da izabrana stavka bude dostupna panelu detalja.

Nutritivni pregled zaliha koristi `MentorFoodNutritionService.details(food.id)`, sa oznakom vrednosti na 100 g. Nepoznate vrednosti ostaju „Nema podatka”. Pregled rezervacija, ukupnih/dostupnih količina, serija i povezanog plana ostaje dostupan.

Jedina nova delegirana akcija, `food-nutrient-tab`, menja vidljivost tri odeljka i `aria-pressed` u postojećem panelu. Ne upisuje podatke, ne dodaje event listenere i ne renderuje stranicu. Prilikom ponovnog renderovanja detalja početni odeljak je „Vitamini”, kao što se ranije početni accordion otvarao automatski.

## Provere i ograničenja

Prošlo je svih **59 testova** iz `tests/nutrition/*.test.js` i `tests/storage/*.test.js`, uključujući četiri nova testa. Provereni su stvarni brojači iz repozitorijuma, filtriranje i izbor namirnica, korisnička kopija, srpski tekst, dodatne kategorije, prilagođene lokacije, povezane nutritivne vrednosti, akcije izabranog batch-a, prazne zalihe i PNG alpha kanali. Provere čuvanja podataka i obračuna ostaju zelene.

Automatski render testovi ne zamenjuju vizuelnu proveru u browseru. Nije izvedena interaktivna browser provera svih dugmadi niti vizuelno poređenje screenshot-a. Na manjim širinama filteri prelaze u više redova, detalji ispod tabele, a kategorije/lokacije/rokovi mogu se horizontalno pomerati. Tabele zadržavaju sve kolone, uz horizontalno pomeranje kada nema dovoljno mesta.

## Ručna provera

1. Otvori Ishrana → Namirnice. Proveri slike kategorija, „Sve”, brojače, pretragu, sve postojeće filtere, sortiranje i reset.
2. Izaberi red i proveri detalje, tri nutritivna odeljka, porciju, vlakna, izvor, izmenu korisničke namirnice i kopiju sistemske namirnice.
3. Proveri dodavanje i četiri brze akcije; import/recept i dalje treba da otvore postojeće placeholder prikaze.
4. Otvori Zalihe. Proveri tri slike lokacija, klik/ponovni klik filtera, prilagođenu lokaciju i njeno kreiranje.
5. Proveri pretragu, kategoriju, lokaciju, rok i status; izaberi red, otvori meni, pregledaj količine, rezervacije i serije.
6. Izaberi stavku iz „Uskoro ističe” i proveri da detalji prikazuju isti batch.
7. Na testnoj stavci proveri dodavanje, potrošnju, dopunu, izmenu, premeštanje i uklanjanje; zatim reload i trajnost izmena.
8. Prebaci jezik između srpskog i engleskog, proveri uži ekran i da unos u search/form polja ne pokreće izbor roditeljskog panela.

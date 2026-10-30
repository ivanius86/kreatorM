# Slike dodatnih kategorija

Izvorni fajlovi: `C:\Users\Ivan Stefanovic\Downloads\Zalihe i namirnice\Sheet 1 mapping.png` i `Sheet 2 mapping.png`.
Oba lista su 1536 × 1024 PNG sa alpha kanalom. Originali nisu menjani.

Svaki list je isečen tačno po mreži 3 × 2 u ćelije 512 × 512. Nakon toga uklonjene su samo potpuno providne margine, uz do 16 piksela sačuvanog prostora oko alpha granice, ograničeno na originalnu ćeliju. Nema resamplinga, novih pozadina ili izmena alpha vrednosti. Fajlovi su sačuvani u postojećem folderu `assets/nutrition/`.

| List / ćelija | PNG u `assets/nutrition/` | Kategorija | Dimenzije |
| --- | --- | --- | --- |
| 1 / gore levo | `Zivina.png` | `poultry` | 512 × 481 |
| 1 / gore sredina | `Jaja.png` | `eggs` | 512 × 473 |
| 1 / gore desno | `PekarskiProizvodi.png` | `bread-bakery` | 500 × 505 |
| 1 / dole levo | `Testenina.png` | `pasta-noodles` | 512 × 511 |
| 1 / dole sredina | `Mahunarke.png` | `legumes` | 512 × 512 |
| 1 / dole desno | `OrasastiPlodovi.png` | `nuts-seeds` | 512 × 451 |
| 2 / gore levo | `MastiIUlja.png` | `fats-oils` | 512 × 493 |
| 2 / gore sredina | `Zacini.png` | `herbs-spices` | 512 × 497 |
| 2 / gore desno | `Pica.png` | `beverages` | 512 × 473 |
| 2 / dole levo | `GotovaJela.png` | `prepared-foods` | 511 × 480 |
| 2 / dole sredina | `GrickaliceISlatkisi.png` | `snacks-sweets` | 512 × 458 |
| 2 / dole desno | `Ostalo.png` | `other` | 510 × 507 |

Izmenjeni fajlovi: `js/nutrition/tabs/namirnice.js` (povezivanje slika sa kategorijama), `lazyLoader.js`, `js/nutrition/nutrition.js`, `index.html` (nova verzija resursa), dodati `scripts/crop-nutrition-category-sheets.ps1`, ovaj dokument i 12 PNG fajlova iz tabele. Poslovna logika, filteri, brojači, prevodi, postojeće kategorije i storage nisu menjani.

Provere: svih pet postojećih testova `tests/nutrition/library-layout.test.js` prolazi. Svih 12 fajlova ima 32-bitni alpha format; nijedna dimenzija nije veća od originalne ćelije. Pregled providnosti izvršen je i pomoću privremene kopije kompozitovane na beloj podlozi; bela podloga nije dodata PNG assetima.

Ograničenje izvora: alpha sadržaj dodiruje ivice ćelija, a neki detalji ilustracija prelaze u susednu ćeliju. Strogo sečenje 3 × 2 zato može zadržati sitne delove susedne ilustracije (npr. list uz levu ivicu `Jaja.png`) ili prekinuti detalj na granici ćelije. Ti vidljivi pikseli nisu brisani niti su granice pomerane, u skladu sa zahtevom da se uklanjaju samo providne margine. Za potpuno izolovane ilustracije potrebni su zasebni PNG originali ili dodatno odobrena obrada sadržaja.

Ponovno sečenje istih originala: pokrenuti `scripts/crop-nutrition-category-sheets.ps1` iz PowerShell-a. Skripta ispisuje veličinu, poziciju ćelije i kontakt alpha sadržaja sa ivicom za svaki rezultat.

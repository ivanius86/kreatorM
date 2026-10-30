# Floating Mentor Chat UI v1 — tok A

Datum: 29. oktobar 2026.

## Presek za nastavak rada — 30. oktobar 2026.

Ovaj odeljak je poslednji dogovoreni status. Stariji delovi dokumenta beleže razvoj; kod nastavka koristiti sledeće stanje.

**Šta je urađeno**

1. Pregledana je postojeća arhitektura: Mentor Core, Gemini/Qwen Gateway, Intelligence Router, Capability Registry, Nutrition adapteri, Write Pipeline i Conversation Storage. To su postojeće komponente koje su ponovo korišćene, bez novog chatbot-a.
2. Mentor je globalni floating chat, dostupan iz svih modula. Navigacija/minimizacija čuvaju isti razgovor, nacrt u tabu i aktivni odgovor. Creator ciljeva ponovo je samostalan na postojećoj `builder` ruti.
3. Aktuelni dizajn: veći portret desno pri otvaranju; samo unos i Pošalji bez spoljnog donjeg panela; istorija centrirana iznad textarea polja; opacity pozadine 50%, blur 35px; brza animacija prvo unosa, zatim istorije.
4. Poslednja korekcija dimenzija: istorija ima širinu 25% ekrana, a levi „Pregled stavki“ istu širinu i visinu. Zajedno zauzimaju oko pola ekrana, uz dodatni prostor za unos/portret. NE vraćati oba panela u zajednički okvir od 25%.
5. „Pregled stavki“ prikazuje aktuelno razjašnjenje i izbore na vrhu, ostale stavke ispod. Klik odmah obrađuje lokalni izbor, čuva neposalati nacrt i postavlja sledeće pitanje; završni upis zaliha i dalje traži posebnu potvrdu. Novo pitanje/odgovor prati se scroll-om, uz očuvanje fokusa tokom kucanja.
6. Ispravljen je Nutrition multi-item bug: svaka stavka ima sopstveni ID, količinu, jedinicu, lokaciju, kandidate i ishode. Jaja 10 kom / frižider više se ne prevezuju na hleb 400 g / ostava. Postoje verzionisana potvrda, zaštita od zastarelog izbora i pojedinačni statusi pri delimičnom neuspehu, bez automatskog ponavljanja neizvesnih upisa.
7. Gemini ključ je podešen samo u lokalnom `.env`; stvarna provera modela i strukturisanog odgovora ranije je prošla. Qwen adapter postoji, ali stvarni Qwen nije proveravan. Ključ se ne upisuje u dokumentaciju ili frontend.

**Provereno i otvoreno**

- Poslednje tehničke provere: Mentor **136/136**, Storage **38/38**, Nutrition **35/35**, Research **139/148**. Devet Research neuspeha postojalo je ranije i nije popravljano ovim radom.
- Stvarni izgled, blur, mobilna tastatura, klikovi i funkcionalni tokovi kroz UI još čekaju korisničko Black-Box testiranje. Ne predstavljati ih kao ručno prihvaćene.
- Nisu menjane domenske storage šeme niti ranije pogrešno sačuvani korisnički zapisi. Njih pregledati/ispraviti ručno kroz Nutrition, bez automatskog brisanja.
- Nacrt nije trajno sačuvan preko refresh-a; istorija razgovora jeste. Chat export je odvojen od glavnog app backupa.

**Šta radimo sledeće, redom**

1. Na računaru na kome se nastavlja proveriti Node, postojeći lokalni `.env` i backend; po potrebi pokrenuti `npm start`. Koristiti isti hostname/port za postojeće lokalne podatke. Ne resetovati baze zbog praznog prikaza na drugom origin-u.
2. Korisnik ručno proverava dva jednaka velika panela, centriranje istorije, animaciju, klik bez ručnog Send, očuvan nacrt i vidljivost novog pitanja. Probni unos: `Dodaj 1 kg pirinča; 2 l mleka u frižider`.
3. Zatim proveriti originalni slučaj jaja/hleb, korekciju samo jedne stavke, reload pre izbora, otkazivanje i završnu potvrdu. Konkretne poruke i očekivanja su u [Nutrition izveštaju](MENTOR_NUTRITION_MULTI_ITEM_FIX.md) i ručnim proverama niže.
4. Popraviti samo prijavljene UI/funkcionalne probleme i ponoviti odgovarajuće tehničke regresije. Bez novih širokih refaktora ili proširenja AI obima.
5. Tek posle stabilizacije i zasebnog odobrenja planirati Conversation Context: više nezavršenih zadataka, pauza/nastavak, reference, Task Recovery i Application Context Bridge. Za njih postoji [audit toka B](MENTOR_CONVERSATION_CONTEXT_AUDIT.md), ali nisu implementirani kao opšti sistem. Sadašnji jedan `activeTask` po razgovoru nije Task Context Manager.

Ova beleška je izmena samo dokumentacije; kod i korisnički podaci nisu menjani prilikom njenog pisanja.

## Pre-implementation audit i plan

Postojeći `index.html` imao je kompletan Creator u `#mentorManualCreator`, skriven iza chat/manual prekidača u `#builderView`. Nisu bili potrebni migracija, brisanje ciljeva ili novi servisi. `mentor-chat.js` je držao jednu instancu conversation repository-ja; view i HTTP client već su bili izdvojeni. `script.js:setView` je prekidao chat pri odlasku iz Creatora, što nije odgovaralo globalnom UI-ju.

Najmanji plan: premestiti postojeći chat u jedan direktni `body` potomak, prikazati sačuvani Creator na istoj `builder` ruti, razvezati chat od navigacije i prilagoditi CSS. Bez izmena Core/Gateway/Router/Capability Registry/Write Pipeline ugovora, domenskih servisa ili baza.

Plan je prošao arhitektonsku analizu i review. Uočene su dve konkretne granice: `.app` je zaseban stacking context, a Research ima document capture handlere za povezivanje stikera. Zato nije bilo dovoljno samo povećati chat `z-index` ili zaustaviti bubbling.

## Isporučeno ponašanje

- Jedan `#mentorFloatingRoot` izvan `.app`, trajno montiran na svim postojećim ekranima. Postojeći portret je launcher; nema novog chat servisa ili drugog repository-ja.
- Početno minimizovan panel. Poslednja korisnička dorada daje samoj istoriji širinu `25vw`, a dodatnom panelu „Pregled stavki“ istu širinu i visinu. Zajedno zauzimaju oko polovine ekrana, uz dodatni prostor za unos i portret. Shell zato više nije ograničen na zajedničkih `25vw`. Desktop visina ostaje `clamp(230px, 28dvh, 380px)`; postojeći `data-open` upravlja otvorenošću, bez novog trajnog UI stanja.
- Donji spoljni panel je uklonjen: ostaju textarea, Pošalji i, tokom zahteva, postojeći Stop. Istorija ima svoj omotač i zajedničku grid kolonu sa samim textarea poljem, pa joj je centar uvek tačno iznad centra unosa, nezavisno od širine dugmeta/portreta. Širina istorije je 80% širine text boxa, sa po 10% uvlačenja.
- Pozadina istorije ima alpha `.5` (50%); tekst i kontrole ostaju pune čitljivosti. `backdrop-filter: blur(35px) saturate(1.15)` radi gde je podržan. CSS blur koristi piksele; korisnički zahtev „35%“ protumačen je kao jačina od 35px. Pozadina ostaje poluprozirna i bez podrške za blur.
- Brzo otvaranje ima dva koraka: unos i dugme se izvlače zdesna nalevo za 105ms, zatim istorija raste nagore uz odlaganje 85ms i trajanje 125ms (ukupno oko 210ms). Nema JS tajmera, rerendera ili ponovnog montiranja. Reduced motion uklanja tranzicije. Tablet/mali ekrani koriste prilagođenu širinu i do `68dvh`, ograničeno VisualViewport prostorom.
- Postojeći razgovori, novi razgovor, brisanje uz potvrdu, izvoz, privatnost i deljenje izabranog cilja dostupni su kroz „Razgovori i opcije“ / „Conversations & options“.
- Navigacija i minimizacija ne prekidaju aktivni odgovor i ne brišu nacrt. Stop, promena jezika i promena razgovora zadržavaju postojeće ponašanje prekidanja.
- Creator je samostalan na istoj `builder` ruti, sa postojećim kategorijama, pitanjima, upisom i servisima. Header chata nudi prečicu ka njemu. `MentorChat.showChat()` ostaje kompatibilan ulaz za otvaranje chata; `showManual()` vodi na Creator. `deactivate()` sada minimizuje prikaz.
- Chat ima sopstveni scroll, bez novog body scroll lock-a ili focus trap-a. `inert`, `aria-hidden` i `aria-expanded` prate vidljivost. Minimizacija iz panela vraća fokus launcheru. Escape prvo zatvara opcije, zatim minimizuje chat.
- Zadržani su i18n, postojeće kartice i potvrde. Nova AI logika nije dodata.

Nacrt ostaje u istom textarea čvoru i postojećoj memoriji taba. Njegovo trajno čuvanje preko refresh-a nije uvedeno. Istorija i postojeći strukturirani zadaci koriste dosadašnji conversation storage. Panel se posle refresh-a otvara ponovo ručno; bira se razgovor prema postojećem repository ponašanju.

## Slojevi i događaji

`style.css` centralizuje slojeve normalne aplikacije (1), body drag preview-a (2400), Mentora (2500), modalnog hosta (2600) i referentnog modalnog sloja (3600). Obični stikeri ostaju zarobljeni u normalnom `.app` context-u, nezavisno od svojih unutrašnjih visokih brojeva.

Spoljni `.app` se podiže samo kada aktivna vidljiva stranica sadrži vidljiv `aria-modal="true"` ili `alertdialog`; skriveni dijalozi i skriveni preci se isključuju. Odvojeni postojeći body dijalozi zadržavaju svoje više slojeve. Browser `confirm` nije zamenjen. Scoped CSS spušta samo body sticker drag preview ispod Mentora.

Chat zaustavlja bubbling interakcija ka spoljnim board handlerima. Postojeći text-editing guard ostaje na delegiranim akcijama. U `research.js:armResearchCanvasConnection` capture handleri za pointer i tastaturu odbacuju interakciju sa Mentorom pre hit-testinga ili upisa, bez vraćanja fokusa stikeru. Capture Escape handler liste konekcija takođe preskače Mentor.

## Izmenjeni fajlovi i razlog

| Fajl | Razlog |
| --- | --- |
| `index.html` | Jedan globalni root, vidljiv Creator, kompaktan header/opcije, ažurirane verzije resursa. |
| `mentor-chat.css` | Floating dimenzije, animacija, fallback/blur, nezavisni scroll, mobilni prikaz i reduced motion; zadržani stilovi postojećih poruka/kartica. |
| `style.css` | Centralni slojevi i usko podizanje stvarnog modalnog hosta. |
| `script.js` | Creator oznake i uklanjanje page lifecycle veze koja je prekidala chat. |
| `js/mentor/mentor-chat.js` | Globalni root, otvaranje/minimizacija, izolacija događaja, kompatibilni javni ulazi. |
| `js/mentor/mentor-chat-view.js` | Prezentaciono stanje otvorenosti, ARIA/inert/fokus i VisualViewport tastatura. |
| `js/i18n/mentor.js` | Novi SR/EN tekstovi floating kontrola. |
| `js/i18n/sr-core.js`, `js/i18n/en-core.js` | Vraćanje Creator naziva u navigaciju. |
| `research.js` | Uske zaštite postojećih capture handlera; bez promene domenskog sticker modela. |
| `lazyLoader.js` | Nova cache verzija izmenjenog Research fajla. |
| `tests/mentor/floating-chat.test.js` | Šest ciljanih white-box regresija. |
| `tests/mentor/browser-check.js` | Usklađivanje starog page UI očekivanja sa launcherom i Creatorom. |
| `tests/mentor/inventory-browser-check.js`, `tests/mentor/write-browser-check.js`, `tests/mentor/recipe-browser-check.js` | Eksplicitno otvaranje globalnog chata u postojećim opt-in runnerima. |
| `docs/MENTOR_CHAT.md` | Aktuelni UI ulaz i linkovi ka isporuci/reviziji. |
| `docs/MENTOR_FLOATING_CHAT_V1.md` | Ovaj izveštaj i ručne provere. |
| `docs/MENTOR_CONVERSATION_CONTEXT_AUDIT.md` | Odvojena revizija toka B; bez implementacije budućih funkcija. |

## Tehničke provere

`tests/mentor/floating-chat.test.js` koristi stvarni controller/view u VM-u sa uskim DOM/transport/repository dvojnicima. Proverava jedinstveni DOM/repository, i18n, kontinuitet draft-a i aktivnog odgovora pri navigaciji/Creatoru/minimizaciji, inert/fokus/Escape/izolaciju, eksplicitni Stop i Research capture zaštitu. Ovo nije browser layout niti real-model test.

Konačni `npm test` rezultati: Mentor **100/100**, Storage **38/38**, Nutrition **35/35**, Research **139/148**. Mentor uključuje šest novih regresija. Ukupna komanda završava neuspehom zbog istih devet Research neuspeha koji su postojali pre promene: pet selekcija/drag testova i četiri `sections.renderIcon` slučaja. Njihovo otklanjanje nije deo ovog zadatka.

Dodatno: svih 13 izmenjenih/dodatih JavaScript fajlova uspešno je parsirano; lokalni HTML asset linkovi postoje. Poređenje sa snimkom pre implementacije potvrđuje da je ceo postojeći Creator podskup HTML-a sačuvan, uz uklanjanje `hidden` samo sa njegovog wrappera. Završni read-only review nije našao preostalu konkretnu blokadu.

Opt-in browser runneri su prilagođeni, ali nisu pokretani. Nisu pozivani stvarni modeli niti korisnički browser profil. Stvarne dimenzije, blur, modalno hit-testiranje i mobilna tastatura čekaju korisničke Black-Box provere.

## Tok A — konkretni ručni Black-Box testovi

Priprema: pokrenuta aplikacija na istom origin-u kao dosadašnji podaci. Za model odgovore potreban je postojeći konfigurisan provider. Koristiti probne unose; potvrdu upisa dati samo kada želiš da probni zapis zaista bude sačuvan. Po potrebi sačuvati uobičajeni backup i poseban chat export.

Svaki red navodi korake, očekivani rezultat i kriterijum prolaza.

1. **Dashboard ikonica:** Otvori Dashboard. Prolaz: okrugli postojeći portret je dole desno, klikabilan i ne menja aktivni modul.
2. **Širina panela:** Otvori chat i izazovi razjašnjenje. Prolaz: istorija i bočni „Pregled stavki“ imaju istu širinu, po `25vw`, i istu visinu. Zajedno zauzimaju oko polovine ekrana plus razmak; unos/portret imaju dodatni prostor. Prvo se izvlače text box i Pošalji, zatim istorija raste nagore. Desktop visina ostaje oko 25–30%. Istorija je centrirana prema textarea polju i uvučena po 10% njegove širine sa obe strane; pozadina je 50% sa blur-om 35px. Pri reduced-motion postavci nema animacije.
3. **Čitljivost:** Otvori chat preko svetlog i tamnijeg sadržaja. Prolaz: tekst/input/kontrole su čitljivi; blur je blag kada je podržan, a bez njega površina ostaje čitljiva.
4. **Nezavisni scroll:** Pripremi dužu istoriju i modul sa scroll-om. Skroluj prvo poruke do oba kraja, zatim pozadinski modul izvan panela. Prolaz: chat ne povlači pozadinu i pozadina ne pomera istoriju; otvaranje samo po sebi ne zaključava stranicu.
5. **Postojeći razgovor:** Pošalji običnu poruku; probaj Enter i Shift+Enter. Prolaz: jedan user/assistant par, Shift+Enter pravi novi red, Stop/retry se ponašaju kao ranije. Za lokalni upit probaj „Šta imam u frižideru?“ i odgovori na postojeću dozvolu.
6. **Nutrition i nacrt:** Upiši neposalati tekst, označi deo teksta, pređi u Nutrition. Prolaz: isti razgovor i tekst ostaju; fokusiranje input-a ne bira panel i ne briše nacrt. Ako odgovor još traje, promena modula ga ne prekida.
7. **Finance/Brainstorming/Research:** Iz otvorenog razgovora pređi redom u te module. Prolaz: globalni chat i istorija ostaju isti, bez novih razgovora ili dupliranih poruka.
8. **Minimizacija:** Tokom odgovora minimizuj chat i ponovo ga otvori; ponovi sa neposalatim tekstom. Prolaz: odgovor nije otkazan, tekst ostaje, kontrole rade; Tab ne ulazi u minimizovani panel. Escape prvo zatvara otvorene opcije, pa panel.
9. **Refresh/restart:** Sačuvaj poslatu razmenu, osveži stranicu i otvori ikonicu. Prolaz: sačuvani razgovor može se izabrati i poruke ostaju. Ne očekuje se trajni neposalati nacrt ili automatski nastavak prekinutog generisanja. Ako je ranije postojao lease, sačekaj njegov istek pre retry-a.
10. **Creator:** Otvori Creator ciljeva u navigaciji i prođi postojeće kategorije/pitanja. Prolaz: Creator radi samostalno; raniji ciljevi su netaknuti, novi probni cilj čuva se postojećim tokom. Prečica iz chat headera vodi na isti Creator bez prekida odgovora.
11. **Stikeri i slojevi:** Otvori Brainstorming/Research sa više stikera i menijima. Prolaz: običan sadržaj i drag preview ne prekrivaju ikonicu, tekst ili kontrole Mentora.
12. **Interakcije iznad stikera:** Dok je chat iznad boarda, klikći kontrole, kucaj, selektuj tekst i skroluj. Posebno aktiviraj povezivanje stikera pa klikni chat. Prolaz: nema neplaniranog povezivanja, brisanja ili pomeranja stikera; fokus ostaje u chatu.
13. **Dijalozi i potvrde:** Otvori Finance/Nutrition formu i stvarnu potvrdu brisanja. Prolaz: blokirajući dijalog je vidljiv i može primiti potvrdu/odbijanje iznad chata. Zatvori ga ili promeni modul kada je dozvoljeno; običan sadržaj ne sme ostati iznad chata zbog skrivenog dijaloga.
14. **Tablet/mobilni:** Probaj uski ekran, landscape i otvorenu soft tastaturu. Prolaz: input, slanje, minimizacija i opcije ostaju dostupni, nema horizontalnog bežanja panela; poruke i opcije se mogu skrolovati. Browser-native select mora moći da se otvori i zatvori.
15. **Regresija funkcija i bezbednost:** Promeni SR/EN; izaberi/napravi razgovor, odbij brisanje, izvezi chat, izaberi cilj za deljenje. Probaj Nutrition write preview i odbij ga. Prolaz: prevodi i kontrole rade, odbijanje ne upisuje podatke. Proveri postojeće Calendar, Finance, Nutrition i Research tokove; tema i podaci su očuvani.

## Pregled stavki i neposredan izbor — 29. oktobar 2026.

Tokom lokalnog Nutrition razjašnjenja otvara se poseban stakleni panel „Pregled stavki“ levo od istorije. Pitanje i izbori su na vrhu, pregled svih stavki ispod, sa sopstvenim scroll-om. Istorija i taj panel imaju po `25vw` i istu visinu; zajedno koriste oko pola ekrana, uz dodatni prostor za unos i portret, prema poslednjoj korisničkoj doradi.

Klik na izbor odmah obrađuje postojeći lokalni nastavak. Ne popunjava/ne šalje neposalati nacrt iz composer-a, ne poziva model za novo rutiranje i ne potvrđuje upis zaliha. Sam klik odobrava nastavak istog lokalnog pitanja; početni zahtevi i širenje opsega čitanja zadržavaju postojeće dozvole. Završni predlog i dalje traži posebno Approve/Odobri. Ponuđeni izbori rade i za read disambiguation, inventory food/batch i izbor stavke za korekciju.

Controller proverava svež razgovor, poslednju assistant poruku, task ID/verziju i otvoreno pitanje. `reserve` ponavlja proveru unutar postojeće IndexedDB transakcije i čuva lokalni binding za bezbedan retry. Promenjen/zastareo izbor ne dodaje novu poruku i ne prevezuje parametre druge stavke. Nema nove baze, sheme, AI sposobnosti ili paralelnog pipeline-a.

Nova poruka/verzija zadatka dovodi najnoviji tekst u vidljivi deo istorije. Bočni panel počinje od novog pitanja; nepromenjeni refresh čuva scroll i identitet dugmeta. Posle klika fokus može pratiti sledeće pitanje uz `preventScroll`, a aktivno kucanje u nacrtu ima prednost. Pitanje koristi polite live region.

Izmenjeni fajlovi ove dorade:

- `index.html`: markup bočnog panela i cache verzije.
- `mentor-chat.css`: bočni panel, isti glass efekat i jednake uvećane dimenzije panela.
- `js/mentor/mentor-chat.js`: direktni, provereni lokalni izbor bez prepisivanja nacrta.
- `js/mentor/mentor-chat-view.js`: pregled/pitanja/izbori, fokus, čuvanje čvorova i praćenje novog teksta.
- `js/mentor/mentor-conversations.repository.js`: transakciona provera binding-a pri rezervaciji, bez izmene šeme.
- `js/mentor/mentor-nutrition-inventory-resolver.js`: ponuđeni izbor stavke za prethodno zatraženu korekciju.
- `js/i18n/mentor.js`: SR/EN oznake i uputstva bočnog panela.
- `tests/mentor/chat-view.test.js`: šest fokusiranih view/fokus/scroll provera.
- `tests/mentor/floating-chat.test.js`: direktni klik, nacrt, dupli klik, zastarela verzija i bound read.
- `tests/mentor/conversations.test.js`: transakcioni race/retry guard i odbijanje izbora posle novije teme.
- `docs/MENTOR_FLOATING_CHAT_V1.md`: ovaj zapis i ručne provere.

Provere: Mentor **136/136**, Storage **38/38**, Nutrition **35/35**; Research ostaje **139/148**, sa istih devet prethodnih neuspeha. Browser i stvarni provider nisu pokretani za ovu doradu. Vizuelna veličina/blur i stvarni touch/fokus ostaju korisnički Black-Box testovi.

Konkretne ručne provere:

1. Unesi `Dodaj 1 kg pirinča; 2 l mleka u frižider`. Ako katalog nudi više vrsta pirinča, očekuj „Pregled stavki“ levo od istorije, iste širine/visine, sa aktuelnim izborom na vrhu. Ako je namirnica jednoznačna, panel treba da postavi nedostajuće pitanje o lokaciji.
2. Dok je pitanje otvoreno, upiši probni neposalati nacrt. Klikni jednu ponuđenu namirnicu. Očekivanje: izbor je odmah obrađen, nacrt ostaje netaknut, a sledeće pitanje se vidi bez ručnog Send za izabranu opciju.
3. Odgovori `u ostavu` kada se pita za lokaciju pirinča. Očekivanje: podaci mleka ostaju isti; kada je sve razjašnjeno, bočni panel se zatvara, završni pregled je u istoriji i ništa nije sačuvano pre posebne potvrde.
4. Skroluj staru istoriju nagore pa pošalji novu poruku. Očekivanje: najnoviji odgovor je vidljiv. Osvežavanje nepromenjenog pitanja ne treba da izbacuje fokus sa izabranog dugmeta ili resetuje ručni scroll.
5. U dva taba promeni otvoreno pitanje/verziju u jednom, pa klikni stari izbor u drugom. Očekivanje: izbor se odbija kao zastareo umesto da promeni sledeću/drugu stavku.
6. Minimizuj/otvori chat i promeni modul. Očekivanje: isti zadatak/razgovor ostaju, nema dodatnog chatbot-a ili automatskog upisa; bočni panel prati vidljivost chata.

## Sledeća faza

Prvo korisnički UI rezultati i eventualne uske popravke toka A. Task Context Manager, Recovery, summary i Application Context Bridge zahtevaju zasebno odobrenje; pogledati odvojeni audit toka B.

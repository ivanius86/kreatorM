# MENTOR APP — FOUNDATION BLUEPRINT V1

## 0. Važna napomena za Codex

Ovo je arhitektonski blueprint za postepeni razvoj postojeće Mentor aplikacije u vanilla JavaScript-u. Nije zadatak da se aplikacija gradi ponovo.

Postojeća aplikacija, njeni funkcionalni moduli, Data Layer, IndexedDB/repositories i lazy loading ostaju osnova MVP-a. React nije obavezna faza: može se razmotriti kasnije samo ako konkretna potreba opravda promenu prezentacionog sloja, uz očuvanje domena i korisničkih podataka.

Postojeći fajlovi su aktivni delovi aplikacije i polazne tačke za ograničena poboljšanja:

* `index.html` kao mapa postojećih ekrana i UI sekcija
* `script.js` kao izvor goal builder i navigation logike
* `brainstorming.js` kao izvor idea modela i board logike
* `research.js` kao izvor research/reference/test modela
* `finansije.js` kao izvor finance modela, calculation logike i comparison koncepta
* `kalendar.js` kao izvor calendar/goal scheduling logike
* `lazyLoader.js` kao postojeći mehanizam učitavanja modula po potrebi
* `js/data/*` kao postojeći Data Layer, sa repositories, IndexedDB/Dexie, kompatibilnošću, migracijom i backupom
* `storageService.js` kao postojeća kompatibilnost sa starijim skladištem
* `js/i18n/*` kao postojeći jezički sistem

Razvijati module inkrementalno. Zadržati korisne granice između poslovne logike, podataka, stanja i prikaza; postojeće globalne i `innerHTML` obrasce poboljšavati samo u okviru potrebnih MVP izmena. Ne započinjati React migraciju niti paralelnu aplikaciju. Sistem ostaje modularan i local-first, sa mogućnošću kasnijeg backend-a i premium cloud save-a.

---

# 1. Product Vision

Mentor aplikacija treba da bude kompletan **personal life operating system** i **mentor / decision platforma**.

Aplikacija nije običan task manager, nije samo planer ciljeva i nije samo finance tracker.

Ona treba da pomogne korisniku da vodi, razume i razvija svoj život kroz:

* ideje
* istraživanje
* planiranje
* donošenje odluka
* finansije
* kalendar
* dnevnik
* refleksiju
* mentorisanje
* praćenje stanja
* predviđanje pravca kretanja
* ostvarenje ideja i ciljeva

Dugoročno, Mentor treba da postane platforma koja može podržati:

* personal life operating system
* mentor decision sistem
* productivity planner
* kolaboraciju na idejama
* marketplace za teme
* marketplace za template-e
* premium widgete
* premium toolove
* cloud save
* mentor treninge
* personalizovane mentor profile
* mogućnost da mentori prodaju treninge kroz aplikaciju

Marketplace, AI Mentor, kolaboracija i mentor treninzi nisu deo MVP-a. Oni se planiraju za kasnije verzije, verovatno V2 ili V3.

---

# 2. Core Product Definition

Core proizvod:

Mentor aplikacija je kompletan personalni operating system koji kombinuje mentor/decision sistem sa alatima za ideje, istraživanje, planiranje, kalendar, dnevnik, finansije i praćenje životnog pravca.

Glavna svrha aplikacije je da pomogne osobi da jasnije razume svoj život, ideje, ciljeve, odluke, finansijsko stanje i pravac u kojem se kreće.

Aplikacija pokriva faze:

1. Ideja
2. Istraživanje
3. Testiranje
4. Planiranje
5. Mentor/decision proces
6. Finansijsko poređenje
7. Kalendar i akcioni koraci
8. Dnevnik i refleksija
9. Prikaz trenutnog stanja
10. Predviđanje pravca kretanja
11. Ostvarenje / realizacija

Važno:

Mentor ne sme biti običan planer. Mora biti modularni personal operating system.

---

# 3. Korisnici

## 3.1 Prva faza

Prva verzija aplikacije koristiće se od strane kreatora aplikacije i oko 10 test korisnika.

Cilj ove faze:

* testiranje osnovne arhitekture
* testiranje korisničkog toka
* otkrivanje bugova
* testiranje language sistema
* testiranje storage/data modela
* validacija da li korisnici razumeju module
* validacija da li korisnici vide vrednost aplikacije

Nakon test faze, aplikacija se planira za javno korišćenje na website-u:

`kreatorm.com`

## 3.2 Ciljni korisnici

Ciljna grupa nije ograničena godinama.

Aplikacija je namenjena svakome ko želi da bolje razume, organizuje i vodi svoj život, ideje, ciljeve, odluke, finansije i pravce.

Potencijalni korisnici:

* pojedinci koji žele bolji životni sistem
* studenti
* preduzetnici
* kreatori
* ljudi koji razvijaju ideje
* ljudi koji žele finansijsku jasnoću
* ljudi koji žele bolji sistem planiranja
* ljudi koji žele bolje donošenje odluka
* ljudi koji žele productivity/life dashboard
* kasnije timovi koji rade na idejama

## 3.3 Kolaboracija

Kolaboracija nije deo MVP verzije, ali arhitektura treba da bude spremna da je kasnije podrži.

Budući kolaboracioni sistem:

* više ljudi može raditi na jednoj ideji
* glavni korisnik / owner / mentor može pozvati druge korisnike
* ideja može imati vizuelnu prezentaciju
* saradnici mogu doprinositi razvoju, istraživanju i planiranju ideje
* kolaboracija treba da bude dodatak na idea/research workspace
* kolaboracija ne sme biti osnova MVP verzije

U MVP-u sistem može biti single-user, ali data model treba kasnije da podrži:

* `ownerId`
* `workspaceId`
* `members`
* `roles`
* `permissions`
* `sharedIdeaId`

---

# 4. MVP Scope

MVP verzija treba da sadrži sve glavne module, ali svaki modul može početi sa basic funkcionalnom verzijom.

Glavni MVP moduli:

* Dashboard
* Brainstorming
* Goals Creator
* Finance
* Journal
* Calendar
* Settings
* Language system
* Backup/export/import
* osnovni dashboard widget system

Svaki modul može imati unutrašnje tabove.

Primeri:

## Brainstorming

* Ideje
* Istraživanje
* Ostvarenje / realizacija

## Goals Creator

* Kreiranje cilja
* Planiranje
* Koraci
* Pregled cilja

## Finance

* Pregled
* Transakcije
* Budžet
* Finansijsko poređenje
* Imovina / kapital

## Journal

* Dnevnik
* Refleksija
* Check-in

## Dashboard

* standardni layout
* widget slotovi
* zamena widgeta
* fast action button

Važno:

MVP može imati sve module, ali ne mora imati sve advanced funkcije.

Ne praviti odmah prekompleksan sistem.

Prvo napraviti osnovne funkcionalne verzije modula.

---

# 5. Šta nije deo MVP-a

Ne raditi u MVP-u:

* AI Mentor
* marketplace
* premium theme marketplace
* mentor treninge
* personalizovane mentor profile
* prodaju treninga
* full collaboration system
* više workspace-a
* kompleksan backend
* cloud save kao aktivna funkcija
* subscription billing
* full drag-and-drop dashboard builder
* advanced finance import/export
* live asset refresh ako komplikuje MVP
* potpuno custom theme system

Ove stvari treba predvideti u arhitekturi, ali ih ne implementirati u MVP-u.

---

# 6. Monetizacija / Product Offers

Kasnije aplikacija može podržavati:

* teme / drugačiji izgled aplikacije
* različite dashboard layout-e
* widget pakete
* premium alate
* dizanje limita
* productivity template-e
* goal planning template-e
* finance premium module
* digitalne proizvode
* subscription model
* cloud save kao premium benefit
* marketplace za teme/template-e
* mentor treninge
* personalizovane mentor profile

AI Mentor se ostavlja po strani za sledeću veću verziju ili update.

Arhitektura treba da bude spremna za:

* `userPlan`
* `entitlements`
* `featureFlags`
* `usageLimits`
* `premiumAccess`
* `storageMode`

Primer:

Free plan:

* local save
* ograničen broj ideja
* osnovni dashboard
* osnovni finance pregled

Premium plan:

* cloud save
* više ili neograničeno ideja
* premium widgeti
* premium teme
* advanced finance
* financial comparison
* advanced projections

U MVP-u ne mora da postoji aktivna naplata, ali architecture layer treba da bude spreman za kasniji entitlement sistem.

---

# 7. Theme Strategy

## 7.1 MVP tema

MVP verzija treba da zadrži trenutni theme style koji je već napravljen u postojećoj aplikaciji.

Cilj MVP-a je završetak funkcionalnih modula i stabilizacija postojeće aplikacije, bez redesign-a.

MVP tema:

* koristi postojeći vizuelni pravac
* jedna default tema
* nema više tema u MVP-u
* nema theme marketplace-a
* nema premium tema u MVP-u

## 7.2 Future theme system

Nakon MVP-a, teme mogu postati premium update.

Dugoročno, teme mogu menjati:

* vizuelni stil
* layout
* osećaj korišćenja
* stil mentora
* način prikaza ciljeva
* način prikaza ideja
* dashboard experience
* korisnički doživljaj

Premium teme mogu biti dostupne premium korisnicima.

Teme ne treba da budu samo promena boja. One mogu biti experience paketi.

Primeri:

* warm mentor
* dark pro
* premium minimal
* productivity dashboard
* finance command center
* cozy journal
* creator mode
* student mode
* entrepreneur mode

## 7.3 Redosled i granica rada

Implementacija sistema tema čeka završetak i stabilizaciju MVP funkcija. Tokom novih MVP izmena koristiti stabilne ID-jeve panela ili semantičke `data-panel` / `data-action` atribute. Poslovna logika, sačuvani podaci i i18n ključevi ne smeju zavisiti od izgleda, veličine, položaja ili DOM redosleda panela. Postojeće zavisnosti su evidentirane u `docs/THEME_READINESS_BACKLOG.md`; nema širokog pripremnog refaktorisanja sada.

## 7.4 Theme Engine Architecture — plan posle MVP stabilizacije

```text
MENTOR APPLICATION
        |
     APP CORE
        |
   THEME ENGINE
        |
   THEME REGISTRY
        |
   THEME ADAPTER
        |
    LAYOUT SLOTS
        |
   THEME PACKAGES
        |
  STOIC | MILITARY | MINIMAL
```

Ovo je ciljna zavisnost prezentacionog sloja, ne novi tok poslovnih podataka. Postojeći dizajn postaje prva potpuno funkcionalna podrazumevana Theme Package konfiguracija; Stoic, Military i Minimal su primeri budućih paketa, ne obaveza MVP-a.

**Theme Engine** je jedino mesto za aktivaciju, promenu i upravljanje temama. Promena teme treba da se desi bez osvežavanja aplikacije i bez ponovnog učitavanja domenskih podataka kada nisu promenjeni. Engine selektivno ažurira tokene, layout i prikaz, uz minimalne DOM izmene; čuva aktivnu stranicu, stanje modula, fokus, tekst u toku uređivanja, scroll i korisničke interakcije. Ne sme nepotrebno ponovo inicijalizovati module ili praviti duple listenere.

**Theme Registry** čuva identifikatore, verzije, manifest, kompatibilnost i konfiguracije dostupnih paketa. Neuspešno ili nekompatibilno učitavanje vraća postojeću podrazumevanu temu bez gubitka stanja. Registry ne čuva poslovne podatke.

**Theme Adapter** povezuje postojeće funkcionalne module sa prikazom izabrane teme. Brainstorming, Research, Goals, Finance, Calendar i Journal dele istu poslovnu logiku, stanje i Data Layer u svim temama. Adapter izlaže stabilne identitete panela i akcija, mere prikaza i ograničene lifecycle pozive; tema ne menja IndexedDB direktno, ne uvodi sopstveno čuvanje i ne kopira poslovnu logiku.

**Layout Slots** su imenovane pozicije: Header, Sidebar, Navigation, Main Content, Secondary Panel, Dashboard Widgets i Floating Actions. Tema može promeniti raspored i navigacioni prikaz kroz slotove bez promene poslovnih operacija. Vizuelni redosled mora ostati usklađen sa redosledom tastature i čitača ekrana. Modul zadržava vlasništvo nad svojim interaktivnim čvorovima; pri premeštanju ili zameni slot mora sačuvati ili pravilno vratiti stanje i fokus.

**Theme Package** zasebno definiše design tokens, tipografiju, boje, ikonografiju, raspored panela, navigacioni prikaz, stil komponenti, animacije i vizuelno ponašanje. Paketi mogu menjati iskustvo i raspored, ne samo CSS. Definišu desktop, tablet i mobile varijante i lokalni fallback za obavezne vizuelne resurse. Izgled mentora/persona može imati zaseban identitet i ugovor da promena teme ne prepiše korisnikov izbor.

Paketi se učitavaju po potrebi i keširaju po ID-u/verziji. Engine primenjuje samo potrebne izmene i predviđa lifecycle hooks za aktivaciju i deaktivaciju, uključujući cleanup event listener-a, observer-a, timera i animacija. Ako se komponenta zameni, njen prethodni lifecycle mora se završiti pre nove inicijalizacije; ako se samo premesti, ne sme se bez potrebe rekreirati. Promena teme ne sme izazvati nepotrebne refresh-e, reset canvas koordinata ili gubitak korisničkog stanja.

Podešavanje aktivne teme, kada se uvede, prolazi kroz postojeći settings repository i backup/migration ugovore. Tema nema sopstveni storage sistem. Theme Marketplace, premium pristup i naplata ostaju kasnije faze.

## 7.5 Odluke za potvrdu pre implementacije

Pre Faze 3 treba potvrditi: granice između Theme Package, layout konfiguracije i izgleda mentora; format i kompatibilnost manifesta; tačan settings/backup ugovor za aktivnu temu; koje promene canvas geometrije podržava Theme Adapter; pravila za lokalne/offline resurse; i minimalni skup responsive layout-a. Ove odluke ne blokiraju završavanje MVP funkcija po pravilima iz §7.3.

---

# 8. Widget Strategy

Widgeti u MVP-u treba prvenstveno da budu dashboard paneli.

Dashboard nije potpuno statičan. Korisnik treba da može da zameni jedan widget drugim.

Widget može biti:

* informativni panel
* mini pregled podataka
* mali mini-tool
* mini forma za brzi unos
* mini analiza

Primeri widgeta:

* goal progress
* finance summary
* mini transakcije
* idea overview
* dnevnik/refleksija
* calendar today
* budget impact
* research status
* life direction
* habit/streak kasnije

Dashboard treba da ima i fast action button dole desno.

Fast action menu može imati opcije:

* nova ideja
* nova transakcija
* novi journal unos
* novi cilj
* nova beleška
* novi calendar event

Za MVP nije potreban full drag-and-drop dashboard builder.

Dovoljno je:

* standardni dashboard layout
* widget slotovi
* replace widget opcija
* izbor dostupnih widgeta
* quick action button

Konceptualni raspored widgeta (nije trenutna storage šema):

```js
dashboardLayout = {
  userId: "local-user",
  layoutId: "default",
  widgets: [
    {
      slotId: "primary-summary",
      widgetId: "goal-progress",
      size: "medium"
    },
    {
      slotId: "finance-summary",
      widgetId: "finance-summary",
      size: "medium"
    },
    {
      slotId: "recent-activity",
      widgetId: "mini-transactions",
      size: "large"
    }
  ]
};
```

Arhitektura:

```text
Dashboard
  -> WidgetRegistry
  -> DashboardLayout
  -> WidgetSlot
  -> QuickActionMenu
```

`slotId` označava ulogu sadržaja, ne koordinate. Buduća tema određuje gde će se slot prikazati, a widget zadržava isti identitet i izvor podataka.

---

# 9. Backend / Storage Strategy

## 9.1 MVP storage

MVP ostaje local-first. Postojeći Data Layer u `js/data/*` već ima repositories, Dexie/IndexedDB bazu, lokalne adaptere, migraciju, backup i kompatibilnost sa starijim `localStorage` podacima. Ne uklanjati ih niti uvoditi paralelno skladište. Izbor aktivnog repository-ja zavisi od postojećeg data bootstrap-a i migracionog stanja.

Ali arhitektura mora od početka biti pripremljena za ozbiljan backend.

Dugoročno:

* free plan koristi local save
* jeftiniji plan koristi local save uz neke dodatne benefite
* premium plan može imati cloud save
* cloud sync / cloud backup postaje premium benefit
* backend se uvodi kasnije bez rušenja core aplikacije

## 9.2 Data access pravilo

UI moduli ne smeju direktno menjati `localStorage` ili IndexedDB mimo postojećeg Data Layer-a. Koriste odgovarajući repository/service; postojeći legacy pristup se uklanja samo kroz zasebnu, proverenu migraciju.

Pravilo:

```text
UI / Feature -> Domain Service / Repository -> aktivni Storage Adapter
```

Primer:

```text
Goals modul
  -> goalsRepository
    -> postojeći lokalni adapter (IndexedDB ili kompatibilni localStorage tok)
    -> cloud adapter tek kada se uvede backend
```

Za budući backend odmah predvideti polja:

* `userId`
* `workspaceId`
* `planType`
* `storageMode: "local" | "cloud"`
* `syncStatus`
* `lastSyncedAt`
* `schemaVersion`

U MVP-u ne moraju sva polja biti aktivna, ali data model treba da bude spreman.

---

# 10. Data Architecture

## 10.1 Workspace model

Za početnu verziju, svaki korisnik ima jedan glavni personal workspace.

Workspace je unapred strukturisan.

U MVP-u korisnik ne menja strukturu celog workspace-a.

Jedini deo koji korisnik može personalizovati je Dashboard, gde može koristiti standardni layout ili zamenjivati/dodavati widgete.

Kasnije se može razmatrati više workspace-a, ali to nije deo MVP-a niti prvih update-a.

Konceptualni model budućih veza (nije zahtev za izmenu postojeće storage šeme):

```text
User
  Workspace
    Dashboard
    Ideas
    Goals
    Finance
    Journal
    Calendar
    Settings
```

## 10.2 Idea kao centralni objekat

Ideja je jedan od centralnih objekata aplikacije.

Ideja nije samo tekstualna beleška.

Jedna ideja može imati:

* osnovne informacije
* status
* kategoriju
* tagove
* istraživanje
* reference
* testiranje
* finansijsko poređenje
* predviđanje / projekciju
* plan ostvarivanja
* povezane ciljeve
* povezane calendar evente
* povezane journal zapise
* realizaciju / execution state

Ideja je radni objekat koji korisnik može:

* analizirati
* istraživati
* testirati
* porediti
* finansijski proceniti
* planirati
* sprovesti u akciju
* pratiti kroz ostvarenje

Konceptualni model ideje (nije trenutna storage šema):

```js
idea = {
  id: "idea_001",
  workspaceId: "workspace_001",
  ownerId: "local-user",
  title: "Example idea",
  description: "",
  status: "draft", 
  stage: "idea",
  category: "",
  tags: [],
  createdAt: "",
  updatedAt: "",

  research: {
    directions: [],
    references: [],
    notes: []
  },

  tests: [],

  financialComparisons: [],

  forecasts: [],

  execution: {
    planId: null,
    goalIds: [],
    calendarEventIds: [],
    status: "not-started"
  },

  metadata: {
    source: "manual",
    archived: false
  }
};
```

## 10.3 Workspace structure

Konceptualna glavna struktura (nije zamena za postojeću IndexedDB šemu ili repositories):

```js
mentorDatabase = {
  schemaVersion: 1,
  user: {
    id: "local-user",
    planType: "free",
    storageMode: "local"
  },
  workspace: {
    id: "workspace_001",
    name: "Personal Workspace",
    type: "personal",
    createdAt: "",
    updatedAt: ""
  },
  settings: {},
  dashboard: {},
  ideas: [],
  goals: [],
  finance: {},
  journal: [],
  calendar: [],
  metadata: {}
};
```

---

# 11. Layer Architecture

Postojeća aplikacija se dalje razvija kroz jasne slojeve. Granice su logičke i ne zahtevaju novu aplikaciju ili masovno premeštanje fajlova.

## 11.1 Domain Layer

Domain layer definiše šta aplikacija zna.

Primeri domena:

* User
* Workspace
* Idea
* Research
* Reference
* IdeaTest
* Goal
* CalendarEvent
* Finance
* Transaction
* Budget
* Asset
* Debt
* FinancialComparison
* JournalEntry
* DashboardWidget
* Theme
* Entitlement

Domain layer ne zna ništa o UI dizajnu.

## 11.2 Data Layer

Data layer zna kako se podaci čuvaju, učitavaju, validiraju i migriraju.

Data layer treba da sadrži:

* postojeću Dexie/IndexedDB bazu i kompatibilni localStorage adapter
* postojeće repositories i servise
* migraciju, validaciju i oporavak
* backup/export/import
* verzionisanje šeme

UI ne sme da zaobilazi aktivni repository direktnim upisom u storage.

## 11.3 App State Layer

App state layer kontroliše:

* aktivni workspace
* aktivni jezik
* aktivnu stranicu/rutu
* otvorene modale
* dashboard layout i buduću aktivnu temu
* session UI state
* user settings

Globalni state treba koristiti oprezno.

Domenske podatke držati kroz repositories i servise modula. UI state čuvati na mestu čiji lifecycle odgovara prikazu, bez nepotrebnog globalnog stanja.

## 11.4 UI Component Layer

Ponovo upotrebljivi UI obrasci/kontrole, postojeći ili budući:

* Button
* Card
* Modal
* EmptyState
* Tabs
* Input
* Select
* Textarea
* PageContainer
* SectionHeader
* WidgetCard
* StatCard
* DataTable
* FormField

UI kontrole ne treba da sadrže poslovnu logiku. U vanilla JS-u DOM je legitimni prezentacioni mehanizam, uz selektivne izmene, stabilne identitete i cleanup handlera. Tekstualni input, textarea, select i contenteditable ostaju terminalni ciljevi događaja; interakcija sa njima ne pokreće parent selekciju, navigaciju ili rerender.

## 11.5 Theme Layer

MVP koristi postojeći vizuelni stil. Budući Theme Engine iz §7 upravlja paketima, layout slotovima i lifecycle-om prikaza; boje i tokeni su samo deo tog ugovora. Tema nikada nije vlasnik poslovne logike ili podataka.

## 11.6 Feature Layer

Feature layer sadrži glavne module:

* dashboard
* goals
* brainstorming
* research
* finance
* journal
* calendar
* settings

Svaki feature može imati svoje UI kontrole, lokalno stanje, servise, pomoćne funkcije, konstante i tabove kada su potrebni. Nema zahteva za React hooks ili paralelno prepisivanje već funkcionalnih modula.

## 11.7 Product / Entitlement Layer

Ovaj layer nije aktivan u MVP-u, ali treba da bude predviđen.

Kasnije će kontrolisati:

* free/premium plan
* cloud save access
* usage limits
* premium widgets
* premium themes
* premium templates
* advanced tools
* mentor marketplace access

## 11.8 Integration Layer

Kasnije integracije:

* backend API
* auth
* payments
* analytics
* AI Mentor
* cloud sync
* marketplace
* collaboration

U MVP-u ovaj layer može biti minimalan.

---

# 12. Language / I18N Architecture

Aplikacija već koristi jezički sistem u `js/i18n/*`, sa sr/en rečnicima i `provider.js`. Njega razvijati inkrementalno, bez paralelnog providera.

Podržani jezici:

* Serbian / sr
* English / en

Pravila:

* Sav novi UI tekst ide kroz postojeći prevodilački API (`t()` / postojeći i18n binding).
* Ne hardkodovati UI tekst direktno u modulima.
* Aktivni jezik ima jedan izvor istine.
* Language mora biti deo settings-a.
* Language mora biti spreman za per-user settings kasnije.
* Fallback mora biti dosledan.
* Sačuvati postojeći `data-i18n` tamo gde radi; nove kontrole povezati semantičkim ključevima, bez pozicionih selektora.

Postojeća osnova:

```text
js/i18n/
  provider.js
  sr-core.js
  sr-builder-calendar.js
  sr-brainstorming-research.js
  sr-finance.js
  en-core.js
  en-builder-calendar.js
  en-brainstorming-research.js
  en-finance.js
```

Aktivni jezik prolazi kroz postojeći settings repository i i18n provider. Tema menja prikaz prevedenog teksta, ne prevode ili jezičko stanje. UI ne pristupa direktno skladištu radi promene jezika.

---

# 13. Existing Structure and Planned Boundaries

Postojeća implementacija je vanilla JavaScript aplikacija. Ova mapa opisuje aktivne ulazne tačke; nije nalog za novu strukturu foldera ili React aplikaciju.

```text
index.html                 ekrani, semantički paneli i skripte
style.css                  postojeći vizuelni stil
script.js                  App Core, navigacija i glavni UI
lazyLoader.js              učitavanje funkcionalnih modula po potrebi
brainstorming.js           ideje i board
research.js, js/research/  istraživanje i research canvas
kalendar.js                kalendar i planiranje
finansije.js               finansije i poređenja
financeDashboard.js        finansijski pregled
js/nutrition/              ishrana
js/data/                   repositories, adapteri, IndexedDB, migracija, backup
storageService.js          kompatibilnost sa starijim skladištem
js/i18n/                   sr/en rečnici i jezički provider
```

Logičke granice za dalje širenje su App Core, funkcionalni moduli, Domain Services, Data Layer, i18n i prezentacioni sloj. Novi moduli koriste postojeće repositories i lazy loading; ne vezuju poslovne operacije za izgled, dimenzije, poziciju ili DOM redosled panela. Kontrole i paneli dobijaju stabilne ID-jeve ili semantičke `data-panel` / `data-action` identitete. Postojeći funkcionalni kod se ne premešta samo radi ove mape.

Planirani, odloženi sloj tema može se kasnije organizovati kao Theme Engine, Theme Registry, Theme Adapter, Layout Slots i zasebni Theme Packages. To je granica odgovornosti, ne trenutno stanje repozitorijuma. React, ako ikada bude opravdan, ostaje opciona tehnologija prezentacionog sloja i ne menja ove ugovore.

---

# 14. Feature Module Rules

Svaki feature treba da bude samostalan koliko je moguće.

Feature može koristiti:

* zajedničke UI kontrole i semantičke panel/action identitete
* postojeće repositories i domenske servise
* postojeći i18n i pomoćne funkcije
* prezentacione tokene kada se uvedu

Feature ne sme:

* direktno zaobilaziti Data Layer radi upisa u `localStorage` ili IndexedDB
* vezati poslovne operacije za CSS klase, dimenzije, pozicije, DOM redosled ili izabranu temu
* nepotrebno rekreirati kontrolu, izgubiti fokus ili prekinuti unos pri promeni prikaza
* sadržati hardkodovan UI tekst
* držati nepovezane module u istom fajlu

U postojećem vanilla JS-u DOM događaji su deo UI sloja. Nove kontrole treba da imaju jasno vlasništvo nad listenerima, idempotentnu inicijalizaciju ili cleanup pri uklanjanju, i da koriste zaštitu za događaje iz tekstualnih polja. Globalni handleri se vezuju za stvarnu interaktivnu kontrolu, ne za široke selektore. Theme Adapter kasnije koristi ove granice bez menjanja poslovne logike.

---

# 15. Dashboard Architecture

Dashboard je glavni pregled stanja korisnika.

MVP dashboard treba da ima:

* standardni layout
* widget slotove
* mogućnost zamene widgeta
* quick action button
* osnovne sažetke iz modula

Dashboard ne treba da sadrži kompletnu logiku svih modula.

Dashboard čita podatke preko repositories/services.

Widgeti treba da budu registrovani kroz widget registry. Njihov stabilni ID i izvor podataka nezavisni su od prikaza i pozicije u temi.

Primer:

```js
widgetRegistry = {
  "goal-progress": {
    id: "goal-progress",
    titleKey: "dashboard.widgets.goalProgress.title",
    viewId: "goal-progress",
    requiredFeature: "goals",
    premium: false
  },
  "finance-summary": {
    id: "finance-summary",
    titleKey: "dashboard.widgets.financeSummary.title",
    viewId: "finance-summary",
    requiredFeature: "finance",
    premium: false
  },
  "mini-transactions": {
    id: "mini-transactions",
    titleKey: "dashboard.widgets.miniTransactions.title",
    viewId: "mini-transactions",
    requiredFeature: "finance",
    premium: false
  }
};
```

---

# 16. Goals Architecture

Goals Creator je jedan od prvih ozbiljnih modula za izgradnju.

Goal model treba da podrži:

* naslov
* opis
* kategoriju
* status
* korake
* rokove
* povezanost sa idejom
* povezanost sa kalendarom
* napredak
* refleksiju

Primer:

```js
goal = {
  id: "goal_001",
  workspaceId: "workspace_001",
  ownerId: "local-user",
  title: "",
  description: "",
  category: "",
  status: "active",
  progress: 0,
  ideaId: null,
  steps: [],
  calendarEventIds: [],
  createdAt: "",
  updatedAt: ""
};
```

Goals treba graditi pre Calendar modula, jer Calendar može zavisiti od goals state-a.

---

# 17. Brainstorming / Ideas Architecture

Brainstorming modul treba da ima osnovne tabove:

* Ideas
* Research
* Realization

Idea je centralni objekat.

Brainstorming dalje treba da očuva i stabilizuje:

* kreiranje ideje
* listu/board ideja
* status ideje
* osnovni preview
* povezivanje sa research tabom
* povezivanje sa realization/plan tabom

Postojeći board i drag-and-drop su funkcionalni delovi aplikacije; tema sme promeniti okvir i raspored, ali ne njihove koordinate, interakcije ili sačuvane ideje. Geometrijske zavisnosti razrešavati ciljano kada se uvode drugačiji layout-i.

---

# 18. Research Architecture

Research modul može biti poseban feature, ali u UX-u može biti deo Brainstorming/Idea workspace-a.

Research treba da podrži:

* research directions
* references
* notes
* idea tests
* linked finance comparison
* future forecasting/prediction

Osnovni research tok obuhvata:

* dodaj reference
* dodaj belešku
* dodaj test ideje
* prikaži research status

Postojeći `research.js` i `js/research/*` ostaju izvor funkcionalnosti. Pri budućem razdvajanju prikaza od domenskih operacija ne duplirati research model niti prepisivati modul radi teme; čuvati canvas stanje i event lifecycle.

---

# 19. Finance Architecture

Finance je najrizičniji modul.

Postojeći `finansije.js` i `financeDashboard.js` ostaju aktivni moduli. Njihova poslovna logika i podaci se čuvaju; granice se poboljšavaju postepeno. Koristiti postojeći kod kao izvor:

* data modela
* calculation logike
* kategorija
* finance comparison koncepta
* storage ključeva za migraciju

Finance MVP treba da podrži:

* osnovni pregled
* ručni unos transakcija
* lista transakcija
* osnovni budžet
* osnovni financial comparison
* osnovni prikaz kapitala/imovine ako nije previše kompleksno

Advanced za kasnije:

* import XLSX/PDF
* live asset refresh
* kompleksni assets/debts
* advanced projections
* financial comparison snapshots
* research cache integration

Kada je opravdano održavanjem, finance logika može se postepeno organizovati u podmodule:

```text
finance/
  overview/
  transactions/
  budget/
  comparison/
  assets/
  services/
```

Pravila:

* calculation funkcije izdvojiti u pure functions
* UI ne sme direktno računati kompleksnu finance logiku
* storage ide kroz financeRepository
* ne dirati legacy finance podatke bez backup-a

---

# 20. Journal Architecture

Journal MVP treba da podrži:

* dnevni unos
* lista zapisa
* refleksija
* check-in
* povezivanje sa idejom ili ciljem kasnije

Primer:

```js
journalEntry = {
  id: "journal_001",
  workspaceId: "workspace_001",
  ownerId: "local-user",
  title: "",
  content: "",
  mood: null,
  tags: [],
  linkedIdeaId: null,
  linkedGoalId: null,
  date: "",
  createdAt: "",
  updatedAt: ""
};
```

Journal treba da bude jednostavan u MVP-u, ali spreman za kasniju refleksiju i mentor insights.

---

# 21. Calendar Architecture

Calendar treba da povezuje:

* goals
* actions
* ideas
* realization plan
* journal/check-ins kasnije

MVP calendar može imati:

* month view
* day view
* event creation
* povezivanje eventa sa ciljem ili idejom
* osnovni action planning

Advanced za kasnije:

* drag-and-drop
* recurring events
* reminders
* advanced planner
* schedule suggestions
* collaboration calendar

---

# 22. Settings / Backup Architecture

Settings MVP treba da sadrži:

* language settings
* storage settings
* export backup
* import backup
* database viewer/dev mode ako je potreban
* reset local data uz confirmation

Backup je kritičan jer MVP koristi local-first storage.

Settings treba da koristi repository/backup service.

Bez direktnog zaobilaženja aktivnog repository-ja iz UI-a.

---

# 23. Repository Layer

Postojeći Data Layer već sadrži repositories za settings, goals, calendar, ideas, finance, assets, comparisons, nutrition i media. Sledeće su konceptualne domenske granice, uključujući buduće workspace, dashboard i journal repositories kada njihovi moduli to budu zahtevali:

```text
settingsRepository
workspaceRepository
dashboardRepository
ideasRepository
goalsRepository
financeRepository
journalRepository
calendarRepository
```

Primer API-ja:

```js
settingsRepository.getSettings();
settingsRepository.saveSettings(settings);
settingsRepository.getLanguage();
settingsRepository.saveLanguage(language);

ideasRepository.getIdeas();
ideasRepository.saveIdeas(ideas);
ideasRepository.getIdeaById(id);
ideasRepository.saveIdea(idea);

goalsRepository.getGoals();
goalsRepository.saveGoals(goals);
goalsRepository.saveGoal(goal);

financeRepository.getFinanceState();
financeRepository.saveFinanceState(state);

journalRepository.getEntries();
journalRepository.saveEntry(entry);

calendarRepository.getEvents();
calendarRepository.saveEvent(event);
```

UI/feature moduli koriste postojeće repositories ili servise, ne adaptere direktno. Primeri API-ja iznad su ciljni ugovori, ne tvrdnja da svaka metoda već postoji.

---

# 24. Storage Adapter Strategy

MVP koristi postojeći local-first Data Layer. Dexie/IndexedDB i repositories su implementirani, uz localStorage kompatibilnost i migracioni tok; aktivan adapter određuje postojeći bootstrap. Cloud adapter je moguć tek kasnije.

```text
repositories/
  -> storageAdapter
    -> IndexedDB/Dexie adapter ili postojeći kompatibilni localStorage adapter
    -> cloudStorageAdapter kasnije
```

Aktivni adapter bira postojeći data bootstrap, ne Theme Engine ili UI kontrola. Novi izbor skladišta zahteva zasebnu proveru migracije i oporavka.

Za MVP:

```js
storageMode = "local";
```

Za premium kasnije:

```js
storageMode = "cloud";
```

---

# 25. Backup / Migration Strategy

Postojeća aplikacija ima legacy localStorage ključeve i implementirane migracione, recovery i backup servise. Ne dirati korisničke podatke ili strukturu bez zasebnog plana, backup-a i provere migracije.

Legacy ključevi koje treba paziti:

* `mentor_database`
* `mentor_brainstorming_ideas`
* `mentorFinanceStateV1`
* `mentorFinanceAssetsV1`
* `mentorFinancialComparisonSnapshotsV1`
* `mentorFinancialComparisonOptionsV1`
* `mentorFinancialComparisonResearchCacheV1`
* `mentorTransactionImportTemplatesV1`
* `mentor_language`
* `mentorPlanner.language`

Postojeći alati već pokrivaju čitanje, normalizaciju, migraciju, verifikaciju, export/import i oporavak. Nove domene ili polja dodavati kroz postojeće ugovore, uz roundtrip proveru backup/restore i očuvanje legacy podataka prema važećoj migracionoj politici.

Ne menjati UI i storage šemu istovremeno za isti modul bez zasebnog, proverljivog koraka. Theme Engine koristi settings repository; tema ne dodaje paralelni storage oblik.

---

# 26. Recommended Build Order

Ovo je redosled evolucije postojeće aplikacije, ne plan za novu aplikaciju. Svaka faza zadržava radne module i korisničke podatke. Arhitektonsku spremnost za teme održavati kroz pravila §7 i §14, bez implementacije Theme Engine-a pre stabilizacije MVP-a.

## Faza 1 — Završiti postojeće funkcionalne module

Dovršiti i povezati Dashboard, Goals, Brainstorming, Research, Finance, Calendar, Journal, Settings i ostale postojeće MVP tokove prema stvarnom stanju svakog modula. Ne praviti placeholder zamene za funkcionalne ekrane. Sačuvati i18n, backup i postojeći Data Layer.

## Faza 2 — Stabilizovati App Core, navigaciju i Data Layer

Otkloniti konkretne bugove, duple inicijalizacije i nepotrebne rerendere. Proveriti repository granice, IndexedDB migraciju/oporavak, backup/restore, integritet podataka i lazy loading. Novi moduli moraju biti nezavisni od pozicije panela i teme.

## Faza 3 — Uvesti osnovni Theme Engine i Theme Registry

Tek posle MVP stabilizacije dodati centralni mehanizam aktivacije, manifest/verziju paketa, lazy loading, keš i siguran fallback. Aktivna tema prolazi kroz postojeći settings repository.

## Faza 4 — Uvesti Theme Adapter i Layout Slots

Uvesti semantičke slotove i ograničene lifecycle ugovore za prikaz. Omogućiti selektivno premeštanje ili zamenu komponenti uz cleanup listener-a i animacija, očuvan fokus i stanje modula.

## Faza 5 — Prva potpuno funkcionalna Theme Package

Upakovati postojeći dizajn kao podrazumevanu temu. Potvrditi paritet funkcija, navigacije, jezika, responsive ponašanja i korisničkih podataka pre dodavanja drugog izgleda.

## Faza 6 — Druga tema sa drugačijim layoutom

Testirati drugačiji raspored panela i navigacije na desktopu, tabletu i telefonu. Promena teme ne sme resetovati podatke, canvas, unos u toku, aktivni prikaz ili nepotrebno ponovo učitati aplikaciju.

## Faza 7 — Premium teme i Theme Marketplace

Tek nakon stabilnih paketa i lifecycle ugovora razmatrati entitlements, premium distribuciju i marketplace. Backend/cloud ostaju zasebna kasnija odluka.

---

# 27. What To Avoid

Ne raditi:

* ne započinjati React migraciju ili paralelnu aplikaciju bez zasebno potvrđene potrebe
* ne prepisivati radne funkcionalne module radi tema
* ne praviti monolitni App Core ili finance modul
* ne koristiti globalni `window.*` kao jedini izvor stanja novih funkcija
* ne vezati poslovnu logiku za CSS klase, položaj, veličinu ili redosled panela
* ne koristiti direktan storage pristup u novom UI-u mimo Data Layer-a
* ne hardkodovati UI tekst van i18n sistema
* ne uvoditi backend, marketplace ili AI Mentor pre stabilnog core sistema
* ne migrirati ili brisati korisničke podatke bez backup-a i provere
* ne graditi Theme Engine pre MVP stabilizacije; ne graditi Theme Marketplace pre proverenih Theme Packages

---

# 28. Next Documentation and Implementation Boundary

Ovaj blueprint sada definiše smer, ali ne odobrava implementaciju Theme Engine-a. Neposredni rad je završavanje i stabilizacija postojećih funkcija. Za svaki novi modul ili ograničenu izmenu:

1. koristiti postojeći App Core, lazy loading, i18n i Data Layer;
2. dodeliti stabilne ID-jeve ili semantičke `data-panel` / `data-action` atribute interaktivnim delovima;
3. odvojiti domenske operacije od prezentacije i pozicije panela;
4. očuvati stanje, fokus, tekstualni unos i korisničke podatke;
5. beležiti preostale theme zavisnosti u `docs/THEME_READINESS_BACKLOG.md`.

Pre Faze 3 posebno pripremiti i proveriti ugovor Theme Adapter-a, format Theme Package manifesta, settings/backup integraciju, podržane layout-e i pravila pristupačnosti. Ta priprema je dokumentacija i ciljana stabilizacija, ne široki refactoring sada.

---

# 29. Success Criteria For Current Foundation

Postojeća osnova je dovoljno stabilna za planirane teme kada:

* glavni funkcionalni moduli i navigacija rade kroz postojeći App Core;
* nema nepotrebne ponovne inicijalizacije ili gubitka stanja pri promeni prikaza;
* novi moduli koriste stabilne identitete panela i zajedničku poslovnu logiku;
* sr/en prevodi prolaze kroz postojeći i18n sistem;
* repositories, IndexedDB migracija, backup/restore i lazy loading ostaju funkcionalni;
* korisnički podaci nisu obrisani ni preoblikovani radi prezentacije;
* prva tema može da se definiše iz postojećeg dizajna bez kopiranja domenske logike.

Ovi kriterijumi ne znače da Theme Engine već postoji. Implementacija tema počinje u Fazi 3.

---

# 30. Final Architecture Principle

Mentor aplikacija ne treba da bude samo skup ekrana.

Ona treba da bude modularni personal operating system.

Core pravilo:

```text
Data model je stabilan.
Business logic je odvojena.
UI je promenjiv.
Theme je promenjiv.
Widgeti su zamenjivi.
Storage je zamenjiv.
Backend dolazi kasnije.
Premium layer dolazi kasnije.
```

MVP treba da bude dovoljno jednostavan da se završi, ali dovoljno profesionalno postavljen da kasnije može podržati:

* premium cloud save
* teme
* template-e
* widget pakete
* kolaboraciju
* mentor marketplace
* AI Mentor
* subscription sistem
* ozbiljan backend

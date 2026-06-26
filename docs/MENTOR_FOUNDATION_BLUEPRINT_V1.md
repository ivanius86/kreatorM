# MENTOR APP — FOUNDATION BLUEPRINT V1

## 0. Važna napomena za Codex

Ovo nije zadatak da se odmah kodira cela aplikacija.

Ovo je arhitektonski blueprint za novi React sistem.

Cilj nije direktna 1:1 migracija starog vanilla JS website-a u React.

Cilj je da se postojeći vanilla website koristi kao analitička baza/specifikacija, a da se novi React sistem gradi od početka, korak po korak, sa čistom arhitekturom.

Stari vanilla website treba koristiti kao izvor znanja:

* `index.html` kao mapa postojećih ekrana i UI sekcija
* `script.js` kao izvor goal builder i navigation logike
* `brainstorming.js` kao izvor idea modela i board logike
* `research.js` kao izvor research/reference/test modela
* `finansije.js` kao izvor finance modela, calculation logike i comparison koncepta
* `kalendar.js` kao izvor calendar/goal scheduling logike
* `storageService.js` kao izvor legacy storage i migration logike
* `js/i18n/*` kao osnova za novi language sistem

Ne kopirati slepo stari kod.

Ne prebacivati veliki `index.html` u React.

Ne prebacivati `innerHTML` render logiku.

Ne prenositi globalni `window.*` model kao osnovu novog sistema.

Novi sistem treba da bude React-first, state-first, modularan, local-first u MVP-u, ali spreman za ozbiljan backend i premium cloud save kasnije.

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

Cilj MVP-a nije kompletan redesign, već stabilna React arhitektura.

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

## 7.3 Theme-ready MVP

Iako MVP ima samo jednu temu, UI mora biti theme-ready.

To znači koristiti design tokens gde je moguće:

* colors
* typography
* spacing
* radius
* shadows
* layout density
* component variants

Ne hardkodovati sve direktno u komponente tako da kasnije tema bude nemoguća.

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

Predloženi model:

```js
dashboardLayout = {
  userId: "local-user",
  layoutId: "default",
  widgets: [
    {
      slotId: "top-left",
      widgetId: "goal-progress",
      size: "medium"
    },
    {
      slotId: "top-right",
      widgetId: "finance-summary",
      size: "medium"
    },
    {
      slotId: "bottom-left",
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

---

# 9. Backend / Storage Strategy

## 9.1 MVP storage

MVP treba da bude local-first.

To znači da aplikacija u početku čuva podatke lokalno na korisnikovom uređaju/browseru.

Ali arhitektura mora od početka biti pripremljena za ozbiljan backend.

Dugoročno:

* free plan koristi local save
* jeftiniji plan koristi local save uz neke dodatne benefite
* premium plan može imati cloud save
* cloud sync / cloud backup postaje premium benefit
* backend se uvodi kasnije bez rušenja core aplikacije

## 9.2 Data access pravilo

React komponente nikada ne smeju direktno koristiti `localStorage`.

Komponente treba da koriste repository layer.

Pravilo:

```text
Component -> Repository -> Storage Adapter
```

Primer:

```text
GoalBuilderPage
  -> goalsRepository
    -> localStorageAdapter za MVP/free/local
    -> cloudStorageAdapter za premium cloud save kasnije
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

Predloženi model:

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

Predloženi model:

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

Predložena glavna struktura:

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

Novi React sistem treba da ima jasne layere.

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

* local database
* repositories
* storage adapters
* migration service
* backup/export/import
* schema versioning

Komponente ne smeju direktno čitati/pisati `localStorage`.

## 11.3 App State Layer

App state layer kontroliše:

* aktivni workspace
* aktivni jezik
* aktivnu stranicu/rutu
* otvorene modale
* dashboard layout
* session UI state
* user settings

Globalni state treba koristiti oprezno.

Domain data treba držati kroz repositories i feature hooks.

## 11.4 UI Component Layer

Reusable UI komponente:

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

UI komponente ne treba da znaju business logic.

## 11.5 Theme Layer

Theme layer kontroliše:

* colors
* typography
* spacing
* radius
* shadows
* density
* component variants

MVP koristi jednu default temu.

Theme system treba biti spreman za buduće premium teme.

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

Svaki feature treba imati svoje:

* components
* hooks
* services
* utils
* constants
* tabs ako je potrebno

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

Aplikacija mora od početka imati jasan language system.

Podržani jezici:

* Serbian / sr
* English / en

Pravila:

* Sav UI tekst u React komponentama ide kroz `t()` funkciju.
* Ne hardkodovati UI tekst direktno u komponentama.
* Aktivni jezik ima jedan izvor istine.
* Language mora biti deo settings-a.
* Language mora biti spreman za per-user settings kasnije.
* Fallback mora biti dosledan.
* Stari `data-i18n` sistem ne treba prenositi kao osnovu React sistema.

Predložena struktura:

```text
src/shared/i18n/
  I18nProvider.jsx
  useI18n.js
  translations/
    sr/
      common.js
      dashboard.js
      goals.js
      brainstorming.js
      research.js
      finance.js
      journal.js
      calendar.js
      settings.js
    en/
      common.js
      dashboard.js
      goals.js
      brainstorming.js
      research.js
      finance.js
      journal.js
      calendar.js
      settings.js
```

Primer upotrebe:

```jsx
const { t, language, setLanguage } = useI18n();

<h1>{t("dashboard.title")}</h1>
```

Za MVP, language provider može koristiti settingsRepository.

Ne koristiti direktan `localStorage` u komponentama.

---

# 13. React Folder Structure

Predložena osnovna struktura:

```text
src/
  app/
    App.jsx
    AppShell.jsx
    routes.jsx
    appConfig.js

  providers/
    AppProviders.jsx

  shared/
    ui/
      Button.jsx
      Card.jsx
      Modal.jsx
      EmptyState.jsx
      Tabs.jsx
      Input.jsx
      Select.jsx
      Textarea.jsx
      PageContainer.jsx
      SectionHeader.jsx
      WidgetCard.jsx
      StatCard.jsx

    i18n/
      I18nProvider.jsx
      useI18n.js
      translations/
        sr/
        en/

    storage/
      localDatabase.js
      storageAdapters/
        localStorageAdapter.js
        cloudStorageAdapter.js
      repositories/
        settingsRepository.js
        workspaceRepository.js
        dashboardRepository.js
        ideasRepository.js
        goalsRepository.js
        financeRepository.js
        journalRepository.js
        calendarRepository.js
      migrationService.js
      backupService.js

    theme/
      defaultTheme.js
      themeTokens.js
      ThemeProvider.jsx

    utils/
      dates.js
      ids.js
      formatters.js
      validators.js

  features/
    dashboard/
      DashboardPage.jsx
      components/
        DashboardGrid.jsx
        WidgetSlot.jsx
        WidgetPicker.jsx
        QuickActionMenu.jsx
      widgets/
        GoalProgressWidget.jsx
        FinanceSummaryWidget.jsx
        MiniTransactionsWidget.jsx
        IdeaOverviewWidget.jsx
        JournalWidget.jsx
        CalendarTodayWidget.jsx
      services/
        widgetRegistry.js

    goals/
      GoalsPage.jsx
      GoalBuilderPage.jsx
      components/
        GoalForm.jsx
        GoalCard.jsx
        GoalSteps.jsx
        GoalReview.jsx
      hooks/
      services/
      constants/

    brainstorming/
      BrainstormingPage.jsx
      components/
        IdeaBoard.jsx
        IdeaCard.jsx
        IdeaModal.jsx
        IdeaTabs.jsx
      tabs/
        IdeasTab.jsx
        ResearchTab.jsx
        RealizationTab.jsx
      services/
        ideaService.js
        ideaStatusService.js

    research/
      ResearchView.jsx
      components/
        ResearchPanel.jsx
        ReferenceList.jsx
        ReferenceCard.jsx
        IdeaTestPanel.jsx
        ResearchNotes.jsx
      services/
        researchService.js
        referenceService.js
        ideaTestService.js

    finance/
      FinancePage.jsx
      tabs/
        FinanceOverviewTab.jsx
        TransactionsTab.jsx
        BudgetTab.jsx
        FinancialComparisonTab.jsx
        AssetsTab.jsx
      components/
        TransactionForm.jsx
        TransactionList.jsx
        BudgetPanel.jsx
        FinanceSummary.jsx
      services/
        financeCalculations.js
        financialComparisonService.js

    journal/
      JournalPage.jsx
      components/
        JournalEntryForm.jsx
        JournalEntryList.jsx
        ReflectionPanel.jsx
        CheckInPanel.jsx
      services/
        journalService.js

    calendar/
      CalendarPage.jsx
      components/
        MonthView.jsx
        WeekView.jsx
        DayView.jsx
        CalendarEventForm.jsx
        CalendarToolbar.jsx
      services/
        calendarService.js
        schedulingService.js

    settings/
      SettingsPage.jsx
      components/
        LanguageSettings.jsx
        BackupControls.jsx
        DatabaseViewer.jsx
        StorageSettings.jsx
```

---

# 14. Feature Module Rules

Svaki feature treba da bude samostalan koliko je moguće.

Feature može koristiti:

* shared UI components
* shared repositories
* shared i18n
* shared utilities
* shared theme tokens

Feature ne sme:

* direktno koristiti `localStorage`
* manipulisati DOM direktno
* zavisiti od globalnih `window.*` API-ja
* sadržati hardkodovan UI tekst
* držati nepovezane module u istom fajlu

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

Widgeti treba da budu registrovani kroz widget registry.

Primer:

```js
widgetRegistry = {
  "goal-progress": {
    id: "goal-progress",
    titleKey: "dashboard.widgets.goalProgress.title",
    component: GoalProgressWidget,
    requiredFeature: "goals",
    premium: false
  },
  "finance-summary": {
    id: "finance-summary",
    titleKey: "dashboard.widgets.financeSummary.title",
    component: FinanceSummaryWidget,
    requiredFeature: "finance",
    premium: false
  },
  "mini-transactions": {
    id: "mini-transactions",
    titleKey: "dashboard.widgets.miniTransactions.title",
    component: MiniTransactionsWidget,
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

Brainstorming MVP treba da podrži:

* kreiranje ideje
* listu/board ideja
* status ideje
* osnovni preview
* povezivanje sa research tabom
* povezivanje sa realization/plan tabom

Ne mora odmah imati kompleksan drag-and-drop board.

Drag-and-drop može biti kasniji enhancement.

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

MVP može imati basic research:

* dodaj reference
* dodaj belešku
* dodaj test ideje
* prikaži research status

Ne prebacivati direktno stari `renderResearchView()` kao HTML string.

React research treba da bude komponentni model.

---

# 19. Finance Architecture

Finance je najrizičniji modul.

Ne migrirati stari `finansije.js` direktno.

Koristiti ga kao izvor:

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

Finance treba podeliti na podmodule:

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

Ne direktan `localStorage` iz komponente.

---

# 23. Repository Layer

Predloženi repositories:

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

Komponente koriste repositories, ne storage adaptere direktno.

---

# 24. Storage Adapter Strategy

U MVP-u koristi se local storage adapter.

Kasnije može postojati cloud adapter.

```text
repositories/
  -> storageAdapter
    -> localStorageAdapter
    -> cloudStorageAdapter kasnije
```

Primer:

```js
const storageAdapter = getStorageAdapter(user.planType, user.storageMode);
```

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

Pošto postoji stari vanilla website sa legacy localStorage ključevima, ne dirati stare podatke bez backup-a.

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

Prvo napraviti backup/export.

Tek kasnije napraviti import/migration tool koji može:

1. pročitati legacy podatke
2. transformisati ih u novi React data model
3. sačuvati ih u novu lokalnu bazu
4. ostaviti legacy podatke netaknute kao backup

Ne migrirati UI i storage shape istovremeno za isti modul.

---

# 26. Recommended Build Order

Predloženi redosled rada:

## Faza 1 — Foundation

* React AppShell
* Routing/view system
* default layout
* Sidebar
* PageContainer
* shared UI components
* LanguageProvider
* Theme tokens za default temu
* Repository layer
* Local storage adapter
* Backup/export/import osnova

## Faza 2 — Dashboard shell

* DashboardPage
* WidgetRegistry
* WidgetSlot
* osnovni widgeti
* replace widget opcija
* QuickActionMenu

## Faza 3 — Goals Creator

* GoalBuilderPage
* goal model
* create/edit goal
* goal steps
* repository integration

## Faza 4 — Brainstorming basic

* create idea
* idea list/board
* idea detail
* idea status
* tabs: Ideas / Research / Realization

## Faza 5 — Research basic

* references
* notes
* idea tests
* research status

## Faza 6 — Journal basic

* daily entry
* entry list
* check-in/reflection

## Faza 7 — Finance basic

* transactions
* finance overview
* budget basic
* simple financial comparison

## Faza 8 — Calendar basic

* calendar view
* events
* link with goals/ideas

## Faza 9 — Settings / backup polish

* language
* storage
* backup
* import/export
* local database viewer

## Faza 10 — Stabilization

* performance
* bug fixing
* data validation
* test users
* UX polish

---

# 27. What To Avoid

Ne raditi:

* ne prebacivati ceo vanilla website odjednom
* ne kopirati veliki `index.html` u React
* ne praviti jedan ogroman `App.jsx`
* ne praviti jedan ogroman `finance.jsx`
* ne koristiti `window.*` kao glavni state sistem
* ne koristiti `innerHTML`
* ne koristiti direktan `localStorage` u komponentama
* ne hardkodovati UI tekst u komponentama
* ne uvoditi backend pre nego što data layer bude čist
* ne uvoditi marketplace pre MVP-a
* ne uvoditi AI Mentor pre stabilnog core sistema
* ne graditi theme marketplace pre default theme MVP-a
* ne migrirati legacy finance podatke bez backup-a

---

# 28. Codex Task For First Implementation Phase

Prvi zadatak za Codex treba da bude samo Foundation, ne cela aplikacija.

Zadatak:

Postavi React foundation za Mentor aplikaciju prema ovom blueprint-u.

Ne prebacuj još stare vanilla module.

Ne prebacuj finance/research/brainstorming logiku.

Ne diraj legacy localStorage podatke.

Napravi:

1. AppShell
2. routing/view system
3. Sidebar
4. placeholder stranice za glavne module
5. LanguageProvider
6. default translations sr/en
7. shared UI components
8. repository layer
9. localStorage adapter
10. default theme tokens
11. basic dashboard widget architecture
12. MIGRATION_NOTES.md

Placeholder stranice:

* Dashboard
* Goals
* Brainstorming
* Research
* Finance
* Journal
* Calendar
* Settings

Svaka placeholder stranica treba da koristi i18n `t()` funkciju, ne hardkodovan tekst.

Sve komponente treba da koriste shared UI gde je moguće.

Nijedna React komponenta ne sme direktno koristiti `localStorage`.

Storage mora ići kroz repository layer.

---

# 29. Success Criteria For Foundation Phase

Foundation faza je uspešna ako:

* aplikacija ima čist AppShell
* navigacija između modula radi
* LanguageProvider radi za sr/en
* tekstovi dolaze iz translation fajlova
* postoje placeholder stranice za module
* postoji repository layer
* postoji localStorage adapter
* postoji basic backup service
* postoje shared UI komponente
* dashboard ima osnovni widget registry
* QuickActionMenu postoji kao UI skeleton
* nije diran stari vanilla website
* nisu obrisani legacy podaci
* struktura je spremna za modul-po-modul izgradnju

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

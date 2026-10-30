# Goals i Calendar persistence plan

Status: odobren za faznu implementaciju  
Opseg: novi persistence domen za Goals i Calendar  
Nije legacy migracija  
Prvi odobreni korak: Goals repository, hydrate, create i sample copy-on-write

## ADR-001: Prihvaćene odluke i podrazumevana pravila

Status: **Accepted**  
Datum: 2026-07-30

Preporuke iz odeljka 12.3 prihvaćene su kao arhitektonske odluke/defaults.
Implementacija ostaje fazna; prihvatanje odluke ne proširuje opseg tekućeg
koraka.

| Tema | Prihvaćena odluka |
|---|---|
| Sample ciljevi | Četiri postojeća sample cilja su read-only, neperzistentni templates. Prva izmena ili zakazivanje pravi novu korisničku kopiju sa novim ID-em. |
| Prazan prvi run | Kada nema durable korisničkih ciljeva, UI prikazuje sample templates; oni se ne upisuju automatski. |
| Planner preferences | `currentView` i `goalDeckFilter` biće trajni u kasnijem koraku; selekcije entiteta ostaju prolazne. |
| `selectedDate` | Podrazumevano se otvara današnji datum; poslednji otvoreni datum se ne vraća dok preferences korak ne odobri drugačije. |
| `slotNotes` | Ne čuva se dok funkcionalnost i vlasnički model ne budu završeni. |
| Note autosave | Default je 500 ms, uz obavezan flush na blur i promenu view-a; implementacija dolazi u notes koraku. |
| Goal rename i eventi | Ručno izmenjen Event naslov ostaje netaknut; osvežavanje iz Goal-a mora biti eksplicitna komanda. |
| Finance polja | `targetAmount` i `currency` su prihvaćeni za buduću dopunu Finance Goal Builder toka. |
| Finance bridge | Pokreće se tek posle uspešnog durable Goal save-a, uz vidljiv error/retry status; Finance greška ne briše Goal. |
| Brisanje finansijskog cilja | Traži potvrdu; budžet i istorijske transakcije se ne brišu automatski. |
| Event completion i novac | Ne kreira automatsku transakciju; uplata mora biti posebna potvrđena komanda. |
| Cross-tab | Prikazuje se upozorenje; aktivni draft se ne prepisuje tiho. |
| Ključevi | Potvrđeni su `mentor_goals_v1` i `mentor_calendar_events_v1`. |

Implementacioni checkpoint:

- završen je prvi korak: `mentor_goals_v1`, Goals hydrate, Goal Builder
  create/save i sample copy-on-write;
- završen je osnovni Calendar korak: `CalendarRepository`,
  `mentor_calendar_events_v1`, event hydrate, batch schedule, osnovni event
  update/delete i Goal delete cascade sa kompenzacijom;
- sledeći podkorak su Goal task/action mutacije, Goal notes i Event notes
  uključujući autosave/debounce i flush pravila;
- planner preferences i ostale napredne Calendar komande ostaju kasniji koraci.

## 1. Cilj

Cilj je da se postojeći Goals i Calendar modeli iz `script.js` i `kalendar.js`
sačuvaju kroz postojeći asinhroni `MentorData` repository sloj, prvo preko
`LocalStorageAdapter`-a, a kasnije bez promene UI ugovora preko IndexedDB
adaptera.

Plan mora:

- sačuvati postojeći vanilla UI i lazy-loading ponašanje;
- zadržati sadašnje agregate bez preterane normalizacije;
- sprečiti gubitak ciljeva, događaja, akcija i beleški;
- jasno odvojiti trajne domenske podatke od prolaznog UI stanja;
- omogućiti bezbedan bridge prema Finance modulu;
- uključiti Goals i Calendar u kompletan backup/import;
- koristiti Promise repository ugovore uspostavljene u Fazi 1;
- ne predstavljati ovaj posao kao migraciju postojećih podataka, jer Goals i
  Calendar trenutno nemaju trajni izvor.

## 2. Trenutno stanje

### 2.1 Vlasništvo i tokovi

`script.js` trenutno:

- definiše globalni `appState`;
- sadrži četiri seed/sample cilja;
- vodi Goal Builder i `flowState`;
- kreira novi cilj u `buildGoalFromAnswers()`;
- direktno dodaje cilj sa `appState.goals.unshift(goal)`;
- objavljuje `window.appState` za Calendar i Finance module.

`kalendar.js` trenutno:

- čita i direktno menja `appState.goals`;
- čita i direktno menja `appState.calendarEvents`;
- zakazuje jednu ili više instanci događaja;
- uređuje i briše ciljeve i događaje;
- vodi akcije, podakcije, completion i beleške;
- briše sve događaje cilja kada se cilj obriše;
- čuva izbor taba, datuma i selektovanih entiteta samo u memoriji.

`finansije.js` trenutno:

- čita finansijske ciljeve iz `window.appState.goals`;
- pronalazi ciljeve kategorije `Finance`;
- heuristički izvlači ciljni iznos iz teksta cilja;
- može da kreira ili ažurira budžet sa `sourceGoalId`;
- izlaže `Finance.ensureSavingsBudgetForGoal(goal)`;
- još nema pouzdan lifecycle poziv kada je cilj kreiran, izmenjen ili obrisan.

### 2.2 Trenutni mutation call-site-ovi

Trajni mutation servis mora pokriti najmanje sledeće postojeće tokove:

| Tok | Trenutno mesto |
|---|---|
| Kreiranje cilja iz Builder-a | `script.js`, `buildGoalFromAnswers()` i `generateBtn` handler |
| Zakazivanje događaja | `kalendar.js`, `addCalendarEvent()` i `scheduleGoal()` |
| Batch zakazivanje dnevne navike | `kalendar.js`, petlja u `scheduleGoal()` |
| Brisanje događaja | `kalendar.js`, `deleteCalendarEvent()` |
| Cascade brisanje cilja i njegovih događaja | `kalendar.js`, `deleteGoal()` |
| Quick edit događaja | `kalendar.js`, `saveSelectedEventChanges()` |
| Full edit cilja/događaja | `kalendar.js`, submit handler za `#goalEditForm` |
| Completion event akcije | `kalendar.js`, `[data-task-action-check]` handler |
| Completion goal podakcije | `kalendar.js`, `[data-task-action-check]` handler |
| Dodavanje goal/event podakcije | `kalendar.js`, `[data-add-task-action]` handler |
| Dodavanje i brisanje beleške | `kalendar.js`, note action handleri |
| Izmena naslova i sadržaja beleške | `kalendar.js`, `goalFocusTabPanel` input handler |

### 2.3 Skriveni mutation tokom čitanja/rendera

Sledeće funkcije trenutno dopunjavaju modele dok se model samo čita ili
renderuje:

- `getGoalActions()`;
- `getTaskActions()`;
- `getEventTaskActions()`;
- `ensureGoalNotes()`;
- `ensureEventNotes()`;
- helperi koji uklanjaju stare podrazumevane naslove/tekst beleški.

Ovo ponašanje nije bezbedno za persistence. Normalizacija mora da se izvrši:

1. pri repository hydrate-u;
2. pri kreiranju novog entiteta; ili
3. kroz eksplicitnu mutation komandu.

Render i selector funkcije posle cutover-a ne smeju menjati kanonski snapshot.

### 2.4 Podaci koji jesu i nisu trajni

Trajni domen:

- `goals`;
- `calendarEvents`;
- nested goal actions i njihove podakcije;
- nested event actions;
- goal i event `notesList`;
- eksplicitne Finance veze kada budu odobrene.

Prolazno UI stanje:

- `flowState`;
- `selectedGoalId`;
- `selectedEventId`;
- `selectedActionId`;
- `selectedGoalNoteId`;
- `selectedSlotHour`;
- `selectedCategory`;
- `selectedSubcategory`;
- `customSubcategoryName`;
- `expandedGoalIds`;
- `goalFocusTab`;
- modal/form draftovi;
- drag/drop stanje.

`currentView`, `selectedDate` i `goalDeckFilter` su preferences kandidati, ali
nisu deo Goals/Calendar kanonskog modela. Njihovo trajno čuvanje je otvorena
odluka.

`slotNotes` trenutno postoji u `appState`, ali nema završen vlasnički tok.
Ne treba ga trajno čuvati dok se ne definišu korisnički slučaj i model.

## 3. Predložene granice modula

```text
Goal Builder UI (script.js)
  -> GoalsCalendarService
    -> GoalsRepository
    -> CalendarRepository
    -> FinanceGoalBridge

Calendar UI (kalendar.js)
  -> GoalsCalendarService
    -> GoalsRepository
    -> CalendarRepository

Finance UI / Finance service
  -> FinanceGoalBridge
    -> GoalsRepository (read)
    -> FinanceRepository (write)
```

Vlasništvo:

- Goals modul je vlasnik definicije cilja, njegovih goal akcija i goal beleški.
- Calendar modul je vlasnik datuma, vremena, event-specifičnih akcija,
  completion-a i event beleški.
- Finance modul je vlasnik budžeta, transakcija i finansijskih obračuna.
- Bridge servis koordinira reference, ali ne postaje vlasnik nijednog modela.
- UI ne poziva adapter i ne piše `localStorage`.

Predloženi novi fajlovi:

```text
js/data/
  repositories/
    goals.repository.js
    calendar.repository.js
    planner-preferences.repository.js        # samo ako se odobri
  services/
    goals-calendar.service.js
    finance-goal-bridge.service.js
  validation/
    goal.validation.js
    calendar-event.validation.js
    goals-calendar-document.validation.js
  bootstrap/
    feature-hydration.js                     # dopuna postojećeg mapiranja
```

Vanilla globalni API ostaje privremen:

```text
window.MentorData.repositories.goals
window.MentorData.repositories.calendar
window.MentorGoalsCalendarService
window.MentorFinanceGoalBridge
```

Isti repository i service ugovori kasnije mogu direktno da se pozovu iz React
hook-ova bez promene storage modela.

## 4. Minimalni kanonski modeli

### 4.1 Goal

V1 treba da zadrži goal kao jedan agregat. Akcije, podakcije i beleške ostaju
nested.

```js
{
  schemaVersion: 1,
  id: "goal-...",
  type: "long-term" | "short-term" | "habit",
  title: "...",
  reason: "...",

  category: "Finance",
  categoryName: "Finansije",
  subcategory: null,
  subcategoryName: "Nije izabrana",
  customSubcategoryName: "",
  goalType: "...",

  targetDate: "YYYY-MM-DD" | null,
  duration: string | null,
  frequency: string | null,
  bestTime: string | null,

  firstAction: "...",
  mainMilestone: "...",
  successMeasurement: "...",
  mentorAnswers: {},
  finalGoalReason: "...",

  actions: [
    {
      id: "...",
      title: "...",
      cadence: "...",
      completed: false,
      actions: [
        {
          id: "...",
          title: "...",
          cadence: "...",
          completed: false
        }
      ]
    }
  ],

  notesList: [
    {
      id: "...",
      title: "...",
      text: "...",
      createdAt: "...",
      updatedAt: "..."
    }
  ],

  financeLink: null,
  createdAt: "...",
  updatedAt: "..."
}
```

Pravila:

- postojeći ID se nikada ne menja pri normalizaciji;
- novi ID treba da koristi centralni ID helper, a kasnije `crypto.randomUUID()`;
- `actions` i `notesList` se normalizuju pre nego što snapshot postane READY;
- `updatedAt` se menja pri svakoj trajnoj izmeni;
- `mentorAnswers` se čuva kao podatak Builder-a, ne kao UI draft;
- `categoryName` i `subcategoryName` se privremeno zadržavaju zbog trenutnog
  vanilla UI-ja i i18n fallback-a;
- ne uvoditi posebne store-ove/tabele za actions i notes u ovoj fazi.

### 4.2 CalendarEvent

V1 zadržava event kao jedan agregat.

```js
{
  schemaVersion: 1,
  id: "evt-...",
  goalId: "goal-...",
  actionId: "goal-action-..." | null,

  date: "YYYY-MM-DD",
  time: "HH:MM",

  title: "...",
  type: "long-term" | "short-term" | "habit",
  category: "Finance",
  subcategory: null,
  subcategoryName: "...",
  customSubcategoryName: "",
  goalType: "...",
  successMeasurement: "...",
  colorKey: "financial",
  reason: "...",
  firstAction: "...",

  actions: [
    {
      id: "...",
      title: "...",
      cadence: "...",
      completed: false
    }
  ],

  notesList: [
    {
      id: "...",
      title: "...",
      text: "...",
      createdAt: "...",
      updatedAt: "..."
    }
  ],

  completed: false,
  notes: "",
  createdAt: "...",
  updatedAt: "..."
}
```

`goalId` i `actionId` su relacije. Kopirani goal podaci na eventu ostaju u V1
zbog kompatibilnosti sa trenutnim renderom i zato što se event može posebno
uređivati.

Pravilo vlasništva:

- Goal je vlasnik definicije cilja.
- Event je vlasnik svog datuma, vremena, event naslova, event akcija,
  completion-a i beleški.
- Izmena Goal naslova ne sme automatski pregaziti ručno izmenjen Event naslov.
- Automatsko osvežavanje denormalizovanih polja mora biti eksplicitna buduća
  komanda, ne nuspojava običnog `get`.

### 4.3 Finance link

Minimalni predlog:

```js
goal.financeLink = {
  budgetId: "budget-goal-..." | null,
  targetAmount: 3000,
  currency: "EUR",
  status: "unlinked" | "pending" | "linked" | "error",
  updatedAt: "..."
};
```

Finance budžet zadržava:

```js
budget.sourceGoalId = goal.id;
```

Finance je vlasnik `budgetId` zapisa i obračuna. Goal je vlasnik korisničke
namere (`targetAmount`, `currency`). Bridge usklađuje vezu.

U V1 događaj ne treba direktno vezivati za transakciju. Lanac je:

```text
Goal
  -> CalendarEvent preko goalId/actionId
  -> Finance budget preko budget.sourceGoalId i goal.financeLink.budgetId
```

Završavanje Calendar eventa ne sme automatski kreirati finansijsku transakciju
bez eksplicitne korisničke potvrde i zasebno odobrenog product pravila.

## 5. LocalStorageAdapter ključevi i sample ciljevi

Ovo su novi ključevi. Oni nisu legacy izvori i ne treba ih uključiti u
IndexedDB legacy migration registry kao stare podatke.

| Ključ | Vlasnik | Shape |
|---|---|---|
| `mentor_goals_v1` | GoalsRepository | `{ version, updatedAt, goals: [] }` |
| `mentor_calendar_events_v1` | CalendarRepository | `{ version, updatedAt, events: [] }` |
| `mentor_planner_preferences_v1` | PlannerPreferencesRepository, opciono | `{ version, currentView, goalDeckFilter, updatedAt }` |

Za prvi korak preporuka je da se uvedu samo prva dva ključa.

Nedostajući ključ znači praznu korisničku kolekciju, ne grešku i ne signal da
se sample podaci automatski upišu.

### 5.1 Sample/seed ciljevi

Četiri sadašnja `seed-*` cilja nikada nisu bili trajni korisnički podaci.
Njihovo prikazivanje ne sme dovesti do automatskog upisa u repository.

Preporuka:

- izdvojiti ih iz `appState.goals` u read-only `GOAL_SAMPLE_TEMPLATES`;
- kada nema korisničkih ciljeva, UI može prikazati jasno označene primere;
- pri prvoj izmeni ili zakazivanju primera napraviti korisničku kopiju sa novim
  ID-em i `createdAt`;
- repository čuva samo korisničku kopiju;
- `seed-*` ID nije dovoljan razlog za brisanje zapisa ako se takav zapis već
  nađe u backup/import dokumentu bez pouzdanog provenance markera;
- nikada ne brisati sample-like zapis samo na osnovu naslova ili sadržaja.

Konačno copy-on-write ponašanje je otvorena odluka korisnika.

## 6. Repository Promise ugovori

Svi ugovori prate postojeći `MentorRepositoryContract`:

- `initialize()` je idempotentan;
- pre hydrate-a je stanje `NOT_INITIALIZED` ili `LOADING`;
- invalid jedini kandidat daje `DATA_RECOVERY_REQUIRED`;
- mutation ide kroz red i vraća Promise;
- snapshot se klonira na ulazu i izlazu;
- neuspešan save vraća prethodni snapshot;
- `subscribe()` objavljuje snapshot i repository state.

### 6.1 GoalsRepository

```js
initialize(): Promise<void>
isReady(): boolean
getState(): RepositoryState
getSnapshot(): Goal[]
getAll(): Goal[]
getById(id): Goal | null
subscribe(listener): () => void

replaceAll(goals): Promise<Goal[]>
create(goal): Promise<Goal>
upsert(goal): Promise<Goal>
remove(id): Promise<void>
```

`remove(id)` uklanja samo goal dokument. UI ne sme direktno da ga koristi za
korisničku komandu brisanja cilja, jer Calendar događaji zahtevaju koordinaciju.

### 6.2 CalendarRepository

```js
initialize(): Promise<void>
isReady(): boolean
getState(): RepositoryState
getSnapshot(): CalendarEvent[]
getAll(): CalendarEvent[]
getById(id): CalendarEvent | null
getByGoalId(goalId): CalendarEvent[]
getByDate(date): CalendarEvent[]
subscribe(listener): () => void

replaceAll(events): Promise<CalendarEvent[]>
create(event): Promise<CalendarEvent>
createMany(events): Promise<CalendarEvent[]>
upsert(event): Promise<CalendarEvent>
remove(id): Promise<void>
removeByGoalId(goalId): Promise<void>
```

`createMany()` je obavezan za dnevnu habit petlju. Jedno zakazivanje mora
rezultovati jednim durable write-om, a ne nizom nezavisnih upisa.

### 6.3 GoalsCalendarService

UI komande idu kroz service:

```js
hydrateAppState(appState): Promise<void>
createGoal(draft): Promise<Goal>
updateGoal(id, patch): Promise<Goal>
deleteGoalCascade(id): Promise<void>

scheduleGoal(command): Promise<CalendarEvent[]>
updateEvent(id, patch): Promise<CalendarEvent>
deleteEvent(id): Promise<void>

toggleGoalTaskAction(command): Promise<Goal>
addGoalTaskAction(command): Promise<Goal>
toggleEventAction(command): Promise<CalendarEvent>
addEventAction(command): Promise<CalendarEvent>

addGoalNote(command): Promise<Goal>
updateGoalNote(command): Promise<Goal>
deleteGoalNote(command): Promise<Goal>
addEventNote(command): Promise<CalendarEvent>
updateEventNote(command): Promise<CalendarEvent>
deleteEventNote(command): Promise<CalendarEvent>
```

Service je vlasnik cross-repository pravila:

- duplicate schedule provera;
- weekly i short-goal capacity pravila;
- batch habit schedule;
- cascade delete;
- izbor redosleda upisa i kompenzacioni rollback;
- slanje domain događaja Finance bridge-u.

### 6.4 LocalStorage cross-document ograničenje

`LocalStorageAdapter` ne može atomski da promeni goal i calendar dokument.
`deleteGoalCascade()` zato mora:

1. uzeti prethodne Goals i Calendar snapshot-e;
2. izračunati oba sledeća snapshot-a bez mutiranja UI state-a;
3. prvo sačuvati Calendar bez događaja tog cilja;
4. zatim sačuvati Goals bez cilja;
5. ako drugi upis ne uspe, pokušati kompenzacioni restore Calendar snapshot-a;
6. ako kompenzacija ne uspe, postaviti domen u `FAILED`/recovery stanje i
   ponuditi backup, bez tihog nastavka rada.

IndexedDB adapter kasnije mora ovu komandu izvršiti u jednoj transakciji.
Repository/service ugovor ne treba menjati pri toj zameni.

## 7. Async bootstrap i hydrate redosled

Preporučeni redosled:

1. Učitati postojeće data contracts, adapter i repository factory skripte.
2. Kreirati `goals` i `calendar` repositories u `js/data/index.js`.
3. Pozvati `settings.initialize()`.
4. Pozvati `Promise.all([goals.initialize(), calendar.initialize()])`.
5. Tek zatim označiti `MentorData.coreReadyPromise` kao uspešan.
6. i18n provider čeka core-ready kao i sadašnji data bootstrap.
7. `script.js` kreira samo prolazni UI deo `appState`.
8. `GoalsCalendarService.hydrateAppState(appState)` kopira repository snapshot-e
   u `appState.goals` i `appState.calendarEvents`.
9. Tek nakon hydrate-a vezati mutation handlere i pozvati početni
   `setView("dashboard")`.
10. Lazy `calendar` feature u `feature-hydration.js` eksplicitno zavisi od
    `repositories.goals` i `repositories.calendar`.
11. `activateCalendarPlanner()` renderuje tek kada su oba repository-ja READY.
12. Finance modul može čitati Goals snapshot tek nakon istog core-ready
    ugovora.

Ako Goals ili Calendar vrati `RECOVERY_REQUIRED`:

- ne prikazivati sample podatke kao da su korisnički podaci;
- ne omogućiti mutation dugmad;
- prikazati recovery stanje;
- omogućiti raw backup/export;
- ne prepisivati invalid payload praznim nizom.

### 7.1 Sinhronizacija repository snapshot-a i appState-a

Tokom vanilla faze `appState` može ostati render snapshot, ali repository je
kanonski izvor.

Pravila:

- mutation prvo gradi `next` kopiju;
- service čeka repository Promise;
- tek uspešan rezultat ulazi u `appState`;
- zatim se renderuje;
- na grešku UI zadržava prethodni snapshot i pokazuje vidljiv status;
- repository subscriptions osvežavaju samo `goals` i `calendarEvents`, bez
  prepisivanja prolaznih UI polja;
- ne raditi background mutation bez error statusa.

Za unos teksta beleške dozvoljen je debounce queue, ali:

- blur mora flush-ovati pending izmenu;
- promena taba/view-a mora sačekati ili flush-ovati pending izmenu;
- greška mora ostaviti korisniku sadržaj za ponovni pokušaj;
- tačno trajanje debounce-a je otvorena odluka.

## 8. Goal ↔ Calendar ↔ Finance bridge

### 8.1 Kreiranje ili izmena finansijskog cilja

Predloženi tok:

1. GoalsRepository trajno sačuva cilj.
2. Service objavi `mentor:goal-saved` sa `goalId`, bez kompletnog privatnog
   payload-a u logovima.
3. FinanceGoalBridge učita cilj iz GoalsRepository-ja.
4. Ako cilj ispunjava odobreno Finance pravilo, bridge pozove
   `Finance.ensureSavingsBudgetForGoal(goal)`.
5. FinanceRepository trajno sačuva budžet sa `sourceGoalId`.
6. Bridge upiše `financeLink` status u Goal samo ako je taj povratni link
   odobren.

Finance failure ne sme obrisati već uspešno kreiran cilj. Link dobija
`pending` ili `error`, a UI nudi retry.

Heurističko parsiranje iz naslova/opisa može ostati fallback za stare ili
importovane dokumente, ali novi Goal Builder treba da dobije eksplicitna
`targetAmount` i `currency` polja kada korisnik izabere finansijski cilj.

### 8.2 Calendar event i Finance

Calendar event ostaje vezan za Goal preko `goalId`. Finance podatak se
rezolvuje preko Goal/Budget relacije.

U ovoj fazi:

- Calendar ne kreira transakciju;
- completion događaja ne znači da je novac stvarno prebačen;
- Finance može prikazati povezani naredni Calendar događaj read-only;
- buduća komanda „Potvrdi uplatu” može eksplicitno kreirati transakciju i
  povezati je sa `goalId`, `calendarEventId` i `budgetId`.

### 8.3 Brisanje cilja

Trenutni Calendar tok briše sve događaje cilja. Finance ponašanje nije
definisano.

Preporuka:

- Calendar događaji se brišu u istoj domenskoj komandi;
- Finance budžet se ne briše automatski;
- budžet se deaktivira ili mu se uklanja `sourceGoalId` tek nakon korisničke
  potvrde;
- istorijske transakcije se nikada ne brišu zbog brisanja cilja.

Ovo zahteva odluku korisnika pre implementacije bridge delete toka.

## 9. Validation i recovery pravila

### 9.1 Goals dokument

Dokument je validan kada:

- envelope je objekat sa podržanim `version`;
- `goals` je niz;
- svaki goal ima jedinstven, neprazan `id`;
- `type` je `long-term`, `short-term` ili `habit`;
- `title` je neprazan string;
- `targetDate`, kada postoji, ima `YYYY-MM-DD` format;
- `actions` i `notesList` su nizovi posle normalizacije;
- action i note ID-jevi su jedinstveni unutar agregata;
- timestamps, kada postoje, mogu da se parsiraju;
- unknown fields se čuvaju, ne odbacuju.

Type-specifična prazna polja mogu biti validation warning, ne nužno fatalna
greška, zbog kompatibilnosti sa sadašnjim modelima.

### 9.2 Calendar dokument

Dokument je validan kada:

- envelope je objekat sa podržanim `version`;
- `events` je niz;
- svaki event ima jedinstven, neprazan `id`;
- `goalId` je neprazan;
- `date` ima `YYYY-MM-DD` format;
- `time` ima validan `HH:MM` format;
- `actions` i `notesList` su nizovi posle normalizacije;
- action i note ID-jevi su jedinstveni unutar eventa;
- `completed` je boolean posle bezbedne normalizacije.

Prošli datum je validan. Događaj koji je vremenom postao istorijski ne sme
postati invalid.

### 9.3 Referencijalna validacija

Posle učitavanja oba dokumenta proveriti:

- svaki `event.goalId` postoji u Goals snapshot-u;
- svaki nenull `event.actionId` postoji u `goal.actions`;
- nema duplikata za istu kombinaciju koju sadašnji schedule tok zabranjuje:
  `goalId + actionId + date + time`;
- `financeLink.budgetId`, ako postoji, proverava bridge, ne Goals validator.

Orphan ili konflikt se ne briše automatski. Domen prelazi u
`DATA_RECOVERY_REQUIRED` i recovery UI treba da ponudi:

- raw export;
- listu problema;
- ručno relinkovanje;
- eksplicitno uklanjanje problematičnog zapisa;
- ponovnu validaciju.

### 9.4 Nedostajući i invalid dokument

- Nedostajući ključ: validno prazno korisničko stanje.
- Jedini prisutni kandidat je invalid: `DATA_RECOVERY_REQUIRED`.
- Ne zamenjivati invalid dokument praznim envelope-om.
- Ne automatski upisivati sample ciljeve.
- Pre svake recovery izmene napraviti raw backup.

## 10. Backup i import

Goals i Calendar moraju postati deo kompletnog Mentor backup-a.

### 10.1 Export

Backup manifest treba da uključi:

```json
{
  "domains": {
    "goals": {
      "version": 1,
      "count": 0,
      "checksum": "..."
    },
    "calendar": {
      "version": 1,
      "count": 0,
      "checksum": "..."
    }
  }
}
```

Dok je aktivan `LocalStorageAdapter`, kompletan backup uključuje:

- raw `mentor_goals_v1`;
- raw `mentor_calendar_events_v1`;
- raw planner preferences ako budu uvedene;
- normalizovani Goals dokument;
- normalizovani Calendar dokument;
- checksum raw i normalizovanog sadržaja;
- referential validation report.

Kasniji IndexedDB backup koristi iste domenske dokumente. Promena adaptera ne
menja backup domenski format.

### 10.2 Import

Import redosled:

1. pročitati i parse-ovati ceo backup;
2. proveriti manifest i podržane verzije;
3. validirati Goals dokument;
4. validirati Calendar dokument;
5. proveriti sve Goal/Event reference;
6. napraviti backup trenutnog stanja;
7. izračunati oba sledeća snapshot-a;
8. primeniti oba dokumenta kroz koordinisanu operaciju;
9. ponovo učitati repository-je i proveriti checksum/count;
10. tek zatim renderovati importovano stanje.

Import ne sme da meša sample templates sa korisničkim goals dokumentom.

U LocalStorage fazi, ako drugi write ne uspe, koristiti kompenzacioni restore.
U IndexedDB fazi oba domena moraju biti u jednoj transakciji.

## 11. Ciljani testovi

### 11.1 Repository unit testovi

- missing Goals key vraća `[]`;
- missing Calendar key vraća `[]`;
- invalid JSON kao jedini kandidat daje `DATA_RECOVERY_REQUIRED`;
- pogrešan envelope version daje recovery;
- duplicate goal ID je odbijen;
- duplicate event ID je odbijen;
- snapshot se klonira i spoljašnja mutacija ga ne menja;
- mutation queue čuva redosled;
- neuspešan adapter write vraća prethodni snapshot;
- `initialize()` je idempotentan;
- `createMany()` radi jedan durable document write;
- unknown fields ostaju sačuvana.

### 11.2 Model/validation testovi

- sva tri goal tipa;
- long-term targetDate;
- short-term duration;
- habit frequency/bestTime;
- nested goal actions i task actions;
- goal/event notes;
- validan istorijski Calendar event;
- nevalidan time/date;
- orphan `goalId`;
- orphan `actionId`;
- duplicate schedule kombinacija;
- normalizacija dodaje prazne nizove bez promene ID-ja;
- normalizacija ne koristi preveden UI tekst kao trajni enum.

### 11.3 Service testovi

- kreiranje cilja persistira pre render update-a;
- edit cilja čuva `createdAt` i menja `updatedAt`;
- single schedule;
- dnevni habit batch schedule;
- weekly i short-goal limit;
- brisanje eventa;
- cascade brisanje goal + events;
- failure na drugom cascade write-u aktivira kompenzaciju;
- neuspešna kompenzacija prelazi u recovery/failed stanje;
- goal action completion;
- event action completion i event `completed`;
- add/edit/delete goal note;
- add/edit/delete event note;
- duplicate note title;
- debounce note save i flush na blur/view change;
- render/selectors ne menjaju repository snapshot.

### 11.4 Bootstrap i browser testovi

- cold reload sa praznim dokumentima;
- cold reload sa sačuvanim ciljevima i događajima;
- direktno otvaranje Planner view-a tokom lazy load-a;
- Goal Builder nije interaktivan pre hydrate-a;
- Finance modul učitan pre i posle Goals hydrate-a daje isti rezultat;
- language change ne menja kanonske enum vrednosti;
- refresh posle svake glavne mutation komande;
- dva brza mutation-a ostaju redom;
- storage quota/error daje vidljiv status bez gubitka UI drafta;
- cross-tab promena ne pravi tihu divergentnu kopiju.

### 11.5 Finance bridge testovi

- nefinansijski cilj ne kreira budžet;
- finansijski cilj sa eksplicitnim iznosom kreira/povezuje budžet;
- ponovljeni bridge poziv je idempotentan po `sourceGoalId`;
- rename cilja ne duplira budžet;
- Finance save failure ostavlja goal sa retry stanjem;
- event completion ne kreira transakciju;
- brisanje cilja ne briše istorijske transakcije;
- odobreno unlink/deactivate pravilo za budžet radi bez orphan linka.

### 11.6 Backup/import testovi

- Goals i Calendar su prisutni u manifestu;
- raw i normalized checksum;
- export/import round-trip;
- import sa orphan eventom je odbijen pre write-a;
- import sa duplicate ID-em je odbijen;
- failure između dva LocalStorage write-a vraća prethodno stanje;
- backup sa sample-like korisničkim zapisom ga ne briše;
- kompletan reload posle importa vraća iste count/ID/checksum vrednosti.

## 12. Izvršenje, cutover i otvorene odluke

### 12.1 Cutover kriterijumi

Persistence se smatra spremnim tek kada:

- `GoalsRepository` i `CalendarRepository` prolaze repository contract testove;
- svi mutation call-site-ovi iz odeljka 2.2 koriste service/repository Promise;
- nijedan Goals/Calendar UI handler direktno ne piše `localStorage`;
- direktne izmene `appState.goals` i `appState.calendarEvents` više nisu
  kanonski write mehanizam;
- render/selectors više ne dopunjavaju actions i notes;
- cold bootstrap čeka Goals/Calendar hydrate;
- lazy Calendar ne renderuje pre READY stanja;
- save greške su vidljive i vraćaju prethodni durable snapshot;
- cascade delete ima testiran compensation put;
- sample ciljevi se ne upisuju automatski;
- reload testovi prolaze za create/edit/delete/schedule/completion/notes;
- Goals/Calendar su uključeni u kompletan backup/import;
- invalid jedini kandidat vodi u `RECOVERY_REQUIRED`;
- Finance bridge je idempotentan i nema automatske transakcije;
- dokumentovane otvorene odluke koje menjaju podatke imaju korisničko
  odobrenje;
- storage exit audit nema nedokumentovan Goals/Calendar persistence call-site.

### 12.2 Predloženi redosled implementacije

1. Zaključati otvorene odluke iz odeljka 12.3.
2. Dodati validation i normalizer test fixture-e.
3. Dodati `GoalsRepository` sa novim LocalStorage ključem.
4. Dodati `CalendarRepository` sa novim LocalStorage ključem.
5. Registrovati repository-je u `js/data/index.js`.
6. Dopuniti core bootstrap i Calendar feature hydration.
7. Dodati `GoalsCalendarService`.
8. Prebaciti Goal Builder create tok.
9. Prebaciti Calendar create/update/delete tokove.
10. Prebaciti actions/completion tokove.
11. Prebaciti notes tokove i debounce/flush.
12. Ukloniti mutation iz render/getter helpera.
13. Uvesti sample template ponašanje.
14. Uključiti Goals/Calendar u backup/import.
15. Implementirati odobreni Finance bridge.
16. Izvršiti repository, browser, recovery i exit audit testove.

Ovaj redosled i dalje koristi `LocalStorageAdapter`. Prelazak na IndexedDB je
kasnija promena adaptera, ne razlog da se preskoče repository granice.

### 12.3 Otvorene odluke za korisnika

1. **Sample ciljevi:** preporuka je read-only prikaz sa copy-on-write pri prvoj
   izmeni ili zakazivanju. Potrebna potvrda.
2. **Prazan prvi run:** da li prikazati sample templates ili samo empty state?
3. **Planner preferences:** da li trajno čuvati `currentView` i
   `goalDeckFilter`? Preporuka: da. Selekcije entiteta ostaju prolazne.
4. **`selectedDate`:** da li se vraća poslednji otvoreni datum ili uvek današnji?
5. **`slotNotes`:** ne čuvati dok se ne definiše završena funkcionalnost.
6. **Note autosave:** potvrditi debounce interval i flush UX. Preporuka:
   400–600 ms uz obavezan flush na blur i promenu view-a.
7. **Goal rename i postojeći eventi:** preporuka je da ručno izmenjen Event
   naslov ostane netaknut; potreban je eksplicitan „osveži iz cilja” tok.
8. **Eksplicitni Finance fields:** da li Goal Builder odmah dobija
   `targetAmount` i `currency` za Finance ciljeve? Preporuka: da.
9. **Finance bridge timing:** automatski posle durable Goal save-a ili na
   posebnu potvrdu korisnika? Preporuka: automatski predlog uz vidljiv status.
10. **Brisanje finansijskog cilja:** deaktivirati budžet, unlinkovati ga ili
    pitati korisnika svaki put? Preporuka: potvrda, bez brisanja budžeta i
    transakcija.
11. **Event completion i novac:** preporuka je bez automatske transakcije;
    eventualna uplata mora biti posebna potvrđena komanda.
12. **Cross-tab ponašanje:** automatski refresh snapshot-a ili upozorenje da su
    podaci promenjeni u drugom tabu? Preporuka: upozorenje i bez tihog
    prepisivanja aktivnog drafta.
13. **Konačni nazivi ključeva:** potvrditi
    `mentor_goals_v1` i `mentor_calendar_events_v1` pre implementacije.

### 12.4 Šta nije deo ovog zadatka

- nema migracije postojećih Goals/Calendar podataka jer trajni izvor ne postoji;
- nema implementacije persistence-a;
- nema produkcionih izmena u `script.js`, `kalendar.js` ili Finance modulu;
- nema instalacije Dexie-a;
- nema IndexedDB schema promene;
- nema normalizacije actions/notes u zasebne store-ove;
- nema automatskog kreiranja finansijskih transakcija;
- nema backend/cloud sync-a;
- nema automatskog brisanja sample-like zapisa.

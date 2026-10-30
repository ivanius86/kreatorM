# KreatorM 1.0.0 — IndexedDB v1 Release Checklist

Release candidate:

- Version: `1.0.0`
- Build: `20260730.1`
- Runtime release ID: `1.0.0+build.20260730.1`
- IndexedDB: `kreatorm_app_db`, structural version `1`
- Git commit: `TBD`
- `releasedAt`: `TBD`
- Operator: `TBD`

Ovaj checklist priprema objavu. Ne odobrava cleanup, reset niti menjanje legacy
izvora.

## 1. Tačni koraci pre objave

1. Potvrditi da su `package.json` i root package u `package-lock.json` na
   `1.0.0`.
2. Potvrditi da `js/release.js`, HTML meta tagovi i Database Viewer prikazuju:
   - `1.0.0`;
   - `20260730.1`;
   - `1.0.0+build.20260730.1`.
3. Iz čistog checkout-a pokrenuti:

   ```powershell
   npm ci
   npm test
   node tests/storage/indexeddb-cutover-smoke-runner.js
   ```

4. Rezultate priložiti release evidenciji. Očekivani postojeći baseline je
   51/51 Node testova i `INDEXEDDB_CUTOVER_SMOKE_OK`.
5. Pokrenuti release candidate u posebnom browser profilu. Ne koristiti jedini
   korisnički profil za prvi manual smoke.
6. Izvršiti first-run proveru iz odeljka 2.
7. Izvršiti modulsku proveru iz odeljka 3, zatim reload proveru iz odeljka 4.
8. Proveriti Database Viewer i napraviti izolovani ZIP iz odeljka 5.
9. Zatvoriti svaki blocker. Ne objavljivati sa storage greškom,
   `recoveryRequired`, neuspelim parity-jem ili high/medium data nalazom.
10. Tek nakon pregleda diff-a pripremiti Git commit i annotated tag prema
    odeljku 7. Ovaj checklist ne izvršava commit ili tag.

## 2. First-run i cutover smoke

Koristiti izolovan profil sa reprezentativnom kopijom legacy podataka i
zatvorenim drugim tabovima.

- [ ] Pre prvog otvaranja evidentirati da legacy ključevi postoje; ništa ne
      brisati.
- [ ] Otvoriti candidate samo jednom i sačekati kompletan bootstrap.
- [ ] DevTools provera daje:

  ```js
  KREATORM_RELEASE
  // {
  //   version: "1.0.0",
  //   build: "20260730.1",
  //   releaseId: "1.0.0+build.20260730.1",
  //   storageDatabase: "kreatorm_app_db",
  //   storageStructuralVersion: 1
  // }
  ```

- [ ] `Object.isFrozen(KREATORM_RELEASE)` je `true`.
- [ ] `MENTOR_APP_VERSION` je `1.0.0+build.20260730.1`.
- [ ] `MentorData.storageSelectionError` je `null`.
- [ ] `MentorData.database.name` je `kreatorm_app_db`.
- [ ] Sve vrednosti u `MentorData.adapterSelection` su `indexeddb`.
- [ ] Nema `failed` ili `recoveryRequired` migration checkpoint-a.
- [ ] Postojeći legacy izvori su i dalje prisutni i netaknuti.

## 3. Kratak manual smoke po modulu

Sve test zapise označiti prefiksom `RC-1.0.0-` da bi se lako razlikovali u
izolovanom profilu.

### Brainstorming

- [ ] Kreirati ideju `RC-1.0.0-Brainstorming`.
- [ ] Promeniti naslov ili opis i sačuvati.
- [ ] Napustiti ekran, vratiti se i potvrditi izmenu.

### Research

- [ ] Otvoriti research tok za `RC-1.0.0-Brainstorming`.
- [ ] Dodati jednu research direction/reference belešku i sačuvati.
- [ ] Ponovo otvoriti isti research tok i potvrditi vezu sa idejom i sadržaj.

### Finance

- [ ] Dodati jednu transakciju `RC-1.0.0-Finance` sa prepoznatljivim iznosom.
- [ ] Potvrditi da se prikazuje u Finance listi i da se zbir ažurirao.
- [ ] Promeniti belešku ili kategoriju i potvrditi durable izmenu.

### Nutrition

- [ ] Kreirati custom food `RC-1.0.0-Nutrition`.
- [ ] Dodati sliku kroz postojeći Nutrition UI i potvrditi prikaz slike/
      thumbnaila.
- [ ] Dodati food u inventory/planning tok i potvrditi da su food i inventory
      veza čitljivi.

### Goals

- [ ] Kreirati goal `RC-1.0.0-Goal`.
- [ ] Dodati jednu action stavku, izmeniti je i potvrditi prikaz.

### Calendar

- [ ] Kreirati Calendar event `RC-1.0.0-Calendar` vezan za
      `RC-1.0.0-Goal`/njegovu action stavku.
- [ ] Promeniti datum ili vreme i potvrditi da goal veza ostaje ispravna.

## 4. Reload i cross-feature provera

1. Završiti sve aktivne izmene.
2. Uraditi normalan browser reload.
3. Sačekati završetak bootstrap-a.
4. Ponovo otvoriti Brainstorming, Research, Finance, Nutrition, Goals i
   Calendar.
5. Potvrditi da su svi `RC-1.0.0-` zapisi i njihove veze sačuvani.
6. Potvrditi da se Nutrition originalna slika i thumbnail učitavaju.
7. Potvrditi da je `MentorData.storageSelectionError === null` i da su svi
   adapteri i dalje `indexeddb`.

## 5. Database Viewer i izolovani backup

- [ ] Otvoriti Database Viewer i kliknuti refresh.
- [ ] Header prikazuje `kreatorm_app_db`, `schema v1` i
      `release 1.0.0+build.20260730.1`.
- [ ] Prikaz obuhvata svih 13 v1 store-ova.
- [ ] `meta` nema `failed`/`recoveryRequired` checkpoint.
- [ ] Kliknuti **Export database backup**.
- [ ] ZIP se otvara i `manifest.json` ima:
  - `sourceMode: "indexeddb"`;
  - `appVersion: "1.0.0+build.20260730.1"`;
  - database `kreatorm_app_db`, structural/data version `1`;
  - svih 13 store-ova;
  - `localstorage/raw.json`;
  - migration, validation i conflicts report;
  - Nutrition media record i binary parity.
- [ ] Izračunati SHA-256 celog ZIP-a i evidentirati filename, `createdAt`,
      record count i media count prema
      [stabilization runbook-u](./INDEXEDDB_STABILIZATION_RUNBOOK.md).

Automatizovani headless smoke koristi privremeni izolovani browser profil,
sintetičke podatke i browser-native Blob/thumbnail. On **nije pročitao i ne
može tvrditi da je pročitao korisnikov live profil**. Stvarni korisnički profil
mora ručno da izvrši svoj production complete ZIP export kroz Database Viewer
i zasebno potvrdi restore/parity prema runbook-u.

## 6. Release odluka

Objava je dozvoljena samo ako:

- [ ] automatizovani i manual smoke prolaze;
- [ ] nema storage selection greške ni `recoveryRequired`;
- [ ] ZIP validacija i media parity prolaze;
- [ ] nema otvorenih high/medium nalaza;
- [ ] legacy izvori nisu menjani ili brisani;
- [ ] reviewer je odobrio tačan release diff.

Popuniti tek nakon stvarne objave:

| Polje | Vrednost |
|---|---|
| Release commit | `TBD` |
| `releasedAt` | `TBD` |
| Operator | `TBD` |
| Release dokaz/link | `TBD` |

Dok je `releasedAt` `TBD`, 30-dnevni stabilizacioni period nije počeo.

## 7. Git predlog — ne izvršavati automatski

Posle ručnog pregleda tačnog staged diff-a:

```powershell
git add package.json package-lock.json js/release.js index.html storageService.js tests/storage/indexeddb-cutover-runtime.html tests/storage/indexeddb-cutover-smoke.js INDEXEDDB_MIGRATION_PLAN.md INDEXEDDB_STABILIZATION_RUNBOOK.md RELEASE_INDEXEDDB_V1_CHECKLIST.md
git commit -m "release: KreatorM 1.0.0 IndexedDB v1"
git tag -a v1.0.0 -m "KreatorM 1.0.0 IndexedDB v1"
```

Commit i tag se ne kreiraju u okviru ovog zadatka.

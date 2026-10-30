# IndexedDB Stabilization Runbook

Status dokumenta: operativna osnova za Fazu 4  
Release candidate version: `1.0.0`  
Release candidate build: `20260730.1`  
Runtime release ID: `1.0.0+build.20260730.1`  
Released at / početak stabilnog perioda: `TBD`  
Cleanup status: **nije potvrđen kao eligible i nije dozvoljen ovim dokumentom**

Ovaj runbook sprovodi Fazu 4 iz
[IndexedDB migration plana](./INDEXEDDB_MIGRATION_PLAN.md). Ne menja data model,
ne uvodi legacy fallback i ne odobrava brisanje podataka.

## 1. Trenutno potvrđeno stanje

Potvrđena tehnička osnova pre release evidencije:

- Node test suite: **51/51 prolazi**.
- IndexedDB cutover browser smoke u Microsoft Edge-u: **OK**.
- Završni reviewer nalaz: **nema high ni medium problema**.
- Aktivni post-cutover storage je `kreatorm_app_db`.
- Kompletan IndexedDB ZIP export, validacija, transakcioni restore i read-back
  parity postoje iza `MentorIndexedDbAdmin`.
- Posle prvog IndexedDB upisa nema automatskog vraćanja na `localStorage`.
- Legacy cleanup API ne postoji.
- Postojeći legacy `localStorage` izvori i baza `mentor_nutrition_images`
  ostaju netaknuti.

Ovo je implementaciona i test potvrda. Release candidate metadata je zaključana
na version `1.0.0`, build `20260730.1` i runtime release ID
`1.0.0+build.20260730.1`. To nije dokaz da je stabilna verzija objavljena i ne
pokreće 30-dnevni period. `releasedAt`, release commit i operator ostaju `TBD`
dok stvarna objava ne bude potvrđena.

## 2. Odgovornosti i nepromenljive sigurnosne ograde

- Release operator popunjava release i backup evidenciju stvarnim vrednostima.
- Osoba koja radi restore koristi izolovan browser profil/origin storage, nikad
  aktivni produkcioni profil.
- Svaki incident koji može uticati na podatke prvo čuva dokaz i kompletan ZIP
  ako je export moguć.
- Niko ne briše ili ručno menja legacy ključeve, staru Nutrition images bazu,
  cutover markere ili migration checkpoint-e.
- `localStorage` i `mentor_nutrition_images` nisu rollback target.
- Reset baze nije rollback mehanizam i nije povezan sa UI dugmetom.
- Cleanup se ne izvodi u Fazi 4. Može samo biti predložen kao zaseban budući
  zadatak kada svi kriterijumi iz odeljka 8 budu dokazani.

## 3. Pre-release checklist

Release se ne proglašava stabilnim dok svaka primenljiva stavka nema dokaz.

### 3.1 Build i review

- [ ] Release commit/revision je zamrznut i zabeležen: `TBD`.
- [x] Release candidate version je zaključana: `1.0.0`.
- [x] Release candidate build je zaključan: `20260730.1`.
- [x] Runtime release ID je zaključan: `1.0.0+build.20260730.1`.
- [ ] `npm ci` prolazi iz zaključanog `package-lock.json`.
- [ ] `npm test` prolazi; očekivani baseline je 51/51.
- [ ] `node tests/storage/indexeddb-cutover-smoke-runner.js` prolazi u
      podržanom Edge okruženju.
- [ ] Nema otvorenih high/medium data-safety ili storage review nalaza.
- [ ] `index.html` i browser smoke harness učitavaju relevantne data skripte
      istim redosledom.
- [ ] Build koristi lokalne, zaključane Dexie i fflate fajlove; nema CDN
      zavisnosti.
- [ ] Baza se otvara kao `kreatorm_app_db`, structural v1.

### 3.2 Produkciono ponašanje pre proglašenja stabilnosti

- [ ] Asinhroni bootstrap se završava bez `MentorData.storageSelectionError`.
- [ ] Svi kanonski adapter selection zapisi pokazuju `indexeddb`.
- [ ] Nema migration checkpoint-a sa statusom `failed` ili
      `recoveryRequired`.
- [ ] Database Viewer prikazuje `kreatorm_app_db` i očekivane store-ove.
- [ ] Read, create/update i reload provera prolazi za aktivne module.
- [ ] Cross-tab provera potvrđuje da zastareli tab ne može da upiše podatke
      posle promene data epoch-a.
- [ ] Produkcioni kompletan ZIP je preuzet i evidentiran prema odeljku 4.
- [ ] Izolovani restore i parity su potvrđeni prema odeljku 5.

### 3.3 Release evidencija

Version i build su zaključani za release candidate. Sam `package.json` nije
dokaz da je build objavljen; objava se potvrđuje stvarnim commitom,
`releasedAt` vrednošću i operatorom:

| Polje | Vrednost |
|---|---|
| Release candidate version | `1.0.0` |
| Release candidate build | `20260730.1` |
| Runtime release ID | `1.0.0+build.20260730.1` |
| Release commit/revision | `TBD` |
| `releasedAt` u ISO 8601 formatu | `TBD` |
| Operator | `TBD` |
| Release dokaz/link | `TBD` |

`releasedAt` postaje početak stabilnog perioda samo kada je ta verzija stvarno
objavljena i eksplicitno proglašena stabilnom. Ne koristiti datum
implementacije, testa ili izrade ovog dokumenta.

## 4. Obavezni production complete ZIP export

Ovaj korak se radi iz produkcionog profila kroz postojeći Database Viewer.

1. Zatvoriti druge tabove aplikacije ili završiti sve aktivne izmene.
2. Otvoriti **Database Viewer** i osvežiti prikaz.
3. Potvrditi da Viewer prikazuje `kreatorm_app_db`, bez storage greške ili
   zahteva za reload.
4. Kliknuti **Export database backup**.
5. Sačuvati preuzeti `.zip` na kontrolisanoj lokaciji bez menjanja sadržaja.
6. Otvoriti kopiju ZIP-a i proveriti `manifest.json`:
   - `sourceMode` je `indexeddb`;
   - database name je `kreatorm_app_db`;
   - structural i data version odgovaraju aktivnom buildu;
   - prisutni su svi v1 store-ovi, raw izvori i obavezni report-i;
   - Nutrition media count, ID-jevi i binarni deskriptori postoje;
   - svaki ZIP entry ima deklarisan SHA-256 i veličinu.
7. Izračunati SHA-256 celog, neizmenjenog ZIP fajla. Na Windows-u:

   ```powershell
   Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\putanja\kreatorm-backup-....zip'
   ```

8. Ukupan record count izračunati kao zbir `count` vrednosti svih
   `manifest.domains` zapisa. Media count uzeti iz
   `manifest.media.recordCount`.
9. U Database Viewer-u ponovo osvežiti snapshot i potvrditi da `meta` sadrži
   `backup:indexeddb:last-verified` koji odgovara exportovanom fajlu. Ako je
   `meta` prikaz skraćen, koristiti read-only proveru iz odeljka 7.
10. Popuniti evidenciju ispod. Samo postojanje fajla bez manifest provere,
    checksum-a i restore potvrde nije dovoljan dokaz kompletnog backupa.

### 4.1 Evidencija produkcionog backupa

| Polje | Vrednost |
|---|---|
| ZIP filename | `TBD` |
| `manifest.createdAt` | `TBD` |
| SHA-256 celog ZIP fajla | `TBD` |
| ZIP byte size | `TBD` |
| Database / structural version / data version | `TBD` |
| Ukupan record count | `TBD` |
| Nutrition media record count | `TBD` |
| Nutrition binary/blob count | `TBD` |
| `backup:indexeddb:last-verified.verifiedAt` | `TBD` |
| Export operator | `TBD` |
| Kontrolisana lokacija/kopija | `TBD` |

## 5. Izolovani restore i parity potvrda

Restore se nikad ne testira nad jedinim produkcionim profilom.

1. Napraviti nov, izolovan browser profil sa zasebnim origin storage-om.
2. Pokrenuti isti release build i potvrditi da profil ne deli IndexedDB sa
   produkcionim profilom.
3. Sačuvati originalni produkcioni ZIP kao read-only dokaz i raditi sa kopijom.
4. U izolovanom Database Viewer-u izabrati **Import database backup**, odabrati
   kopiju ZIP-a i potvrditi replace import.
5. Sačuvati automatski pre-action ZIP izolovane baze.
6. Import mora završiti bez greške. To potvrđuje validaciju pre upisa,
   transakcioni replace i neposredni read-back parity.
7. Dozvoliti reload, zatim ponovo otvoriti Database Viewer.
8. Proveriti funkcionalni read/reload za sve aktivne module i da su media blob i
   thumbnail čitljivi.
9. Iz izolovane obnovljene baze napraviti novi complete ZIP export.
10. Uporediti originalni i post-restore manifest:
    - database identity i v1 store set su isti;
    - za kanonske store-ove, kao i `legacyBackups`, isti su count, ID skup i
      domain checksum;
    - media ID skup, record count, binary count, byte size i pojedinačni
      SHA-256 deskriptori su isti;
    - obavezni migration, validation i conflict report-i postoje.

`meta` store može legitimno imati drugačiji checksum zbog novog data epoch-a,
restore vremena i `backup:indexeddb:last-verified` evidencije. To nije parity
greška ako su očekivane operativne meta razlike dokumentovane, a svi kanonski
store-ovi, `legacyBackups`, report-i i media sadržaj ostanu isti.

### 5.1 Restore/parity evidencija

| Polje | Vrednost |
|---|---|
| Izolovani profil/build | `TBD` |
| Source ZIP filename | `TBD` |
| Source ZIP SHA-256 | `TBD` |
| Restore vreme | `TBD` |
| Import rezultat | `TBD` |
| Read-back parity rezultat | `TBD` |
| Post-restore export filename/SHA-256 | `TBD` |
| Kanonski store parity | `TBD` |
| Nutrition media parity | `TBD` |
| Dokumentovane `meta` razlike | `TBD` |
| Operator | `TBD` |

## 6. Najmanje 30 dana stabilizacionog praćenja

Period traje najmanje 30 punih kalendarskih dana od stvarnog `releasedAt`.
Dok je `releasedAt` `TBD`, period nije počeo.

Najmanje jednom dnevno:

1. potvrditi aktivnu release verziju/build;
2. proveriti `MentorData.storageSelectionError`;
3. read-only proveriti migration checkpoint-e i zabeležiti svaki
   `failed`/`recoveryRequired`;
4. proveriti da nema neočekivanog `reloadRequired` ili ponovljenog epoch
   konflikta;
5. pregledati prijavljene neuspele write, backup, import ili hydrate događaje;
6. zabeležiti rezultat, uključujući dane bez incidenta.

Minimalni log:

| Datum/vreme | Dan perioda | Version/build | Storage error | `recoveryRequired` domeni | Incident/severity | Akcija i dokaz | Otvoreno? |
|---|---:|---|---|---|---|---|---|
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

Pravila perioda:

- Nerazrešen high/medium data-safety incident znači da period nije potvrđen.
- Gubitak podataka, neuspešan restore/parity, trajni `recoveryRequired` ili
  potreba za data popravkom prekidaju stabilni period. Novi period počinje tek
  od stvarno objavljene i potvrđene korektivne stabilne verzije; novi datum se
  beleži, ne pretpostavlja.
- Low incident bez uticaja na integritet ne resetuje automatski period, ali
  mora imati obrazloženje i zatvoren status.
- Odsustvo loga nije dokaz stabilnosti.

## 7. Read-only status i `legacyCleanupEligibility`

### 7.1 Storage/recovery pregled

U DevTools konzoli može se koristiti postojeći read-only admin snapshot:

```js
const snapshot = await MentorIndexedDbAdmin.viewerSnapshot({ rowLimit: 1000 });
const meta = snapshot.stores.meta;
const recoveryRequired = meta.rows.filter(
  (row) => row && row.status === "recoveryRequired"
);
({
  generatedAt: snapshot.generatedAt,
  database: snapshot.database,
  metaTruncated: meta.truncated,
  storageSelectionError: MentorData.storageSelectionError || null,
  recoveryRequired
});
```

Ako je `metaTruncated: true`, povećati `rowLimit` i ponoviti read-only poziv.
Ovaj poziv ne menja bazu.

### 7.2 Eligibility bez cleanup API-ja

Dok release metadata nije poznata, koristiti samo:

```js
await MentorIndexedDbAdmin.legacyCleanupEligibility();
```

Ne prosleđivati string `TBD` kao datum. Kada postoje stvarne release vrednosti,
status se može pročitati ovako:

```js
await MentorIndexedDbAdmin.legacyCleanupEligibility({
  stableReleaseVersion: "STVARNA_VERZIJA",
  stableReleaseAt: "STVARNI_ISO_8601_DATUM",
  manualConfirmation: false
});
```

Rezultat je isključivo status:

- `actionPerformed` mora ostati `false`;
- `note` potvrđuje da cleanup API nije izložen;
- `verifiedBackup` pokazuje poslednji evidentirani kompletan IndexedDB backup;
- `stableDays` je izračunat broj dana;
- `eligible` ostaje `false` dok je `manualConfirmation: false`.

U ovom runbook-u se `manualConfirmation: true` ne koristi. To je dozvoljeno tek
u zasebnom budućem cleanup zadatku posle nove eksplicitne odluke.

## 8. Kada se manual cleanup sme samo predložiti

Zaseban cleanup zadatak može biti predložen, ali ne i automatski pokrenut, tek
kada postoje svi sledeći dokazi:

- release version/build/release ID odgovaraju zaključanom candidate-u, a
  stvarni `releasedAt`, commit i operator više nisu `TBD`;
- dokumentovano je najmanje 30 punih dana stabilnog korišćenja;
- nema otvorenih high/medium data-safety incidenata;
- nema `failed` ili `recoveryRequired` checkpoint-a;
- postoji production complete ZIP sa filename, createdAt, SHA-256, record i
  media count dokazima;
- izolovani restore i kanonski/media parity su uspešno potvrđeni;
- `legacyCleanupEligibility({ ..., manualConfirmation: false })` potvrđuje
  prva tri tehnička uslova, dok `eligible` namerno ostaje `false`;
- identifikovan je tačan, ograničen spisak legacy ključeva i stara Nutrition
  baza, uz zaseban pre-cleanup backup i rollback plan;
- korisnik je u tom budućem zadatku eksplicitno odobrio opseg i ručnu akciju.

Čak i tada rezultat Faze 4 je samo predlog novog zadatka. Ovaj dokument ne
označava cleanup eligible, ne uvodi cleanup API i ne briše ništa.

## 9. Incident rollback i recovery bez legacy fallback-a

### 9.1 Prva reakcija

1. Zaustaviti nove korisničke mutacije i zatvoriti dodatne tabove.
2. Ne reload-ovati naslepo ako postoje nesačuvani dijagnostički podaci.
3. Zabeležiti version/build, vreme, modul, korake reprodukcije,
   `MentorData.storageSelectionError`, checkpoint status i data epoch stanje.
4. Ako baza može da se čita, odmah napraviti complete ZIP kroz Database Viewer
   i zabeležiti njegov SHA-256.
5. Ne menjati `localStorage`, cutover marker, migration checkpoint ili
   `mentor_nutrition_images`.

### 9.2 Rollback aktivne post-cutover baze

1. Izabrati poslednji poznati dobar **kompletan IndexedDB ZIP**, ne legacy JSON.
2. Proveriti njegov filename, SHA-256, manifest identity i prethodni izolovani
   restore/parity dokaz.
3. Prvo reprodukovati i probati restore u izolovanom profilu.
4. U pogođenom profilu koristiti Database Viewer import. Import automatski
   pravi i validira novi pre-action complete ZIP pre transakcionog replace-a.
5. Sačuvati pre-action ZIP i njegov SHA-256 pre potvrde da je incident zatvoren.
6. Posle uspešnog importa dozvoliti reload, proveriti module, checkpoint-e,
   epoch i napraviti novi post-recovery complete ZIP.
7. Dokumentovati koji je snapshot vraćen i koji podaci posle tog snapshot-a
   zahtevaju kontrolisanu rekonstrukciju.

Ne prebacivati adapter na `localStorage`. Legacy kopije mogu biti starije od
prvih IndexedDB upisa i njihovo aktiviranje bi bilo tih gubitak novijih podataka.

### 9.3 `recoveryRequired`

- Aktivni domen sa IndexedDB write markerom ne vraća se na legacy izvor.
- Za pre-activation recovery kandidat koristi se samo eksplicitni
  `MentorIndexedDbAdmin.retryRecovery()` tok: novi complete raw backup,
  potvrda da je backup preuzet, validiran repaired source overlay i odobren
  target.
- Atomic target-i ostaju `goals-calendar`, `ideas-comparisons`,
  `finance-assets` i `nutrition-envelopes`; aktivan partner ili partner sa
  IndexedDB upisom blokira retry.
- Za već aktivan domen koristi se restore poslednjeg poznatog dobrog kompletnog
  IndexedDB ZIP-a ili korektivni data repair odobren kao zaseban zadatak.
- Ako baza ne može bezbedno da se otvori ili exportuje, ne resetovati je.
  Sačuvati browser profil, zaustaviti mutacije i prvo ispraviti runtime ili
  pripremiti kontrolisan restore u izolovanom okruženju.

## 10. Završetak Faze 4

Faza 4 može biti označena završenom tek kada:

- sva release i backup `TBD` polja imaju stvarne proverljive vrednosti;
- production export i izolovani restore/parity su dokumentovani;
- postoji najmanje 30 dana potpunog stabilizacionog loga;
- svi data incidenti su zatvoreni;
- nema `recoveryRequired`;
- legacy izvori su i dalje netaknuti;
- eventualni cleanup je samo izdvojen kao novi, eksplicitno odobren zadatak.

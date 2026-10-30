const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const Dexie = require("dexie");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");
const { ROOT } = require("./test-helpers");

const DATABASE_NAME = "kreatorm_app_db";

function loadInfrastructure() {
  global.window = global;
  global.Dexie = Dexie;
  global.indexedDB = indexedDB;
  global.IDBKeyRange = IDBKeyRange;
  global.MentorDataPhase0 = {};
  global.MentorIndexedDB = {};

  [
    "js/data/backup/backup-checksum.service.js",
    "js/data/migration/migration-status.constants.js",
    "js/data/database/schema-v1.js",
    "js/data/database/kreatorm.database.js",
    "js/data/database/transaction.helper.js",
    "js/data/adapters/dexie.adapter.js",
    "js/data/migration/migration-state-machine.js",
    "js/data/migration/migration-checkpoint.service.js",
    "js/data/migration/migration-verification.service.js",
    "js/data/recovery/indexeddb-recovery.service.js"
  ].forEach((relativePath) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    vm.runInThisContext(source, { filename: relativePath });
  });

  return {
    infrastructure: global.MentorIndexedDB,
    checksumService: global.MentorDataPhase0.BackupChecksumService
  };
}

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Cleanup blocked for ${name}.`));
  });
}

test("IndexedDB v1 supports aggregate CRUD, atomic rollback and verified checkpoints", async () => {
  await deleteDatabase(DATABASE_NAME);
  const { infrastructure, checksumService } = loadInfrastructure();
  const database = infrastructure.createDatabase({
    Dexie,
    indexedDB,
    IDBKeyRange
  });

  try {
    await database.open();

    assert.equal(database.name, DATABASE_NAME);
    assert.deepEqual(
      database.tables.map((table) => table.name).sort(),
      infrastructure.SchemaV1.storeNames.slice().sort()
    );
    assert.equal(database.tables.length, 13);

    const calendarSchema = database.table("calendarEvents").schema;
    assert.deepEqual(
      calendarSchema.indexes.map((index) => index.name).sort(),
      ["[goalId+date]", "date", "goalId"]
    );

    const adapter = new infrastructure.DexieAdapter(database);
    const goals = adapter.createRepository("goals");
    const calendarEvents = adapter.createRepository("calendarEvents");
    const nestedGoal = {
      id: "goal-1",
      title: "Launch",
      actions: [{ id: "action-1", done: false }],
      notesList: [{ id: "note-1", text: "Keep nested" }]
    };

    await goals.create(nestedGoal);
    await calendarEvents.create({
      id: "event-1",
      goalId: "goal-1",
      date: "2026-07-30",
      title: "Review"
    });
    assert.deepEqual(await goals.getById("goal-1"), nestedGoal);
    assert.equal(
      (await calendarEvents.whereEquals("goalId", "goal-1")).length,
      1
    );

    await assert.rejects(
      infrastructure.TransactionHelper.run(
        database,
        "rw",
        ["goals", "calendarEvents"],
        async ({ table }) => {
          await table("goals").put({ id: "goal-aborted" });
          await table("calendarEvents").put({
            id: "event-aborted",
            goalId: "goal-aborted",
            date: "2026-07-31"
          });
          throw new Error("Abort transaction");
        }
      ),
      /Abort transaction/
    );
    assert.equal(await goals.getById("goal-aborted"), undefined);
    assert.equal(
      await calendarEvents.getById("event-aborted"),
      undefined
    );

    const checkpointKey = "migration:test-goals";
    const checkpoints = new infrastructure.MigrationCheckpointService(database);
    await checkpoints.ensure(checkpointKey, {
      domain: "goals",
      migrationVersion: 1
    });
    await checkpoints.transition(
      checkpointKey,
      infrastructure.MigrationStateMachine.STATUS.BACKUP_IN_PROGRESS
    );
    await checkpoints.transition(
      checkpointKey,
      infrastructure.MigrationStateMachine.STATUS.BACKED_UP
    );
    await checkpoints.transition(
      checkpointKey,
      infrastructure.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS
    );

    const importedGoals = [{
      id: "goal-imported",
      actions: [{ id: "action-imported" }],
      notesList: []
    }];
    const importedCheckpoint = await checkpoints.replaceDomainAndCheckpoint(
      "goals",
      importedGoals,
      checkpointKey,
      { sourceChecksum: "raw-backup-checksum" }
    );
    assert.equal(
      importedCheckpoint.status,
      infrastructure.MigrationStateMachine.STATUS.IMPORTED
    );
    assert.deepEqual(await goals.getAll(), importedGoals);

    const verification =
      await infrastructure.MigrationVerificationService.verifyAndCheckpoint({
        database,
        storeName: "goals",
        expectedRecords: importedGoals,
        checkpointService: checkpoints,
        checkpointKey,
        checksumService,
        cryptoApi: webcrypto
      });

    assert.equal(verification.report.valid, true);
    assert.equal(
      verification.checkpoint.status,
      infrastructure.MigrationStateMachine.STATUS.VERIFIED
    );
    assert.equal(
      infrastructure.IndexedDbRecoveryService.assertActivationAllowed(
        verification.checkpoint
      ),
      true
    );
    assert.throws(
      () => infrastructure.IndexedDbRecoveryService.assertActivationAllowed({
        status: infrastructure.MigrationStateMachine.STATUS.IMPORTED
      }),
      (error) => error.code === "RECOVERY_REQUIRED"
    );
  } finally {
    database.close();
    await deleteDatabase(DATABASE_NAME);
  }
});

test("Dexie lifecycle handling records controlled blocked and versionchange signals", async () => {
  await deleteDatabase(DATABASE_NAME);
  const { infrastructure } = loadInfrastructure();
  let blockedDetail = null;
  let versionChangeDetail = null;
  const database = infrastructure.createDatabase({
    Dexie,
    indexedDB,
    IDBKeyRange,
    onBlocked(detail) {
      blockedDetail = detail;
    },
    onVersionChange(detail) {
      versionChangeDetail = detail;
    }
  });

  try {
    await database.open();
    database.on.blocked.fire({ oldVersion: 10, newVersion: 20 });
    database.on.versionchange.fire({ oldVersion: 10, newVersion: 20 });

    assert.equal(database.lifecycleState.blocked, true);
    assert.equal(blockedDetail.databaseName, DATABASE_NAME);
    assert.equal(blockedDetail.oldVersion, 10);
    assert.equal(
      database.lifecycleState.versionChangeRequested,
      true
    );
    assert.equal(versionChangeDetail.newVersion, 20);
    assert.equal(database.isOpen(), false);
  } finally {
    database.close();
    await deleteDatabase(DATABASE_NAME);
  }
});

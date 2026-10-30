const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPhase0Scripts } = require("./test-helpers");

function load() {
  return loadPhase0Scripts([
    "js/data/migration/migration-status.constants.js",
    "js/data/migration/migration-report.model.js",
    "js/data/recovery/recovery-report.service.js"
  ]);
}

test("invalid only candidate produces recoveryRequired and blocks cutover", () => {
  const api = load();
  const report = api.RecoveryReportService.fromAudit({
    entries: [{
      key: "mentor_nutrition_foods_v1",
      owner: "nutrition-foods",
      present: true,
      readStatus: "ok",
      validationStatus: "invalid",
      errors: ["INVALID_ARRAY:userFoodNutrients"],
      checksum: "a".repeat(64)
    }]
  }, { createdAt: "2026-01-01T00:00:00.000Z", domain: "nutritionFoodData" });

  assert.equal(report.status, "recoveryRequired");
  assert.equal(report.allowsEmptyActivation, false);
  assert.throws(
    () => api.RecoveryReportService.assertCutoverAllowed(report),
    (error) => error.code === "RECOVERY_REQUIRED"
  );
});

test("migration report preserves non-selected conflict candidate checksums", () => {
  const api = load();
  const report = api.MigrationReportModel.createMigrationReport({
    createdAt: "2026-01-01T00:00:00.000Z",
    domains: [{
      domain: "ideas",
      status: "backed_up",
      conflicts: [{
        id: "idea-1",
        sourceKeys: ["mentor_database", "mentor_brainstorming_ideas"],
        candidateChecksums: { central: "a".repeat(64), legacy: "b".repeat(64) },
        selectedSource: "mentor_database",
        rule: "central-without-timestamp"
      }]
    }]
  });

  assert.equal(report.domains[0].conflicts[0].candidateChecksums.legacy, "b".repeat(64));
  assert.equal(report.domains[0].conflicts[0].selectedSource, "mentor_database");
});

(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const DOMAIN_PATHS = Object.freeze({
    "data/settings.json": "settings",
    "data/ideas.json": "ideas",
    "data/finance-documents.json": "financeDocuments",
    "data/assets.json": "assets",
    "data/comparisons.json": "comparisons",
    "data/cache.json": "cache",
    "data/nutrition-food-data.json": "nutritionFoodData",
    "data/nutrition-inventory-data.json": "nutritionInventoryData",
    "data/goals.json": "goals",
    "data/calendar.json": "calendar"
  });

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function createMemoryRestoreTarget() {
    let committed = { stores: {}, media: [] };
    return {
      isEmpty() {
        return Object.keys(committed.stores).length === 0 && committed.media.length === 0;
      },
      async replaceAtomically(next) {
        committed = clone(next);
      },
      snapshot() {
        return clone(committed);
      }
    };
  }

  function parseJsonFile(archive, path, fflate) {
    const bytes = archive.files[path];
    if (!bytes) return null;
    try {
      return JSON.parse(fflate.strFromU8(bytes));
    } catch (_) {
      const error = new Error(`Backup JSON entry is invalid: ${path}`);
      error.code = "RESTORE_JSON_INVALID";
      throw error;
    }
  }

  async function restoreIntoEmptyTarget(archive, target, options) {
    const fflate = options?.fflate || root.fflate;
    if (!fflate?.strFromU8) {
      const error = new Error("The locally installed fflate library is required.");
      error.code = "ZIP_LIBRARY_UNAVAILABLE";
      throw error;
    }
    if (!archive || archive.status !== "valid") {
      const error = new Error("A validated ZIP archive is required.");
      error.code = "VALIDATED_ARCHIVE_REQUIRED";
      throw error;
    }
    if (!target?.isEmpty?.()) {
      const error = new Error("Restore target must be empty.");
      error.code = "RESTORE_TARGET_NOT_EMPTY";
      throw error;
    }

    const next = { stores: {}, media: [] };
    Object.entries(DOMAIN_PATHS).forEach(([path, store]) => {
      const value = parseJsonFile(archive, path, fflate);
      if (value !== null) next.stores[store] = value;
    });
    const hasGoals = Object.prototype.hasOwnProperty.call(next.stores, "goals");
    const hasCalendar = Object.prototype.hasOwnProperty.call(next.stores, "calendar");
    if (hasGoals !== hasCalendar) {
      const error = new Error("Goals and Calendar restore documents must be imported together.");
      error.code = "RESTORE_GOALS_CALENDAR_PAIR_REQUIRED";
      throw error;
    }
    if (hasGoals) {
      const validation = namespace.GoalsCalendarBackupService?.validateDocuments(
        next.stores.goals,
        next.stores.calendar
      );
      if (!validation?.valid) {
        const error = new Error("Goals and Calendar restore documents are invalid.");
        error.code = "RESTORE_GOALS_CALENDAR_INVALID";
        error.details = validation?.errors || ["GOALS_CALENDAR_VALIDATOR_UNAVAILABLE"];
        throw error;
      }
      next.stores.goals = validation.goals;
      next.stores.calendar = validation.calendar;
    }

    const mediaIndex = parseJsonFile(
      archive,
      "indexeddb/mentor_nutrition_images/foodImages.json",
      fflate
    );
    if (mediaIndex) {
      const mediaValidation = namespace.BackupValidators.validateMediaIndex(mediaIndex);
      if (!mediaValidation.valid) {
        const error = new Error("Media index is invalid.");
        error.code = "RESTORE_MEDIA_INDEX_INVALID";
        error.details = mediaValidation.errors;
        throw error;
      }
      next.media = mediaIndex.records.map((record) => {
        const blobBytes = archive.files[record.blob.path];
        const thumbnailBytes = record.thumbnail ? archive.files[record.thumbnail.path] : null;
        if (!blobBytes || (record.thumbnail && !thumbnailBytes)) {
          const error = new Error("Media binary entry is missing.");
          error.code = "RESTORE_MEDIA_BINARY_MISSING";
          throw error;
        }
        return {
          id: record.id,
          entityType: record.entityType,
          entityId: record.entityId,
          foodId: record.foodId,
          type: record.type,
          originalName: record.originalName,
          size: record.size,
          updatedAt: record.updatedAt,
          blob: new Uint8Array(blobBytes),
          blobType: record.blob.contentType,
          thumbnail: thumbnailBytes ? new Uint8Array(thumbnailBytes) : null,
          thumbnailType: record.thumbnail?.contentType || null
        };
      });
    }

    await target.replaceAtomically(next);
    return target.snapshot();
  }

  namespace.IsolatedRestoreService = Object.freeze({
    createMemoryRestoreTarget,
    restoreIntoEmptyTarget,
    domainPaths: DOMAIN_PATHS
  });
})(typeof window !== "undefined" ? window : globalThis);

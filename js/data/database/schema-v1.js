(function (root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const stores = Object.freeze({
    meta: "key",
    legacyBackups: "key,capturedAt",
    settings: "key",
    ideas: "id,status,type,updatedAt",
    financeDocuments: "id,type",
    assets: "id,recordType,type,updatedAt",
    comparisons: "id,recordType,ideaId,updatedAt",
    cache: "key,expiresAt",
    nutritionFoodData: "id",
    nutritionInventoryData: "id",
    media: "id,entityType,entityId,[entityType+entityId],updatedAt",
    goals: "id",
    calendarEvents: "id,goalId,date,[goalId+date]"
  });

  namespace.SchemaV1 = Object.freeze({
    databaseName: "kreatorm_app_db",
    structuralVersion: 1,
    dataVersion: 1,
    stores,
    storeNames: Object.freeze(Object.keys(stores))
  });
})(typeof window !== "undefined" ? window : globalThis);

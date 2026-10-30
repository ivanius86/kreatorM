(function (root) {
  "use strict";

  function createMediaRepository() {
    let ready = false;
    const api = () => root.MentorNutritionFoodImageStorage;
    const requireApi = () => {
      if (!api()) throw new root.MentorDataError("MEDIA_STORAGE_UNAVAILABLE", "Nutrition media service is not loaded.");
      return api();
    };
    return {
      storageKind: "legacy-indexeddb",
      async initialize() { requireApi(); ready = true; },
      isReady: () => ready,
      validate(file) { return requireApi().validate(file); },
      async getEntity(entityType, entityId) { return requireApi().getEntity(entityType, entityId); },
      async saveEntity(entityType, entityId, file) {
        return requireApi().saveEntity(entityType, entityId, file);
      },
      async put(record) {
        if (!record?.entityType || !record?.entityId || !record?.blob) throw new root.MentorDataError("INVALID_MEDIA_RECORD", "Media record is incomplete.");
        if (["research-video", "research-av", "research-source"].includes(record.entityType)) return requireApi().putEntityRecord(record);
        return requireApi().saveEntity(record.entityType, record.entityId, record.blob);
      },
      async removeEntity(entityType, entityId) { await requireApi().removeEntity(entityType, entityId); },
      async restoreEntity(entityType, entityId, record) {
        return requireApi().restoreEntity(entityType, entityId, record);
      },
      async objectUrlEntity(entityType, entityId, thumbnail) {
        return requireApi().objectUrlEntity(entityType, entityId, thumbnail);
      },
      urlMetadata(url) { return requireApi().urlMetadata(url); },
      async resolveEntityUrl(entityType, entityId, metadata, thumbnail) {
        return requireApi().resolveEntityUrl(
          entityType,
          entityId,
          metadata,
          thumbnail
        );
      },
      revokeObjectUrl(url) { return requireApi().revokeObjectUrl(url); },
      save(foodId, file) { return requireApi().save(foodId, file); },
      get(foodId) { return requireApi().get(foodId); },
      remove(foodId) { return requireApi().remove(foodId); },
      restore(foodId, record) {
        return requireApi().restore(foodId, record);
      },
      objectUrl(foodId, thumbnail) {
        return requireApi().objectUrl(foodId, thumbnail);
      },
      resolveUrl(foodId, metadata, thumbnail) {
        return requireApi().resolveUrl(foodId, metadata, thumbnail);
      },
      async exportAll() {
        throw new root.MentorDataError("MEDIA_EXPORT_PHASE0_ONLY", "Complete media export remains owned by the Phase 0 backup service.");
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createMediaRepository = createMediaRepository;
})(typeof window !== "undefined" ? window : globalThis);

(function () {
  "use strict";
  const DB = "mentor_nutrition_images", STORE = "foodImages", VERSION = 1;
  const memory = new Map();
  const rules = () => window.MentorNutritionFoodFormValidation || { MAX_IMAGE_BYTES: 5 * 1024 * 1024, ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"] };
  function validate(file) {
    if (!file || !rules().ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error("Unsupported food image type.");
    if (file.size > rules().MAX_IMAGE_BYTES) throw new Error("Food image is too large.");
    return true;
  }
  function openDb() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const request = indexedDB.open(DB, VERSION);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
  function transact(mode, operation) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      if (!db) return resolve(null);
      const tx = db.transaction(STORE, mode), request = operation(tx.objectStore(STORE));
      let requestResult, settled = false;
      request.onsuccess = () => { requestResult = request.result; };
      const fail = (error) => { if (settled) return; settled = true; db.close(); reject(error || tx.error || request.error || new Error("IndexedDB transaction failed.")); };
      request.onerror = () => { /* transaction error/abort handlers own rejection */ };
      tx.onerror = () => fail(tx.error || request.error);
      tx.onabort = () => fail(tx.error || request.error);
      tx.oncomplete = () => { if (settled) return; settled = true; db.close(); resolve(requestResult); };
    }));
  }
  function canvasBlob(file, maxSide, quality) {
    return new Promise((resolve) => {
      if (!window.createImageBitmap || !window.document?.createElement) return resolve(file);
      createImageBitmap(file).then((bitmap) => {
        const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = window.document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
        canvas.toBlob((blob) => resolve(blob || file), "image/webp", quality);
      }).catch(() => resolve(file));
    });
  }
  const entityKey = (entityType, entityId) => `${entityType}-image:${entityId}`;
  async function prepareEntityRecord(entityType, entityId, file) {
    validate(file);
    const id = entityKey(entityType, entityId), blob = await canvasBlob(file, 1280, .86), thumbnail = await canvasBlob(file, 240, .78);
    const record = { id, entityType, entityId, blob, thumbnail, type: blob.type || file.type, originalName: file.name || null, size: blob.size, updatedAt: new Date().toISOString() };
    if (entityType === "food") record.foodId = entityId;
    return record;
  }
  function metadataForRecord(record) {
    return { storage: "indexeddb", imageId: record.id, type: record.type, originalName: record.originalName, size: record.size, updatedAt: record.updatedAt };
  }
  async function saveEntity(entityType, entityId, file) {
    const record = await prepareEntityRecord(entityType, entityId, file);
    const id = record.id;
    const persisted = await transact("readwrite", (store) => store.put(record));
    if (!persisted) { const error = new Error("Persistent image storage is unavailable."); error.code = "IMAGE_STORAGE_UNAVAILABLE"; throw error; }
    memory.set(id, record);
    return metadataForRecord(record);
  }
  async function putEntityRecord(record) {
    if (!["research-video", "research-av", "research-source"].includes(record?.entityType) || record.id !== entityKey(record.entityType, record.entityId) || !(record.blob instanceof Blob)) throw new Error("Invalid research media record.");
    if (record.entityType !== "research-video" && (!record.blob.size || record.blob.size > (record.entityType === "research-source" ? 25 : 100) * 1024 * 1024)) throw new Error("Invalid research media size.");
    const persisted = await transact("readwrite", (store) => store.put(record));
    if (!persisted) throw new Error("Persistent video storage is unavailable.");
    memory.set(record.id, record);
    return record;
  }
  async function getEntity(entityType, entityId) { const id = entityKey(entityType, entityId); try { return await transact("readonly", (store) => store.get(id)) || memory.get(id) || null; } catch (_) { return memory.get(id) || null; } }
  async function removeEntity(entityType, entityId) { const id = entityKey(entityType, entityId); memory.delete(id); try { await transact("readwrite", (store) => store.delete(id)); } catch (_) { /* metadata remains authoritative */ } }
  async function restoreEntity(entityType, entityId, record) { const id = entityKey(entityType, entityId); if (!record) return removeEntity(entityType, entityId); const restored = { ...record, id, entityType, entityId }; if (entityType === "food") restored.foodId = entityId; const persisted = await transact("readwrite", (store) => store.put(restored)); if (!persisted) throw new Error("Image rollback failed."); memory.set(id, restored); return true; }
  async function objectUrlEntity(entityType, entityId, thumbnail) { const record = await getEntity(entityType, entityId), blob = thumbnail ? record?.thumbnail : record?.blob; return blob ? URL.createObjectURL(blob) : null; }
  function urlMetadata(url) { const value = String(url || "").trim(); return value ? { storage: "url", url: value, updatedAt: new Date().toISOString() } : null; }
  async function resolveEntityUrl(entityType, entityId, metadata, thumbnail) { return metadata?.storage === "url" ? metadata.url : objectUrlEntity(entityType, entityId, thumbnail); }
  const save = (foodId, file) => saveEntity("food", foodId, file);
  const get = (foodId) => getEntity("food", foodId);
  const remove = (foodId) => removeEntity("food", foodId);
  const restore = (foodId, record) => restoreEntity("food", foodId, record);
  const objectUrl = (foodId, thumbnail) => objectUrlEntity("food", foodId, thumbnail);
  const resolveUrl = (foodId, metadata, thumbnail) => resolveEntityUrl("food", foodId, metadata, thumbnail);
  window.MentorNutritionFoodImageStorage = { validate, prepareEntityRecord, metadataForRecord, save, get, remove, restore, objectUrl, urlMetadata, resolveUrl, saveEntity, putEntityRecord, getEntity, removeEntity, restoreEntity, objectUrlEntity, resolveEntityUrl, revokeObjectUrl: (url) => { if (url?.startsWith?.("blob:")) URL.revokeObjectURL(url); } };
})();

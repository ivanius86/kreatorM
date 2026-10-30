(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function safePathSegment(value) {
    return encodeURIComponent(String(value ?? "missing")).replace(/%/g, "_");
  }

  async function prepareMediaExport(records, options) {
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const indexRecords = [];
    const binaryEntries = [];

    for (const record of records || []) {
      if (!record?.id) {
        const error = new Error("Media record ID is required.");
        error.code = "MEDIA_ID_REQUIRED";
        throw error;
      }
      if (!record.blob) {
        const error = new Error("Original media blob is required.");
        error.code = "MEDIA_BLOB_REQUIRED";
        throw error;
      }

      const segment = safePathSegment(record.id);
      const blobPath = `media/${segment}-blob`;
      const blobChecksum = await checksumService.sha256(record.blob, cryptoApi);
      binaryEntries.push({
        path: blobPath,
        contentType: record.blob.type || record.type || "application/octet-stream",
        byteSize: record.blob.size,
        sha256: blobChecksum.hex,
        recordId: record.id,
        role: "blob",
        data: record.blob
      });

      let thumbnailMetadata = null;
      if (record.thumbnail) {
        const thumbnailPath = `media/${segment}-thumbnail`;
        const thumbnailChecksum = await checksumService.sha256(record.thumbnail, cryptoApi);
        binaryEntries.push({
          path: thumbnailPath,
          contentType: record.thumbnail.type || "application/octet-stream",
          byteSize: record.thumbnail.size,
          sha256: thumbnailChecksum.hex,
          recordId: record.id,
          role: "thumbnail",
          data: record.thumbnail
        });
        thumbnailMetadata = {
          path: thumbnailPath,
          contentType: record.thumbnail.type || "application/octet-stream",
          byteSize: record.thumbnail.size,
          sha256: thumbnailChecksum.hex
        };
      }

      indexRecords.push({
        id: record.id,
        entityType: record.entityType ?? null,
        entityId: record.entityId ?? null,
        foodId: record.foodId ?? null,
        type: record.type || record.blob.type || null,
        originalName: record.originalName ?? null,
        size: Number(record.size || record.blob.size || 0),
        updatedAt: record.updatedAt ?? null,
        blob: {
          path: blobPath,
          contentType: record.blob.type || record.type || "application/octet-stream",
          byteSize: record.blob.size,
          sha256: blobChecksum.hex
        },
        thumbnail: thumbnailMetadata
      });
    }

    return {
      index: {
        sourceDatabase: "mentor_nutrition_images",
        sourceStore: "foodImages",
        recordCount: indexRecords.length,
        records: indexRecords
      },
      binaryEntries,
      summary: {
        recordCount: indexRecords.length,
        blobCount: binaryEntries.length,
        totalBytes: binaryEntries.reduce((total, entry) => total + Number(entry.byteSize || 0), 0)
      }
    };
  }

  namespace.NutritionMediaExportService = Object.freeze({ prepareMediaExport, safePathSegment });
})(typeof window !== "undefined" ? window : globalThis);

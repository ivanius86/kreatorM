(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  async function auditLocalStorageSnapshot(snapshot, options) {
    const validators = options?.validators || namespace.LegacyPayloadValidators;
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const entries = [];

    for (const entry of snapshot?.entries || []) {
      if (entry.readStatus !== "ok") {
        entries.push({
          key: entry.key,
          owner: entry.source?.owner || null,
          present: entry.present,
          readStatus: entry.readStatus,
          errorCode: entry.errorCode || "READ_FAILED"
        });
        continue;
      }

      const validation = validators.validateSource(entry.source, entry.raw);
      const result = {
        key: entry.key,
        owner: entry.source?.owner || null,
        role: entry.source?.role || null,
        canonicalDomain: entry.source?.canonicalDomain || null,
        present: entry.present,
        readStatus: "ok",
        byteSize: entry.present ? checksumService.byteSize(entry.raw) : 0,
        parseStatus: validation.parseStatus,
        validationStatus: validation.validationStatus,
        errors: validation.errors.slice()
      };
      if (entry.present) {
        try {
          result.checksum = (await checksumService.sha256(entry.raw, cryptoApi)).hex;
        } catch (error) {
          result.checksum = null;
          result.checksumErrorCode = error?.code || "CHECKSUM_FAILED";
        }
      } else {
        result.checksum = null;
      }
      entries.push(result);
    }

    return {
      auditVersion: 1,
      sourceType: "localStorage",
      capturedAt: snapshot?.capturedAt || null,
      totals: {
        registered: entries.length,
        present: entries.filter((entry) => entry.present === true).length,
        invalid: entries.filter((entry) => entry.validationStatus === "invalid").length,
        readFailed: entries.filter((entry) => entry.readStatus === "failed").length,
        bytes: entries.reduce((total, entry) => total + Number(entry.byteSize || 0), 0)
      },
      entries
    };
  }

  async function auditMediaSnapshot(snapshot, options) {
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    if (!snapshot || snapshot.status !== "ok") {
      return {
        auditVersion: 1,
        sourceType: "indexedDB",
        status: snapshot?.status || "unavailable",
        errorCode: snapshot?.errorCode || null,
        recordCount: 0,
        blobCount: 0,
        totalBytes: 0,
        records: []
      };
    }

    const records = [];
    for (const record of snapshot.records || []) {
      const result = {
        id: record?.id ?? null,
        entityType: record?.entityType ?? null,
        entityId: record?.entityId ?? null,
        blobSize: Number(record?.blob?.size || 0),
        thumbnailSize: Number(record?.thumbnail?.size || 0),
        errors: []
      };
      if (!result.id) result.errors.push("MEDIA_ID_REQUIRED");
      if (!record?.blob) result.errors.push("MEDIA_BLOB_REQUIRED");
      if (record?.blob) {
        try {
          result.blobChecksum = (await checksumService.sha256(record.blob, cryptoApi)).hex;
        } catch (error) {
          result.errors.push(error?.code || "BLOB_CHECKSUM_FAILED");
        }
      }
      if (record?.thumbnail) {
        try {
          result.thumbnailChecksum = (await checksumService.sha256(record.thumbnail, cryptoApi)).hex;
        } catch (error) {
          result.errors.push(error?.code || "THUMBNAIL_CHECKSUM_FAILED");
        }
      }
      records.push(result);
    }

    return {
      auditVersion: 1,
      sourceType: "indexedDB",
      status: "ok",
      database: snapshot.database,
      store: snapshot.store,
      recordCount: records.length,
      blobCount: records.reduce((total, record) => total + (record.blobSize > 0 ? 1 : 0) + (record.thumbnailSize > 0 ? 1 : 0), 0),
      totalBytes: records.reduce((total, record) => total + record.blobSize + record.thumbnailSize, 0),
      records
    };
  }

  namespace.StorageAuditService = Object.freeze({
    auditLocalStorageSnapshot,
    auditMediaSnapshot
  });
})(typeof window !== "undefined" ? window : globalThis);

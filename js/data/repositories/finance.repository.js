(function (root) {
  "use strict";

  function createFinanceRepository(adapter) {
    const h = root.MentorRepositoryHelpers;
    const controller = root.MentorRepositoryContract.createController({ state: {}, importTemplates: [] });
    const isTemplates = Array.isArray;

    async function load() {
      const [central, state, templates] = await Promise.all([
        h.jsonCandidate(adapter, "mentor_database", h.isObject),
        h.jsonCandidate(adapter, "mentorFinanceStateV1", h.isObject),
        h.jsonCandidate(adapter, "mentorTransactionImportTemplatesV1", isTemplates)
      ]);
      const finances = central.valid && Array.isArray(central.value.finances) ? central.value.finances : [];
      const centralStateValue = finances.find((item) => item?.id === "finance-state" || item?.type === "financeState");
      const centralTemplatesValue = finances.find((item) => item?.id === "transaction-import-templates" || item?.type === "importTemplates")?.templates;
      const stateCandidates = h.requireValidCandidate("finance", [{
        key: "mentor_database.finances.finance-state",
        present: centralStateValue !== undefined,
        valid: h.isObject(centralStateValue),
        value: centralStateValue ? h.stripFields(centralStateValue, ["id", "type"]) : null
      }, state], {});
      const templateCandidates = h.requireValidCandidate("financeImportTemplates", [{
        key: "mentor_database.finances.transaction-import-templates",
        present: centralTemplatesValue !== undefined,
        valid: Array.isArray(centralTemplatesValue),
        value: centralTemplatesValue
      }, templates], []);
      const primaryTemplates = templateCandidates[0].value || [];
      const secondaryTemplates = templateCandidates[1]?.value;
      const canUnion = secondaryTemplates && primaryTemplates.every((item) => item?.id) && secondaryTemplates.every((item) => item?.id);
      let selectedState = stateCandidates[0].value || {};
      if (stateCandidates.length > 1) {
        const centralSavedAt = Date.parse(stateCandidates[0].value?.savedAt);
        const legacySavedAt = Date.parse(stateCandidates[1].value?.savedAt);
        if (Number.isFinite(centralSavedAt) && Number.isFinite(legacySavedAt) && legacySavedAt > centralSavedAt) {
          selectedState = stateCandidates[1].value;
        }
      }
      return {
        state: selectedState,
        importTemplates: canUnion ? h.mergeById(primaryTemplates, secondaryTemplates, ["updatedAt"]) : primaryTemplates
      };
    }

    async function saveDocument(id, type, value) {
      await h.updateCentral(adapter, (database) => {
        const finances = Array.isArray(database.finances) ? database.finances : [];
        database.finances = [...finances.filter((item) => item?.id !== id), { id, type, ...value }];
        return database;
      });
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getStateStatus: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getState: () => controller.getSnapshot().state,
      getImportTemplates: () => controller.getSnapshot().importTemplates,
      subscribe: controller.subscribe,
      saveState(state) {
        const next = h.clone(state || {});
        return controller.mutate(async (current) => {
          await adapter.write("mentorFinanceStateV1", next);
          await saveDocument("finance-state", "financeState", next);
          return { ...current, state: next };
        }).then((snapshot) => snapshot.state);
      },
      saveImportTemplates(templates) {
        const next = Array.isArray(templates) ? h.clone(templates) : [];
        return controller.mutate(async (current) => {
          await adapter.write("mentorTransactionImportTemplatesV1", next);
          await saveDocument("transaction-import-templates", "importTemplates", { templates: next });
          return { ...current, importTemplates: next };
        }).then((snapshot) => snapshot.importTemplates);
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createFinanceRepository = createFinanceRepository;
})(typeof window !== "undefined" ? window : globalThis);

(function (root) {
  "use strict";

  // Temporary sync-read bridge for classic feature scripts. Writes intentionally
  // remain Promise-based and are removed when each feature owns async mutations.
  root.MentorDataCompatibility = Object.freeze({
    getIdeas() { return root.MentorData.repositories.ideas.getAll(); },
    saveIdeas(items) { return root.MentorData.repositories.ideas.replaceAll(items); },
    getFinanceState() { return root.MentorData.repositories.finance.getState(); },
    saveFinanceState(state) { return root.MentorData.repositories.finance.saveState(state); },
    getImportTemplates() { return root.MentorData.repositories.finance.getImportTemplates(); },
    saveImportTemplates(items) { return root.MentorData.repositories.finance.saveImportTemplates(items); },
    getAssetsState() {
      const repository = root.MentorData.repositories.assets;
      return { assets: repository.getAssets(), debts: repository.getDebts() };
    },
    saveAssetsState(value) { return root.MentorData.repositories.assets.saveState(value); },
    getComparisonSnapshots(ideaId) { return root.MentorData.repositories.comparisons.getSnapshots(ideaId); },
    getComparisonOptions(ideaId) { return root.MentorData.repositories.comparisons.getOptions(ideaId); },
    getResearchCache() { return root.MentorData.repositories.comparisons.getResearchCache(); }
  });
})(typeof window !== "undefined" ? window : globalThis);

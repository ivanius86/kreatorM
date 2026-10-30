(function (root) {
  "use strict";

  const inFlight = new Map();

  function repositoriesFor(featureName) {
    const repositories = root.MentorData?.repositories || {};
    const map = {
      brainstorming: [repositories.ideas, repositories.comparisons],
      research: [repositories.ideas, repositories.comparisons],
      financeDashboard: [repositories.goals, repositories.finance, repositories.assets],
      finance: [repositories.goals, repositories.ideas, repositories.finance, repositories.assets, repositories.comparisons],
      nutrition: [repositories.nutritionFoodData, repositories.nutritionInventoryData, repositories.media],
      calendar: [repositories.goals, repositories.calendar]
    };
    return (map[featureName] || []).filter(Boolean);
  }

  function initializeFeature(featureName) {
    if (inFlight.has(featureName)) return inFlight.get(featureName);
    const promise = Promise.resolve(root.MentorData?.repositorySelectionPromise)
      .then(() => Promise.all(repositoriesFor(featureName).map((repository) => repository.initialize())))
      .then(() => featureName === "nutrition" ? root.MentorInventoryRepository?.initialize?.() : undefined)
      .then(() => undefined)
      .catch((error) => {
        inFlight.delete(featureName);
        throw error;
      });
    inFlight.set(featureName, promise);
    return promise;
  }

  root.MentorFeatureHydration = Object.freeze({
    initializeFeature,
    isReady(featureName) {
      return repositoriesFor(featureName).every((repository) => repository.isReady());
    }
  });
})(typeof window !== "undefined" ? window : globalThis);

(function () {
  "use strict";

  const loadedScripts = new Set(Array.from(document.scripts).map((script) => script.getAttribute("src")).filter(Boolean));
  const scriptPromises = new Map();
  const featurePromises = new Map();
  const NUTRITION_ASSET_VERSION = "20261110-nutrition-phase3-01";
  const nutritionAsset = (src) => `${src}?v=${NUTRITION_ASSET_VERSION}`;

  const FEATURES = {
    journal: {
      scripts: ["js/i18n/journal-book-prototype.js", "js/journal/prototype/book-animation.js", "js/journal/prototype/book-prototype.js"].map((src) => `${src}?v=20261113-book-07`),
      ready: () => Boolean(window.MentorJournalBookPrototype?.activate)
    },
    calendar: {
      scripts: ["kalendar.js"],
      ready: () => Boolean(window.CalendarPlanner?.renderCalendar)
    },
    brainstorming: {
      scripts: ["js/i18n/research-sticker-designer.js?v=20261021-header-colors-10", "research-icons.js?v=20261013-symbol-catalog-01", "research-attachments.js?v=20261019-live-designer-01", nutritionAsset("js/nutrition/services/food-image-storage.service.js"), "js/research/research-sticker-core.js?v=20261021-header-colors-10", "js/research/research-sticker-sections.js?v=20261021-header-colors-10", "js/research/research-sticker-editors.js?v=20261020-compact-image-editor-09", "js/research/research-sticker-designer.js?v=20261021-header-colors-10", "js/research/research-model.js?v=20261019-live-designer-01", "js/research/research-geometry.js?v=20261020-border-anchors-01", "js/research/research-selection.js?v=20261007-organizer-01", "js/research/research-groups.js?v=20261009-group-background-02", "js/research/research-annotations.js?v=20261007-organizer-01", "js/research/research-sticker-style.js?v=20261007-organizer-07", "js/research/research-persistence.js?v=20261019-live-designer-01", "js/research/research-organizer.js?v=20261020-section-options-03", "js/research/research-sticker-drag.js?v=20261007-sticker-drag-01", "js/research/research-external-drop.js?v=20261019-live-designer-01", "research.js?v=20261029-floating-01", "brainstorming.js?v=20261020-section-options-03"],
      ready: () => Boolean(window.Brainstorming?.state && window.Brainstorming?.renderBrainstormingTab)
    },
    financeDashboard: {
      scripts: ["financeDashboard.js"],
      ready: () => Boolean(window.FinanceDashboard?.activateFinanceDashboard)
    },
    finance: {
      scripts: ["research-icons.js?v=20261013-symbol-catalog-01", "finansije.js?v=20261013-symbol-search-01"],
      ready: () => Boolean(window.Finance?.renderActiveFinanceTab)
    },
    nutrition: {
      hydrateAfterScripts: true,
      scripts: ["js/nutrition/nutrition-data.js", "js/nutrition/data/food-categories.js", "js/nutrition/data/nutrient-definitions.js", "js/nutrition/nutrition-foods-i18n.js", "js/nutrition/nutrition-inventory-i18n.js", "js/nutrition/services/id.service.js", "js/nutrition/services/food-filter-profile.service.js", "js/nutrition/models/food.model.js", "js/nutrition/models/nutrient.model.js", "js/nutrition/models/food-nutrient.model.js", "js/nutrition/models/food-portion.model.js", "js/nutrition/models/nutrition-source.model.js", "js/nutrition/models/inventory-batch.model.js", "js/nutrition/models/inventory-location.model.js", "js/nutrition/models/inventory-allocation.model.js", "js/nutrition/models/recipe.model.js", "js/nutrition/models/meal-plan-entry.model.js", "js/nutrition/data/foods.seed.js", "js/nutrition/data/food-filter-profiles.seed.js", "js/nutrition/data/foods.verified-extension.js", "js/nutrition/data/food-translations.js", "js/nutrition/validation/food.schema.js", "js/nutrition/validation/food-nutrient.schema.js", "js/nutrition/validation/dataset.validation.js", "js/nutrition/nutrition-storage.js", "js/nutrition/inventory-storage.js", "js/nutrition/repositories/nutrient.repository.js", "js/nutrition/repositories/food.repository.js", "js/nutrition/repositories/inventory.repository.js", "js/nutrition/repositories/planning.repository.js", "js/nutrition/validation/food-form.validation.js", "js/nutrition/services/unit-conversion.service.js", "js/nutrition/services/inventory.service.js", "js/nutrition/services/recipe-profile.service.js", "js/nutrition/services/recipe-filter.service.js", "js/nutrition/services/planning.service.js", "js/nutrition/services/meal-plan-selectors.js", "js/nutrition/services/food-nutrition.service.js", "js/nutrition/services/intake.service.js", "js/nutrition/services/intake-selectors.js", "js/nutrition/services/food-image-storage.service.js", "js/nutrition/services/food-form.service.js", "js/nutrition/components/nutrition-icons.js", "js/nutrition/components/food-form.js", "js/nutrition/components/inventory-form.js", "js/nutrition/components/recipe-filters.js", "js/nutrition/components/planning-forms.js", "js/nutrition/components/intake-form.js", "js/nutrition/nutrition.js", "js/nutrition/tabs/pregled.js", "js/nutrition/tabs/namirnice.js", "js/nutrition/tabs/frizider.js", "js/nutrition/tabs/recepti.js", "js/nutrition/tabs/plan-ishrane.js", "js/nutrition/tabs/statistika.js"].map(nutritionAsset),
      ready: () => Boolean(
        window.MentorNutrition?.activateNutrition &&
        ["overview", "foods", "fridge", "recipes", "plan", "statistics"].every((tab) => typeof window.MentorNutritionTabs?.[tab] === "function")
      )
    }
  };

  const VIEW_FEATURES = {
    journal: "journal",
    planner: "calendar",
    brainstorming: "brainstorming",
    finance: "financeDashboard",
    nutrition: "nutrition"
  };

  function loadScript(src) {
    if (loadedScripts.has(src)) return Promise.resolve();
    if (scriptPromises.has(src)) return scriptPromises.get(src);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => {
        loadedScripts.add(src);
        resolve();
      };
      script.onerror = () => {
        scriptPromises.delete(src);
        reject(new Error("Nije moguce ucitati skriptu: " + src));
      };
      document.body.appendChild(script);
    });

    scriptPromises.set(src, promise);
    return promise;
  }

  function loadScriptsInOrder(scripts) {
    return scripts.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve());
  }

  function loadFeature(featureName) {
    const feature = FEATURES[featureName];
    if (!feature) return Promise.resolve();
    const hydrationReady = () => window.MentorFeatureHydration?.isReady?.(featureName) !== false;
    if (feature.ready() && hydrationReady()) return Promise.resolve();
    if (featurePromises.has(featureName)) return featurePromises.get(featureName);

    const hydrate = () => window.MentorFeatureHydration?.initializeFeature?.(featureName) || Promise.resolve();
    const loadAndHydrate = feature.hydrateAfterScripts
      ? loadScriptsInOrder(feature.scripts).then(hydrate)
      : Promise.resolve().then(hydrate).then(() => loadScriptsInOrder(feature.scripts));
    const promise = loadAndHydrate.then(() => {
      if (!feature.ready()) {
        throw new Error("Lazy modul nije spreman: " + featureName);
      }
      if (!hydrationReady()) {
        throw new Error("Data repository nije spreman: " + featureName);
      }
    }).catch((error) => {
      featurePromises.delete(featureName);
      throw error;
    });

    featurePromises.set(featureName, promise);
    return promise;
  }

  function ensureView(viewName) {
    return loadFeature(VIEW_FEATURES[viewName]);
  }

  function preloadFeature(featureName) {
    const feature = FEATURES[featureName];
    if (!feature || feature.ready()) return;
    feature.scripts.forEach((src) => {
      if (loadedScripts.has(src) || document.querySelector('link[rel="prefetch"][href="' + src + '"]')) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "script";
      link.href = src;
      document.head.appendChild(link);
    });
  }

  function callTopLevelAfterFeature(featureName, functionName, args, bridge) {
    return loadFeature(featureName).then(() => {
      const fn = window[functionName];
      if (typeof fn === "function" && fn !== bridge) {
        return fn.apply(window, args);
      }
      return undefined;
    });
  }

  function createTopLevelBridge(featureName, functionName) {
    const bridge = function () {
      return callTopLevelAfterFeature(featureName, functionName, Array.from(arguments), bridge);
    };
    return bridge;
  }

  function callMethodAfterFeature(featureName, rootName, methodName, args, bridge) {
    return loadFeature(featureName).then(() => {
      const target = window[rootName];
      const fn = target?.[methodName];
      if (typeof fn === "function" && fn !== bridge) {
        return fn.apply(target, args);
      }
      return undefined;
    });
  }

  function createMethodBridge(featureName, rootName, methodName) {
    const bridge = function () {
      return callMethodAfterFeature(featureName, rootName, methodName, Array.from(arguments), bridge);
    };
    return bridge;
  }

  if (typeof window.setFinanceTab !== "function") {
    const financeTabBridge = function () {
      window.__mentorPendingFinanceTab = arguments[0] || "dashboard";
      return callTopLevelAfterFeature("finance", "setFinanceTab", Array.from(arguments), financeTabBridge);
    };
    window.setFinanceTab = financeTabBridge;
  }

  if (typeof window.openFinancialComparisonForIdea !== "function") {
    window.openFinancialComparisonForIdea = createTopLevelBridge("finance", "openFinancialComparisonForIdea");
  }

  window.Brainstorming = Object.assign(window.Brainstorming || {}, {
    activateBrainstorming: window.Brainstorming?.activateBrainstorming || createMethodBridge("brainstorming", "Brainstorming", "activateBrainstorming"),
    resetBrainstormingView: window.Brainstorming?.resetBrainstormingView || createMethodBridge("brainstorming", "Brainstorming", "resetBrainstormingView"),
    openResearchIdeaById: window.Brainstorming?.openResearchIdeaById || createMethodBridge("brainstorming", "Brainstorming", "openResearchIdeaById")
  });

  window.CalendarPlanner = Object.assign(window.CalendarPlanner || {}, {
    activateCalendarPlanner: window.CalendarPlanner?.activateCalendarPlanner || createMethodBridge("calendar", "CalendarPlanner", "activateCalendarPlanner"),
    resetPlannerView: window.CalendarPlanner?.resetPlannerView || createMethodBridge("calendar", "CalendarPlanner", "resetPlannerView")
  });

  window.MentorLazy = {
    loadFeature,
    ensureView,
    preloadFeature,
    isLazyView: (viewName) => Boolean(VIEW_FEATURES[viewName]),
    isViewLoaded: (viewName) => {
      const featureName = VIEW_FEATURES[viewName];
      return !featureName || Boolean(FEATURES[featureName]?.ready?.() && window.MentorFeatureHydration?.isReady?.(featureName) !== false);
    },
    isFeatureLoaded: (featureName) => Boolean(FEATURES[featureName]?.ready?.() && window.MentorFeatureHydration?.isReady?.(featureName) !== false)
  };

  const warmup = () => {
    preloadFeature("calendar");
    preloadFeature("brainstorming");
    preloadFeature("financeDashboard");
    preloadFeature("finance");
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmup, { timeout: 4000 });
  } else {
    window.setTimeout(warmup, 2500);
  }
})();

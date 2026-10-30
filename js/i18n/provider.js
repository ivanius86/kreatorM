(function () {
  const STORAGE_KEY = "mentor_language";
  const LEGACY_STORAGE_KEY = "mentorPlanner.language";
  const FALLBACK_LANGUAGE = "en";
  const REQUIRED_NAMESPACES = [
    "common",
    "navigation",
    "ideas",
    "research",
    "finance",
    "calendar",
    "builder",
    "onboarding",
    "settings",
    "validation",
    "emptyStates"
  ];

  const languageConfig = {
    sr: { label: "Srpski", locale: "sr-Latn-RS", dir: "ltr" },
    en: { label: "English", locale: "en-US", dir: "ltr" }
  };

  let resources = window.MentorI18nResources || {};
  const missingTranslationKeys = new Set();
  let pendingLanguageEvent = null;

  function normalizeLanguageResources(language) {
    if (resources[language]?.nav && !resources[language].navigation) resources[language].navigation = resources[language].nav;
    if ((!resources[language].finance || !Object.keys(resources[language].finance).length) && resources[language].research?.finance) {
      resources[language].finance = resources[language].research.finance;
    }
    REQUIRED_NAMESPACES.forEach((namespace) => {
      if (!resources[language][namespace]) resources[language][namespace] = {};
    });
  }

  function refreshResources() {
    resources = window.MentorI18nResources || resources || {};
    Object.keys(resources).forEach(normalizeLanguageResources);
    return resources;
  }

  refreshResources();

  let currentLanguage = readInitialLanguage();
  let formatters = createFormatters(currentLanguage);

  function detectBrowserLanguage() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ""];
    return languages.some((language) => String(language).toLowerCase().startsWith("sr")) ? "sr" : "en";
  }

  function readInitialLanguage() {
    refreshResources();
    const repository = window.MentorData?.repositories?.settings;
    const stored = repository?.isReady?.() ? repository.getLanguage() : null;
    if (languageConfig[stored] && resources[stored]) return stored;
    const detected = detectBrowserLanguage();
    return resources[detected] ? detected : FALLBACK_LANGUAGE;
  }

  function getNestedValue(source, key) {
    return key.split(".").reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), source);
  }

  function getTranslationValue(source, key) {
    const value = getNestedValue(source, key);
    if (value !== undefined) return value;
    if (key.startsWith("navigation.")) return getNestedValue(source, "nav." + key.slice("navigation.".length));
    if (key.startsWith("nav.")) return getNestedValue(source, "navigation." + key.slice("nav.".length));
    return undefined;
  }

  function interpolate(template, params) {
    if (!params) return template;
    return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => {
      const value = getNestedValue(params, key);
      return value === undefined || value === null ? "" : String(value);
    });
  }

  function isDevelopmentMode() {
    return !location.hostname || ["localhost", "127.0.0.1"].includes(location.hostname);
  }

  function logMissingTranslation(key, language, fallbackUsed) {
    if (fallbackUsed) return;
    const logKey = language + ":" + key;
    if (!isDevelopmentMode() || missingTranslationKeys.has(logKey) || missingTranslationKeys.size > 20) return;
    missingTranslationKeys.add(logKey);
    console.warn("[i18n] Missing translation", { key, language, fallbackUsed });
  }

  function normalizeTranslateArgs(params, fallbackOrLanguage, language) {
    const normalized = {
      params,
      fallback: undefined,
      language: languageConfig[language] ? language : currentLanguage
    };

    if (typeof params === "string" && !languageConfig[params]) {
      normalized.params = undefined;
      normalized.fallback = params;
    }

    if (languageConfig[params]) {
      normalized.params = undefined;
      normalized.language = params;
    }

    if (typeof fallbackOrLanguage === "string") {
      if (languageConfig[fallbackOrLanguage] && language === undefined) {
        normalized.language = fallbackOrLanguage;
      } else {
        normalized.fallback = fallbackOrLanguage;
      }
    }

    return normalized;
  }

  function t(key, params, fallbackOrLanguage, language) {
    refreshResources();
    const args = normalizeTranslateArgs(params, fallbackOrLanguage, language);
    const lang = languageConfig[args.language] && resources[args.language] ? args.language : currentLanguage;
    const value = getTranslationValue(resources[lang] || {}, key);
    const fallback = getTranslationValue(resources[FALLBACK_LANGUAGE] || {}, key);
    if (value === undefined) logMissingTranslation(key, lang, fallback !== undefined || args.fallback !== undefined);
    return interpolate(value !== undefined ? value : fallback !== undefined ? fallback : args.fallback !== undefined ? args.fallback : key, args.params);
  }

  function hasTranslation(key, language = currentLanguage) {
    refreshResources();
    const lang = languageConfig[language] && resources[language] ? language : currentLanguage;
    return getTranslationValue(resources[lang] || {}, key) !== undefined;
  }

  function getLanguage() {
    return currentLanguage;
  }

  function createFormatters(language) {
    const config = languageConfig[language] || languageConfig[FALLBACK_LANGUAGE];
    return {
      number: new Intl.NumberFormat(config.locale),
      currency: new Intl.NumberFormat(config.locale, { style: "currency", currency: "EUR" }),
      date: new Intl.DateTimeFormat(config.locale, { dateStyle: "medium" }),
      time: new Intl.DateTimeFormat(config.locale, { timeStyle: "short" })
    };
  }

  function updateLanguageButtons() {
    document.querySelectorAll("button.language-option[data-language]").forEach((button) => {
      const isActive = button.dataset.language === currentLanguage;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  async function applyLanguage(language, options = {}) {
    refreshResources();
    const nextLanguage = languageConfig[language] && resources[language] ? language : detectBrowserLanguage();
    const resolvedLanguage = resources[nextLanguage] ? nextLanguage : FALLBACK_LANGUAGE;
    const changed = resolvedLanguage !== currentLanguage;
    if (!changed && !options.force) {
      updateLanguageButtons();
      return currentLanguage;
    }

    if (options.persist !== false) {
      const repository = window.MentorData?.repositories?.settings;
      if (typeof repository?.setLanguage !== "function") {
        const error = new Error(
          "Settings repository is unavailable; language was not changed."
        );
        error.code = "SETTINGS_REPOSITORY_UNAVAILABLE";
        window.dispatchEvent?.(new CustomEvent(
          "mentor:languagechangeerror",
          { detail: { language: resolvedLanguage, code: error.code } }
        ));
        throw error;
      }
      try {
        await repository.setLanguage(resolvedLanguage);
      } catch (error) {
        updateLanguageButtons();
        window.dispatchEvent?.(new CustomEvent(
          "mentor:languagechangeerror",
          {
            detail: {
              language: resolvedLanguage,
              previousLanguage: currentLanguage,
              code: error?.code || "LANGUAGE_PERSIST_FAILED"
            }
          }
        ));
        throw error;
      }
    }

    currentLanguage = resolvedLanguage;
    formatters = createFormatters(currentLanguage);
    const config = languageConfig[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = config.dir;
    document.body.dataset.language = currentLanguage;

    updateLanguageButtons();

    document.documentElement.dataset.languageReady = "true";
    if (options.emit !== false) {
      window.clearTimeout(pendingLanguageEvent);
      const emitLanguageChange = () => {
        window.dispatchEvent(new CustomEvent("mentor:languagechange", {
          detail: { language: currentLanguage, initial: Boolean(options.initial) }
        }));
      };
      if (options.defer !== false && !options.initial) {
        pendingLanguageEvent = window.setTimeout(emitLanguageChange, 0);
      } else {
        emitLanguageChange();
      }
    }
    return currentLanguage;
  }

  function setLanguage(language) {
    return applyLanguage(language);
  }

  function initI18n(options = {}) {
    return applyLanguage(currentLanguage, { force: true, initial: true, persist: false, ...options });
  }

  function registerResources(language, valuesOrNamespace, configOrValues, maybeConfig) {
    refreshResources();
    const isNamespaceRegistration = typeof valuesOrNamespace === "string";
    if (isNamespaceRegistration) {
      resources[language] = resources[language] || {};
      resources[language][valuesOrNamespace] = configOrValues || {};
      if (maybeConfig) languageConfig[language] = maybeConfig;
    } else {
      resources[language] = valuesOrNamespace || {};
      if (configOrValues) languageConfig[language] = configOrValues;
    }
    normalizeLanguageResources(language);
  }

  function getBuilderCatalog(language) {
    refreshResources();
    const lang = languageConfig[language] && resources[language] ? language : currentLanguage;
    const catalog = getNestedValue(resources[lang] || {}, "builder.catalog") || getNestedValue(resources[FALLBACK_LANGUAGE] || {}, "builder.catalog") || [];
    return JSON.parse(JSON.stringify(catalog));
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("button.language-option[data-language]");
    if (button) {
      event.preventDefault();
      try {
        await applyLanguage(button.dataset.language, { force: true });
      } catch (error) {
        console.error("[i18n] Language could not be persisted.", error);
      }
    }
  });

  window.MentorI18n = {
    t,
    getLanguage,
    setLanguage,
    setLanguageWithRefresh: setLanguage,
    applyLanguage,
    initI18n,
    hasTranslation,
    registerResources,
    getBuilderCatalog,
    get language() {
      return currentLanguage;
    },
    get locale() {
      return (languageConfig[currentLanguage] || languageConfig[FALLBACK_LANGUAGE]).locale;
    },
    get formatters() {
      return formatters;
    },
    resources,
    languageConfig
  };

  initI18n();
  window.MentorData?.coreReadyPromise?.then(() => {
    const stored = window.MentorData.repositories.settings.getLanguage();
    if (languageConfig[stored] && resources[stored]) {
      applyLanguage(stored, { force: true, initial: true, persist: false });
    }
  }).catch(() => {
    // Browser language remains a display-only fallback while recovery is required.
  });
})();

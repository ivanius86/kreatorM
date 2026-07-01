# I18n Guide

## Scope

The current legacy/static implementation uses the global `window.MentorI18n` provider.

This is acceptable for the legacy/static app because modules are loaded as browser scripts and render through explicit JavaScript render functions.

The future React app should use a React i18n layer such as:

- `LanguageProvider`
- `useI18n`
- imported translation resources

React components should not directly depend on `window.MentorI18n` except through a temporary compatibility layer if needed during migration.

## Translation API signature

The canonical future translation function signature should be:

```js
t(key, params?, fallback?)
```

Arguments:

- `key`: translation key such as `finance.assets.title`
- `params`: optional interpolation values
- `fallback`: optional fallback text if the key is missing

Canonical examples:

```js
window.MentorI18n.t("finance.assets.title", {}, "Assets");
window.MentorI18n.t("goals.summary.count", { count: 3 }, "You have {count} goals");
```

The current legacy/static provider supports a broader compatibility signature:

```js
t(key, params, fallbackOrLanguage, language)
```

It also supports older calls such as:

```js
window.MentorI18n.t("finance.assets.title", "Assets");
window.MentorI18n.t("finance.assets.title", {}, "Assets");
```

Current legacy interpolation uses double braces in resource strings, for example `{{count}}`. The future canonical API should support params and fallback clearly, and the interpolation format should be documented in one place before React migration.

## Namespace and key naming rules

The first segment of the key is the namespace/domain.

Example:

```text
finance.assets.title
```

- `finance` = namespace
- `assets.title` = nested key

Rules:

- Use semantic keys, not visual keys.
- Good: `finance.assets.title`
- Good: `goals.form.deadlineLabel`
- Bad: `finance.blueCardTitle`
- Bad: `dashboard.leftBoxText`
- Bad: `button1`

Keys should describe product meaning, not layout, color, position, or temporary component structure.

## Params and interpolation

Dynamic values should use params/interpolation.

Rules:

- Do not build translated sentences by string concatenation.
- Do not hardcode word order in JavaScript.
- Keep the whole sentence in translation resources when grammar may differ by language.

Good:

```js
t("goals.summary.count", { count }, "You have {count} goals");
```

Bad:

```js
count + " goals";
```

For the current legacy/static provider, translation resources should use the interpolation format currently supported by `provider.js`, such as `{{count}}`.

## Pluralization strategy

Pluralization should be handled through the i18n layer where possible.

Rules:

- Do not scatter plural logic across random components.
- Keep plural rules close to translation resources or the i18n provider.
- Prefer a single project-level pluralization strategy before adding many count-based strings.

Known current limitation: the legacy/static provider does not yet provide a complete pluralization API. This should be treated as a future improvement, especially before adding complex Serbian/English count-based copy in React.

## Missing key behavior

Missing translations should never break rendering.

Rules:

- Missing keys should fall back to English if available.
- If English is missing, use the provided fallback.
- If fallback is missing, return the key.
- Log a development warning if possible.

The current legacy/static provider uses English as the fallback language and logs missing translations in development mode when no fallback is available.

## Formatting rules

Language and formatting should be related but not treated as the same thing.

Rules:

- Currency, date, time, and number formatting should eventually follow user settings.
- For MVP, it is acceptable to use language locale defaults.
- The architecture should allow user preferences later.
- Formatting should live in the i18n/provider or shared formatting utilities, not inside random components.

The current legacy provider exposes `formatters` for number, currency, date, and time formatting.

## Legacy/static implementation rules

These rules apply to the current legacy/static app.

## Files

Resources are split by language and domain:

- `js/i18n/sr-core.js`
- `js/i18n/sr-builder-calendar.js`
- `js/i18n/sr-brainstorming-research.js`
- `js/i18n/sr-finance.js`
- `js/i18n/en-core.js`
- `js/i18n/en-builder-calendar.js`
- `js/i18n/en-brainstorming-research.js`
- `js/i18n/en-finance.js`
- `js/i18n/provider.js`

`provider.js` owns the active language, fallback behavior, formatting, and language-change events. Legacy modules should call only `window.MentorI18n`.

## Legacy rules

- Rendered UI should call `window.MentorI18n.t("namespace.key", params, "Fallback")` or a module helper such as `financeT`, `calT`, `brainT`, or `researchT`.
- Legacy modules should call `window.MentorI18n`.
- Do not render Serbian first and translate it after render.
- Do not add `data-i18n` attributes if the project standard is explicit module render functions.
- Static HTML text must be owned by an explicit module render function.
- On `mentor:languagechange`, the app shell routes the event to the active view.
- Modules should expose render functions instead of adding parallel language listeners.
- English is the fallback language for missing keys.

## Add text

Add the same key to the matching domain file for each language:

```js
// js/i18n/en-finance.js
window.MentorI18nResources.en.finance.assets.title = "Assets";

// js/i18n/sr-finance.js
window.MentorI18nResources.sr.finance.assets.title = "Imovina";
```

Use it during render:

```js
window.MentorI18n.t("finance.assets.title", {}, "Assets");
```

## Add a new module

1. Create `<language>-<module>.js` for each language, for example `sr-habits.js` and `en-habits.js`.
2. In each file, merge into the language object:

```js
(function () {
  window.MentorI18nResources = window.MentorI18nResources || {};
  window.MentorI18nResources.en = window.MentorI18nResources.en || {};
  Object.assign(window.MentorI18nResources.en, {
    habits: {
      title: "Habits"
    }
  });
})();
```

3. Add both files before `provider.js` in `index.html`.
4. Render with `window.MentorI18n.t("habits.title", {}, "Habits")`.

## Add a language

1. Add the language resources for every active namespace/domain, for example `de-core.js`, `de-finance.js`, and other active module files.
2. Set `window.MentorI18nResources.de = window.MentorI18nResources.de || {}` in every file.
3. Add those files before `provider.js` in `index.html`.
4. Add language metadata in `provider.js`:

```js
de: { label: "Deutsch", locale: "de-DE", dir: "ltr" }
```

5. Add a selector option with `data-language="de"`.
6. Confirm fallback behavior.
7. Test key screens in the new language.
8. Check date, number, and currency formatting.

## Current legacy API

- `t(key, params, fallbackOrLanguage, language)`
- `getLanguage()`
- `setLanguage(lang)`
- `setLanguageWithRefresh(lang)`
- `applyLanguage(lang, options?)`
- `initI18n(options?)`
- `hasTranslation(key, language?)`
- `registerResources(language, valuesOrNamespace, configOrValues, maybeConfig)`
- `getBuilderCatalog(language?)`
- `formatters`
- `resources`
- `languageConfig`

## Future React i18n direction

React should use a provider/hook pattern.

Suggested structure:

```text
src/shared/i18n/
  LanguageProvider.tsx
  useI18n.ts
  resources/
    sr/
      common.ts
      navigation.ts
      dashboard.ts
      settings.ts
      goals.ts
      calendar.ts
      ideas.ts
      research.ts
      ideaTesting.ts
      finance.ts
      compass.ts
    en/
      common.ts
      navigation.ts
      dashboard.ts
      settings.ts
      goals.ts
      calendar.ts
      ideas.ts
      research.ts
      ideaTesting.ts
      finance.ts
      compass.ts
```

React components should use:

```tsx
const { t, language, setLanguage, formatters } = useI18n();
```

React components should not directly call `window.MentorI18n`.

If legacy compatibility is needed during migration, create a narrow adapter around `window.MentorI18n` and keep that dependency out of ordinary React components.

## Testing checklist

- Switch from Serbian to English.
- Switch from English to Serbian.
- Refresh page and confirm selected language persists.
- Check missing key fallback.
- Check dynamic params.
- Check date/currency/number formatting.
- Check active view rerenders after language change.
- Check that no hardcoded text appears in the updated module.
- Check that React components, when introduced, use the React i18n hook/provider instead of global window access.

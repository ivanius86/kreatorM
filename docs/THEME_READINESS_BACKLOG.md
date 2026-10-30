# Deferred theme readiness work

Status: deferred. Current priority is finishing and stabilizing MVP functions.
This document records observed dependencies, not an approved refactor or theme implementation plan.
No functionality needs to be changed solely to resolve this backlog now.

## Rules for new MVP changes

- Identify panels and controls with stable IDs or semantic `data-panel` / `data-action` attributes.
- Keep domain operations and saved data independent of panel styling, dimensions, position, and DOM order.
- Do not use `nth-of-type`, child indexes, or similar positional targeting for functionality or translations.
- Future themes may change images, panel shape, size, and layout. Reuse the same domain services, data, and functional controls across layouts.
- Preserve text-editing event guards, DOM node identity, focus, and unsaved input when changing presentation.
- Only resolve an existing dependency now if required by a bounded MVP change; otherwise retain it here.

## Observed dependencies to address when introducing themes

Line numbers are navigation hints from the analysis and may change.

| Area | Evidence | Deferred action |
| --- | --- | --- |
| Positional translation targeting | `script.js`, around 478-485: dashboard `nth-of-type`; around 562-564: settings label order | Target semantic IDs/attributes before enabling panel rearrangement. |
| Shell geometry | `style.css`, around 10403: grid column, fixed sidebar width and offset tied to 220px | Share dimension tokens and define supported responsive shell layouts. |
| Card appearance | `style.css`, around 10965: literal gradients, border radius, padding and shadows; repeated rules throughout the stylesheet | Tokenize effective rules incrementally while preserving the current default appearance. |
| Nutrition styling | `js/nutrition/nutrition.css`: local `--n-*` tokens, literal colors and fixed dimensions | Map module appearance to shared theme tokens without changing nutrition logic. |
| Remaining nutrition positional styling | `js/nutrition/nutrition.css`: overview orbit metrics and inventory overview use positional presentation selectors; food-table positional column hiding/sizing and inventory-detail positional hiding were removed for the October 2026 library layout fix | Keep remaining overview presentation dependencies deferred until themes; use semantic panel/action hooks for new behavior. |
| Brainstorming geometry | `brainstorming.js`: card dimensions, zoom, expanded panels and research workspace geometry, notably around 1260-1276 and 2527-2582 | Separate outer panel layout from saved idea coordinates; remeasure presentation without resetting state. |
| Research geometry | `research.js`, around 958-973: dock parent/coordinates; around 1306-1456: canvas card sizes, zoom, coordinates and connectors | Preserve canvas data and module ownership; add bounded dimension-change hooks for supported layouts. |
| Finance geometry | `finansije.js`, around 3232-3246, 4748 and 5156: tab widths, chart bounds and scroll offsets | Recalculate geometry when layout/font metrics change without rerendering input forms or resetting views. |
| Dynamic sidebar symbol | `script.js`, around 714-770: navigation/category changes overwrite symbol image | Keep uploaded persona separate from the navigation/category symbol. |
| Settings persistence | `js/data/repositories/settings.repository.js`; `js/data/repositories/indexeddb-core.repositories.js`, around 221-258: language-only snapshots | Extend both settings contracts consistently; preserve language and other fields on every mutation. Use the selected repository, not a parallel storage system. |
| Media preparation | `js/data/repositories/media.repository.js`; IndexedDB media repository around 1102-1158; `js/nutrition/services/food-image-storage.service.js`; `lazyLoader.js` | Make shared image preparation available independently of opening Nutrition; preserve existing media contracts and durable Blob storage. |
| Migration and backup | `js/data/normalization/legacy-domain-normalizer.service.js`, around 632: settings normalization retains language only; `js/data/migration/legacy-to-indexeddb.service.js`; `js/data/backup/` | Ensure future appearance fields and persona references survive migration and backup/restore; verify roundtrip before release. |
| Offline visual assets | `index.html`, around 9-13: Google Fonts; `finansije.js`, around 6396-6410: CDN icons; `research.js`, around 3611: CDN icons | Bundle assets required by offline themes with local fallback. |

## Future scope

When themes are scheduled, design independent theme, layout and persona modules with a shared API such as `setTheme()`, `setLayout()` and `setAvatar()`.
Include desktop/tablet/mobile variants, previous-appearance recovery and a local default on loading failure.
Keep CSS visual ordering compatible with keyboard and reading order.
Paid themes, AI image generation, text-command interpretation and microphone control remain separate later work.

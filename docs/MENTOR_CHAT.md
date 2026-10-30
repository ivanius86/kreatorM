# Mentor AI Chat

## Current UI — Floating Chat v1 (2026-10-29)

Local inventory add/restock requests now support bounded, independently clarified multi-item tasks with version-bound approval and per-item execution outcomes. See [Nutrition multi-item fix, evidence and manual tests](MENTOR_NUTRITION_MULTI_ITEM_FIX.md).

Mentor is now one global floating chat, opened with the existing portrait at the bottom right. The `builder` navigation route is again the standalone Goal Creator / Creator ciljeva. The page-mode descriptions below record earlier implementation history.

The same controller, client, conversation repository, providers and action services are reused. Module navigation and minimization preserve the draft and active request; explicit Stop, conversation switching and language switching retain cancellation. Unsent drafts remain tab-memory only. See [Track A delivery and manual UI checks](MENTOR_FLOATING_CHAT_V1.md) and the separate [Track B context audit, without implementation](MENTOR_CONVERSATION_CONTEXT_AUDIT.md).

The `builder` navigation entry is now **Mentor**. Chat is the default; **Create a goal manually / Ručno kreiraj cilj** retains the complete existing category and questionnaire flow. Existing goals and other modules keep their original repositories and schema.

## USDA-first food catalog search — 2026-10-30

The existing food creation search now first translates locally using all 165 SR/EN seed pairs and curated names/preparation synonyms, then queries USDA FoodData Central. Generic `kuvani pasulj` searches `beans mature seeds cooked`, without choosing a variety or returning bean sprouts; pršuta, ham and bacon remain separate. Candidates show the original source description, food type, preparation, brand and USDA data type. Every candidate still requires a user choice, followed by the existing signed preview and explicit save approval.

Gemini is an optional search-only fallback when the local dictionary cannot resolve a name and USDA returns no reliable matches. An unavailable model or model quota returns a recoverable refinement/manual-entry message; USDA outages or USDA quota never trigger Gemini. Selected food details use USDA directly, deterministic local metadata and the original English name/`other` when uncertain. No model supplies nutrients. Existing FDC IDs, 45-field mapping, unknown versus zero values, signatures, duplicates and IndexedDB writes retain their existing contracts; saved records are not rewritten.

Diagnostics distinguish `FOOD_USDA_QUOTA` from `FOOD_GEMINI_QUOTA` and record only source, safe code, upstream HTTP status and sanitized retry seconds. Missing upstream retry timing is `null`. Search text, upstream bodies and API keys are excluded. The manual path remains Nutrition → Foods → Add. Automated tests cover ordering, optional-fallback failure/recovery, bean varieties, preparation, source details, quotas and approved persistence. Live USDA search and detail verification passed; browser acceptance remains a manual check.

## Setup on Windows

Install Node.js 22.16 or later (24 LTS recommended). Existing frontend dependencies are pinned in `package-lock.json`; run `npm ci` if `node_modules` is absent.

From the project directory:

```powershell
Copy-Item .env.example .env
```

Edit `.env` locally and set `GEMINI_API_KEY` to a key from [Google AI Studio](https://aistudio.google.com/apikey). Keep this file private. It is excluded by `.gitignore`; `.env.example` contains no credential. Environment variables can also be configured in the shell instead of using `.env`.

```dotenv
GEMINI_API_KEY=your_local_key
GEMINI_MODEL=gemini-3.1-flash-lite
PORT=3000
```

Start the application and backend together:

```powershell
npm start
```

Open **http://127.0.0.1:3000** and choose Mentor in the sidebar. If using the portable runtime downloaded during implementation:

```powershell
& '.\.tools\node-v24.22.1-win-x64\node.exe' server.js
```

Keep the same hostname and port as your previous app server to access that browser origin's existing data. IndexedDB and localStorage are origin-specific: switching from `localhost` to `127.0.0.1`, or changing ports, shows a different local database. Existing data at the previous origin is retained. Export an existing app backup from the old origin before moving to a new one.

The server binds to IPv4 loopback only. The frontend uses same-origin `/api/mentor/chat`; it never receives the key. Local static files are allowlisted; `.env`, hidden paths, server sources, tests, dependencies, and traversal targets are not served. Restart the server after changing `.env`.

## Gemini configuration and verification

Official Google [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) and [pricing](https://ai.google.dev/gemini-api/docs/pricing) were checked on 2026-10-23. Per the user's preference, `gemini-3.1-flash-lite` is the default: a supported Flash-Lite model with structured JSON output and free-tier access. Account, region, quotas, and future model availability must still be verified with the configured key.

The backend uses Google's official [`generateContent` REST endpoint](https://ai.google.dev/api/generate-content), passing the key only in the server-to-Google `x-goog-api-key` header. Responses use a JSON schema and are validated again before reaching the UI or goal service.

Run the opt-in real integration diagnostic after setting the key:

```powershell
npm run check:gemini
# Or:
& '.\.tools\node-v24.22.1-win-x64\node.exe' server.js --check-gemini
```

This checks the selected model's `generateContent` support and makes one real structured generation with a synthetic skill-learning prompt. It consumes API quota and prints only a safe success/error status. No app data is read. The configured model accepted the intent-classification request during expansion diagnostics. End-to-end acceptance of the latest expansion is left to the user, as requested.

## Conversation behavior and privacy

- User and assistant messages have unique IDs, timestamps, and transactionally assigned sequence numbers. Conversations restore after reload and can be selected, created, deleted with confirmation, and exported as JSON.
- Conversation storage uses Dexie database `kreatorm_mentor_chat_db`, separate from `kreatorm_app_db`. This avoids changing the existing strict migration and backup contracts. **Existing app database backups do not include chats.** Use **Export conversations / Izvezi razgovore** to save a separate readable JSON archive. Chat archive import is deferred.
- Only recent complete user/assistant pairs and the current message are sent: at most 23 messages within a 24,000-character budget. Older messages remain saved locally. There is no indefinite full-history transmission, automatic summary, or cross-conversation memory.
- Saved goal context is disabled by default. Selecting one goal authorizes sharing only its ID, title, type, category, first action, and target date with the next message. Explicit meal-planning requests share a basic list of at most 20 saved recipes (ID, name, servings and meal type). Each saved user message records an immutable request snapshot. Retrying uses that same snapshot. Inventory, financial transactions, journal entries and unrelated records are not sent to Gemini.
- Dietary/training constraints are derived from all local user messages in the selected conversation and sent as a bounded constraint snapshot, even after the originating message leaves the model's recent context. Unknown food/allergen classifications do not count as safe matches. Nutrition proposals are invalidated by a newer user turn; approval must use the current conversation revision.
- Selected app language controls future replies (Serbian Latin or English). Changing language, leaving Mentor, switching conversations, stopping a response, or opening the manual creator cancels/invalidate the active request. Interrupted messages remain retryable.
- Backend requests time out after 75 seconds; the client stops after 90 seconds. A 110-second transactional conversation lease prevents simultaneous sends across tabs and expires after a crashed tab. Conversation Web Locks serialize message reservation, action approval and deletion across tabs. After an interrupted page reload, retry may need to wait for the lease to expire; no request is silently resent.
- Retry reuses the saved user-message ID; assistant reply IDs are deterministic. Transport IDs additionally include the selected language so retrying after a language change cannot reuse the previous language's cached response. The backend coalesces duplicate requests and caches successful results in memory for five minutes, up to 100 entries. It stores no conversation files on the server.
- Input is limited to 4,000 characters. Backend bodies are capped at 96 KiB, output at 3,072 tokens for ordinary chat, up to 8,192 for ordinary authorized action batches and 16,384 for bounded multi-day meal plans, provider requests at two simultaneously and twelve starts/minute. There are no automatic retries of generated responses or model fallbacks. A rejected structured schema (HTTP 400) can trigger one JSON-mode compatibility request, still subject to the same local validation and overall timeout.
- All user/model text is displayed with `textContent`. No AI-generated HTML or commands execute.

## Approved goal proposals

Gemini can propose `createGoal`, `createIdea`, `createRecipe` and `createMealPlanEntry`. Explicit intent is constrained by command/action matching and requested counts, with a maximum of five ordinary proposals. An explicit multi-day meal plan has separate bounds: up to seven new recipes and 28 scheduled meals covering at most seven days. Missing meals/day must be clarified first. See [weekly plan behavior and changed files](MENTOR_WEEKLY_PLANS.md). No action is saved without approval. Goals, ideas, recipes and meal plans use their existing modules and repositories.

The adapter creates existing goal records, maps tasks to the existing `actions` model, preserves additional milestone strings, and uses the current repository's validation, durable mutation, and coordination. The bounded `createIfAbsent` repository operation reads current durable goals within its write transaction and adds one goal without replacing the collection; stale tabs approving different goals cannot overwrite each other's data. A stable proposal-derived goal ID prevents duplicate approval, including recovery when the goal saved but the chat approval marker failed. Per the user's current scope, AI goals do not create Finance budgets or connect to financial transactions. The legacy manual creator keeps its existing behavior. Saved goals can be reviewed, scheduled and tracked through the existing Calendar UI; the AI does not schedule events or edit/delete existing goals.

## Sourced recipes and approval safeguards

### Cooked beans/ribs response validation — 2026-10-30

The request `napravi mi recept za kuvani pasulj sa rebrima, nadji sastojke bilo koje` reached recipe creation. The reported `provider-request / INVALID_RESPONSE` was accompanied by server `application-response` diagnostics: provider JSON had arrived, but local response validation rejected it. A separate live attempt with the same isolated prompt succeeded, so the exact original invalid field was not established. Offline reproductions confirmed that an empty reply or malformed recipe source/quantity fields could cause that same failure.

For recipe-only creation, an empty model caption no longer discards otherwise valid proposals: a harmless localized caption is supplied before the existing policy creates its actual status message. Malformed local recipe responses still fail strict validation and now return the existing localized no-valid-recipe/no-card explanation. Fixed stage/code metadata is logged without payloads, ingredient values or user text. Provider JSON/transport failures, unexpected errors, goals, ideas and meal-plan validation retain their existing error behavior; no automatic model retry or speculative field repair was added.

`pasulj` / `bean(s)` source lookup now uses `beans`, rather than the default chickpea query. This does not create missing ribs or other ingredients, attach an unrelated source, or establish that the requested recipe can be saved. Tests cover the exact source query, whitespace captions with valid proposals, malformed source IDs and quantities with no unsafe card, localized SR/EN feedback and preservation of provider errors. Existing user data and schemas remain unchanged.

### Actual Arepa request and missing approval cards — 2026-10-30

The actual command began `make me recipie for arepa:` followed by eleven ingredients. The spelling `recipie` was excluded by the recipe noun guard, so this explicit creation request fell into ordinary plain-text chat. The subsequent `let me aprove` also had no creation noun, and the former continuation fallback required a question mark in the preceding assistant reply. As a result, recipe prose could contain invented `foodId: 101` records and refer to pending approvals without any structured proposal or card. This is a separate root cause from the hydration issue below.

The narrow `recipie` / `recipies` spellings now use the existing recipe authorization, structured generation, catalog/source validation and client recipe exclusions. Ingredient quantities do not become recipe counts. The explicit dish name `arepa` is searched as `arepa`; it does not fall back to a chickpea query. No source from the supported service means a localized no-source/no-card result, without generating a substitute source.

A short approval continuation can recover only the immediately preceding explicit user recipe command in the same bounded conversation request when that command has no recorded proposal. Assistant prose and printed ingredient IDs never authorize actions. Existing action history produces accurate pending/approved/dismissed guidance rather than duplicate proposals. Text never approves or saves anything. The existing stale-proposal check remains: a later chat message can require a fresh recipe request.

Plain-text responses with internal food records or false recipe approval-card promises are replaced by an explicit explanation that no recipe was prepared for approval in that response. A structured recipe still keeps unresolved ingredient/source problems visible and cannot be saved until existing checks pass. Missing P.A.N., water, salt, lime, cilantro or pepper records are not invented; the public catalog selection limit is unchanged. These changes do not implement Global Adaptive Intent Memory, a Task Manager, schema changes or general recovery across topics.

Regression coverage includes the actual original command, `let me aprove` after misleading prose, real action statuses, negative/hypothetical origins, a topic change, unverified source failure in SR/EN, fake food IDs, requested card counts and inventory-route exclusion. Fixtures use a valid isolated source to prove routing; they do not establish that the full Arepa recipe or a real model/source call succeeds. No user database was read or modified for these checks.

### Recipe approval correction — 2026-10-30

Recipe approval now waits for Nutrition hydration and a successful domain preview. Previously, restored ingredient choices could be checked before the food repository loaded, disabling approval even after the choices validated. The preview now updates the existing button without replacing focused selects, and preserves busy, finalized and pending-prerequisite guards.

Exact one-piece annotations such as `1 piece (150 g)`, `1 clove (4 g)`, and proposal units `kom (150 g)` / `čen (4 g)` normalize to their explicitly stated metric totals. No average weights or density conversions are inferred. Multiple counts, unsupported containers and contradictory amounts remain blocked.

This correction does not add missing foods, alter the public catalog selection, relax source validation or repair previously stored proposals automatically. The reported complete P.A.N. recipe can still require catalog/ingredient clarification. Tests cover hydration with restored choices, focus preservation, busy/finalized/pending states, invalid recipes and explicit metric annotations; browser/model acceptance remains a separate check.

Recipe discovery uses fixed HTTPS endpoints from [TheMealDB](https://www.themealdb.com/api.php), with bounded parallel discovery and short in-memory caches. The provider's developer key `1` is intended for development/personal learning; review its current terms and supporter requirements before public distribution. Gemini receives public source recipes and eligible system food IDs, not the user's private food database.

Every recipe preview includes source attribution, quantities, preparation, a source photograph and local nutrition calculations. Exact imports with unresolved ingredients/measurements cannot be approved. Adaptations explicitly disclose that quantities/substitutions are new and the original photograph is illustrative. Attribution survives later manual edits; changed recipes are marked adapted. Source photos are fetched through a bounded same-origin proxy restricted to TheMealDB meal-image URLs, without redirects, with MIME/signature checks. Approval stores the verified image in local media; an unavailable image prevents recipe creation and leaves it retryable. No generated or invented image URLs are accepted.

Approving all proposals saves them sequentially, with recipes before dependent planned meals. Each item has a stable ID and durable approved/dismissed state. Earlier successful items survive a later failure; retry does not duplicate them. There is no claim of a cross-database atomic batch. Ideas and nutrition insertions read the latest durable collection before changing it. Current food profiles and dietary requirements are revalidated before saving.

Planning a meal requires an existing or separately approved recipe and an explicit real date. It reserves available inventory and records shortages through the existing planning service; it never marks meals completed, consumes stock, or creates ingredients automatically. Financial transactions, budgets, edits and deletion are outside the action allowlist.

The 2026-10-27 Gemini error fix replaces the broad nested action union with separate arrays for the authorized action kinds. HTTP 400 schema rejection no longer reports `MODEL_UNAVAILABLE`; only an unavailable model (404) does. Schema rejection may use one validated JSON-mode compatibility request. User-facing chat acceptance testing is left to the user at their request; no completed end-to-end verification of this expansion is claimed.

## Chat module foundation (2026-10-27)

The Mentor chat keeps one controller in `js/mentor/mentor-chat.js` for conversation state, persistence coordination, cancellation, retries, approvals and event binding. `js/mentor/mentor-chat-view.js` now owns chat DOM rendering and the manual/chat mode display. `js/mentor/mentor-chat-client.js` owns the chat and status HTTP requests. Existing action cards remain in `js/mentor/mentor-action-cards.js` and storage remains in the separate conversation repository. Browser scripts load the view and client before the controller.

The reported `response-render / ReferenceError` was caused by action cards reading `constraints` before its declaration. That declaration now precedes its first use, and the chicken/fish badge is restricted to Nutrition cards. No database schema or saved record was changed. The user reserved testing for themselves, so this change was reviewed statically only; it has not been verified in a browser.

Files changed: `js/mentor/mentor-action-cards.js`, `js/mentor/mentor-chat-view.js`, `js/mentor/mentor-chat-client.js`, `js/mentor/mentor-chat.js`, `index.html`, and `docs/MENTOR_CHAT.md`.

### Meal-plan clarification routing

A pending meal-plan question is now resumed only when the next user message supplies the missing days, date or meal selection, or explicitly starts a new plan. A separate request such as adding pantry foods or asking about web research is processed as a new topic instead of repeating the meal-plan question. The model is instructed to state the actual capability limits: this version cannot add foods or inventory from chat and has no general web search; public recipe discovery is available only for recipe requests. No conversation data or storage schema was changed. This routing correction received static review only, following the user's request to leave testing to them.

Files changed for this correction: `server/meal-planning.js`, `server/action-policy.js`, `server/gemini.js`, and `docs/MENTOR_CHAT.md`.

### Provider error clarification

A browser diagnostic pointing to `mentor-chat-client.js:16` means the local backend returned a JSON error. It does not, by itself, indicate a blocked local port. The reported `NETWORK` and `INVALID_RESPONSE` responses came from the backend; the old server logs did not retain enough safe detail to identify their exact upstream cause.

Ordinary replies with no authorized creation action now request plain text from Gemini and pass through the existing reply validator and false-save-claim guard. Structured JSON remains required for authorized creation actions. This avoids imposing an output schema on simple questions. For future `NETWORK` or `INVALID_RESPONSE` failures, the local server logs only the error code, a fixed processing phase and an upstream HTTP status when available. It never logs the provider response body, API key or chat content. User-facing error wording now reflects that a backend JSON error may come from the Gemini request or response. No real provider request, automated test or browser check was run for this correction; testing remains with the user.

Files changed for this correction: `server/gemini.js`, `server.js`, `js/i18n/mentor.js`, `index.html`, and `docs/MENTOR_CHAT.md`.

## Checks

```powershell
npm run test:mentor
npm test
```

Mentor automated tests use mocked Gemini responses and fake IndexedDB. The optional real-browser check uses installed Chrome, a disposable browser profile, and a mocked provider. It does not read the normal browser profile or call Google:

```powershell
npm run test:mentor:browser
# For another Chrome/Edge path, set MENTOR_BROWSER before running.
```

Manual acceptance after configuring the real key:

1. Open Mentor; send a vague goal, answer a follow-up, and verify context and selected-language replies.
2. Reload; create/select another conversation; retry an interrupted/error response and verify no duplicate user message.
3. Ask for a goal proposal. Review and approve; open Calendar and verify the saved goal/tasks. Dismiss another proposal and verify no goal is created.
4. Stop/switch conversations while waiting. Verify the late response does not appear in another conversation. Delete a conversation and verify saved goals remain.
5. Check narrow/mobile and desktop layouts; avatar remains above the chat on narrow screens. Enter sends, Shift+Enter inserts a newline, and typing/focusing does not select panels or reset drafts.
6. Switch Serbian/English, test the manual creator, and open the existing modules. Inspect browser requests: calls go to `/api/mentor/chat`, without the Gemini key.

## Boundaries intentionally deferred

### Browser error reporting correction (2026-10-27)

The old generic `STORAGE` message was also used for unrelated rendering, Nutrition module-loading and date-format errors. Its appearance therefore did not establish an IndexedDB failure. The exact exception from the user's earlier failed attempt was not recorded and is not claimed to be known.

Errors now distinguish request preparation, module loading, response validation, response persistence, rendering, browser quota and storage permissions. A malformed historical timestamp displays an unavailable-time label without rewriting the saved record. Planning dates use local Gregorian numeric components rather than locale-specific date strings.

Received, validated replies that fail to persist are retained in memory (up to three replies) so Retry in the same open tab attempts persistence first without another Gemini request. This cache is temporary, language-specific, cleared after a successful commit or conversation deletion, and does not survive a page reload. A rendering error after a successful commit offers a display retry and does not relabel the saved response as a failed write.

Diagnostics contain only an allowlisted processing stage, exception class, error code and an optional same-origin JavaScript filename/line/column. They omit chat text, full exception messages/stacks, query strings, API keys and user database records. The local same-origin POST endpoint `/api/mentor/client-diagnostic` accepts up to 1 KiB, logs at most 30 reports/minute, and calls no model. `MentorChat.getLastDiagnostic()` exposes the same redacted record in the current browser tab. Existing databases are neither reset nor migrated for this change.

Changed files: `js/mentor/mentor-chat.js`, `js/mentor/mentor-protocol.js`, `js/mentor/mentor-action-adapters.js`, `js/i18n/mentor-actions.js`, `server.js`, `index.html`, and `docs/MENTOR_CHAT.md`. Verification was static only, following the user's request to reserve interactive and automated testing for themselves.

Editing existing records, autonomous actions, calendar scheduling, milestone progress UI, general AI access to other modules, permanent summaries/embeddings, chat archive import, shared app-backup integration, server accounts, and public hosting are outside this implementation. The backend is a local development solution. No new theme system or frontend framework was introduced.

Before changes, storage and nutrition checks passed. Research had 9 existing failures out of 148 tests (139 passed), including sticker dragging/selection and `sections.renderIcon is not a function`; these unrelated modules were left unchanged.

## Implementation file list

Created:

- `server.js`, `server/gemini.js`: local server and Gemini REST adapter.
- `.env.example`, local ignored `.env`: server configuration template and private configuration file.
- `js/mentor/mentor-protocol.js`: bounded shared request/response/proposal contract.
- `js/mentor/mentor-conversations.repository.js`: isolated Dexie conversation persistence.
- `js/mentor/mentor-goal-proposals.js`: approved goal creation and allowlisted context reads.
- `js/mentor/mentor-chat.js`: chat controller and persistence coordination.
- `js/mentor/mentor-chat-view.js`: chat DOM rendering and mode display.
- `js/mentor/mentor-chat-client.js`: same-origin chat and status requests.
- `js/i18n/mentor.js`: Serbian and English chat resources.
- `mentor-chat.css`: responsive chat layout in the existing palette.
- `tests/mentor/server.test.js`, `tests/mentor/conversations.test.js`, `tests/mentor/proposals.test.js`: mocked automated checks.
- `tests/mentor/browser-check.js`: isolated Chrome/Edge integration check and screenshots.
- `docs/MENTOR_CHAT.md`: configuration, privacy, architecture boundaries, checks and file list.

Modified:

- `index.html`: Mentor panels and local asset loading; legacy builder retained.
- `script.js`: Mentor activation/reset/cancellation hooks and navigation label.
- `js/i18n/sr-core.js`, `js/i18n/en-core.js`: Mentor navigation label.
- `js/data/services/goals.service.js`: bounded create-if-absent service operation.
- `js/data/repositories/goals.repository.js`, `js/data/repositories/indexeddb-core.repositories.js`: safe insertion of an approved goal without stale collection replacement.
- `tests/storage/indexeddb-core-migration.test.js`: stale-tab approval regression check.
- `package.json`: start, Gemini diagnostic and test commands.
- `.gitignore`: exclude private env files and `.tools` while keeping `.env.example`.

An SHA-256-verified portable Node runtime, baseline/final test logs and screenshots were placed in ignored `.tools/` for this workspace; they are not frontend assets.

## Files changed for the 2026-10-27 expansion and Gemini correction

- `server.js`: shared recipe provider and restricted image proxy; expanded request deadline.
- `server/gemini.js`: intent classification, sourced recipe context, action-specific generation schemas, bounded JSON-mode compatibility and accurate 400/404 error handling.
- `server/action-policy.js` (new): deterministic action/count limits, source checks, stable identities, consumed-action budget and dietary filtering.
- `server/public-food-catalog.js` (new): eligible public system foods and their verified dietary/allergen profiles.
- `server/recipe-sources.js` (new): bounded TheMealDB lookup, source/image validation and caches.
- `js/mentor/mentor-protocol.js`: typed actions, generation schema normalization and persistent conversation constraints.
- `js/mentor/mentor-conversations.repository.js`: immutable request snapshots, per-action outcomes and conversation locks.
- `js/mentor/mentor-action-adapters.js` (new): explicit approval, stable inserts, recipe media, dependency handling and module navigation.
- `js/mentor/mentor-action-cards.js` (new): complete previews, sources, adaptation disclosures and local nutrition values.
- `js/mentor/mentor-chat.js`: action execution, sequential batch approval, shared recipe context and send/approval coordination.
- `js/i18n/mentor-actions.js` (new): Serbian/English action labels and actionable errors.
- `js/data/repositories/indexeddb-core.repositories.js`: fresh transactional idea/nutrition insertion.
- `js/data/repositories/ideas.repository.js`: local create-if-absent fallback.
- `js/data/repositories/nutrition-inventory-data.repository.js`: fresh-envelope local mutation fallback.
- `js/nutrition/services/planning.service.js`: bounded recipe/meal insertion, diet checks, safe reservations and source preservation.
- `js/nutrition/nutrition.js`: opening saved recipes/planned meals from chat.
- `js/nutrition/tabs/recepti.js`: recipe source and adaptation disclosure.
- `brainstorming.js`: refresh approved ideas from the existing repository.
- `lazyLoader.js`: invalidate changed Nutrition module assets.
- `index.html`: load action resources/adapters/cards and updated CSS.
- `mentor-chat.css`: scoped action previews and recipe/source presentation.
- `tests/mentor/action-policy.test.js` (new): focused policy/source fixtures; `tests/mentor/conversations.test.js`: lease fixture update.
- `docs/MENTOR_CHAT.md`: expansion, privacy, safeguards and changed-file documentation.

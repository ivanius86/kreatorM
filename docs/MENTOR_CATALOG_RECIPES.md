# Catalog-first recipe proposals (2026-10-30)

## Plan

User clarification: creating a recipe uses actual catalog foods first. Missing foods require an offer to create a verified food or choose a suitable catalog alternative. Dry/cooked or other substitutions must regenerate quantities and preparation; they are not equal-weight conversions.

- Allow newly composed catalog recipes (`sourceId: catalog`) without an external recipe link. Keep source-backed exact imports strict. Require real foods, valid quantities, dietary compatibility and numbered preparation steps for composed recipes.
- Correct source-relatedness for adapted recipes only: dried white and cooked pinto beans can belong to the same culinary family; this does not change food identity, nutrients or amounts. Verify requested beans/ribs as substantive anchors independently of ingredient order.
- For missing catalog ingredients expose a verified-food creation action and suitable catalog alternatives. Food creation still requires its own approval. Alternatives request a fresh recipe rather than mutating the old ingredient weight.
- Bind actions to the stored current proposal. Preserve the original command for a visible resume action after food approval. Never silently save a recipe.

## Regression checks

Catalog recipes without TheMealDB, existing-catalog beans/ribs request, source beans/ribs relationship and permutations, unrelated source rejection, missing food choices, source import strictness, substitution regeneration, approval/dismissal/stale binding and existing inventory/food flows.

## Result

Implemented. Catalog-composed recipes use real food IDs and do not require an external source. Exact imports keep their source checks. Adapted source links use culinary relatedness without changing nutrient identity or weights. Requested beans/ribs/chicken and substantive foods are checked independently of their list position.

Missing food cards offer creation or regeneration with a catalog alternative. Creation has its own food approval. A successful creation exposes an explicit resume action; an already existing source record can also resume without duplicating it. Substitutions never apply a new food to an old dry/cooked weight. The original requirements are retained in bounded, untrusted recovery context; they authorize no extra actions. Buttons are rechecked against durable current messages/tasks inside reservation.

Preparation state is shared with the model along with consented food metadata. Catalog food names remain canonical. Inline numbered steps are accepted. A recognized contradiction such as soaking an already-boiled catalog bean triggers one bounded preparation repair; a still-invalid recipe remains unapprovable. This checks specific contradictions and instruction structure, not general culinary correctness.

## Verification

- All 182 Mentor tests pass, including existing inventory and food workflows.
- Isolated Chrome flow passes: catalog beans/ribs can be approved without an external source; missing food creation requires approval, survives reload, then resumes recipe creation; substitutions generate a new uncommitted recipe. Original requested servings are retained (6 for the food-resume case, 5 for substitution).
- Real Gemini request `NAPRAVI MI RECEPT, PASULJ SA REBRIMA` returned HTTP 200, `sourceId: catalog`, actual smoked-rib/cooked-bean IDs, cooking instructions for already-cooked beans and an empty unresolved list. No recipe was saved to user storage by this live API check.

## Changed files and purpose

- `server/recipe-food-relations.js` — bounded culinary families for relatedness and suggested alternatives.
- `server/action-policy.js` — catalog recipes, missing foods, requested anchors, preparation checks and normalized recovery metadata.
- `server/mentor-core.js` — catalog-first instructions, optional external sources, original requirements and one bounded preparation repair.
- `server/public-food-catalog.js` — include actual food preparation state.
- `js/mentor/mentor-protocol.js` — catalog provenance, missing-food requests, preparation state and bounded recovery context.
- `js/mentor/mentor-action-adapters.js` — catalog recipe save/preview, optional source images and targeted consented user foods.
- `js/mentor/mentor-action-cards.js` — missing-food creation and substitution controls.
- `js/mentor/mentor-chat.js` — bound recovery/resume commands and preserved requirements.
- `js/mentor/mentor-chat-view.js` — visible resume action after food approval.
- `js/mentor/mentor-conversations.repository.js` — atomic binding checks; missing-food substitutions cannot be saved in place.
- `js/mentor/mentor-nutrition-food.js` — reuse an existing verified source record and allow recipe continuation.
- `js/i18n/mentor-actions.js` — Serbian/English recovery copy, catalog provenance and validation messages.
- `js/i18n/mentor.js` — permission copy includes preparation state.
- `index.html` — asset versions for refreshed clients.
- `tests/mentor/catalog-recipes.test.js` — catalog/source/food-choice regressions.
- `tests/mentor/mentor-core.test.js` — source independence and bounded preparation correction.
- `tests/mentor/conversations.test.js` — stale/forged recovery and regeneration-only bindings.
- `tests/mentor/action-cards.test.js` — missing choices cannot bypass approval validation.
- `tests/mentor/food-browser-check.js` — full isolated recovery/approval/continuation/substitution flow.
- `docs/MENTOR_CATALOG_RECIPES.md` — plan, behavior, checks and file list.

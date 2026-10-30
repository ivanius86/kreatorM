# Pre-existing test issues

## NUTRITION-TEST-001 — Missing food fixture

- Status: resolved (`test-fixture-only`)
- Test: `tests/nutrition/planning-completion.test.js`
- Case: `inventory add and restock immediately resync planned egg reservations`
- Existing result before Phase 1: `INVENTORY_VALIDATION_FAILED` with `foodMissing`
- Classification: pre-existing test fixture issue; not a Phase 1 regression
- Phase 1 action: no production or fixture change was made; the case is excluded from the targeted Phase 1 test set
- Resolution: the fixture now exposes the same Egg record through `getAll()` and `getById()`, and awaits the existing asynchronous inventory operations.
- IndexedDB assessment: not an IndexedDB regression; no production code was changed for this resolution.

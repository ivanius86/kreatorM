# Engineering Foundation Rules

## Purpose

This document defines how software development should be approached in this project so the app stays stable, scalable, maintainable, and safe for user data.

This is not a feature specification. It does not define one specific module such as goals, finance, calendar, research, or ideas. It defines reusable engineering principles and foundation layers that should apply to every future feature.

The core principle is simple:

Before building UI or adding a new feature, define the foundation first:

- data model
- storage strategy
- repository/service boundaries
- forms/buttons behavior
- validation
- i18n/language handling
- routing/module boundaries
- shared UI components
- error/loading/empty states
- backup/export safety
- future migration path

## 1. Build platform foundations before screens

Do not build the app as disconnected UI screens. Every feature should be built on stable layers that can survive future changes to storage, routing, language, design, and backend architecture.

UI should be the final expression of the system, not the starting point. Screens and components should reflect already-defined data models, workflows, validation rules, persistence boundaries, and user states.

React components should stay focused on presentation and user interaction. They may collect input, display data, call hooks/actions, and show state. They should not become the hidden home for business rules, storage logic, validation rules, or migration logic.

Business rules, storage logic, validation, and migration behavior should live in predictable foundation layers. Avoid hiding important system behavior inside random components, event handlers, or one-off utility code.

## 2. Decision before implementation

Before implementing any feature, the project should first make the necessary architectural decisions.

Before implementing any feature, ask:

- Is this a new feature or an extension of an existing one?
- Does this belong to an existing domain?
- Does this require a new data model?
- Does this introduce new persistent data?
- Can existing shared components be reused?
- Does this affect i18n?
- Does this affect storage?
- Does this require migration?
- Does this require a new route?
- Is there already an existing implementation pattern?

Implementation should not start until the affected foundations are understood. If data, storage, validation, i18n, routing, shared UI, or migration impact is unclear, the next step should be analysis or planning.

## 3. Avoid over-engineering

- Prefer the simplest architecture that satisfies current requirements.
- Do not introduce new layers, abstractions, repositories, services, providers, or utilities unless they clearly reduce complexity.
- Avoid premature optimization.
- Small features should not receive enterprise-level architecture.
- Keep the app scalable, but do not overbuild for imaginary future requirements.

Scalability comes from clean boundaries and consistent habits, not from adding abstractions before the product needs them.

## 4. Consistency over cleverness

- Prefer consistency over cleverness.
- If the project already has an established pattern, use it.
- Do not invent a different architecture for one module unless there is a strong reason.
- Similar features should feel structurally similar.
- Predictability is more valuable than clever one-off solutions.

A future maintainer should be able to understand a new module by recognizing familiar patterns from existing modules.

## 5. Single source of truth

Every important concept should have one canonical source.

Examples:

- UI text -> i18n translation files
- Language state -> language provider
- Persistent data -> repositories
- Storage access -> storage adapter
- Business rules -> services
- Validation -> schemas
- Routes -> routing configuration
- Shared visual patterns -> shared UI components

Rules:

- Do not duplicate sources of truth.
- Do not store the same durable data in multiple places unless there is a clear reason.
- Do not create parallel systems for the same responsibility.
- If duplication is unavoidable, document why.

Duplicated authority is one of the fastest ways to create drift, bugs, and unsafe migrations.

## 6. Standard feature development checklist

For every new feature or module, Codex should check these questions before implementation.

### Product behavior

- What problem does this feature solve?
- What should the user be able to do?
- What data does the feature create, read, update, or delete?
- What should happen when there is no data?
- What should happen when saving fails?

### Data model

- What entities are needed?
- What fields are required?
- What fields are optional?
- What relationships exist between entities?
- What data should be stored?
- What data should be calculated instead of stored?

### Storage

- Where should the data live now?
- Which storage adapter should be used?
- Are there existing keys or legacy data?
- Is migration needed?
- Could this data be sensitive or important?
- What must never be lost?

### Repository/service

- Which repository owns the data?
- Which service owns the business rules?
- Should React components call a hook/service instead of storage directly?
- Is this feature ready for future IndexedDB or backend storage?

### Forms/buttons

- Does this feature need forms?
- What is the submit path?
- How is validation handled?
- What happens while saving?
- What happens on success?
- What happens on error?
- How do we prevent duplicate submit?
- Can the button ever fail silently?

### Validation

- Is a schema needed?
- Should data be validated on form submit?
- Should stored/imported data be validated when read?
- What invalid data must be rejected?

### i18n

- Are all visible UI texts translated?
- Which namespace should be used?
- Is there hardcoded text?
- What is the fallback behavior?

### Routing

- Does this feature need a route?
- Should it be lazy-loaded?
- Does it belong inside an existing domain or a new domain?
- How does it connect to navigation?

### Shared UI

- Can existing shared components be reused?
- Is a new shared component needed?
- Are we duplicating buttons, cards, modals, empty states, or inputs?

### Error/loading/empty states

- What does the user see while loading?
- What does the user see when there is no data?
- What does the user see when something fails?
- Can the user recover from the error?

### Backup/export

- Does this feature create important user data?
- Should this data be included in export?
- Should import validate this data?
- Is backup needed before migration?

### Future migration

- Can this feature move from localStorage to IndexedDB later?
- Can this feature move to backend API later?
- Is UI coupled too tightly to storage?
- Are repositories acting as stable boundaries?

## 7. Feature lifecycle

The preferred lifecycle for every serious feature is:

1. Product definition
2. Data model
3. Storage strategy
4. Repository/service boundary
5. Validation
6. i18n
7. Routing/module boundary
8. Shared UI needs
9. Form/button behavior
10. Error/loading/empty states
11. Backup/export impact
12. Future migration impact
13. UI implementation
14. Testing/review
15. Release or next iteration

The UI should come after the foundation decisions, not before them. When the foundation is clear, screens become simpler, safer, and easier to change.

## 8. Layered architecture rule

The preferred feature flow is:

```text
React Component
-> Hook
-> Service
-> Repository
-> Storage Adapter
```

### React Component

- Displays UI.
- Collects user input.
- Calls hooks/actions.
- Should not directly use localStorage.
- Should not contain migration logic.
- Should not contain large business logic.

### Hook

- Connects React UI to feature behavior.
- Manages UI state such as loading, saving, error, and success.
- Calls services.

### Service

- Contains business/product rules.
- Decides what should happen.
- Validates workflows.
- Calls repositories.

### Repository

- Owns data access for one domain.
- Reads and writes data through the storage adapter.
- Hides storage details from the rest of the app.

### Storage Adapter

- Talks to localStorage now.
- Can be replaced by IndexedDB or a backend later.
- Handles storage errors consistently.

## 9. Data model foundation

- Define data models before UI implementation.
- Prefer clear canonical entities.
- Avoid duplicated data structures.
- Avoid storing derived values when they can be calculated.
- Every persisted entity should normally include `id`, `createdAt`, and `updatedAt`.
- Add `status`, `type`, `category`, or relationship ids only when needed.
- Keep future workspace/user support in mind, but do not overbuild it early.

Data models should describe the durable shape of the product, not only the fields a current screen happens to need.

## 10. Storage foundation

- No React component should directly call `localStorage`.
- No form should directly save to `localStorage`.
- All persistence should go through repositories and storage adapters.
- Storage keys should be centralized.
- Stored data should be versioned when appropriate.
- Migration helpers should exist before changing stored data shape.
- Never delete or overwrite user data accidentally.
- Never auto-save mock/sample data into real user storage.
- Storage errors must be visible to the user or safely handled.

Storage must be treated as a user-data safety boundary. Convenience should never be more important than preserving user-created information.

## 11. Repository and service foundation

- Each domain should have its own repository when it owns persistent data.
- Services should contain business logic and workflow rules.
- UI should not decide persistence rules.
- Repositories should make future storage migration easier.
- Keep repositories small and predictable.

Repositories answer how data is accessed. Services answer what the product should do. Components answer how the user sees and triggers that behavior.

## 12. Forms and buttons foundation

All forms and save buttons must follow one stable pattern.

Every form should support:

- `onSubmit` as the main save path
- validation before save
- loading/saving state
- disabled submit button while saving
- `try/catch` around save actions
- clear error message
- clear success feedback
- no duplicate submit
- no silent failure
- no direct storage writes from the form

Buttons should not be fixed one by one. The project should use shared button and form primitives so behavior is consistent across the app.

Recommended shared primitives:

- `shared/ui/Button`
- `shared/ui/Input`
- `shared/ui/Select`
- `shared/ui/Textarea`
- `shared/forms/useAppForm`
- `shared/forms/FormError`
- `shared/forms/FormActions`

## 13. Validation foundation

- Important data should have schemas.
- Validation should happen before saving.
- Imported data should be validated before entering storage.
- Migration data should be validated.
- Invalid objects should not be silently stored.
- Use a schema validator only when justified.
- Zod or a similar TypeScript schema validator may be used if appropriate.

Validation should protect both the user and the application. It should catch invalid input at form boundaries and invalid stored/imported data at persistence boundaries.

## 14. i18n foundation

- No hardcoded visible UI text.
- All UI text should go through the language system.
- Use namespaces by feature/domain.
- Provide fallback behavior.
- Keep language separate from currency/date formatting when possible.
- Adding more languages later should not require rewriting components.

i18n should be treated as part of feature architecture, not a cleanup step after UI work. A component is not complete if visible text is hardcoded outside the language system.

## 15. Routing and module foundation

- Routes should follow product domains.
- Large modules should be lazy-loaded when useful.
- Dashboard should not load every heavy feature upfront.
- A route should not depend on unrelated modules to work.
- Module boundaries should be clear.

Routing should reveal the product structure. It should not create hidden coupling between unrelated domains.

## 16. Shared UI foundation

- Reuse shared UI components.
- Avoid creating many different button/input/modal/card patterns.
- Shared UI should be stable, accessible, and predictable.
- New shared components should be created only when multiple features need the same pattern.
- Do not redesign the app every time a feature is added.

Recommended shared UI:

- `Button`
- `IconButton`
- `Input`
- `Select`
- `Textarea`
- `Card`
- `Modal`
- `PageHeader`
- `EmptyState`
- `StatusBadge`
- `Tabs`
- `Table`
- `ConfirmDialog`
- `Toast` / notification pattern

Shared UI exists to make the product feel coherent and to keep behavior consistent. It should reduce duplication without forcing premature abstraction.

## 17. Performance foundation

Performance should be considered before implementation, but without premature optimization.

Before implementing performance-sensitive work, ask:

- Will this feature load unnecessary data?
- Can this module be lazy-loaded?
- Will this cause unnecessary rerenders?
- Are derived values recalculated too often?
- Can this list/table grow large?
- Should expensive calculations be memoized?
- Does Dashboard load only what it needs?
- Can this feature degrade as user data grows?

Rules:

- Avoid obvious scalability problems early.
- Do not optimize without reason.
- Prefer clean data flow before micro-optimizations.

Good performance starts with clear ownership, limited data loading, predictable rendering, and avoiding unnecessary work.

## 18. Error, loading, and empty state foundation

Every important feature should define:

- idle state
- loading state
- saving state
- success state
- error state
- empty state
- disabled state

The app must never fail silently. If an action fails, the user should know what happened. If there is no data, the user should receive a useful empty state. If an action is in progress, the UI should show it.

State handling should be designed before implementation, especially for forms, imports, migrations, and anything that writes user data.

## 19. Backup, export, and import foundation

- Any important user-created data should be exportable.
- Export should include version information.
- Import should validate data before saving.
- Backup should exist before destructive migrations.
- Migration should never destroy user data without a safe fallback.
- Export/import should be considered part of the storage foundation, not an afterthought.

Backup and export are part of user trust. If the app stores meaningful personal data, it must provide a path to preserve, move, and recover that data.

## 20. Security and data safety

- Protect user-created data above everything else.
- Never delete or overwrite user data without a safe path.
- Validate imported or external data.
- Never trust external data blindly.
- Prefer safe failure over silent corruption.
- Do not expose private user data in logs or UI by accident.
- Storage, import/export, migration, and backup are user trust boundaries.

Security and data safety are not only backend concerns. Local storage, browser state, import files, logs, migration helpers, and UI error displays can all expose or corrupt important user data if handled carelessly.

## 21. Future migration foundation

The app should be designed so storage can evolve:

```text
localStorage -> IndexedDB -> backend API
```

To support this:

- keep UI away from storage details
- use repositories as boundaries
- use storage adapters
- validate data at boundaries
- avoid hardcoded storage keys inside components
- avoid coupling features to one storage technology
- do not implement backend too early
- do not implement IndexedDB too early unless needed

Future migration readiness does not mean overbuilding now. It means keeping the boundaries clean enough that migration remains possible later.

## 22. Legacy/reference code rule

If a legacy/static website or old implementation exists:

- Treat it as read-only reference.
- Use it to understand behavior, flows, and data shape.
- Do not copy old architecture blindly.
- Do not copy `window.*` communication.
- Do not copy direct DOM manipulation.
- Do not copy duplicated storage keys.
- Do not copy automatic sample/mock data writes.
- Do not copy hardcoded UI text.
- Rebuild features using the new foundation layers.

Legacy code can explain what the product used to do. It should not define the architecture of the React app.

## 23. Architecture review rule

Large or risky changes should start with architecture analysis. Implementation should not start until the plan is clear.

The architecture review should identify:

- affected modules
- risks
- data impact
- storage impact
- i18n impact
- migration concerns

Implementation should be done in small approved steps, and review should happen after implementation.

Preferred workflow:

```text
Architectural plan -> Risk review -> Small implementation step -> Post-change review
```

This keeps large changes understandable and reduces the chance of damaging existing behavior or user data.

## 24. Testing philosophy

Every meaningful feature should be tested or manually checked through key paths.

Check at least:

- happy path
- validation path
- error path
- empty state
- loading/saving state
- recovery path
- refresh/persistence check
- import/export check if relevant

Testing does not only mean automated tests. For this project, every feature should at least have a manual smoke test checklist that confirms the important user paths still work.

## 25. Codex working rules

Before implementing a feature:

- Read this document.
- Identify which foundations are affected.
- Do not jump directly into UI if data/storage/forms/validation are unclear.
- Ask for a plan or create a plan first for risky changes.
- Keep changes small and reviewable.
- Do not change unrelated modules.
- After implementation, list changed files and explain why.

For large or risky changes:

- Use architecture analysis first.
- Implement only the approved first step.
- Review after implementation.

Codex should preserve existing functionality, protect local user data, respect the i18n system, and avoid broad rewrites unless an approved plan requires them.

## 26. Project mantra

The goal of this project is not to build screens.

The goal is to build a stable platform where screens become simple.

Foundation first.
Architecture before implementation.
Data before UI.
Consistency before speed.
Small reviewable steps before large rewrites.
Protect user data above everything else.

## 27. Definition of ready

A feature is ready for UI implementation only when:

- data model is defined
- storage path is clear
- repository/service boundary is clear
- forms/buttons behavior is clear if forms are involved
- validation is defined or intentionally deferred
- i18n namespace is known
- route/module boundary is clear
- shared UI components are identified
- error/loading/empty states are planned
- backup/export impact is checked
- future migration risk is considered

If these foundations are unclear, the next step should be analysis or planning, not screen-building.

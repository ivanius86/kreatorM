# Mentor App Codex Agent Routing

This file defines project-wide Codex behavior for the Mentor app and explains when to use each project-specific agent.

## Project Context

The Mentor app is a half-built React mentor and personal operating system. It includes or will include:

- Dashboard
- Ideas
- Research
- Idea testing
- Financial comparison
- Compass / direction evaluation
- Personal finance
- Language / i18n system
- Local storage now
- Possible IndexedDB later
- Future backend migration

Long-term, the app should grow into a scalable personal life operating system and mentor platform. Architecture must stay modular, maintainable, safe for user data, and easy to migrate later.

## Core Project Rules

- Preserve existing functionality.
- Do not remove working features.
- Do not introduce mock data unless explicitly requested.
- Do not hardcode UI text outside the language/i18n system.
- Prefer small, reviewable changes.
- For large or risky changes, analyze first and create a plan before editing.
- Always list changed files after implementation.
- Protect local user data and storage.
- Keep future IndexedDB/backend migration in mind.
- Preserve the current visual theme unless explicitly asked to redesign.
- Do not rewrite unrelated modules.
- Do not make broad architecture changes without a plan.

## Agent Routing Rules

Choose one main agent based on the task type. Do not call multiple agents by default.

### Use mentor-architect

Use `mentor-architect` when the task mentions or affects:

- architecture
- app structure
- module structure
- routing
- providers
- state management
- scalability
- backend migration
- major refactor
- module boundaries
- "best architecture"
- "how should this be structured"
- "before coding, analyze"
- finance module structure
- idea/research/test module structure

### Use mentor-ui-ux

Use `mentor-ui-ux` when the task mentions or affects:

- UI
- UX
- layout
- design
- screen
- page
- panel
- dashboard
- form
- button appearance
- empty state
- wording
- visual hierarchy
- spacing
- responsive design
- mentor-like tone
- user flow

### Use mentor-data-storage

Use `mentor-data-storage` when the task mentions or affects:

- localStorage
- IndexedDB
- database
- JSON
- import/export
- persistence
- saved data
- migration
- data model
- storage layer
- offline data
- data safety
- future backend compatibility

### Use mentor-i18n

Use `mentor-i18n` when the task mentions or affects:

- language
- Serbian
- English
- translation
- i18n
- language provider
- locale
- fallback language
- hardcoded text
- text keys
- UI copy centralization

### Use mentor-reviewer

Use `mentor-reviewer` when:

- changes were already made
- the user asks to check/review/verify
- there may be bugs or regressions
- the task says "did Codex break something"
- the task says "check last changes"
- the task involves code quality, duplicated logic, mock data, broken flows, or i18n issues

### Use mentor-implementation

Use `mentor-implementation` when:

- there is already an approved plan
- the user asks to implement a specific step
- the task is clear, small, and bounded
- the task says "implement only step X"
- the task says "apply this approved plan"

## When Not To Use Subagents

Do not use subagents for very small tasks such as:

- changing one button label
- changing one text string
- changing one color
- fixing a typo
- small CSS spacing
- adding one simple UI element
- simple copy changes

For small tasks, Codex should handle the task directly unless the user explicitly asks to use an agent.

## Multi-Agent Rules

Do not call multiple agents by default.

Use only one main agent per task unless the task is large or risky.

For large tasks, use this safe workflow:

1. `mentor-architect` analyzes and creates a plan.
2. `mentor-reviewer` reviews the plan and identifies risks.
3. `mentor-implementation` implements only the approved first step.
4. `mentor-reviewer` reviews the final changes.

Never allow multiple agents to edit source code at the same time.

## Required Response Formats

### Analysis Agents

Use this format for architecture, UI/UX, data/storage, and i18n analysis when no implementation is being performed:

- Summary
- Risks
- Affected files/folders
- Recommended next steps
- What should be done now
- What can wait

### Implementation Agent

Use this format after implementation:

- What was changed
- Files changed
- Why each change was made
- How to test/check it
- Any risks or follow-up needed

### Reviewer Agent

Use this format for review:

- Issues found
- Severity: low / medium / high
- Affected files
- Suggested fix
- Whether the code is safe to continue

## Agent Examples

- `mentor-architect`: "Before coding, analyze the best architecture for splitting the finance module."
- `mentor-implementation`: "Apply the approved plan and implement only step 1."
- `mentor-reviewer`: "Review the last changes and check whether anything broke."
- `mentor-ui-ux`: "Improve the dashboard empty state and spacing without redesigning the whole app."
- `mentor-data-storage`: "Plan how saved ideas should migrate from localStorage to IndexedDB."
- `mentor-i18n`: "Find hardcoded English and Serbian UI text and propose translation keys."

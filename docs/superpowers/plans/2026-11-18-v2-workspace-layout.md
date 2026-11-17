# V2 workspace layout implementation plan

> Execute inline with executing-plans; the user approved this design and requested autonomous self-review.

**Goal:** Apply the reference's workspace proportions while preserving existing functionality.
**Architecture:** Retain providers, hooks and routes. Refine V2 shell styling in a dedicated workspace stylesheet; reorganize task row presentation and move the existing create trigger into TaskToolbar.
**Tech stack:** React, TypeScript, CSS, Vitest, Playwright, pnpm.
**Spec:** docs/superpowers/specs/2026-11-18-v2-workspace-layout.md

## Constraints

No dependencies, backend changes, new features or routes. Preserve prior uncommitted V2 polish. Keep all existing translation keys and add only column labels if required. Use pnpm from the matching package.

## Task 1: Reference proportions and task layout

Files: `frontend/e2e/v2-workspace-layout.spec.ts`, `frontend/src/features/v2/components/{V2Sidebar,V2Topbar,TaskToolbar,TaskRow,TaskCollection}.tsx`, `frontend/src/features/v2/pages/DashboardPage.tsx`, `frontend/src/features/v2/layouts/V2Layout.tsx`, `frontend/src/features/v2/styles/workspace.css`.

- [x] Add browser regressions: sidebar width 220–240; icon/label horizontal; toolbar contains create/search/filter; desktop row <=88px and columns align; mobile navigation still works; both themes have no page overflow; docking remains contained.
- [x] Run them before code and confirm expected layout failures.
- [x] Use existing `onCreate: () => void` callback to move the create trigger into TaskToolbar. Leave service calls, dialogs and mutations unchanged.
- [x] Reorganize TaskRow into title/context, status, priority, due and action groups. Keep `role=listitem`, existing accessible button names and inline error handling.
- [x] Add a desktop column heading row in TaskCollection using existing localized labels; hide it on small screens.
- [x] Implement 232px sidebar with horizontal links, bottom sign-out; compact topbar and statistics-first layout; responsive task rows and dock breakpoint using CSS container queries.
- [x] Rerun browser regressions and inspect rendered screenshots, including long names, dialogs and Agents.

## Task 2: Review and verification

- [x] Run existing V2 and liquid-glass functional Playwright suites; production smoke checks after build.
- [x] Run frontend `pnpm exec vitest run --maxWorkers=2`, `pnpm run lint`, changed-file `pnpm exec prettier --check`, `pnpm run build`.
- [x] Run backend `pnpm run build` and `pnpm exec vitest run --maxWorkers=2`.
- [x] Open screenshots for desktop/mobile; test navigation, search/filter, editing, theme/language and chat as a user; fix observed issues.
- [x] Record final command results, warnings and verification limitations in a review note with screenshots. Do not commit or publish unless asked.

## Review adjustments

- Added an existing assistant launcher label in the desktop sidebar; its action and session behavior remain unchanged.
- Added the localized Status column label in English and Vietnamese.
- Refined 320px pagination and stacked filter/create controls so labels remain readable.
- Updated `frontend/e2e/frontend-v2.fixture.ts` to use the actual PUT method for start/finish; replaced a conditional text-prefix selector with a required semantic row assertion in `frontend/e2e/frontend-v2.spec.ts`.
- Updated `frontend/e2e/agent-workspace.fixture.ts` to persist replies across the client's history refresh. Wait for initial conversation hydration before entering a draft in the new journey tests.
- Final evidence: 45 UI checks + 3 production checks; 494 frontend unit tests; 539 backend unit tests, 97 configured skips.

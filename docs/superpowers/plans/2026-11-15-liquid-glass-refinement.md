# Liquid Glass refinement — Implementation plan

**Spec:** [Approved refinement specification](../specs/2026-11-15-liquid-glass-refinement.md).

**Execution:** The user authorized the document author to implement after completing these documents. Work on the existing `feat/fe-liquid-glass` branch, preserving the supplied uncommitted foundation. Snapshot affected files before edits. This is a tightly coupled refinement executed inline with test-first verification.

## Constraints and interfaces

Retain the foundation's shared providers/API hooks and URL-first version switching. No backend changes or new dependencies. All source and styles remain under `frontend/src/features/v2`, except EN/VI locale additions and corresponding tests. Remove V1 handoffs and update tests whose expectations were explicitly superseded; do not weaken unrelated regressions.

New `components/TaskEditor.tsx`: props `{ task?: Task; onSaved: () => void; onCancel: () => void }`. It renders the V2 dialog and owns draft, mutations, validation, dirty-close handling and choice queries. Create from DashboardPage; edit replaces read-only content inside TaskDetailsDialog without stacking dialogs. Preserve the task detail URL when exiting edit mode.

## Task 1 — Test and document the new behavior

- [x] Add `test/TaskEditor.test.tsx` using real Query hooks with service-boundary mocks. Assert create payload, title validation, edit date/project clearing, failure retains input, duplicate save prevention and dirty cancellation.
- [x] Update `test/V2Layout.test.tsx` and `test/TaskDetailsDialog.test.tsx` to require no V1 menu/edit links and native edit controls. Add browser tests for native create/edit and grid/floating layout.
- [x] Run new tests and confirm failures specifically reflect missing behavior before editing production files.

Commands from frontend: `pnpm exec vitest run src/features/v2/test` and targeted Playwright refinement tests.

## Task 2 — Implement independent task workflows

- [x] Build TaskEditor with existing category/project queries and create/update mutations; add EN/VI labels to `shared/i18n/locales/{en,vi}/v2.json`.
- [x] Build payloads from changed edit fields only. Preserve IDs and status; use existing `shared/utils/dateTime.js` conversion; category default and nullable fields follow the spec.
- [x] Integrate New task in DashboardPage and TaskCollection empty state, Edit in TaskDetailsDialog. Remove all ordinary cross-version links from V2Sidebar and V2NotFoundPage; keep VersionSwitcher.
- [x] Stabilize dialog callbacks/focus cleanup if necessary so editing input does not repeatedly reset focus. Keep pending/dirty cancellation protected for Escape, backdrop and close button.
- [x] Run targeted tests to green and inspect the diff for duplicate data logic.

## Task 3 — Refine the visual system

- [x] Update `styles/tokens.css` and `styles/v2.css` with separate shell/content glass fills, 48px grid, ambient light, inset shell surfaces, directional highlights and dark-mode counterparts.
- [x] Update V2Sidebar/V2Topbar, DashboardSummary, TaskRow and TaskCollection to produce a compact rail, editorial task heading, summary band and coherent task surface. Keep rows readable and avoid per-row backdrop filters.
- [x] Add form styles, 44px controls, accessible status colors and dialog stacking. Scope all CSS and preserve opaque/reduced-motion/transparency/forced-color fallbacks.
- [x] Run browser workflow tests; capture 360/768/1440 light/dark and inspect the actual images. Correct clipping, weak material or contrast before completion.

## Task 4 — Regression and acceptance

- [x] Run frontend `pnpm test`, `pnpm run lint`, changed-file Prettier and `pnpm run format:check`, then `pnpm run build`.
- [x] Run relevant existing V2/V1 Playwright regression and new refinement scenarios; report any environment/fixture failures accurately.
- [x] Run backend `pnpm test` and `pnpm run build` per repository minimum verification.
- [x] Save actual commands/results/screenshots and R1–R6 status in `docs/superpowers/reviews/2026-11-15-liquid-glass-refinement.md`. Do not claim real-backend persistence if only mocked tests ran.

Illustrative behavioral assertions for the new workflow:

```tsx
await user.click(screen.getByRole("button", { name: "New task" }));
await user.type(screen.getByLabelText("Title"), "Plan the release");
await user.click(screen.getByRole("button", { name: "Create task" }));
// Service receives trimmed title and domain values, never a V1 navigation.
// Closing a changed form exposes Keep editing / Discard changes.
```

This plan supersedes the original foundation plan's V1 handoff UI and read-only task limitation. Other original routing/session requirements remain in force.

## Follow-up material and regression corrections

- [x] Apply the user's component-specific material table: topbar edge/multiple shadows, transparent sidebar with refractive-looking rim, gradient stats/inner highlights, lower-blur task surface, and specular button hover.
- [x] Verify actual screenshots after this pass; test reduced motion and opaque fallback against the component overrides.
- [x] Add history-navigation regression: dirty Back must ask for discard; pending save must cancel navigation without replaying it after save. Add unload protection for dirty/pending drafts.
- [x] Fix foundation switcher overflow in V1 at 320/390px using two-row mobile topbar and coordinated content offset, preserving all controls. Run existing V1 language/dashboard/theme tests to verify.

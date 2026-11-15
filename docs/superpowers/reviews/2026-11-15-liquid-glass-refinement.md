# Liquid Glass refinement — Implementation evidence

Date: 2026-11-15. Branch: `feat/fe-liquid-glass`.

Implemented on top of the existing uncommitted V2 foundation. No backend code or dependencies changed. The supplied foundation changes remain in the working tree; the diff against HEAD includes those earlier changes and must not be attributed entirely to this refinement.

## Delivered

- Static 48px grid with quiet mint/blue light fields, floating glass rail and topbar, translucent graded statistics, and a unified readable task surface.
- Applied the user's component material table: upper-edge topbar reflection and layered shadows, transparent sidebar with CSS refractive-looking rim, gradient/inner-highlight statistic cards, lower-blur elevated task panel, and specular button hover.
- Removed ordinary V1 navigation badges and management/edit links. Dashboard is the only implemented navigation destination; the shared switcher remains. Infrastructure load-failure recovery retains its emergency HTML link.
- Native V2 create/edit forms using the existing queries, mutations, validation constraints and invalidation. Preserved assignments/status, explicit nullable date/project clearing, duplicate-save prevention, draft retention on failure and refetch, dirty discard, history-navigation guard and unload protection.
- Corrected V2 dialog focus resets, inert background handling, stacking and focus restoration.
- Corrected the foundation V1 switcher's mobile overflow with a two-row header and coordinated content offset. Existing controls remain available; unrelated V1 styling was preserved.
- Updated English spec/plan and supersession notices. Existing review documentation received formatting only.

## Test-first evidence

- Before navigation edits, the updated V2Layout and TaskDetailsDialog tests failed on the old V1 destinations: 2 failing / 10 passing tests.
- TaskEditor initially failed its first 7 behavior tests before implementation. Its final 13 tests cover payloads, nullable clearing, preserved references, failures, choice retry, dirty/pending/history/unload behavior and draft preservation.
- The browser Back test initially failed because the editor disappeared. It now passes with an explicit discard decision.
- Existing V1 language tests exposed header overflow at 320px and 390px; both passed after the narrow header correction.
- Independent source review found the history-navigation gap; scoped re-review found no remaining important defects after correction.

## Final verification

All frontend commands below ran from `frontend/`; backend commands ran from `backend/`.

| Command                                   | Result                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Frontend `pnpm test`                      | PASS: 92 files, 461 tests.                                                                 |
| Frontend `pnpm run lint`                  | PASS, exit 0.                                                                              |
| Changed-file `pnpm exec prettier --check` | PASS. Exact absolute-path argument list is recorded in `/tmp/refinement-format-files.txt`. |
| Frontend `pnpm run format:check`          | FAIL on 10 untouched files listed below; no claim of a passing whole-tree format check.    |
| Frontend `pnpm run build`                 | PASS, includes `tsc -b`; existing large-chunk advisory remains.                            |
| Backend `pnpm test`                       | Initial default-concurrency run: 530 passed, 2 import-time timeouts, 97 skipped.           |
| Backend `pnpm test --maxWorkers=2`        | PASS: 62 files, 532 tests; 10 files / 97 tests skipped by the existing suite.              |
| Backend `pnpm run build`                  | PASS, `tsc --noEmit`.                                                                      |
| `git diff --check`                        | PASS.                                                                                      |

Final browser regression command:

```bash
pnpm exec playwright test e2e/frontend-v2.spec.ts e2e/frontend-v2-visual.spec.ts e2e/liquid-glass-refinement.spec.ts e2e/app.spec.ts e2e/dashboard.spec.ts e2e/theme.spec.ts e2e/language.spec.ts --workers=2
```

Result: **44 passed**. Includes V1/V2 navigation, direct entry, authentication return, task lifecycle, native create/edit, dirty history navigation, keyboard focus, mobile overflow, light/dark, localization and existing V1 dashboard/theme/language flows.

Production build smoke:

```bash
pnpm exec playwright test --config playwright.v2-production.config.ts
```

Result: **3 passed**: cold dashboard entry, unknown V2 route, and recovery from a failed V2 chunk. This uses Vite preview and mocked API responses, not deployed Nginx or live backend persistence.

### Remaining warnings and unverified scope

- Whole-tree Prettier reports existing formatting differences in `pnpm-lock.yaml`, `src/features/agent/skills/test/SkillEditorPage.test.tsx`, `SkillReadBadge.test.tsx`, `SkillsPage.test.tsx`, `src/features/calendar/calendar.css`, `src/features/tasks/hooks/afterTaskUncovered.js`, `taskStatusTransitions.ts`, `useTaskStatusEffect.js`, `useTransitionTasks.js`, and `src/styles/index.css`. These were not reformatted as part of this change.
- Frontend unit output includes jsdom's existing unsupported full-navigation message. The suite completes successfully; actual browser navigation is covered by Playwright.
- Vite reports chunks over 500 kB, including existing Agent/diagram dependencies. No bundle-size claim is made.
- Default-concurrency backend tests timed out importing app modules while other suites ran. Limiting to two workers passes without code changes or increased timeouts.
- No production deploy, real-account writes, or live MongoDB persistence smoke was performed. The entire unrelated E2E suite was not run; the seven named relevant browser suites were.
- Contrast was visually reviewed on the captured surfaces; no automated WCAG certification or physical refraction simulation is claimed. Native browser zoom at 200% and separate browser-engine testing remain unverified.

## Visual evidence

Local artifacts generated by Playwright and inspected during implementation:

- [Light desktop](/tmp/liquid-glass-light-1440.png)
- [Dark desktop](/tmp/liquid-glass-dark-1440.png)
- [Light mobile](/tmp/liquid-glass-light-360.png)
- [Dark mobile](/tmp/liquid-glass-dark-360.png)
- [Light tablet](/tmp/liquid-glass-light-768.png)
- [Dark tablet](/tmp/liquid-glass-dark-768.png)
- [Mobile task editor](/tmp/liquid-glass-editor-mobile.png)
- [Solid fallback](/tmp/liquid-glass-solid-fallback.png)

Full-page screenshots capture a viewport-fixed background; the grid's appearance below the original viewport in a stitched image is not a claim about its scrolling behavior. Reduced-motion and focus containment were exercised in the mobile editor test. Artifacts are local `/tmp` files and are not committed assets.

## Refinement acceptance mapping

| ID  | Evidence/status                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Implemented; light/dark screenshots show grid, floating surfaces, reflection and material hierarchy.                                            |
| R2  | Implemented; unit/browser assertions reject ordinary V1 destinations. Only switcher crosses versions during normal use.                         |
| R3  | Implemented; 13 editor tests plus browser create/edit and shared-refresh flow pass. Live persistence not independently verified.                |
| R4  | Implemented; failure/dirty/history/pending/assignment/null-date coverage passes.                                                                |
| R5  | Responsive/focus/theme/localization/reduced-motion and solid-fallback checks pass; 200% browser zoom and cross-engine checks remain unverified. |
| R6  | Relevant V1/V2 regression, unit tests, lint and builds pass. Whole-tree formatting and existing warnings are reported above.                    |

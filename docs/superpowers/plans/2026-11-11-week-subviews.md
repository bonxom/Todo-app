# Week subviews and usability implementation plan

**Spec:** `docs/superpowers/specs/2026-11-11-week-timeline.md`, revision section.
**Goal:** Offer Detailed/Compact Week subviews and validate their usability in the browser.
**Architecture:** CalendarGrid owns subview/interval state and a timeline viewport ref. Detailed renders WeekTimeline; Compact reuses the original DayCell grid. Keep existing API and due-date semantics.

- [x] Add failing CalendarGrid tests for both mode buttons, default Detailed, Compact's seven day cells/preview cap, conditional interval control, preservation across Month, and no date/mutation callbacks when changing modes. Run focused Vitest to confirm red.
- [x] Add failing timelineLayout test for startDate on a future day with earlier clock hours; render this as a deadline marker. Keep all existing tests.
- [x] Implement CalendarGrid secondary toolbar, state, conditional WeekTimeline, selected-day scroll dependency and i18n labels. Keep Month markup intact and localize weekday labels in Compact.
- [x] Improve WeekTimeline scoped CSS: muted hour/half-hour lines using existing variables, sticky local-time corner/header, wider mobile columns, grouped sticky title/time, compact marker titles/tooltips, focus rings. Forward onTaskUpdated to details. Add viewport ref restoring 08:00 initial time and preserving minute across zoom/subview changes.
- [x] Extend calendar browser tests for mode round trips, zoom scroll anchoring, horizontal sticky gutter, compact selection/detail/drag, narrow 320/390 widths, Vietnamese text and dark theme. Use realistic timed and overlapping tasks as well as the existing long-task fixture; capture screenshots and inspect them.
- [x] Run frontend tests, `pnpm exec playwright test e2e/calendar.spec.ts --workers=2`, lint, changed-file Prettier, build/typecheck; backend build and tests. Inspect screenshots and final diff. Record results and remaining limitations.

No commit, push, or deployment requested. Existing uncommitted timeline work must be retained.

## Verification and visual review

Browser checks use the real frontend in Chromium with mocked API fixture data, including timed appointments, overlaps, due-only tasks and long tasks. No live account data was changed. Ten browser scenarios passed, covering both subviews, Month round trips, 15/30/60-minute zoom anchoring (allowing pixel rounding), task dialogs, date navigation, completion/rejection, move and Ctrl-drag copy, light/dark, Vietnamese/English and widths from 320px to desktop. Screenshot review led to softer grid lines, a sticky local-time corner, wider mobile columns, readable time/title wrapping, localized swipe guidance and scroll offsets accounting for the app header.

Screenshots are generated under `frontend/artifacts/`: `calendar-review-detailed-desktop.png`, `calendar-review-compact-desktop.png`, `calendar-review-detailed-dark.png`, `calendar-review-compact-dark.png`, `calendar-review-detailed-mobile.png`, `calendar-review-compact-mobile.png`, `calendar-review-mobile-scrolled.png`, and the two `calendar-review-vietnamese-320-*.png` views.

Final commands (run from the named package):

- Frontend: `pnpm test` — 353 passed.
- Frontend: `pnpm exec playwright test e2e/calendar.spec.ts --workers=2` — 10 passed.
- Frontend: `pnpm run lint`.
- Frontend: `pnpm run build` (includes TypeScript checking).
- Frontend: `pnpm exec prettier --check src/features/calendar/components/CalendarGrid.jsx src/features/calendar/components/WeekTimeline.jsx src/features/calendar/components/timelineLayout.js src/features/calendar/components/test/CalendarGrid.test.jsx src/features/calendar/components/test/timelineLayout.test.js src/features/calendar/calendar.css src/shared/i18n/locales/en/workspace.json src/shared/i18n/locales/vi/workspace.json e2e/calendar.spec.ts ../docs/superpowers/specs/2026-11-11-week-timeline.md ../docs/superpowers/plans/2026-11-11-week-timeline.md ../docs/superpowers/plans/2026-11-11-week-subviews.md`.
- Backend: `pnpm run build`; `pnpm test` — 452 passed, 94 skipped by the suite. Skipped integration paths were not verified.
- Repository: `git diff --check`.

Warnings: Vite reports large bundle chunks; the frontend suite prints a jsdom navigation warning in unrelated tests. Playwright prints the environment's NO_COLOR/FORCE_COLOR warning. Browser verification is Chromium with fixture APIs, not live backend integration or physical touch-device testing. No commit or deployment performed.

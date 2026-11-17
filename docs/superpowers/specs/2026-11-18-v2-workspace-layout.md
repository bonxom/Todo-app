# V2 workspace layout

Approved direction: borrow the reference image's wide labeled sidebar, compact topbar, full-width content panels and dense rows. Keep Orbit's liquid glass palette and all existing functionality. This is a presentation refactor, with no new routes, API contracts or domain behavior.

## Acceptance criteria

- Desktop (>=1024px): 220–240px sidebar; icon and label share a horizontal row; brand above navigation and sign-out pinned below it. Preserve existing destinations and active-page semantics.
- Topbar: compact section indicator with existing date, language, theme and version controls. No promotional hero, global search, notifications or unsupported actions.
- Dashboard: the three existing statistics first, followed by a large tasks panel. Search, status filter and the existing New task action share the toolbar on desktop. No standalone action row above statistics.
- Desktop task rows align title/project/category, status, priority, due date and action into consistent columns. Full task names remain accessible; long content wraps without pushing other columns or overflowing.
- Small screens retain an accessible navigation dialog and stacked task cards with readable labels and >=44px primary action targets. No page overflow at 320px, 390px or tablet widths.
- Calendar and Agents keep existing functionality within the revised shell. Chat docking must not make task rows or topbar overflow on desktop.
- Preserve loading, empty, error, pagination, create/edit, status mutations, keyboard focus, reduced motion/transparency and V1 isolation.

## Non-goals

No SpecRooms, Tools, Admin, notifications, global search, new statistics or API changes. No typography slogans or added dashboard greetings. No backend changes.

## Verification

Playwright layout assertions and visual review on desktop/mobile in both themes; existing functional suites; frontend unit tests, lint, changed-file Prettier checks and build/typecheck; backend build and unit regressions. Browser API fixtures isolate UI checks; live MongoDB/AI and real iOS are outside this verification.

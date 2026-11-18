# Statistics v2 — Liquid Glass specification

Date: 2026-11-18. Status: design direction approved; specification prepared for review. Implementation has not started. User instruction: “ok viết spec và plan thôi”.

## Objective and scope

Deliver a real, data-backed `/v2/statistics` page inside the existing V2 shell so users can understand task completion, daily consistency, and workload distribution. Extend the visual system established by V2 Dashboard and Calendar. Preserve `/statistics` and its behavior.

In scope: summary, completion trend, 365-day activity heatmap with completed-task details, status/category breakdowns, route/navigation/version-switch integration, English/Vietnamese, light/dark, loading/error/empty states and automated verification.

Non-goals: backend/API/schema changes, new analytics endpoints, export, comparisons with previous periods, invented growth percentages, task mutations inside analytics, global date filters, persistent range preferences, new chart packages, and redesigning other V2 pages.

## Global constraints

- Use pnpm@11.21.0 only; frontend and backend remain separate packages.
- Use existing React 19, TypeScript, Chart.js, TanStack Query, Vitest and Playwright tooling; add no dependencies.
- Reuse existing stat queries, service and date helpers; do not change API contracts or query keys.
- Keep V1 Statistics components and CSS unchanged; scope new styling under `.v2-statistics` and `.v2-statistics-*`.
- Use V2 theme tokens and existing heading/body fonts; all new visible copy and accessible labels support English and Vietnamese.
- Follow Test -> Code -> Test -> Lint -> Format check -> Build/type-check after the spec and plan are approved for execution.

## Visual direction

Use the existing palette: mist `#e7efef`, ink `#213d43`, teal `#14675f`, muted `#526c72`, pale glass `#f2f8f7`; dark mode inherits existing V2 overrides. Do not duplicate these as fixed page colors. Reuse `--v2-font-heading` and `--v2-font-body`; use tabular numerals for metrics.

Glass panels have translucent fill, bright inner rim, restrained blur and soft shadow, using `GlassPanel` and V2 radius/shadow tokens. The signature is a continuous teal completion track in the overview, echoed by the trend and heatmap. Keep text and plotting surfaces readable; no animated ambient effects. Status meanings use labels as well as color.

```text
Statistics                              View tasks
[ All-time overview: total | completed | in progress ]
[ Completion track              pending · given up ]
[ Completion trend: range label, dates, 7/14/30/90 ]
[ Completed and given-up daily lines                 ]
[ Consistency: last 365 days + heatmap + day details  ]
[ Current task status           ][ Completed by category ]
```

Desktop uses two equal breakdown columns; below 900px they stack. Below 600px summary and controls wrap in reading order. At 360, 390, 768 and 1440px, the document has no horizontal overflow; only the labelled heatmap region may scroll horizontally. Panels and chart parents use `min-width: 0`. The assistant dock must not clip controls.

## Data and behavior contracts

### Data sources

- `useStatsQuery()` provides `Stat` from `GET /api/stats/` through the shared HTTP client.
- `useActivityQuery(selectedDateKey)` provides completed tasks through `GET /api/stats/completed-tasks?date=YYYY-MM-DD`. The existing service accepts both an array and `{ date, tasks }` response.
- Do not issue an activity request until a heatmap day is selected. Closing the details disables that selection; cached queries remain managed by TanStack Query. Fast day changes must never display the previous day's rows under the new date.
- Normalize daily data with `normalizeDailyStats`; use `getDateKeysInRange`, `getUtcTodayKey`, `shiftUtcDateKey`, `formatUtcDateLabel` and `createHeatmapModel` rather than introducing new date arithmetic.

### Overview and scope labels

Show total, completed and in-progress counts, plus pending/given-up counts and an accessible completion progressbar. Completion is `round(completedTasks / totalTasks * 100)`, or zero when total is zero, clamped to 0–100 for rendering. Format numbers with the current locale. Explicitly label overview and status distribution as all-time.

“View tasks” navigates to `/v2/dashboard`. It is a link, not a nonfunctional button.

### Trend range

Default to 30 UTC date keys ending today, inclusive. Presets are 7, 14, 30 and 90 days; selection updates both inputs, chart and range label, and uses `aria-pressed`. Custom dates apply only to the trend; overview, heatmap and category totals are unaffected.

Keep draft date inputs separate from the last valid applied range. Empty, impossible, reversed or future-ended ranges show a localized inline error and preserve the last valid chart. A valid edit applies immediately. Restore both fields and clear errors when selecting a preset. Range count is inclusive; a single-day range is valid. Bound custom range length to 366 days, with a localized error explaining the limit, to avoid unbounded chart generation. Use native min/max hints plus explicit validation.

Render completed and given-up daily counts, filling missing dates with zero when the dataset exists. An entirely empty daily dataset shows an empty trend message; an otherwise populated dataset with no entries in the range shows a zero series and explanatory no-activity text. No trend API request is added. Provide a labelled chart and an accessible textual summary of both range totals; canvas tooltips are supplementary. Respect reduced motion and update chart colors when theme changes.

### Heatmap and details

Reuse the existing helper's local-calendar window of 365 dates ending on local today; incoming daily keys retain their existing `YYYY-MM-DD` interpretation. Do not silently convert this window to UTC: the trend's UTC scope and heatmap's local scope follow existing behavior and receive timezone boundary tests.

Show total completed, active days, highest daily count and intensity legend. Padded out-of-range days are disabled. Every in-range day, including zero-count days, is a button labelled with full date and completion count. Click/Enter/Space toggles selection; selected day has `aria-pressed=true` and an inline panel with localized date, close control, and completed-task rows. Display title, category and project with translated fallbacks; rows are read-only. Close returns focus to the selected cell. Loading, empty and failure/retry states stay local to details, with live announcements. Preserve existing heatmap model behavior for duplicate daily keys and best-day ties.

### Breakdowns

Status distribution uses current pending, in-progress, completed and given-up counts. Category distribution aggregates `completedOfEachCategory` across all returned daily records, grouping by `categoryName` to match V1; label this scope as “Recorded completion history”, not all-time. The API does not guarantee that daily history covers the entire lifetime. Sort categories by count descending, then name for ties. Include positive values, percentage and count in legends. A zero total renders an empty message without invalid percentages or conic gradients. Many categories scroll within the legend; long names wrap. Do not infer category shares from overall completedTasks.

## Integration and states

Add a lazy `statistics` child route with `RouteLoadError`, Sidebar Statistics link and active state, and Statistics topbar title. Update `UI_ROUTES`, `isSupportedProtectedPath` and `getVersionDestination` for exact `/statistics` ↔ `/v2/statistics` mapping; unrelated version destinations keep existing behavior. Do not carry unused search/hash values across this mapping.

Initial loading: page heading remains visible and body uses labelled skeleton/status content. Initial failure: glass error panel with API error message, fallback copy and retry. Successful zero totals: render overview zeros, useful empty charts and heatmap. Background refresh failure with cached data: keep panels usable and show a nonblocking alert with retry. Retry disables while fetching. Do not treat undefined pending data as a successful empty result.

Use one h1, semantic sections/headings, labelled date inputs, visible keyboard focus, meaningful link/button names, `role=progressbar`, error alerts and polite loading announcements. Do not use ARIA grid unless complete grid keyboard behavior is implemented; heatmap buttons in a labelled region suffice. Blur has a solid readable fallback, and animation honors `prefers-reduced-motion`.

## Acceptance criteria and verification

| ID   | Testable outcome                                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC01 | Authenticated deep link, sidebar and topbar resolve Statistics; guests follow existing protected-route behavior.                                                                   |
| AC02 | Version switching maps exact Statistics routes in both directions without changing unrelated route behavior.                                                                       |
| AC03 | Fixture 128 total / 96 completed / 18 in progress / 10 pending / 4 given up shows 75% and correct counts; zero total shows 0%.                                                     |
| AC04 | Presets, single-day/custom range, missing days and inclusive boundaries produce correct trend labels/data/totals; invalid input preserves the applied chart and displays an error. |
| AC05 | Trend changes leave overview, category and 365-day heatmap scopes unchanged.                                                                                                       |
| AC06 | Heatmap shows exactly 365 selectable dates, correct aggregates, disabled padding, date/count labels, and mouse/keyboard selection with close-focus restoration.                    |
| AC07 | Activity query is selection-gated; loading/empty/error/retry, cached day switching and rapid switching show data for the selected date only.                                       |
| AC08 | Status and category totals/percentages, repeated category names, ties, long names, many categories and zero totals render correctly.                                               |
| AC09 | Initial loading/failure/retry, successful empty data and background failure with cached data behave as specified.                                                                  |
| AC10 | English/Vietnamese, light/dark, reduced motion and assistant dock work at 360/390/768/1440px with no document overflow.                                                            |
| AC11 | V1 Statistics remains unchanged; frontend tests/E2E/lint/format/build/type-check and backend minimum build/tests are recorded with exact results.                                  |

Use mocked service integration tests for data and interactions, pure model tests for range/aggregation edges, navigation unit tests for mappings, and Playwright for full route flows, themes/locales, keyboard and layout. Freeze time; explicitly cover UTC/local midnight boundary and year/leap-day windows. Screenshots require human inspection, not only successful file generation.

## Delivery boundary

This request produces the spec and implementation plan only. No implementation, dependency installation, application test run or application change is authorized by the current follow-up. Execution tasks remain unchecked until implementation is requested.

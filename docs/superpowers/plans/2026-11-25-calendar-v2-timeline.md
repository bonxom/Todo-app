# Calendar V2 Timeline Implementation Plan

## Goal

Add a scrollable, date-grouped **Timeline** view that starts today in Calendar V2.

## Architecture

Keep Timeline state and presentation in the V2 feature. Use a TanStack infinite query with one 14-day window per query page and exhaust REST pagination within each window. Calendar V2 owns mode selection and keeps its existing task detail and creation dialogs.

## Technology

React 19, TypeScript, TanStack Query, Tailwind CSS 4, i18next, Vitest, and Playwright.

[Calendar V2 Timeline design](../specs/2026-11-25-calendar-v2-timeline-design.md)

## Constraints

- Route scope is `/v2/calendar`. Keep the existing Week and Month behavior, Settings choices, REST contract, and authorization.
- Group valid deadlines using the browser's local dates. Fetch 14 days per window and up to 100 results per REST page.
- Show task actions through the existing detail dialog. Use V2 theme tokens and English and Vietnamese locale strings.
- Follow the [development workflow](../../workflow.md). Observe the new tests fail before changing application code, then run automated, browser, lint, format, and build checks.

## Task 1 — Date windows and paginated data

**Files**

- Add `frontend/src/features/v2/calendar/timelineData.ts` for date arithmetic, fetching a complete date window, and grouping.
- Add `frontend/src/features/v2/calendar/useTimelineTasks.ts` for the infinite query.
- Add `frontend/src/features/v2/test/timelineData.test.ts`.
- Update `frontend/src/features/tasks/api/taskKeys.ts` with the new key factory. Its only new caller is Calendar V2.

**Interfaces**

| Interface                                                                                        | Responsibility                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `getTimelineWindow(anchor: Date, offset: number): CalendarRange`                                 | Return local calendar bounds and their inclusive ISO equivalents for 14 dates starting at the given day offset.  |
| `loadTimelineWindow(anchor: Date, offset: number, signal: AbortSignal): Promise<TimelineWindow>` | Load all API pages for a window and keep only tasks with valid due dates within its bounds.                      |
| `TimelineWindow`                                                                                 | Hold `range: CalendarRange` and `tasks: Task[]`.                                                                 |
| `groupTimelineTasks(windows: readonly TimelineWindow[]): TimelineDay[]`                          | Deduplicate by task ID, then order by due instant and ID before grouping by local date.                          |
| `TimelineDay`                                                                                    | Hold `key: string`, `date: Date` at local midnight, and `tasks: Task[]`.                                         |
| `taskKeys.timeline(startIso: string)`                                                            | Return `[...taskKeys.all, "timeline", { startIso }]`.                                                            |
| `useTimelineTasks(anchor: Date)`                                                                 | Return TanStack query data and controls for `TimelineWindow` pages, with numeric day offsets as page parameters. |

- [ ] Add date-window tests. With a local anchor of November 25, 2026, assert that the first window ends December 8 at 23:59:59.999, the next starts December 9 at 00:00, and their ISO endpoints differ by one millisecond. With a March 7, 2026 anchor in `America/New_York`, assert that the next window begins March 21 at 00:00 local and that the UTC elapsed time between starts is 335 hours. Assert equivalent local day boundaries through December 31.
- [ ] Add fetch and grouping tests. Mock `taskService.getAllTasks` with 100 rows on page 1 and one row on page 2. Assert both requested page numbers, identical range and sort parameters, the forwarded abort signal, and all 101 rows. Assert a failure on page 2 rejects the entire window and a retry requests both pages. Supply out-of-order rows, same-instant rows, duplicate IDs, a due date outside its window, and missing or invalid dates. Assert the exact final groups and ID order, including completed and given-up tasks.
- [ ] Run the focused Vitest tests and record the failure caused by the missing Timeline data behavior.
- [ ] Implement the date helpers with `startOfDay`, `endOfDay`, and `addDays` from `calendarRanges.ts`. Use `taskService.getAllTasks` with `pageNo` starting at 1, `pageSize: 100`, and `sort: "dueDate:asc_createdAt:asc"`. Follow `pageInfo.totalPage` and forward the query abort signal on every request. Use local calendar dates for group keys. The final display tie-breaker is applied client-side because the REST sort parser treats an underscore as a sort-field separator.
- [ ] Implement the query with `initialPageParam: 0` and `getNextPageParam` advancing the previous offset by 14, including after an empty response. Put the query under `taskKeys.all` so normal task mutations invalidate it. Keep its infinite result separate from the existing array cache under `taskKeys.calendarRoot()`.
- [ ] Rerun the focused tests under the DST time zone and confirm they pass.

```sh
TZ=America/New_York pnpm exec vitest run src/features/v2/test/timelineData.test.ts
```

## Task 2 — Calendar V2 mode and continuation

**Files**

- Update `frontend/src/features/v2/pages/CalendarPage.tsx` for the third mode and integration with both existing dialogs.
- Add `frontend/src/features/v2/components/CalendarTimeline.tsx` for the date groups, task rows, and continuation UI.
- Update `frontend/src/shared/i18n/locales/en/v2.json` and `frontend/src/shared/i18n/locales/vi/v2.json`.
- Extend `frontend/src/features/v2/test/CalendarPage.test.tsx` and add `frontend/src/features/v2/test/CalendarTimeline.test.tsx`.
- Add `frontend/e2e/v2-calendar-timeline.spec.ts`. Layer task routes specific to this spec over `installV2Fixture` from `frontend/e2e/frontend-v2.fixture.ts`.

**Interfaces**

- `CalendarTimeline` accepts `anchorDate: Date` and `onOpenTask: (taskId: string) => void`. It consumes `useTimelineTasks` and renders only the Timeline panel.
- Calendar V2's local view type adds `"timeline"` beside the shared `CalendarViewMode`. Its existing selected period continues to serve Week and Month. Disable their query while Timeline is active. The existing task selection and creation state render the dialogs for all three modes.

- [ ] Extend the page tests. Navigate from the default Month view to the next month, select Timeline, and assert its anchor is today and period arrows are absent. Switch out and assert the month heading matches the browsed month. Assert **Today** targets the top of the list, preserves loaded windows on the same day, and moves the query anchor after the clock passes midnight.
- [ ] Add component tests with the real query, `renderWithProviders`, a mocked `taskService`, and a controllable `IntersectionObserver`. Assert that an initially visible sentinel needs the button, leaving and entering view schedules one load, and a concurrent button click schedules no additional request. Assert that a failed continuation keeps prior rows and retries the same interval, a failed background refresh retains rows and retries the loaded data, and an empty interval advances the next request without creating empty date groups. Assert that without the observer the button still works. Assert that an initial error has a working retry.
- [ ] Add Playwright tests against `/v2/calendar`, freezing the date and setting the browser time zone. Use API fixtures that filter ranges and honor pagination. Include valid 24-character task IDs for details. Verify the mode switch, a real scroll followed by appended rows, **Load more days** continuing through an empty interval, and **Today** returning to the top. Verify keyboard opening and closing with focus restoration, then create, reschedule, and update task status through the existing dialogs. Verify that `/calendar` lacks the Timeline control. Add the responsive checks below.
- [ ] Run the component and focused browser tests. Confirm failure caused by the missing Timeline mode and behavior.
- [ ] Add the selector and Timeline-specific toolbar behavior. Store the Timeline anchor separately from the Week and Month period. Initialize it from local today when entering Timeline. Keep the **Today** action visible and scroll the start of the Calendar content into view below the workspace header. Recompute the anchor on that action and leave its query key stable on the same local day.
- [ ] Render date-group headings, task rows, and scoped loading and error states. Use `getLocale()` with `Intl.DateTimeFormat` for date and time display. Add strings for **Timeline**, **Tomorrow**, **Load more days**, loading more days, failure to load more days, the localized group count, and the empty state with the last date checked. Reuse task status, priority, **Today**, and **Retry** strings. Use the workspace container width for the date marker breakpoint and the V2 tokens for both themes.
- [ ] Use a sentinel with one stable observer and track out-of-view to in-view transitions. Skip the initial in-view notification and avoid recreating the observer in response to fetch-state changes. Gate auto-load while any fetch is in progress or an error requires explicit retry. Route manual continuation and automatic continuation through `fetchNextPage({ cancelRefetch: false })`. Use `refetch()` for an initial or background-refresh failure and retry the next page for a continuation failure. Keep result rows mounted while fetching more.
- [ ] Rerun the focused tests and verify the existing Week, Month, day-panel, and resize regressions.

```sh
pnpm exec vitest run src/features/v2/test/CalendarPage.test.tsx src/features/v2/test/CalendarTimeline.test.tsx
pnpm run test:e2e v2-calendar-timeline.spec.ts calendar.spec.ts calendar-resize.spec.ts frontend-v2.spec.ts
```

## Task 3 — Verification

- [ ] Run the full frontend Vitest suite. Inspect Playwright screenshots at 360, 768, and 1440 px with light and dark themes and English and Vietnamese. Check date grouping, long titles, no horizontal overflow, and visible keyboard focus. At 1440 px, open the assistant dock and check that the date marker responds to the reduced content width and that the row remains reachable. Use the existing dock interaction in `e2e/v2-workspace-layout.spec.ts` as a reference.
- [ ] Run frontend lint and formatting checks, followed by the build and type-check. Run the repository baseline checks from the backend directory.
- [ ] Report the exact commands, Vitest and Playwright results, browser scenarios and screenshots inspected, and any verification gaps. Identify the fixture-backed browser runs.

From `frontend/`:

```sh
pnpm test
pnpm run test:e2e v2-calendar-timeline.spec.ts calendar.spec.ts calendar-resize.spec.ts frontend-v2.spec.ts
pnpm run lint
pnpm run format:check
pnpm run build
```

From `backend/`:

```sh
pnpm run build
pnpm test
```

# Implementation plan — V2 Calendar

Spec: [../specs/2026-11-15-v2-calendar-liquid-glass.md](../specs/2026-11-15-v2-calendar-liquid-glass.md)

| # | Task | Files |
| --- | --- | --- |
| C1 | Add calendar chrome keys (view labels, period navigation, day counts) | `locales/{en,vi}/v2.json` |
| C2 | Lazy `/v2/calendar` route | `features/v2/routes.tsx` |
| C3 | Sidebar `Calendar` entry + generic active detection; topbar title map | `components/V2Sidebar.tsx`, `components/V2Topbar.tsx` |
| C4 | Calendar page: week agenda + month grid + day panel + dialogs | `pages/CalendarPage.tsx` |
| C5 | Glass calendar styles, responsive agenda, reduced motion | `styles/v2.css` |
| C6 | Component tests for AC01–AC04 | `test/CalendarPage.test.tsx` |

## Test cases

1. Month view renders a 6×7 grid (42 cells) with task chips and overflow indicators.
2. Week view renders 7 day columns; each column lists its tasks in due-time order.
3. Next/previous/Today change the period label and the query range passed to `useCalendarTasksQuery`.
4. Selecting a day lists its tasks in the day panel; clicking one opens the task details dialog.
5. Error state offers retry; loading state renders a status message.

## Verification

```bash
cd frontend && pnpm exec vitest run src/features/v2/test
cd frontend && pnpm run lint && pnpm run build
cd frontend && pnpm run dev   # http://localhost:5000/v2/calendar
```

Browser: month overview, switch to week, navigate periods, open a day, open a task, create a task, check 360/768/1440 for overflow.

## Rollback

Revert the V2 calendar files and the route/sidebar/topbar edits; no data migration.

## Delivered (2026-11-15)

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 10 files, 63 tests passed (5 new calendar tests) |
| `pnpm run lint` / `pnpm run build` | exit 0 / exit 0 |
| Live month view (`/v2/calendar`) | 35 grid cells for November 2026, chips `9:00 AM Calendar check A` and `3:00 PM Calendar check B`, count `2 Tasks`, `Calendar` nav item `aria-current="page"` |
| Live week view | 7 columns, period `Nov 15 – Nov 21`; Next → `Nov 22 – Nov 28`; Today → back to `Nov 15 – Nov 21` |
| Day panel | `aside[aria-label="Sunday, November 15, 2026"]` lists the day's task |
| Task details | chip → dialog with title, status, priority, localized due date, category, `Edit task` |
| New task from calendar | editor opens with its fields |
| Responsive | 1440/768/360: `scrollWidth === clientWidth`; week view collapses to a single-column agenda below 900px |

Contract update: the existing `V2Layout.test.tsx` assertion "no Calendar link" became obsolete by this feature; it now asserts the implemented V2 destinations are present (`/v2/dashboard`, `/v2/agents`, `/v2/calendar`) and still forbids V1 destinations.

Test data created in the dev database while verifying: `Calendar check A` (Nov 15, 09:00) and `Calendar check B` (Nov 16, 15:00) on the existing test account `agent.v2.check+2@example.test`.

## Delivered — week detail mode

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 10 files, 66 tests passed (3 new: detail default + agenda switch, slot placement `top: 756px / height: 36px`, midnight start treated as a point in time) |
| `pnpm run lint` / `pnpm run build` | exit 0 / exit 0 |
| Live 1365×768 | 48 slots, 7 day columns, initial `scrollTop 576` (08:00), 09:00 task rendered 36px tall in its slot, block → task details dialog, Escape closes |
| Live Agenda | 7 day columns, timeline unmounted |
| Live 768 / 360 | `scrollWidth === clientWidth`; the detail grid scrolls inside its container (`innerScroll: true`, page overflow 0) |

Design note: V1's `layoutDayTasks` paints a task whose start is midnight as a block from 00:00 to its due time. V2 intentionally treats a midnight start as "no time-of-day information" and renders a single slot, so the detail grid stays readable; tasks with a real start time still show their full span.

## Follow-up tasks — drag and drop

| # | Task | Files |
| --- | --- | --- |
| D1 | Draggable blocks, column drop targets, snapped minute, drop indicator | `components/WeekDetailGrid.tsx` |
| D2 | Wire `useCalendarMutations.changeTaskDueDate`, inline error, month-cell drops | `pages/CalendarPage.tsx` |
| D3 | Grab cursors, drop indicator, dashed drop cell, error banner | `styles/v2.css` |
| D4 | Tests: week drop → ISO minute, month drop keeps time, error path | `test/CalendarPage.test.tsx` |
| D5 | Locale keys `dragHint`, `errorMovingTask` | `locales/{en,vi}/v2.json` |

## Delivered — drag and drop

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 10 files, 70 tests passed (4 new: week drop → ISO minute, drop indicator, month chip keeps time, failure alert) |
| `pnpm run lint` / `pnpm run build` | exit 0 / exit 0 |
| Live week drag | `dragstart` payload = task id → drop on Tuesday column at 10:00 → `PUT /api/tasks/<id>` 200, `GET /tasks?...` refetch, block re-rendered in the Tuesday column at 10:00 |
| Live month drag | chip dropped on Nov 20 cell → `data-drop` outline during hover, task persisted on `Friday, November 20, 2026` keeping `3:00 PM` |
| Persistence | after reload the moved task stays on its new day/time |

Interaction note: moves use the pointer drag; keyboard users keep the click → details → edit path (documented in spec §6.3). Resizing a task's span is still out of scope.

## Delivered — task actions

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 10 files, 74 tests passed (4 new: start+give up, finish, reopen, delete with confirmation) |
| `pnpm run lint` / `pnpm run build` | exit 0 / exit 0 |
| Live cycle | `Finish` → `PUT /tasks/<id>/finish` 200 → actions become `Reopen`; `Reopen` → `PUT /tasks/<id>` 200 → `Finish/Give up`; `Give up` → actions `Restore/Delete`; `Restore` → back to `Finish/Give up` |
| Details dialog | opening a week block shows the same action row inside the dialog |

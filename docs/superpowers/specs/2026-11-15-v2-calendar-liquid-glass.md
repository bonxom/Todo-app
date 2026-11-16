# V2 Calendar — Liquid Glass

Date: 2026-11-15. Status: approved for implementation (user request: "Tiếp tục làm trang Calendar đi").

Extends [Liquid Glass refinement](2026-11-15-liquid-glass-refinement.md). V1 (`features/calendar/*`) is the functional reference; V1 files are imported read-only.

## 1. Objective

Deliver `/v2/calendar` as a real, data-backed V2 page: week agenda and month grid in the V2 glass shell, driven by the existing calendar task query and scheduling data, with task details and task creation reachable without leaving `/v2/*`.

## 2. Scope

### In scope

- `features/v2/pages/CalendarPage.tsx` — week/month calendar.
- `features/v2/routes.tsx` — lazy `calendar` route with `RouteLoadError`.
- `features/v2/components/V2Sidebar.tsx` — `Calendar` navigation entry with active state.
- `features/v2/components/V2Topbar.tsx` — section title resolves for every V2 section.
- `features/v2/styles/v2.css` — `.v2-calendar-*` styles.
- `shared/i18n/locales/{en,vi}/v2.json` — additive keys (user-approved earlier).
- `features/v2/test/CalendarPage.test.tsx`.

### Reuse (no new data layer)

`useCalendarTasksQuery` (range-buffered), `calendarRanges` (`getBufferedCalendarRange`, `getVisibleCalendarRange`, `buildWeekDays`, `buildMonthDays`, `startOfDay`, `addDays`, `addMonths`, `taskHasDueDateInRange`), V2 `TaskDetailsDialog` and `TaskEditor`, shared date utilities. No new query key, no backend change.

### Not included (explicit)

Drag/resize rescheduling in the time grid, the project-focus panel, the V1 sidebar task-visibility filter, day-prefilled task creation, swipe gestures, and the V1 duplicate/copy flows. These remain V1-only; the calendar still shows every task due in the visible range.

## 3. Behavior

| Concern | Contract |
| --- | --- |
| Range | `getBufferedCalendarRange(currentDate, viewMode)` → ISO `startDate`/`endDate` for the query; `getVisibleCalendarRange` filters rendered tasks (`taskHasDueDateInRange`). |
| Week view | Seven columns from `buildWeekDays`; each column lists that day's tasks sorted by due time, with time and status marker. |
| Month view | Whole-week grid from `buildMonthDays` (35–42 cells, padded to complete weeks); each cell shows the day number, up to three task chips and a `+N` overflow; leading/trailing days are dimmed. |
| Period navigation | Previous/next move by 7 days (week) or 1 month (month); `Today` resets to the current date. The header shows the localized period label. |
| Day selection | Clicking a day opens a glass day panel listing every task due that day; clicking a chip or row opens `TaskDetailsDialog` (`?taskId` not used — dialog state is local to the page). |
| New task | Opens `TaskEditor` in create mode; on save the calendar query is invalidated by the shared mutation hooks. |
| States | Loading skeleton text, error with retry, empty day (`No tasks`), empty range. `aria-live` announces the current period. |
| Locale/theme | Reuses `v2` + `workspace` namespaces and the shared theme; dates formatted through `Intl.DateTimeFormat(getLocale())`. |
| Accessibility | One `h1`; grid uses `role="grid"`/`role="row"`/`role="gridcell"` for the month and a labelled list for the week; every cell is a button with an accessible name containing the full date and task count; focus ring from `.v2-app`. |
| Responsive | ≥1200px three-part header + 7 columns; 900–1199px compact columns; <900px week view becomes a vertical agenda (one card per day) and the month grid stays 7 columns with smaller chips and no horizontal scroll. |

## 4. Acceptance

| ID | Condition |
| --- | --- |
| AC01 | `/v2/calendar` renders week and month views with real tasks from the existing query. |
| AC02 | Period navigation and Today update the label, the query range and the rendered tasks. |
| AC03 | Day selection lists that day's tasks; task chips open task details; New task opens the editor. |
| AC04 | Loading, error+retry and empty states render without dead controls. |
| AC05 | 360/768/1440 in light/dark show no horizontal overflow and no clipped header actions. |
| AC06 | `lint`, `typecheck`, `build`, V2 Vitest suite pass; write scope respected. |

## 5. Week detail mode (follow-up, 2026-11-15)

User follow-up: *"Week mode thiếu chế độ detail"*. The week view gains a layout switch.

- Toolbar segmented control **Detail | Agenda** (visible only in week mode). Detail is the default.
- **Detail** (`components/WeekDetailGrid.tsx`): 24h grid, 30-minute slots at 36px (1.2px per minute), hour labels in a 56px gutter, seven day columns, today highlighted, initial scroll to 08:00. Task placement is computed in the component (`placeDayTasks`):
  - task with a start time → block spans start → due, minimum one slot;
  - task without a start time, or with a midnight start (no time-of-day information) → one 30-minute slot ending at the due time;
  - overlapping blocks split the column into lanes (cluster + lane assignment).
- Blocks are buttons: title, localized time, status colouring, `title` tooltip; click opens `TaskDetailsDialog`.
- **Agenda** keeps the previous per-day list.
- The grid scrolls inside its own container (`max-height: 560px`, `min-width: 760px`); the page never scrolls horizontally, verified at 360/768/1440. Below 900px the grid keeps an internal horizontal scroll.

Measured live (Nov 15–21): 48 slots, 7 day columns, scroll top 576px (08:00), block for the 09:00 task 36px tall placed in the 08:30–09:00 slot, block click opens the details dialog, Agenda restores 7 day columns.

## 6. Drag and drop (follow-up, 2026-11-15)

User follow-up: *"Hiện chưa có tính năng Drag and Drop ở version 2"*.

### 6.1 Week detail

- Task blocks are draggable (`draggable`, `text/plain` = task id, `effectAllowed = "move"`, grab cursor).
- Each day column is a drop target: `dragOver` computes the target minute from the pointer offset (1.2px per minute), snaps to 15 minutes, clamps to `00:00–23:45`, and paints a two-pixel drop indicator.
- `drop` resolves the task, builds the target date at the snapped local minute and calls `changeTaskDueDate` from `useCalendarMutations` (optimistic cache update, rollback on failure, `invalidateTaskDependents`).

### 6.2 Month grid

- Chips are draggable. Every day cell is a drop target; the drop keeps the task's original time-of-day and moves only the date, and the hovered cell shows a dashed accent outline.

### 6.3 Rules

- Only `dueDate` changes; `startDate` is untouched (resize is out of scope).
- Failures show an inline `role="alert"` message and the optimistic move is rolled back by the shared mutation.
- A drag never navigates; a plain click still opens the task details.
- Pointer drag is the interaction; keyboard users keep the click → details → edit path. A keyboard-accessible move control is not part of this increment.

### 6.4 Acceptance

| ID | Condition |
| --- | --- |
| AC07 | Dragging a block inside week detail moves the task to the snapped day/minute and persists through the shared mutation. |
| AC08 | Dragging a chip in month view moves the task to the target day, keeping its time. |
| AC09 | A failed move surfaces an inline error; the task returns to its original slot. |

## 7. Task actions (follow-up, 2026-11-15)

User follow-up: *"Ở trang calendar chỉ mới hiển thị task, chưa có tương tác (hoàn thành, từ bỏ...)"*.

`components/TaskStatusActions.tsx` renders the state machine for a task and is shared by the calendar day panel and the task details dialog:

| Task status | Actions |
| --- | --- |
| pending | Start · Give up · Delete |
| in-progress | Finish · Give up · Delete |
| completed | Reopen · Delete |
| given-up | Restore · Delete |

- Mutations: `useStartTaskMutation`, `useFinishTaskMutation`, `useGiveUpTaskMutation`, `useRestoreTaskMutation`, `useDeleteTaskMutation` — the same hooks V1 uses, so cache invalidation and stats stay consistent.
- Delete requires an explicit confirmation dialog; the confirm is disabled while the request is in flight.
- Failures render an inline `role="alert"` message and leave the task unchanged.
- Action buttons are disabled while any action for that task is pending (no duplicate requests).
- The week block and the month chip themselves stay single-purpose (drag / open details); their actions live in the details dialog so the 36px block does not become an icon soup.

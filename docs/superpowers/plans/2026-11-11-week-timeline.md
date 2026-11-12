# Week Timeline Implementation Plan

> **For agentic workers:** Use the executing-plans workflow to implement this plan task by task. No implementation is retained in this handoff. All checkboxes remain open.

**Goal:** Replace the compact Week calendar with a time-positioned schedule and adjustable time detail.

**Architecture:** Keep CalendarGrid as the toolbar and mode switch. Add WeekTimeline for scrolling day columns and timelineLayout for pure positioning and collision allocation. Reuse task detail and drag utilities; retain the existing due-date-based query and API semantics.

**Tech Stack:** React, existing CSS variables, Vitest/Testing Library, Playwright, pnpm. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-week-timeline.md`

## Global constraints

- Browser-local time; display-only 00:01 fallback on the due date when startDate is absent/invalid. Never persist the fallback.
- 15/30/60-minute detail selector, default 30; changing detail never mutates task dates.
- Preserve Month, project filters, day selection, detail modal, completed/given-up styling and project colors.
- Preserve existing day-based drag/copy behavior, including completed-project handling. Time-slot dragging and resize are out of scope.
- Use existing design tokens and typography, including light/dark themes. The reference screenshot supplies structure, not a new visual theme.
- Follow Test → Code → Test → Lint → Format check → Build/type-check. Do not treat this document as completed implementation.

## Task 1: Timeline calculations

**Create:** `frontend/src/features/calendar/components/timelineLayout.js`

**Test:** `frontend/src/features/calendar/components/test/timelineLayout.test.js`

**Interface:** `layoutDayTasks(tasks, day, pixelsPerMinute)` returns an array of `{ task, startMinute, endMinute, top, height, lane, laneCount }`. Export `formatTimelineMinute(minute)` for zero-padded 24-hour labels.

- [ ] Write tests before implementation. Example acceptance cases:

```js
const day = new Date(2026, 10, 11);
const dueOnly = { _id: "a", dueDate: "2026-11-11T17:30:00" };
expect(layoutDayTasks([dueOnly], day, 1)[0]).toMatchObject({
  startMinute: 1,
  endMinute: 1050,
  top: 1,
  height: 1049,
});
expect(dueOnly.startDate).toBeUndefined();
const meeting = {
  _id: "b",
  startDate: "2026-11-11T09:00:00",
  dueDate: "2026-11-11T10:30:00",
};
expect(layoutDayTasks([meeting], day, 2)[0]).toMatchObject({
  top: 1080,
  height: 180,
});
```

- [ ] Test overlap chain A 09–10, B 09:30–10:30, C 10–11: two lanes, A/C reuse a lane. D 12–13 occupies full width. Test identical times and short visual collisions.
- [ ] Test start on previous day (clip at 00:00), invalid/missing due date (omit), missing/invalid start (00:01), start after due (deadline marker), midnight deadline, zero duration and 23:59. Assert finite nonnegative positions and cards bounded by the day.
- [ ] Run `pnpm test src/features/calendar/components/test/timelineLayout.test.js` in frontend. Confirm failure is missing behavior, not a test setup problem.
- [ ] Compute wall-clock minutes using local date hours/minutes. Use a minimum card height of 28px; clamp short late-night cards to the day bottom. Sort by visual start, group transitive overlapping visual intervals, greedily reuse lanes whose end is at/before the next top; assign each group its maximum simultaneous lane count. Do not mutate inputs.
- [ ] Rerun the tests and verify green.

## Task 2: Integrate Week timeline

**Create:** `frontend/src/features/calendar/components/WeekTimeline.jsx`

**Modify:**

- `frontend/src/features/calendar/components/CalendarGrid.jsx`
- `frontend/src/features/calendar/calendar.css`
- `frontend/src/features/calendar/components/test/CalendarGrid.test.jsx`
- `frontend/src/shared/i18n/locales/en/workspace.json`
- `frontend/src/shared/i18n/locales/vi/workspace.json`

**Interface:** WeekTimeline receives `days`, `selectedDate`, `tasksByDate`, `interval`, `onDateSelect`, `onTaskDueDateChange`, `onTaskCopy`, `onTaskUpdated`. CalendarGrid owns interval state so Month/Week switching retains the chosen detail during the mount.

- [ ] Add failing component tests: selector defaults to 30, labels cover 00:00 through 23:30, four tasks in one day all render (no three-card cap), due-only task reads 00:01–17:30, day selection calls its callback, task click opens existing detail UI.
- [ ] Add a selector interaction test:

```jsx
fireEvent.change(screen.getByRole("combobox", { name: "Time detail" }), {
  target: { value: "15" },
});
expect(screen.getByText("09:15")).toBeVisible();
fireEvent.change(screen.getByRole("combobox", { name: "Time detail" }), {
  target: { value: "60" },
});
expect(screen.queryByText("09:15")).not.toBeInTheDocument();
expect(screen.getByText("23:00")).toBeVisible();
```

- [ ] Assert zoom never invokes mutation callbacks and Month has neither the selector nor the timeline. Run the component test file to confirm red.
- [ ] Render WeekTimeline only for Week. Keep Month's DayCell rendering intact. Scope sticky headers/time-gutter and timeline styles to the new component to avoid existing `.calendar-day` minimum-height rules.
- [ ] Add a labeled select: `Time detail` / `Độ chi tiết`; options `15 min`, `30 min`, `60 min` (Vietnamese: `phút`). Add `Local time` / `Giờ địa phương` and a localized rescheduling error. Follow existing i18n resource conventions.
- [ ] Use 36px per interval: `pixelsPerMinute = 36 / interval`. Full-day heights are 3456/1728/864px. Put them inside a scroll region capped around 650px desktop / 560px mobile, with sticky date header and left time gutter. Use approximately 70px for the gutter and at least 130px per day; horizontal overflow must remain inside the calendar.
- [ ] Preserve the visible time when changing detail by converting scrollTop through the old and new pixels-per-minute values. Center the selected day horizontally on narrow screens without resetting vertical scrolling on ordinary selection.
- [ ] Render every task with project-color edge, title, time range, completion styling and description when space permits. Keep full title/date range accessible via tooltip and detail modal; compact cards must not let text overlap other cards. Keep long-block content readable while scrolling.
- [ ] Use `TaskDetailButton` with `onTaskUpdated`; use `setTaskDragData`, `getTaskDragData`, `isCopyDragRequested` for existing gestures. Dropping onto another day preserves deadline hours/minutes. Copy keeps the existing completed-project sanitization. Preserve existing same-day no-op behavior. Surface errors; no silent success on failed callbacks.
- [ ] Add tests for drag move/copy callbacks, malformed payload, failed mutation, completed-project copies and keyboard date selection. Rerun component tests and the calculation suite.

## Task 3: Browser regression and verification

**Modify:** `frontend/e2e/calendar.spec.ts`

**Reuse:** `frontend/e2e/dashboard.fixture.ts` and existing `frontend/playwright.config.ts`.

- [ ] Add a fixture scenario with a true 09:00–10:30 interval, a due-only task and overlapping intervals. Verify rendered bounding boxes reflect time and do not intersect within a day.
- [ ] Verify switching 30→15→60 changes grid density, preserves task data and keeps the visible time approximately anchored. Scroll near midnight/end-of-day to check clipping and sticky header/gutter.
- [ ] Retain existing calendar navigation, Month, filters, modal, status and drag tests. Adapt Week-specific selectors to actual new markup without weakening behavioral assertions.
- [ ] Capture and visually inspect light/dark desktop and 390px mobile screenshots; check 320/768/1024 widths for page overflow. Check keyboard focus and localized labels.
- [ ] Run in frontend:

```sh
pnpm test
pnpm exec playwright test e2e/calendar.spec.ts --workers=2
pnpm run lint
pnpm exec prettier --check src/features/calendar/components/CalendarGrid.jsx src/features/calendar/components/WeekTimeline.jsx src/features/calendar/components/timelineLayout.js src/features/calendar/components/test/CalendarGrid.test.jsx src/features/calendar/components/test/timelineLayout.test.js src/features/calendar/calendar.css src/shared/i18n/locales/en/workspace.json src/shared/i18n/locales/vi/workspace.json e2e/calendar.spec.ts
pnpm run build
```

- [ ] Run minimum backend regression commands in backend:

```sh
pnpm run build
pnpm test
```

- [ ] Review `git diff --check` and the final diff against spec. Report exact verification results, warnings and skipped checks. Format only touched files. Do not claim browser QA from component tests alone.

## Handoff status

The initial handoff was documentation-only. A subsequent agent implemented the timeline, and the user then requested Detailed/Compact subviews and browser review. The current revision and verification record are in `docs/superpowers/plans/2026-11-11-week-subviews.md`; the original checklist above describes the initial handoff rather than the final revision status.

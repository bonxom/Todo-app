# Week timeline

## Approved behavior

Week offers Detailed and Compact subviews. Detailed uses seven day columns and a local-time axis covering 00:00–24:00; Compact preserves the original day lists. Preserve the app's surface, accent, typography, project colors, completion styling, navigation, filters, day selection, detail dialog, and day-based drag/copy behavior. Month remains unchanged.

Provide a labeled 15/30/60-minute detail selector, default 30. Each interval occupies 36px; changing it zooms the timeline without changing dates. Keep day headers and time gutter sticky inside a bounded scrolling region; mobile scrolls horizontally within the calendar, initially revealing the selected day.

Tasks use startDate through dueDate. Missing/invalid startDate defaults to 00:01 on the local due date, for display only. The calendar remains due-date based (matching its existing query): earlier starts are clipped at 00:00 on the due date, with full dates available in the tooltip. Invalid/reversed or zero-length intervals appear as a compact deadline marker. Missing/invalid due dates are omitted. Cards have a small minimum readable height, stay inside the day, and overlapping visual intervals occupy separate lanes; adjacent nonoverlapping intervals reuse space. No three-task preview cap.

## Non-goals

No API/schema changes, persisted fallback values, cross-day occupancy queries, time-slot drag scheduling, resize gestures, or new scheduling fields. Existing drag gestures change the deadline day and preserve its time, including copy and completed-project handling.

## Acceptance and verification

- All 24 hours and all seven dates appear, with 48 slots by default and 96/24 at 15/60 minutes.
- 09:00–10:30 is positioned proportionally; due-only 17:30 displays 00:01–17:30 without mutating input.
- Overlap chains, touching intervals, midnight, invalid timestamps and reversed dates render safely.
- Detail changes do not call mutation callbacks. Selecting dates and opening task details still work.
- Regression checks cover Month, drag/copy, navigation, light/dark and narrow screens.
- Run frontend tests, calendar Playwright, lint, changed-file Prettier, build; backend tests and build.

## Revision: Week subviews and usability (2026-11-11)

Week must offer two subviews: Detailed (Chi tiết) and Compact (Tóm gọn). Detailed remains the default for the newly implemented calendar; Compact restores the original seven day cards and their preview limits. Place this switch in a secondary toolbar within Week, separate from Month/Week navigation. Only Detailed exposes a visibly labeled, localized 15/30/60-minute selector. Remember subview and interval while navigating dates and switching Month/Week in the mounted calendar; no new persistence requirement.

Retain the selected date, tasks, filters and mutation callbacks across subview changes. Compact must still support existing task details, drag and copy. Detailed must retain its visible time when zooming or returning from Compact; first open starts around 08:00 with the full 24-hour range reachable by scrolling. Both headers and time gutter remain visible. Use subdued theme-aware grid lines, generous day-column widths on mobile, visible keyboard focus, and keep time/title together in long blocks while scrolling. Compact deadline markers show the deadline rather than an impossible reversed interval. Header buttons identify the full date and selected/today state.

Verification must include actual browser clicks, screenshots inspected by the implementer, desktop/mobile and light/dark, English/Vietnamese, both subviews, Month round trips, zoom anchoring, date navigation, details and rescheduling. Existing implementation changes belong to the user and must be preserved except for scoped fixes needed by this revision.

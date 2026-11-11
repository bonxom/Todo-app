# Calendar resize implementation plan

**Spec:** `docs/superpowers/specs/2026-11-11-calendar-resize.md`
**Goal:** Consolidate the toolbar and allow resizing task start/end times.
**Architecture:** Pure time calculations in timelineResize.js; pointer lifecycle/preview/save in useTimelineResize.js; WeekTimeline owns card markup and sibling grips. Extend the existing calendar date mutation to accept a date-field patch. Pass the callback through CalendarPage → CalendarView → CalendarGrid → WeekTimeline.

- [ ] Add failing tests in components/test/timelineResize.test.js for snapping, unchanged endpoint, due-only fallback, day bounds and no-op. Add mutation tests in api/test/useCalendarMutations.test.tsx for startDate patch, pending cache state and failure rollback. Add CalendarGrid assertion for CustomSelect under the primary toolbar.
- [ ] Implement timelineResize.js exports `getResizeRange(task, edge, candidateMinute, interval)` returning `{field,value,startMinute,endMinute}` or null; `getResizeCandidate(originMinute, deltaY, pixelsPerMinute, scrollDelta)` converts gesture distance to minutes.
- [ ] Generalize due-date mutation to date patch without changing existing changeTaskDueDate callers. Add changeTaskDates(task, patch). Pass onTaskDatesChange through the calendar; propagate rejection to the timeline for inline error handling.
- [ ] Move subview controls into CalendarGrid toolbar, replace native select with CustomSelect using the existing aria-label/option API, consolidate responsive CSS.
- [ ] Implement useTimelineResize with pointer capture, drag threshold, snapping, local preview, auto-scroll, cancellation and single async save. Add accessible sibling grips around the task open/drag button; keep lanes stable during the gesture. Add localized preview/saving/error and handle labels.
- [ ] Add browser tests with mutable fixture tasks: actual mouse drags for both edges and all intervals, Escape, failure rollback, keyboard control, no detail dialog after release, save/reload, CustomSelect clicks and toolbar geometry. Recheck existing calendar suite, screenshot and inspect desktop/mobile/light/dark.
- [ ] Run frontend full tests, calendar E2E, lint, changed-file Prettier and build/typecheck; backend build/tests; git diff --check. Record exact results and warnings.

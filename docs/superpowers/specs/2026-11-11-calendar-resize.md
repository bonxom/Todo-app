# Calendar toolbar and task resizing

## Approved design
Move Week Detailed/Compact and the 15/30/60-minute selector into the primary toolbar with Month/Week and previous/Today/next. Use the existing CustomSelect. Keep one row when space permits; wrap control groups on narrow screens. The interval selector is visible only in Detailed.

In Detailed, hover/focus at a task's top or bottom edge reveals a resize grip and vertical-resize cursor. Dragging top changes startDate; bottom changes dueDate. Preview the new size and range immediately, snap to the selected 15/30/60-minute grid, and persist one changed field on release. Missing/invalid start uses the existing display fallback 00:01; resizing top writes a real startDate, resizing bottom does not persist that fallback.

## Constraints and edge cases
Use browser-local calendar times and existing authenticated updateTask API. Keep the fixed endpoint unchanged and require start < due. Clamp to the displayed due day, 00:00–23:59 (day boundary may be off-grid); never resize across a day. For starts clipped from a previous day, dragging the top explicitly replaces start with a time on the displayed day. Ignore invalid/no-op changes. Keep existing drag/copy of the card body and clicking for details.

Pointer capture keeps dragging active outside the handle; account for timeline scrolling, including auto-scroll near the viewport edges. Escape, pointer cancellation and lost capture cancel without saving. Suppress accidental detail clicks after resizing. Disable further timeline edits while a resize save is pending; display localized saving/error feedback. Keep the preview until the server settles; rollback on failure via the calendar mutation cache. Accessible grips support ArrowUp/ArrowDown by one interval and expose time values; keyboard edits persist once per press. Tiny/reversed intervals must remain bounded; disable handles if no valid interval can be produced.

## Acceptance criteria
Tests cover top and bottom resizing, all snap intervals, positive duration/clamping, missing start, previous-day start, no-op/cancel, scroll-aware pointer movement, one request per release, backend failure rollback, persisted values after reload, and existing task body drag/copy/detail behavior. Browser-check desktop light/dark and mobile, one-row toolbar at desktop and CustomSelect option clicks. No new dependency or backend contract required.

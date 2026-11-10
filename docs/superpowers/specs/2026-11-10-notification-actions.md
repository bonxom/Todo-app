# Notification actions

User request: add read buttons in the bell popup and delete all notifications.

## Behavior and acceptance criteria

- Unread rows in popup/history offer a separate Mark as read button; it does not navigate or close popup. Opening the row retains existing mark-and-open behavior. Read rows have no read action.
- Popup and history offer Mark all as read and Delete all. All means the user's entire history, including other pages and both read states.
- Delete all opens an inline confirmation with Cancel and Confirm delete. Cancel does not mutate. Pending mutations disable conflicting actions; errors preserve data and allow retry.
- Successful mutation refreshes badge and all notification lists for current user. Delete resets history page to 1, preserving filter. Empty lists disable delete; no unread items disables mark-all using global unread count.
- DELETE /api/notifications with no body returns { deletedCount }. Auth required; no caller-selected recipient. Strict empty-body validation. Capture request-start cutoff before readiness/auth; only items created at or before cutoff are removed.
- Removal uses deletedAt tombstones. List/count/read/read-all exclude deletedAt != null. Mongo null matching includes legacy documents without deletedAt. No TTL and no deletion of unique deduplication keys: worker cannot resurrect a deleted notification for the same recipient/task/type/deadline. A different type or deadline can still generate a new notification.
- New notifications arriving after delete's cutoff remain visible and unread. Other users, including admin-owned history, are unchanged.
- Deleted notification cannot be marked read (404); delete-all repeated is successful with zero affected. Tombstones are internal and omitted from API DTO.
- en/vi strings, keyboard focus, mobile layout, light/dark follow existing Orbit UI. No new package dependencies.

## Non-goals

Individual deletion, undo, permanent erasure, notification scheduling changes and worker deployment changes.

## Error handling and tests

Real MongoDB: legacy documents, mixed read/unread, >one page, cross-user isolation, cutoff, repeated deletion, worker upsert after deletion, new type after deletion, concurrent deletion/generation. HTTP: 401/400, authenticated recipient, delayed readiness cutoff. UI: mark-one without navigation, popup mark-all, confirmation/cancel/success/error, pending state and global count/cache invalidation. Browser: popup actions, history reset and keyboard/mobile confirmation. Required full test/lint/format/build checks for both packages; report pre-existing format failures separately.

# Notification Actions Implementation Plan

> Use executing-plans and TDD inline. User directly requested implementation; scope is existing notification UI and API.

**Goal:** Read actions in popup and delete all history without regeneration.
**Architecture:** Extend Notification with internal deletedAt, reuse authenticated API layers and React Query invalidation; shared bulk-actions UI for popup/history.
**Spec:** [notification-actions](../specs/2026-11-10-notification-actions.md)

## Constraints

No new dependencies; NodeNext .js imports, existing auth/ownership and request-start cutoff; preserve notification unique index; en/vi; pnpm only. All mutation queries scope recipient and active records. No real user data used for tests.

## Task 1 — Backend tombstones and delete API

Files: backend/types/INotification.ts, models/Notification.ts, repositories/notificationRepository.ts, services/notificationService.ts, controllers/notificationController.ts, routes/notificationRoute.ts. Tests: repositories/test/notificationRepository.integration.test.ts and test/notifications.test.ts.

- [x] Add repository deleteAll stub, tests first and observe assertion failure. With old/new/user-B rows, expect deleteAll(A, cutoff) to return old count, list/count A only new, list B unchanged, markRead(deleted) null; repeated delete returns zero. Reinsert identical dedup key returns false; different type succeeds.
- [x] Run focused tests with disposable MongoDB replica set via ORBIT_MCP_TEST_MONGO_URI.
- [x] Add nullable deletedAt default null. Queries use `{recipientId, deletedAt:null}`; projection excludes deletedAt. `deleteAll(recipientId,cutoff)` uses updateMany with createdAt <= cutoff and `$set:{deletedAt:cutoff}`; return modifiedCount. InsertOnce retains tombstones by unchanged unique key.
- [x] Add route tests for DELETE /api/notifications: auth, reject body recipientId, response `{deletedCount}`, current user including ADMIN, request-start cutoff. Observe 404 before route then green.
- [x] Implement service/controller/route with protect and notificationBodySchema. Run regression integration/route tests and typecheck.

## Task 2 — Client and UI actions

Files: frontend/src/shared/services/notificationService.ts; features/notifications/api/notificationMutations.ts; components/NotificationList.tsx, NotificationBell.tsx, new NotificationBulkActions.tsx; NotificationsPage.tsx; notifications.css; en/vi common.json. Tests: existing notification client/mutation/component tests and e2e/notifications.fixture.ts, notifications.spec.ts.

- [x] Tests before UI: mark-one button leaves popup open, invokes read API only; mark-all calls existing API; delete requires confirm, cancel makes no request, success clears lists/count, failure keeps entries and retry. Browser fixture handles DELETE and tombstones via removed fixture entries.
- [x] Add client deleteAll() returning `{deletedCount:number}`, mutation invalidates notificationKeys.all(userId). Add client/mutation assertions.
- [x] NotificationList adds onMarkRead callback and sibling button per unread row; never nest buttons. Pending state disables both row and read buttons. Focus remains stable after action.
- [x] Shared NotificationBulkActions props `{disabled:boolean, hasItems:boolean, hasUnread:boolean, onDeleted?:()=>void}` owns mark-all/delete mutations and inline confirmation. Restore focus after cancel; after delete focus persistent action. Report errors inside component. Parent gets mutation busy state to disable conflicting row actions.
- [x] Popup gets bulk actions, global count and mark-only callback. History uses same controls and resets page 1 on deletion. Include deletion confirmation in existing dialog keyboard behavior without nested modal.
- [x] Add English/Vietnamese strings and responsive styles. Run component/client tests then Playwright actions and existing notification layout cases.

## Task 3 — Verify and document

- [x] Full backend `pnpm run test --maxWorkers=2` with disposable replica set; frontend `pnpm test`; `pnpm exec playwright test e2e/notifications.spec.ts --workers=1`.
- [x] Each package: `pnpm run lint`, `pnpm run format:check`, `pnpm run build`. Format changed files only and report unrelated failures.
- [x] Inspect popup screenshots for mobile/desktop confirmation; independent final code review under requesting-code-review if required. Fix findings with regression tests.
- [x] Document tombstone retention and command results, commit scoped changes, preserve branch without deploying.

## Execution record

Implemented 2026-11-10. Backend RED: four new route/repository assertions failed,
then passed against disposable MongoDB. Frontend RED: seven new UI/client cases
failed, then passed; browser popup actions failed before UI implementation and
passed after. Additional regression coverage was added for pending operations,
multiple pages and unread filters.

Ruling: mutation hooks live in the popup/page so row actions share a single busy
state; NotificationBulkActions is a shared presentation component with async
callbacks. This avoids effect-based communication of busy state to parents.

Independent review found two keyboard issues (focus after removing an unread row,
Escape outside confirmation controls) and an unreachable extra handler attached
to read-all. Regression tests reproduced both keyboard failures before fixes;
read-all now registers only its read handler. Unread history restores focus to its
persistent filter; popup rows restore focus to their open-task button. Escape
cancellation remains active throughout confirmation.

All tests, lint and builds pass. Full-package format checks were run but remain
non-green due to eight unchanged files in each package; changed files pass.
See [verification report](../../deployment/notification-actions-verification.md).

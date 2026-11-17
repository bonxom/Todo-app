# V2 glass controls, assistant and notifications

## Approved intent and design

The user requests pill-shaped liquid-glass topbar buttons matching the supplied reference, moves the existing chat launcher into that cluster, and brings V1 notification functionality into V2. Reuse existing state, queries and mutation services. Retain the Orbit palette; do not add a global search or fake badge.

## Acceptance criteria

- Language, theme and version controls use rounded glass surfaces, translucent fill, bright rim and soft elevation in both themes. The assistant uses a labeled pill; the notification bell uses a circular glass control with a red badge for actual unread counts (99+ cap; zero hidden).
- The assistant launcher is inside the topbar, with no floating or sidebar duplicate. Preserve draft/session, compact/expanded/docked modes, history, resizing, Escape and focus restoration. On the full chat page the launcher focuses the existing composer instead of opening a duplicate chat.
- Notifications reuse V1 user-scoped queries, polling, mark-one/all, confirmed delete-all, errors/retry, empty/loading states and keyboard behavior. Notification task links stay on `/v2/dashboard?taskId=...`; View all opens `/v2/notifications`.
- The new V2 history page reuses V1 behavior (all/unread, pagination, delete confirmation); version switching maps V1/V2 notification history. V1 defaults and visuals stay intact.
- Controls and notification popup fit 320px, 390px, tablet and desktop; touch controls >=44px. Portal content receives V2 tokens. Reduced transparency, reduced motion, forced colors and focus remain usable.
- Do not change backend contracts, data, auth/ownership behavior or add dependencies.

## Errors and edge cases

Never fabricate an unread count on API failure. Keep existing count-error indicator, mutation errors and retry behavior. Missing tasks open the existing V2 unavailable state. Confirm deletion before sending the mutation. Preserve the focused launcher when dismissing dialogs.

## Verification

Write browser/unit tests before implementation: topbar launcher location and focus, real badge, V2 task/history links, all/unread and pagination, mark/read/delete/empty/error flows; both themes and mobile. Run existing V1 notifications and V2 regressions, package unit suites, lint, changed-file format, build/typechecks and production smoke checks. Visually inspect screenshots.

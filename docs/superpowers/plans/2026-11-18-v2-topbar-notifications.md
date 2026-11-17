# V2 topbar notifications implementation plan

**Spec:** docs/superpowers/specs/2026-11-18-v2-topbar-notifications.md
**Execution:** Inline; user explicitly requests implementation using existing functionality.

- [x] Write failing Playwright tests in `frontend/e2e/v2-topbar-notifications.spec.ts` using existing notification fixtures: launcher belongs to header, glass pill radius, badge21, Escape/focus, view-all route, pagination/unread/mark-all, confirmed deletion, missing task link, mobile no-overlap and screenshots.
- [x] Add unit coverage for V2 notification version mapping before changing `frontend/src/shared/navigation/uiVersions.ts`.
- [x] `V2Topbar.tsx`, `V2Layout.tsx`, `V2AgentChatBubble.tsx`: provide a topbar portal target for the existing launcher; retain its component/session and standalone test compatibility. On full Agents focus the existing composer. Add NotificationBell with a V2 presentation prop.
- [x] `NotificationBell.tsx`, `NotificationsPage.tsx`: optional `version` defaults to V1. Use version-specific dashboard/history destinations, expose V2 portal classes and keep all existing services, confirmation and error handling unchanged.
- [x] `features/v2/routes.tsx`, `pages/NotificationsPage.tsx`, `uiVersions.ts`: register V2 history and version destinations; topbar shows Notifications title.
- [x] `styles/topbar.css`: scoped glass-pill tokens, assistant and bell controls, red badge, portal/history skin, responsive wrapping and accessibility media queries. Import after existing V2 styles.
- [x] Update prior V2 tests where the intentionally relocated launcher changes assertions. Run browser regressions and inspect desktop/light/dark/mobile screenshots; fix issues found.
- [x] Run frontend/backend unit suites, lint, changed-file Prettier, build/typecheck and production smoke. Record commands, results and limits in a review note. Preserve existing worktree changes; do not commit/publish.

## Self-review adjustments

- Explicitly hide the mobile menu on desktop after the glass button styles; avoid overriding responsive display accidentally.
- Keep notification header/actions/footer fixed within the popup and scroll only its list, making View all always reachable.
- Use an Assistant label distinct from the Agents page name. At 320px keep an accessible icon-only assistant launcher; other mobile controls remain 44px.
- V1's existing mobile layout deliberately uses two rows; correct its regression assertion to test two-dimensional overlap rather than reject any shared horizontal coordinate. No V1 product CSS changed.
- Keep the new error-retry test aligned with the existing localized Try again label.
- Final results: 65 browser regressions + 3 production checks, 495 frontend unit tests, 539 backend unit tests with 97 configured skips.

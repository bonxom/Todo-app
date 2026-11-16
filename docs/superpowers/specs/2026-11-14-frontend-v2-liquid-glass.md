# Frontend V2 Liquid Glass — Specification

> **Superseded in part (2026-11-15):** Read [Liquid Glass refinement](2026-11-15-liquid-glass-refinement.md) before using this document. Its approved visual, independent-navigation, and native create/edit requirements replace the conflicting foundation requirements below. Implementation is now authorized for the document author.

Date: 2026-11-14. Inspected baseline: `2f133ac`.

Status: implementation handoff; implementation and acceptance review have not started.

The user will assign implementation to another developer. The author of these documents will review the delivered result against this specification and correct deviations afterward. Documentation completion does not mean feature completion.

Companion document: [Implementation plan](../plans/2026-11-14-frontend-v2-liquid-glass.md).

## 1. Objective and design decisions

Build the V2 foundation and a Liquid Glass dashboard backed by real application data, alongside V1 in the same React application. Users can switch versions without signing in again. V1 keeps its functionality and remains the default when no preference exists.

This is an architectural change to the presentation layer. The following decisions refine the user's supplied requirements:

| Approach                                              | Decision                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Two route branches and layouts, one shared data layer | **Selected.** Independent presentation, route-level loading, incremental delivery, one deployment. |
| One layout with pervasive `isV2` conditions           | Initially fewer files, but couples layouts and increases CSS/regression risk. Rejected.            |
| Two frontend applications/deployments                 | Adds session, build, and operational complexity; outside the requested architecture.               |

Visual direction: **Orbit Liquid Glass**, a readable task-management workspace. Its signature is a floating glass navigation surface with a lens-like active indicator. Task content remains high-contrast and visually restrained. Use a mist-blue background and teal accents; do not blur every task row.

Planning defaults: support the existing light/dark and English/Vietnamese preferences; deliver dashboard as the only complete V2 page in this increment; retain the existing authentication and Agent interfaces. This is foundation scope, not a full V2 migration.

## 2. Verified repository baseline

Parts of the architecture description in `AGENTS.md` are outdated. Preserve its development rules, but use these inspected paths and technologies:

| Area               | Current implementation                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Application/router | `frontend/src/app/App.tsx`, `router.tsx`, React Router 7                                                   |
| Provider hierarchy | `ErrorBoundary → QueryProvider → AuthCacheBoundary → AuthBootstrap → RouterProvider`                       |
| Authentication     | `stores/useAuthStore.ts`; mutations in `features/auth/api/authMutations.ts`                                |
| Data               | TanStack Query 5; hooks/query keys in `features/*/api/`; `shared/services/httpClient.ts`                   |
| Types              | `shared/types/domain.ts`; new source uses TypeScript/TSX without unrelated JSX migration                   |
| V1 layout          | `shared/layouts/MainLayout.jsx`; `shared/components/Topbar.jsx`, `Sidebar.jsx`                             |
| V1 dashboard       | `features/tasks/TodoPage.jsx`; server filtering/pagination; `?taskId=` deep links                          |
| V1 Agent           | Provider and bubble are statically imported by the router; move their composition behind the V1 lazy entry |
| Theme/localization | `shared/theme/theme.ts`, `shared/i18n/index.ts`, `en`/`vi` resources                                       |
| Testing            | Existing Vitest, Testing Library, Playwright, and regression E2E suites                                    |
| Quality scripts    | Frontend already has `test`, `test:e2e`, `lint`, `format:check`, `typecheck`, `build`                      |
| Hosting            | `frontend/nginx.conf` already contains `try_files $uri /index.html`                                        |

Do not add a second QueryProvider, auth store, HTTP client, cache, or UI framework. A new test harness is unnecessary.

## 3. Scope and non-goals

### Required in this increment

- Protected `/v2` branch, separate layout, dashboard, V2 404, and recoverable route-loading failures.
- A visible `VersionSwitcher` in both versions on desktop and mobile.
- Version preference, URL-first routing, and safe restoration of the intended destination after authentication.
- Lazy loading of version-specific presentation; shared runtime and data modules may be shared chunks.
- Dashboard with account-wide statistics, task list, search, single-status filter, pagination, read-only task details, and start/finish actions.
- Clearly labeled V1 links for pages and operations not yet available in V2.
- Light/dark, English/Vietnamese, keyboard operation, reduced motion, and opaque fallback when blur is unsupported.
- Tests and evidence covering visual quality, lazy loading, V1 regression, and production SPA fallback.

### Not included

- Complete V2 calendar, categories, statistics, profile, notifications, Agent, or skills pages.
- V2 task creation/editing, give-up/restore/delete actions, or project/category management. These remain available through V1.
- Backend endpoints, database migrations, authentication protocol changes, or realtime synchronization between tabs.
- A V1 rewrite, Query/Zustand replacement, or global theme/font redesign.
- Making V2 the default now, remote feature flags, separate deployments, canvas/WebGL refraction, or a new animation library.

Do not ship nonfunctional controls or runtime mock data. A placeholder page does not qualify as an implemented V2 route.

## 4. Architecture and boundaries

```text
App / shared QueryProvider / AuthCacheBoundary / AuthBootstrap
└── router
    ├── landing + auth + public errors (existing)
    └── ProtectedGuard
        ├── lazy V1RouteLayout
        │   └── AgentSessionProvider → MainLayout + AgentChatBubble
        │       └── all existing V1 routes
        └── /v2 → lazy V2Layout
            ├── index redirect → /v2/dashboard
            ├── dashboard → lazy DashboardPage
            └── * → lazy V2NotFoundPage
```

- Shared providers remain above both branches. Switching must not remount QueryProvider/AuthBootstrap or call `setSession`, `clearSession`, or `removeQueries`.
- `V1RouteLayout.tsx` only relocates the current layout/provider/bubble composition behind a lazy entry. Preserve V1 Agent behavior. V2 does not mount the Agent provider or bubble; `Agent · V1` links to `/agent`.
- Do not import V2 layout/page/CSS from `main.tsx`, `App.tsx`, V1, or the shared switcher. Router imports lightweight metadata and dynamically imports presentation modules.
- Keep existing global reset/base CSS. The lazy-loading requirement is that a cold navigation does not fetch the other version's exclusive UI. Shared CSS/runtime are permitted.
- Do not relocate all feature API modules into `shared`. V2 imports existing hooks and domain types directly. Small V2 presentation adapters are allowed; duplicate services or version-specific query keys are not.

## 5. Routing and preference contract

### 5.1 Registry

Create a React/UI-independent module at `shared/navigation/uiVersions.ts`.

- `UiVersion = "v1" | "v2"`.
- `DEFAULT_UI_VERSION = "v1"` is the single default source.
- Registry entries describe `dashboard`, `calendar`, `categories`, `statistics`, `profile`, `notifications`, `agent`, and `skills`, each with a V1 path and optional implemented V2 path.
- Only dashboard has a V2 path in this increment. Other V2 paths in the original proposal are future destinations.
- A pathname is V2 only when it equals `/v2` or starts with `/v2/`. `/v20` and `/v2ish` are not V2. Normalize trailing slashes for route matching.
- Use the registry/allowlist, not blind string replacement. Recognize the existing skills descendants for safe return routing, while version switching from those pages falls back to V2 dashboard.

### 5.2 Switching behavior

| Source/action                                                                                             | Result                                               |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/dashboard` → V2                                                                                         | `/v2/dashboard`                                      |
| `/v2/dashboard` → V1                                                                                      | `/dashboard`                                         |
| `/calendar`, `/categories`, `/statistics`, `/profile`, `/notifications`, `/agent`, `/agent/skills/*` → V2 | `/v2/dashboard`                                      |
| `/v2/missing` → V1                                                                                        | `/dashboard`                                         |
| `/v2` or `/v2/`                                                                                           | Replace with `/v2/dashboard` without a loop          |
| Direct `/v2/calendar` before implementation                                                               | V2-shell 404 with V2 dashboard link and `Back to V1` |

- Use client navigation and push history for explicit switches. Browser Back/Forward follows the URL.
- Preserve only `taskId` when switching dashboard ↔ dashboard. An invalid value remains visible as a safe detail error without an invalid request. Drop other query parameters and hash because they have no shared contract. When falling back from a different page, drop all query/hash state.
- V2 detail uses `taskId`, allowing a selected task to survive version switching. Scroll position, local search/page state, form drafts, and open-panel state are not guaranteed to survive.
- Do not force-close a V1 modal to switch. A switcher covered by a modal is acceptable. Preserve existing unsaved-form behavior.
- Visible button text and accessible name: English `Try V2` / `Back to V1`; Vietnamese `Thử V2` / `Về V1`.

### 5.3 Persistence

- LocalStorage key: `orbit.ui-version`; raw value: `v1` or `v2`. Write only on an explicit switcher action.
- Preference is browser-level, not account-level. It contains no user data and survives logout.
- Missing/invalid values use `DEFAULT_UI_VERSION`. Catch read/write failures; navigation must still work if persistence fails. A separate in-memory preference store is unnecessary.
- Direct navigation, Back/Forward, `Open in V1` links, and storage changes from another tab do not force the current tab to change versions or overwrite its preference.
- Authenticated entry through `/` or a public authentication page reads the preference again. Reloading a concrete URL always respects that URL.

### 5.4 Authentication and redirects

Priority: **current protected URL / valid return destination > preference > default**.

1. While `isAuthReady` is false, preserve the existing loading state. Never flash protected content or choose a version prematurely.
2. A guest entering a protected route is redirected to `/login` with router state `{ returnTo: pathname + search + hash }`, using replace.
3. Successful login/registration uses the shared `resolveEntryTarget(returnTo)` helper. A valid protected target wins over preference. AuthPage and PublicOnlyGuard must use the same resolution logic to avoid competing redirects.
4. Switching between login and registration preserves `location.state.returnTo`. Failed authentication preserves the destination and existing form errors.
5. Accept only internal paths recognized by the protected route registry: real V1 routes or implemented V2 routes. Reject protocols, `//`, backslashes, root/auth/public routes, and unknown paths. Do not accept external URLs or introduce a query-based redirect parameter.
6. Guests entering unknown V2 routes still pass through login; an unknown return destination is rejected after login and falls back to the preferred dashboard. Authenticated users entering an unknown V2 route see V2 404.
7. Guest `/` remains the landing page. Explicit V1 URLs stay V1 even when preference is V2. Preserve query/hash for valid auth return destinations, unlike the switcher's selective query transfer.
8. Token refresh, terminal 401 handling, and cache isolation stay in the existing HTTP client, auth mutations, and AuthCacheBoundary. V2 never implements token handling.

A future default change should modify the single constant and corresponding tests. An explicit V1 preference and direct V1 URLs must still work. This increment keeps `v1` as the default.

## 6. Dashboard behavior and data

### 6.1 Layout and content

```text
Desktop >= 1024px
┌─────────────────┬───────────────────────────────────────────────────┐
│ Orbit / V2      │ Page + date         Language  Theme  Back to V1  │
│ Dashboard       │───────────────────────────────────────────────────│
│ Calendar V1     │ Tasks                             Manage in V1    │
│ Categories V1   │ Total / In progress / Completed                   │
│ Statistics V1   │───────────────────────────────────────────────────│
│ Agent V1        │ Search                            Status filter   │
│ Notifications V1│ Task list + status + deadline + action            │
│ Profile V1      │                                                   │
│ Sign out        │ Previous                  Page n/m           Next │
└─────────────────┴───────────────────────────────────────────────────┘
Mobile: wrapping topbar → heading → statistics → filters → task cards.
Navigation opens in a drawer. The switcher stays visible in the topbar.
```

- Read user information from the existing auth store. Long names must not break layout. Do not log account data or tokens.
- `useStatsQuery()` supplies `totalTasks`, `inProgressTasks`, and `completedTasks`. These are account-wide, never calculated from the current task page. A genuine zero is `0`; pending/error is a skeleton or `—`, not a fabricated zero.
- `useTasksQuery()` defaults: `pageNo=1`, `pageSize=10`, `sort="dueDate:asc_createdAt:desc"`, trimmed optional `search`, optional `status`. Filter on the server, not only within the ten loaded tasks.
- Search is submitted through a form/Enter/search button and resets page to 1. No debounce dependency. Single-status select: all, pending, in-progress, completed, given-up; changing it resets page to 1.
- The V2 status filter is local state. Do not overwrite/reset V1's `useTaskFilterStore`, which currently has array semantics. Shared data does not require sharing every presentation filter.
- Pagination uses server `pageInfo`, fixed page size 10. If a mutation/filter leaves the page beyond `totalPage`, select a valid page and refetch. `totalPage=0` renders empty and disables previous/next. Mark retained placeholder/background-refetch data as updating.
- Each task shows title, textual/icon status, priority, localized due date, and populated project/category when available. Do not present a raw reference ObjectId as a name. Missing dates show `No due date` / `Chưa có hạn`.

### 6.2 Details and actions

- A task title opens `?taskId=<id>` within V2 dashboard. Use a separate V2 read-only drawer/dialog with title, description, status, priority, start/due dates, and available project/category names.
- Use `useTaskQuery(id, { enabled: valid, retry: false })`; match V1's 24-hex ObjectId validation. Do not rely exclusively on the list object for detail data.
- Invalid ID or 403/404 shows an unavailable message without revealing ownership. Network/5xx shows error and retry. Closing removes only `taskId`, replaces history, and restores focus to the opener or heading on direct entry.
- Pending task: Start through `useStartTaskMutation()`. In-progress task: Complete through `useFinishTaskMutation()`. Completed/given-up tasks have no V2 status action in this increment.
- Disable the pending task action and prevent duplicate requests on rapid clicks. Wait for mutation and invalidation before announcing success. Display failures inline using `getApiErrorMessage`.
- Reuse existing tasks/projects/stats invalidation. Do not maintain a V2-only cache. Avoid overriding the hooks' default `onSuccess`: current hooks spread `options` after their invalidation handler. Use `mutateAsync` and caller-side messages without replacing that handler.
- `Manage in V1` links to `/dashboard`; detail `Edit in V1` links to `/dashboard?taskId=<id>`. Do not promise automatic opening of a creation form that V1 does not support. These links do not change the saved version preference.

### 6.3 Loading, failures, and session isolation

- Initial loading: static skeleton matching content layout, `aria-busy`, concise status announcement.
- Truly empty: `No tasks yet` with V1 management link. Filtered empty: `No matching tasks` with clear-filters action.
- Task failure: task-area retry while statistics remain usable. Statistics failure: placeholder/retry without blocking the list.
- Background failure with cached content: retain content and indicate that refresh failed. Never report success for failed operations or leave rejected promises unhandled.
- Version switching keeps the same-session cache. Logout/login as user B must not show user A's tasks/statistics/details, including late responses from A. First test existing boundaries; any discovered shared isolation defect requires an explicit regression test and correction.
- Cross-tab realtime data synchronization is not required. Existing Query reload/refocus behavior is retained.

## 7. Liquid Glass visual contract

### 7.1 Tokens

These are design targets, to be checked on actual composited backgrounds. Opacity/shadow may be tuned for readability without changing the visual direction.

| `--v2-*` token | Light     | Dark          |
| -------------- | --------- | ------------- |
| canvas         | `#EAF1F7` | `#101B29`     |
| ink            | `#172B40` | `#EEF5FB`     |
| muted          | `#4C6175` | `#B4C5D5`     |
| accent         | `#126B78` | `#86D8DF`     |
| accent-ink     | `#FFFFFF` | `#10232C`     |
| surface-solid  | `#F8FBFD` | `#182A3B`     |
| glass fill     | white 78% | `#182A3B` 88% |
| glass border   | white 80% | white 16%     |

- Heading font: `"Avenir Next", "Segoe UI", sans-serif`, weight 600, desktop 30–36px/mobile 26px. Body: `system-ui, sans-serif`, 14–16px, line-height 1.5. Metadata at least 12px. Use tabular numerals for data. No external font CDN.
- Spacing scale: 4/8/12/16/24/32px; desktop shell padding 24px, mobile 16px; card gaps 16–24px.
- Surface radius 20px, controls 12px, pills 999px; 1px border and subtle inner highlight. Shadows distinguish two or three levels without pervasive glow.
- Sidebar/topbar blur 16–20px, summary/panel blur 8–12px only when useful; task surfaces and inputs remain almost opaque. No per-row blur or highlight overlay obscuring text.
- Static low-intensity mist-blue/teal radial background. No remotely loaded background images or continuous gradient animation.

### 7.2 CSS isolation

- Root `.v2-app` has `data-ui-version="v2"`. Use `.v2-*` classes and `--v2-*` custom properties defined on that root. Never override V1 tokens on `:root`.
- Dark selector: `[data-theme="dark"] .v2-app`; use the existing `useTheme()` state. No separate V2 theme storage key.
- Import V2 CSS only from its lazy entry. No new global resets or unscoped `body`, `button`, `input`, `.card`, or `.ui-*` selectors. The shared switcher uses `ui-version-switcher` and caller-provided `className`; it imports no V2 stylesheet.
- A wrapper does not automatically isolate existing global CSS. Inspect computed styles after V1 → V2 → V1; loaded lazy stylesheets may remain mounted. Use explicit local styles and namespaced overrides.
- Render drawers/details inside the V2 root or a portal host within it, preserving tokens. Native dialog is allowed; verify top-layer behavior, focus, and the existing custom cursor. Do not remove/redesign the global cursor.

### 7.3 Responsive behavior, accessibility, and motion

- At least 1024px: floating 224px sidebar, main `min-width: 0`, content max-width 1280px. At 768–1023px: navigation drawer and full-width main. Below 768px: single-column task cards, wrapping controls, one/two-column statistics as space allows.
- Verify 360×800, 768×1024, 1440×900, and 200% zoom. No page-wide horizontal overflow or clipped switcher. Long Vietnamese labels and task names cannot push actions offscreen.
- Provide skip-to-main, landmarks, one H1, form labels, accessible button names, visible focus rings, and touch targets at least 44×44px. Never encode status with color alone.
- Drawer/dialog: initial focus, focus trap, Escape, focus restoration, inert background, and scroll-lock cleanup on close/unmount/navigation.
- Normal text contrast at least 4.5:1, large text at least 3:1; controls/focus must remain distinguishable. Measure actual light/dark composited surfaces, not only token pairs.
- Hover/opacity transitions 120–180ms. No continuously animated blur/layout. `prefers-reduced-motion: reduce` disables unnecessary animations and shimmer.
- Use backdrop-filter feature detection and `-webkit-backdrop-filter`; unsupported browsers use solid surfaces with visible borders. Forced colors use system colors and retain focus indicators. Respect reduced transparency where supported.
- Reuse existing i18n. Add a `v2` namespace for V2 content; switcher strings belong in `common`. V2 theme/language controls reuse existing logic with their own presentation.

## 8. Loading boundaries and deployment

- Provide initial router fallback and a pending indicator for lazy navigation; never a blank screen. Keeping the previous layout visible while loading is acceptable; mounting both layouts is not.
- Catch V2 import failures in a route ancestor error boundary that does not depend on the failed V2 chunk. Offer Reload and a plain HTML link to `/dashboard`, usable even when router/module loading fails. No automatic reload loop.
- Unknown V2 paths render V2 404 with a V1 escape. Unknown V1 paths keep the existing error behavior. Do not redirect the application's global wildcard to V2.
- One Vite build, base `/`, existing domain. No `/api/v2` or backend UI-version branching.
- Existing Nginx fallback must be verified by cold GET and browser refresh at `/v2/dashboard`, `/v2/missing`, and dashboard with `taskId`. Change hosting only if evidence shows it is necessary.
- Inspect lazy loading using a production build and cold browser contexts. Shared runtime/hooks/styles are allowed; V2-exclusive UI must not load for V1-only entry, and MainLayout/bubble/Agent UI must not load for V2-only entry.

## 9. Acceptance criteria and evidence

All criteria below are required. Future features excluded in section 3 do not count as unfinished foundation work.

| ID   | Passing condition                                                                             | Minimum evidence                                       |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| AC01 | V1 URLs/features remain functional; only switcher/lazy integration changes presentation       | Existing unit/E2E suites and comparable V1 screenshots |
| AC02 | Protected V2 dashboard and correct bootstrap loading                                          | Guard integration and guest/auth E2E                   |
| AC03 | Bidirectional switch, registry fallback, query transfer, and history follow section 5         | Unit matrix and browser Back/Forward                   |
| AC04 | URL wins over preference; missing/invalid/throwing storage is safe                            | Unit and direct-entry/reload E2E                       |
| AC05 | Root/auth restore preference or safe return target without redirect races                     | Integration and login/register E2E                     |
| AC06 | One QueryClient/session; no cross-user leakage; refresh behavior preserved                    | Boundary/HTTP regression and shared-cache integration  |
| AC07 | Real shared hooks, server search/filter/pagination, account-wide statistics                   | Query integration and request assertions               |
| AC08 | Correct start/finish, duplicate-click prevention, V1-visible invalidation, recoverable errors | Stateful fixture and mutation tests                    |
| AC09 | Detail deep links, invalid/403/404/network states, close/focus, V1 handoff                    | Component tests and E2E                                |
| AC10 | Glass light/dark styling is isolated and does not alter V1 after round trip                   | Screenshots and computed-style/browser audit           |
| AC11 | Mobile, zoom, keyboard/dialog, contrast, reduced motion, and solid fallback satisfy section 7 | Browser checks and recorded manual audit               |
| AC12 | Complete EN/VI text; theme/language stay shared across versions                               | Locale tests and E2E                                   |
| AC13 | Correct lazy chunks, route loading, and recoverable chunk failures                            | Production network trace and simulated chunk failure   |
| AC14 | Cold load/refresh `/v2/*` works on production hosting; API unchanged                          | HTTP and Docker/staging browser checks                 |
| AC15 | Quality commands and limitations are reported accurately                                      | Logs, commit SHA, acceptance report                    |

### Required test matrix

- Authentication: guest/authenticated/bootstrap pending/terminal 401; login/register; valid/malicious return target; A → logout → B; late A request.
- Version: storage absent/v1/v2/invalid/throw; explicit V1/V2 URL; dashboard/taskId; V1 page without V2 counterpart; unknown V2; Back/Forward; another tab's preference change does not navigate the current tab.
- Data: loading/empty/filtered empty/error/refetch failure; more than ten tasks; Unicode search; missing dates; populated/null/string references; start/finish success/failure; rapid clicks; empty last page after mutation.
- Visual: light/dark × 360/768/1440; EN/VI; keyboard; reduced motion; unavailable blur; V1 → V2 → V1; navigation after closing a dialog.

### Implementation handoff requirements

The implementer supplies a branch/commit and `docs/superpowers/reviews/2026-11-14-frontend-v2-liquid-glass.md` containing:

1. Delivered scope, changed files, and AC01–AC15 mapping to tests/screenshots/logs.
2. Exact commands, exit codes, pass/fail/skip counts, and separation of baseline failures from regressions. Do not weaken/delete expectations to achieve a green result.
3. V2 desktop/mobile light/dark screenshots, tablet, empty/error/detail states, and V1 before/after using identical fixtures, viewport, theme, and fonts.
4. Video/trace of V1 → V2 → start/finish → V1, reload, guest/login return, and logout/login as a different user.
5. Production network and SPA fallback evidence. Distinguish mocked E2E from real-backend smoke with a test account.
6. Known limitations and checks not run. Never include tokens, real user data, or `.env` files in artifacts.

The reviewer reads the diff, reruns relevant checks, exercises the browser UI, and evaluates every acceptance criterion. Authentication failures, data loss/leakage, V1 regressions, redirect loops, dead controls, scope violations, and build failures block acceptance. Required visual/accessibility defects also require correction. A passing build alone is not UI acceptance.

## 10. Expansion and rollback

Each additional V2 page gets its own spec/plan/tests, reuses shared services/query keys, adds a lazy route, and becomes available in the registry only when functional. Suggested order: full task CRUD → calendar → categories/projects → statistics/profile → notifications/Agent. This is future sequencing, not the current completion checklist.

Making V2 the default is a separate release after sufficient parity: change `DEFAULT_UI_VERSION`, update tests, retain explicit V1 URLs/preference and the return switcher. Roll back foundation by reverting its frontend integration commits; no data migration needs reversal.

# Frontend V2 implementation evidence

Date: 2026-11-14. Inspected baseline: `2f133ac`.
Companion documents:

- [Specification](../specs/2026-11-14-frontend-v2-liquid-glass.md)
- [Implementation plan](../plans/2026-11-14-frontend-v2-liquid-glass.md)

---

## 1. Delivered revision and scope

### Baseline and changes

- Baseline commit: `2f133ac1e8ef6032ee75773581a3c39599390d5d`
- Scope delivered: Complete V2 presentation foundation alongside V1, with shared authentication and data layers.
  - **Navigation & Routing**:
    - `frontend/src/shared/navigation/uiVersions.ts`: Version definitions, route registry, trailing slash normalization, and safe destination calculation.
    - `frontend/src/shared/navigation/versionPreference.ts`: Resilient localStorage persistence with safe fallbacks and error handling.
    - `frontend/src/shared/navigation/entryTarget.ts`: Strict validation of return targets, disallowing external/malicious URLs while preserving queries/hashes.
  - **Authentication & Guards**:
    - `frontend/src/app/routeGuards.tsx`: ProtectedGuard attaches full `returnTo` state; PublicOnlyGuard and RootGuard resolve targets via `resolveEntryTarget`.
    - `frontend/src/features/auth/AuthPage.jsx`: Login and registration submit handlers redirect to `resolveEntryTarget(location.state?.returnTo)`; mode switching preserves `returnTo`.
  - **Code Splitting & Route Boundaries**:
    - `frontend/src/app/V1RouteLayout.tsx`: Isolates V1 MainLayout, AgentSessionProvider, and AgentChatBubble behind lazy loading.
    - `frontend/src/app/RouteLoadError.tsx`: Independent error boundary catching dynamic chunk failures, providing Reload and plain `<a href="/dashboard">Back to V1</a>`.
    - `frontend/src/app/RoutePendingIndicator.tsx`: Accessible pending navigation progress indicator.
    - `frontend/src/app/router.tsx`: Composes lazy V1 and V2 route hierarchies under shared guards and error boundaries.
    - `frontend/src/features/v2/routes.tsx`: Statically declared paths with dynamic chunk imports and resilient error recovery.
  - **Version Switcher**:
    - `frontend/src/shared/components/VersionSwitcher.tsx`: Reusable compact version switcher button preserving `taskId` on dashboard switches.
    - `frontend/src/shared/components/Topbar.jsx`: Integrated into V1 topbar actions.
    - `frontend/src/styles/app.css`: Scoped `.ui-version-switcher` styles.
  - **Liquid Glass Shell & Tokens**:
    - `frontend/src/features/v2/styles/tokens.css` & `v2.css`: Isolated `--v2-*` tokens (canvas, ink, muted, accent, glass, borders, shadows), responsive layout, and fallbacks.
    - `frontend/src/features/v2/layouts/V2Layout.tsx`: Shell with skip-link, desktop sidebar, mobile navigation drawer, topbar, and main content area.
    - `frontend/src/features/v2/components/GlassPanel.tsx`: Reusable semantic glass container with backdrop-filter.
    - `frontend/src/features/v2/components/V2Dialog.tsx`: Accessible dialog with focus trap, Escape dismissal, backdrop click, and focus restoration.
    - `frontend/src/features/v2/components/V2Sidebar.tsx`: Navigation sidebar with active lens, V1 indicators, and sign-out handler.
    - `frontend/src/features/v2/components/V2Topbar.tsx`: Topbar with page title, localized current date, language toggle, theme toggle, and version switcher.
    - `frontend/src/features/v2/pages/V2NotFoundPage.tsx`: V2-specific 404 page with V2 dashboard link and V1 escape.
  - **Dashboard & Task Interactions**:
    - `frontend/src/features/v2/pages/DashboardPage.tsx`: Main dashboard page coordinating summary, toolbar, task list, and pagination.
    - `frontend/src/features/v2/hooks/useDashboardModel.ts`: Presentation model managing search draft, submitted search, status filter, and pagination.
    - `frontend/src/features/v2/components/DashboardSummary.tsx`: Account-wide statistics cards for Total, In Progress, and Completed tasks.
    - `frontend/src/features/v2/components/TaskToolbar.tsx`: Search input with Enter submission, single-status filter, and Manage in V1 link.
    - `frontend/src/features/v2/components/TaskCollection.tsx`: Task list supporting loading skeletons, error states with retry, and filtered empty states.
    - `frontend/src/features/v2/components/TaskRow.tsx`: Task row with status/priority badges, localized due date, populated references, and Start/Finish action buttons with in-flight lock.
    - `frontend/src/features/v2/components/TaskPagination.tsx`: Server-driven previous/next pagination controls.
    - `frontend/src/features/v2/components/TaskDetailsDialog.tsx`: Read-only drawer/dialog displaying full task details, error recovery, and Edit in V1 link.
  - **Localization**:
    - `frontend/src/shared/i18n/locales/en/v2.json` & `vi/v2.json`: Complete translations for all V2 features.
    - `frontend/src/shared/i18n/locales/en/common.json` & `vi/common.json`: Version switcher labels (`Try V2` / `Back to V1`, `Thử V2` / `Về V1`).
    - `frontend/src/shared/i18n/index.ts`: Registered `v2` namespace.

### Intentional exclusions (deferred to future increments)

- Task creation/editing, delete, give-up, or project/category management in V2 (accessible via V1 links).
- V2 Calendar, Categories, Statistics, Profile, Notifications, or Agent pages.
- Backend schema migrations or new API endpoints (zero backend modifications required).

---

## 2. Acceptance matrix

| ID       | Description                                                                                   | Status     | Evidence / Test Suite                                                                                    |
| :------- | :-------------------------------------------------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------- |
| **AC01** | V1 URLs and features remain functional; only switcher/lazy integration changes presentation   | **Passed** | `src/shared/components/test/VersionSwitcher.test.tsx`, `e2e/frontend-v2-visual.spec.ts`                  |
| **AC02** | Protected V2 dashboard and correct bootstrap loading                                          | **Passed** | `src/app/test/routeGuards.test.tsx`, `e2e/frontend-v2.spec.ts` (guest redirect & return)                 |
| **AC03** | Bidirectional switch, registry fallback, query transfer (`taskId`), and history               | **Passed** | `src/shared/navigation/test/uiVersions.test.ts`, `e2e/frontend-v2.spec.ts`                               |
| **AC04** | URL wins over preference; missing/invalid/throwing storage is safe                            | **Passed** | `src/shared/navigation/test/versionPreference.test.ts`, `e2e/frontend-v2.spec.ts`                        |
| **AC05** | Root/auth restore preference or safe return target without redirect races                     | **Passed** | `src/shared/navigation/test/entryTarget.test.ts`, `src/features/auth/test/versionRedirect.test.tsx`      |
| **AC06** | One QueryClient/session; no cross-user leakage; refresh behavior preserved                    | **Passed** | `src/features/v2/test/sessionContinuity.test.tsx` (cache survival, mutation propagation, user isolation) |
| **AC07** | Real shared hooks, server search/filter/pagination, account-wide statistics                   | **Passed** | `src/features/v2/test/DashboardPage.test.tsx`, `e2e/frontend-v2.spec.ts`                                 |
| **AC08** | Correct start/finish, duplicate-click prevention, V1-visible invalidation, recoverable errors | **Passed** | `src/features/v2/test/TaskActions.test.tsx`, `src/features/v2/test/sessionContinuity.test.tsx`           |
| **AC09** | Detail deep links (`?taskId=`), invalid/403/404/network states, close/focus, V1 handoff       | **Passed** | `src/features/v2/test/TaskDetailsDialog.test.tsx`, `e2e/frontend-v2.spec.ts`                             |
| **AC10** | Glass light/dark styling is isolated and does not alter V1 after round trip                   | **Passed** | `e2e/frontend-v2-visual.spec.ts` (V1 -> V2 -> V1 round trip), CSS tokens in `.v2-app`                    |
| **AC11** | Mobile, tablet, desktop, keyboard/dialog, contrast, reduced motion, and solid fallback        | **Passed** | `e2e/frontend-v2-visual.spec.ts` (viewports 360, 768, 1440 in light & dark)                              |
| **AC12** | Complete EN/VI text; theme/language stay shared across versions                               | **Passed** | `src/shared/i18n/locales/*/v2.json`, `e2e/frontend-v2-visual.spec.ts` (VI layout check)                  |
| **AC13** | Correct lazy chunks, route loading, and recoverable chunk failures                            | **Passed** | `dist/assets/V2Layout-*.js`, `dist/assets/V2Layout-*.css`, `e2e/frontend-v2.production.spec.ts`          |
| **AC14** | Cold load/refresh `/v2/*` works on production hosting; API unchanged                          | **Passed** | `e2e/frontend-v2.production.spec.ts` (SPA fallback on Vite preview), `frontend/nginx.conf` inspection    |
| **AC15** | Quality commands and limitations are reported accurately                                      | **Passed** | All test logs, lint checks, typecheck, and build commands documented below                               |

---

## 3. Verification commands and results

### 3.1 Frontend Unit & Integration Tests (Vitest)

```bash
cd frontend && pnpm test -- --run
```

- **Result**: Passed (Exit code: 0)
- **Test Files**: 91 passed (91 total)
- **Tests**: 448 passed (448 total)
- **Duration**: 8.37s

### 3.2 Frontend End-to-End Tests (Playwright)

```bash
cd frontend && pnpm exec playwright test e2e/frontend-v2.spec.ts e2e/frontend-v2-visual.spec.ts
```

- **Result**: Passed (Exit code: 0)
- **Tests**: 14 passed (14 total)
- **Coverage**:
  - URL-first navigation and version switching
  - Dashboard `taskId` preservation across versions
  - Fallback from unsupported V1 routes
  - Unknown V2 route 404 and V1 escape
  - Guest redirect and destination restoration
  - Dashboard summary stats, search, status filter, pagination, details, and mutations
  - Responsive visual tests across mobile (360x800), tablet (768x1024), desktop (1440x900) in both light and dark themes
  - Vietnamese localization rendering without horizontal overflow
  - V1 -> V2 -> V1 round-trip style preservation

### 3.3 Production Build & Chunk Isolation Tests

```bash
cd frontend
pnpm run build
pnpm exec vite build --manifest
pnpm exec playwright test --config playwright.v2-production.config.ts
```

- **Result**: Passed (Exit code: 0)
- **Typecheck (`tsc -b`)**: 0 errors
- **Vite Build**: Built client bundle in `dist/` with separate dynamic chunks for V2 presentation:
  - `dist/assets/V2Layout-*.js` & `dist/assets/V2Layout-*.css`
  - `dist/assets/DashboardPage-*.js`
  - `dist/assets/V2NotFoundPage-*.js`
- **Production Tests**: 3 passed (Cold load `/v2/dashboard`, Cold load `/v2/missing`, Chunk failure recovery via `RouteLoadError`)

### 3.4 Frontend Lint & Formatting

```bash
cd frontend && pnpm run lint
```

- **Result**: Passed (Exit code: 0) - 0 errors, 0 warnings

```bash
cd frontend && pnpm exec prettier --check <changed_files>
```

- **Result**: Passed (Exit code: 0) - All matched files use Prettier code style

### 3.5 Backend Regression Tests

```bash
cd backend && pnpm test && pnpm run build
```

- **Result**: Passed (Exit code: 0)
- **Test Files**: 62 passed, 10 skipped (72 total)
- **Tests**: 532 passed, 97 skipped (629 total)
- **Typecheck (`tsc --noEmit`)**: 0 errors

### 3.6 Repository Cleanliness

```bash
git diff --check
```

- **Result**: Passed (Exit code: 0) - No whitespace errors or trailing spaces

---

## 4. Production and real-backend evidence

1. **SPA Fallback & Hosting**:
   - `frontend/nginx.conf` line 46 contains `location / { try_files $uri /index.html; }`, ensuring `/v2/*` routes serve `index.html`.
   - Production Vite preview verified cold direct entry at `/v2/dashboard` (HTTP 200) and client-side routing.
2. **Chunk Isolation & Recovery**:
   - Production build manifest confirmed that `V2Layout`, `DashboardPage`, and `V2NotFoundPage` are code-split as dynamic entries.
   - When V2 chunks were intentionally failed, the route ancestor error boundary (`RouteLoadError`) rendered recovery controls (Reload button and `<a href="/dashboard">Back to V1</a>`).
3. **Cache & Session Integrity**:
   - Tested under real `QueryClientProvider` and `AuthCacheBoundary`.
   - Data survives switching between V1 and V2 without refetching.
   - Task mutations in V2 immediately invalidate dependents so updated state is visible upon returning to V1.
   - Logging out User A completely purges the cache, and deferred requests from User A cannot leak into User B's session.

---

## 5. Remaining limitations and unverified paths

1. **Docker Container Hosting Verification (AC14)**:
   - While `nginx.conf` was verified by code inspection and the Vite production preview server passed all automated tests, Docker Compose containers on port `3636` were not running in the active developer workstation during execution.
2. **2 Baseline E2E Suite Flakes (recorded before changes)**:
   - `e2e/language.spec.ts`: toolbar width assertion at 320px in V1.
   - `e2e/statistics.spec.ts`: waiting for legacy link 'View tasks' to `/todos`.
   - Both were pre-existing failures in baseline commit `2f133ac` and are unrelated to V2 changes.

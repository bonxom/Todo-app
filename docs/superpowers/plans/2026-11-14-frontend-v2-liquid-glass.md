# Frontend V2 Liquid Glass — Implementation Plan

> **Superseded in part (2026-11-15):** Read [Liquid Glass refinement](2026-11-15-liquid-glass-refinement.md) before using this document. Its approved visual, independent-navigation, and native create/edit requirements replace the conflicting foundation requirements below. Implementation is now authorized for the document author.

> **For agentic workers:** Use the `executing-plans` skill to implement this plan task by task. The user is assigning implementation to another developer; the document author is responsible for subsequent acceptance review and corrections. Do not interpret this handoff as a request for the author to implement now.

**Goal:** Deliver a usable Liquid Glass V2 dashboard alongside V1, with safe version switching, shared authentication/data, and evidence for acceptance.

**Architecture:** Two lazy presentation branches under the existing ProtectedGuard and shared application providers. A lightweight shared route/preference module owns version navigation. V2 consumes existing feature Query hooks and services without duplicating the data layer.

**Tech stack:** Existing React 19, React Router 7, TypeScript, Vite 7, Tailwind 4/CSS, TanStack Query 5, Zustand 5, i18next, Lucide, Vitest, Testing Library, and Playwright. Use pinned `pnpm@11.21.0`; no dependency additions are expected.

**Spec:** [Frontend V2 Liquid Glass specification](../specs/2026-11-14-frontend-v2-liquid-glass.md). Read it in full before implementation.

**Baseline:** `2f133ac`, inspected on 2026-11-14. Recheck paths and working-tree changes before executing; preserve unrelated work.

## Global constraints

- V1 keeps its functionality and remains the default when no preference exists.
- Only dashboard has a V2 path in this increment.
- LocalStorage key: `orbit.ui-version`; raw value: `v1` or `v2`. Write only on an explicit switcher action.
- Preference is browser-level, not account-level. It contains no user data and survives logout.
- New source uses TypeScript/TSX without unrelated JSX migration.
- One Vite build, base `/`, existing domain. No `/api/v2` or backend UI-version branching.
- Shared providers remain above both branches. Switching must not remount QueryProvider/AuthBootstrap or call `setSession`, `clearSession`, or `removeQueries`.
- Use `.v2-*` classes and `--v2-*` custom properties defined on the V2 root. Never override V1 tokens on `:root`.
- Do not ship nonfunctional controls or runtime mock data.
- Tests precede production changes: Spec → Plan → failing tests → implementation → tests → lint → format check → build/type-check.
- Run package commands inside the corresponding package directory; no root package/workspace exists.
- Do not change backend, lockfiles, generated outputs, or environment files without a demonstrated requirement. Never hand-edit lockfiles.

## Delivery sequence and review gates

| Task | Deliverable                                                | Acceptance coverage   | Depends on |
| ---- | ---------------------------------------------------------- | --------------------- | ---------- |
| 1    | Version registry and safe preference/return-target helpers | AC03–AC05             | Baseline   |
| 2    | Authentication entry/return integration                    | AC02, AC04–AC06       | 1          |
| 3    | Lazy V1/V2 route boundaries and recoverable errors         | AC01–AC02, AC13       | 1–2        |
| 4    | Shared switcher and minimal V1 integration                 | AC01, AC03–AC04, AC12 | 1, 3       |
| 5    | Accessible Liquid Glass shell, theme and localization      | AC10–AC12             | 3–4        |
| 6    | Dashboard queries, filtering, statistics and pagination    | AC06–AC07             | 5          |
| 7    | Task details and shared start/finish mutations             | AC06, AC08–AC09       | 6          |
| 8    | Browser regression, visual and production verification     | AC01–AC14             | 1–7        |
| 9    | Final quality checks and acceptance handoff                | AC15 and all criteria | 8          |

Each task ends with a focused reviewable diff and test evidence. Suggested commit subjects are provided; stage only the task's files. Never commit secrets or unrelated changes. The final implementer report must leave unexecuted checks explicitly unverified.

## File ownership map

All paths below are repository-relative. New files are proposed paths, not files claimed to exist already.

| Area              | Files and responsibility                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Navigation policy | New `frontend/src/shared/navigation/uiVersions.ts`, `versionPreference.ts`, `entryTarget.ts`; pure route mapping, guarded storage, safe entry destination                                                                      |
| Navigation tests  | New `frontend/src/shared/navigation/test/uiVersions.test.ts`, `versionPreference.test.ts`, `entryTarget.test.ts`                                                                                                               |
| Auth integration  | Modify `frontend/src/app/routeGuards.tsx`, `frontend/src/features/auth/AuthPage.jsx`; extend `frontend/src/app/test/routeGuards.test.tsx`; new auth return tests                                                               |
| Route composition | Modify `frontend/src/app/router.tsx`; new `frontend/src/app/V1RouteLayout.tsx`, `RouteLoadError.tsx`, `RoutePendingIndicator.tsx`; new `frontend/src/features/v2/routes.tsx`                                                   |
| Version switcher  | New `frontend/src/shared/components/VersionSwitcher.tsx` and test; modify only relevant section of `Topbar.jsx` and scoped shared styles in `frontend/src/styles/app.css`                                                      |
| V2 shell          | New `frontend/src/features/v2/layouts/V2Layout.tsx`; `components/V2Sidebar.tsx`, `V2Topbar.tsx`, `GlassPanel.tsx`, `V2Dialog.tsx`; `styles/tokens.css`, `styles/v2.css`                                                        |
| V2 dashboard      | New `frontend/src/features/v2/pages/DashboardPage.tsx`; `components/DashboardSummary.tsx`, `TaskToolbar.tsx`, `TaskCollection.tsx`, `TaskRow.tsx`, `TaskPagination.tsx`, `TaskDetailsDialog.tsx`; `hooks/useDashboardModel.ts` |
| V2 errors         | New `frontend/src/features/v2/pages/V2NotFoundPage.tsx`; load failure escape stays in the shared app error component                                                                                                           |
| Localization      | Modify `frontend/src/shared/i18n/index.ts`, `locales/en/common.json`, `locales/vi/common.json`; add `locales/en/v2.json`, `locales/vi/v2.json`                                                                                 |
| Feature tests     | New `frontend/src/features/v2/test/V2Layout.test.tsx`, `DashboardPage.test.tsx`, `TaskActions.test.tsx`, `TaskDetailsDialog.test.tsx`, `sessionContinuity.test.tsx`, `testSupport.tsx`                                         |
| Browser evidence  | New `frontend/e2e/frontend-v2.fixture.ts`, `frontend-v2.spec.ts`, `frontend-v2-visual.spec.ts`, `frontend-v2.production.spec.ts`, `frontend/playwright.v2-production.config.ts`                                                |
| Handoff           | New `docs/superpowers/reviews/2026-11-14-frontend-v2-liquid-glass.md`; keep spec/plan current if a justified design change occurs                                                                                              |

`frontend/src/app/App.tsx`, `QueryProvider.tsx`, `AuthCacheBoundary.tsx`, auth stores, HTTP client, and existing feature APIs should remain unchanged unless a failing regression proves a specific integration fix is needed. Do not modify `guardDecisions.ts` merely to encode a preferred URL: keep its existing auth decisions, resolve destinations in the route components.

## Baseline preparation

- [ ] Read `AGENTS.md`, the companion spec, current route tree, V1 layout/topbar, auth flow, `taskQueries.ts`, `taskMutations.ts`, task invalidation, and theme/i18n code.
- [ ] Record `git status --short` and `git rev-parse HEAD`. Use an isolated branch/worktree according to the environment's workflow; do not overwrite local edits.
- [ ] Verify `node --version` and `pnpm --version`. If dependencies are absent, use `pnpm install --frozen-lockfile` separately in frontend and backend.
- [ ] Capture baseline checks below. Record unrelated failures before changing application code. A known baseline failure is not permission to weaken tests.

```bash
# Working directory: frontend
pnpm test
pnpm run lint
pnpm run format:check
pnpm run build
pnpm run test:e2e
```

```bash
# Working directory: backend
pnpm test
pnpm run build
```

- [ ] Capture V1 dashboard at 1440×900 and 360×800 in light/dark using deterministic fixtures. Preserve the same fixture, dates, viewport, locale, and font environment for the final comparison.

## Task 1: Version registry and safe navigation policy

**Files:** Create the three navigation modules and their tests listed in the ownership map.

**Public interfaces:**

```ts
// uiVersions.ts
export type UiVersion = "v1" | "v2";
export type UiLocation = { pathname: string; search?: string; hash?: string };
export type VersionDestination = { to: string; isFallback: boolean };
export const DEFAULT_UI_VERSION: UiVersion = "v1";
export const UI_VERSION_STORAGE_KEY = "orbit.ui-version";
export const UI_ROUTES: ReadonlyArray<{
  id: string;
  v1: string;
  v2?: string;
}>;
export function getUiVersion(pathname: string): UiVersion;
export function getDashboardPath(version: UiVersion): string;
export function getVersionDestination(
  location: UiLocation,
  target: UiVersion,
): VersionDestination;
export function isSupportedProtectedPath(pathname: string): boolean;

// versionPreference.ts
export function readPreferredVersion(): UiVersion;
export function savePreferredVersion(version: UiVersion): void;

// entryTarget.ts
export function resolveEntryTarget(returnTo?: unknown): string;
```

The registry includes actual V1 paths. Recognize `/agent/skills/new` and exactly one skill-ID segment after `/agent/skills/`; do not accept arbitrary descendants. Recognize `/v2` as the dashboard entry alias. Only dashboard is mapped to V2.

- [ ] Write table-driven tests before implementations. Include trailing slashes, `/v20`, all unsupported counterparts, and query/hash rules. Example expectations:

```ts
import { describe, expect, it } from "vitest";
import { getUiVersion, getVersionDestination } from "../uiVersions";

describe("version destinations", () => {
  it("preserves only dashboard taskId", () => {
    expect(
      getVersionDestination(
        {
          pathname: "/dashboard",
          search: "?taskId=507f1f77bcf86cd799439011&page=4",
          hash: "#section",
        },
        "v2",
      ),
    ).toEqual({
      to: "/v2/dashboard?taskId=507f1f77bcf86cd799439011",
      isFallback: false,
    });
  });
  it("falls back without unrelated source state", () => {
    expect(
      getVersionDestination(
        {
          pathname: "/calendar",
          search: "?date=2026-11-14",
          hash: "#week",
        },
        "v2",
      ),
    ).toEqual({ to: "/v2/dashboard", isFallback: true });
  });
  it("uses an exact prefix boundary", () => {
    expect(getUiVersion("/v2/dashboard")).toBe("v2");
    expect(getUiVersion("/v20")).toBe("v1");
  });
});
```

- [ ] Add storage tests for absent/v1/v2/invalid values and `Storage.prototype.getItem/setItem` throwing. Assert save catches errors and does not alter auth/theme/language storage.
- [ ] Add return-target tests for valid V1/V2 routes, dashboard queries, `/v2`, skill descendants, and invalid non-string values. Reject `https://example.com`, `//example.com`, backslashes, `/login`, `/register`, `/`, unknown routes, and encoded path tricks that do not match the allowlist. Invalid input returns the preferred dashboard.
- [ ] Run `pnpm exec vitest run src/shared/navigation/test`. A missing-module failure is acceptable only for the intended new module; resolve all test setup/import mistakes before treating it as the red phase.
- [ ] Implement small pure helpers. Parse return targets against a fixed local base only after rejecting external/ambiguous input; check resulting pathname against the protected allowlist. Preserve query/hash only for valid auth return targets. Use `URLSearchParams` for switcher `taskId` transfer.
- [ ] Implement storage with read/write inside `try/catch`; never use `localStorage.clear()`. Helpers do not import components or touch auth state.
- [ ] Rerun tests; verify registry and spec agree on implemented routes.
- [ ] Suggested commit: `feat(frontend): define UI version navigation policy`.

## Task 2: Integrate authentication entry and return destinations

**Files:** Modify `app/routeGuards.tsx`, `features/auth/AuthPage.jsx`; extend `app/test/routeGuards.test.tsx`; create `features/auth/test/versionRedirect.test.tsx`.

**Consumes:** `resolveEntryTarget(returnTo?: unknown): string`.

**Produces:** One consistent redirect decision across login/register handlers and public guards, without changing auth mutations or token behavior.

- [ ] Extend guard tests to render actual components under MemoryRouter with auth state and localStorage controlled per test. Test pending bootstrap, guest V2 entry, explicit V1 URL despite V2 preference, authenticated root/login/register, and safe return priority.
- [ ] Test AuthPage login and registration with a mocked auth service/mutation response, then assert the destination. Switching auth form modes must preserve the return state; invalid credentials must not discard it.
- [ ] Run `pnpm exec vitest run src/app/test/routeGuards.test.tsx src/features/auth/test/versionRedirect.test.tsx`; verify failures identify missing preference/return handling.
- [ ] In ProtectedGuard, read `useLocation()` and attach the requested path to the existing guest redirect:

```tsx
<Navigate
  to="/login"
  replace
  state={{ returnTo: location.pathname + location.search + location.hash }}
/>
```

- [ ] In PublicOnlyGuard, use `resolveEntryTarget(location.state?.returnTo)` when the existing decision says redirect to dashboard. In RootGuard, use `resolveEntryTarget()` for authenticated root entry. Preserve pending/outlet/landing decisions.
- [ ] In AuthPage, replace both hardcoded dashboard navigations with the helper result and preserve `location.state` when toggling login/register. Keep auth API calls and validation unchanged.
- [ ] Verify the guard and submit handler resolve the same target when `setSession` causes a render before the async handler resumes. Assert there is no intermediate dashboard bounce or redirect loop.
- [ ] Run the new tests and existing `AuthBootstrap`, `AuthCacheBoundary`, auth mutation, and HTTP-client suites.
- [ ] Suggested commit: `feat(frontend): restore safe version-aware auth destinations`.

## Task 3: Split lazy route boundaries and add failure recovery

**Files:** Modify `app/router.tsx`; create `app/V1RouteLayout.tsx`, `RouteLoadError.tsx`, `RoutePendingIndicator.tsx`, `features/v2/routes.tsx`, `features/v2/layouts/V2Layout.tsx`, `features/v2/pages/DashboardPage.tsx`, `V2NotFoundPage.tsx`; create `app/test/versionRoutes.test.tsx`.

**Consumes:** Existing route arrays, ProtectedGuard, version helpers.

**Produces:** A working guarded V2 route scaffold, lazy V1 layout, and a route error boundary independent of V2 chunks. The scaffold is intermediate work, not an accepted dashboard.

- [ ] Write route integration tests using `createMemoryRouter` and the exported route tree with controlled auth/API responses. Assert only the selected shell renders, `/v2` replaces to dashboard, and `/v2/missing` stays a V2 404. Assert V1 Agent routes remain present.
- [ ] Add a controlled rejected lazy import test using the same `RouteLoadError` component. Assert Reload and a normal anchor to `/dashboard` exist even when V2 cannot import.
- [ ] Run `pnpm exec vitest run src/app/test/versionRoutes.test.tsx` and record expected failures.
- [ ] Move the existing V1 layout composition verbatim into its lazy wrapper:

```tsx
import MainLayout from "../shared/layouts/MainLayout";
import { AgentChatBubble } from "../features/agent/AgentChatBubble";
import { AgentSessionProvider } from "../features/agent/AgentSessionProvider";

export default function V1RouteLayout() {
  return (
    <AgentSessionProvider>
      <MainLayout assistant={<AgentChatBubble />} />
    </AgentSessionProvider>
  );
}
```

- [ ] Replace only the V1 wrapper's eager `element` with a route `lazy` function. Remove its eager UI imports from router. Keep every existing child route and the existing public `/ui-demo` route.
- [ ] Add a sibling `/v2` branch under the same ProtectedGuard, with statically declared paths and dynamic UI imports. Example route shape:

```tsx
{
  path: "v2",
  errorElement: <RouteLoadError />,
  lazy: async () => ({
    Component: (await import("./layouts/V2Layout")).default,
  }),
  children: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: "dashboard", lazy: async () => ({
      Component: (await import("./pages/DashboardPage")).default,
    }) },
    { path: "*", lazy: async () => ({
      Component: (await import("./pages/V2NotFoundPage")).default,
    }) },
  ],
}
```

- [ ] Add an initial fallback using the installed router's supported API and a navigation status indicator using `useNavigation()` inside route context. Test both cold entry and delayed navigation; do not assume a Suspense boundary alone covers route `lazy`.
- [ ] Keep RouteLoadError styling lightweight and independent of V2 CSS. Its V1 escape is `<a href="/dashboard">`, intentionally not dependent on successful router navigation.
- [ ] Rerun route tests and existing guard tests. Confirm App-level providers were not duplicated or moved.
- [ ] Suggested commit: `feat(frontend): isolate lazy V1 and V2 route layouts`.

## Task 4: Add the version switcher without redesigning V1

**Files:** Create `shared/components/VersionSwitcher.tsx`, `shared/components/test/VersionSwitcher.test.tsx`; modify `shared/components/Topbar.jsx`, narrowly scoped `styles/app.css`, EN/VI `common.json`.

**Interface:**

```ts
export interface VersionSwitcherProps {
  className?: string;
}
// Default export; determines current version from useLocation().pathname.
```

- [ ] Write MemoryRouter tests asserting label, route destination, stored preference, preservation of dashboard taskId, unsupported-page fallback, and successful navigation despite a storage exception. Include a history Back assertion; selection must follow URL rather than saved preference.
- [ ] Run `pnpm exec vitest run src/shared/components/test/VersionSwitcher.test.tsx` before implementation.
- [ ] Implement a real `type="button"` with caller styling, current URL detection, opposite-version target, and `navigate(destination.to)` after best-effort persistence:

```tsx
const target = getUiVersion(location.pathname) === "v1" ? "v2" : "v1";
const destination = getVersionDestination(location, target);
const switchVersion = () => {
  savePreferredVersion(target);
  navigate(destination.to);
};
```

- [ ] Add common keys `version.tryV2` and `version.backToV1` in both locales using the exact spec labels. Do not hardcode English into the shared component.
- [ ] Place switcher in V1 Topbar actions, with a text-visible compact style. At 360px, wrap or allocate a second action row as needed without removing notification/theme/language/profile controls. Any required topbar-height adjustment must remain compatible with MainLayout's offset; test clipping rather than silently overlapping content.
- [ ] Keep all other V1 layout styling untouched. If wrapping requires coordination, modify `MainLayout.jsx` narrowly and explain the change in the report; do not globally restyle the topbar.
- [ ] Rerun component tests and V1 dashboard/theme/language/notification browser checks.
- [ ] Suggested commit: `feat(frontend): add bidirectional UI version switcher`.

## Task 5: Build the Liquid Glass shell and accessible primitives

**Files:** Complete `V2Layout.tsx`, `V2NotFoundPage.tsx`; create shell components, `GlassPanel.tsx`, `V2Dialog.tsx`, tokens/styles; register `v2` locale resources; create `features/v2/test/V2Layout.test.tsx`.

**Interfaces:**

```ts
// GlassPanel: semantic wrapper, no data fetching.
type GlassPanelProps = React.PropsWithChildren<{
  className?: string;
}>;

// V2Dialog: shared accessible primitive for navigation and task details.
type V2DialogProps = React.PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>;
```

V2Layout owns drawer-open state, shell navigation, theme/language presentation, and an Outlet. V2Sidebar receives `onNavigate?: () => void`; V2Topbar receives `onOpenNavigation: () => void`. Neither owns server data. Logout uses the existing `useLogoutMutation()` and returns to `/`, including its current cleanup-on-failure behavior.

- [ ] Write shell tests: landmarks/skip link, switcher presence, V1 destinations labeled as V1, logout invocation, theme/language changes, drawer Escape and focus restoration. Use real navigation helpers and shared preference/theme logic.
- [ ] Run `pnpm exec vitest run src/features/v2/test/V2Layout.test.tsx` and record failures for missing behavior.
- [ ] Implement `.v2-app` with `data-ui-version="v2"`; import `tokens.css` and `v2.css` only here. Use the exact palette, spacing, font stacks, dimensions, and responsive rules from spec section 7.
- [ ] Define tokens locally, for example:

```css
.v2-app {
  --v2-canvas: #eaf1f7;
  --v2-ink: #172b40;
  --v2-muted: #4c6175;
  --v2-accent: #126b78;
  --v2-surface-solid: #f8fbfd;
  --v2-glass: rgb(255 255 255 / 78%);
  min-height: 100dvh;
  color: var(--v2-ink);
  background: var(--v2-canvas);
}
[data-theme="dark"] .v2-app {
  --v2-canvas: #101b29;
  --v2-ink: #eef5fb;
  --v2-muted: #b4c5d5;
  --v2-accent: #86d8df;
  --v2-surface-solid: #182a3b;
  --v2-glass: rgb(24 42 59 / 88%);
}
.v2-glass-panel {
  background: var(--v2-surface-solid);
}
@supports (
  (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
) {
  .v2-glass-panel {
    background: var(--v2-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
```

- [ ] Build sidebar/topbar with the signature active lens, restrained highlights, and dense readable task area. Keep version switching visible at mobile widths. Native inputs/buttons and Lucide icons are sufficient.
- [ ] Implement V2Dialog with a native dialog or an equivalently tested focus-trapped primitive. Keep its DOM/portal inside `.v2-app`; handle Escape, backdrop dismissal where appropriate, initial focus, inert background, close cleanup, and returning focus. Do not import a V1 form component and its CSS.
- [ ] Use `useTheme`, `setLanguage`, `getLocale`, and existing auth logout logic. Register EN/VI `v2` resources in the existing i18n module, without creating a second i18n instance. Keep visual CSS lazy; eager translation JSON is acceptable shared metadata.
- [ ] Add reduced-motion, reduced-transparency where supported, forced-color, and no-blur behavior. Verify custom cursor remains usable inside dialogs and does not hide the native pointer unexpectedly.
- [ ] Run shell tests plus existing i18n resource tests. Inspect 360/768/1440 light/dark in the browser before building dashboard content; revise contrast/spacing if needed.
- [ ] Suggested commit: `feat(frontend): add isolated Liquid Glass workspace shell`.

## Task 6: Connect dashboard queries and server-side filtering

**Files:** Complete `pages/DashboardPage.tsx`; create `hooks/useDashboardModel.ts`, `DashboardSummary.tsx`, `TaskToolbar.tsx`, `TaskCollection.tsx`, `TaskRow.tsx`, `TaskPagination.tsx`; create `testSupport.tsx`, `DashboardPage.test.tsx`.

**Interfaces:**

```ts
// useDashboardModel.ts
export function useDashboardModel(): {
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  submitSearch: () => void;
  status: import("@/shared/types/domain").TaskStatus | "";
  setStatus: (value: import("@/shared/types/domain").TaskStatus | "") => void;
  clearFilters: () => void;
  pageNo: number;
  setPageNo: (value: number) => void;
  tasksQuery: ReturnType<
    typeof import("@/features/tasks/api/taskQueries").useTasksQuery
  >;
  statsQuery: ReturnType<
    typeof import("@/features/statistics/api/statQueries").useStatsQuery
  >;
};
```

The model holds presentation state and invokes existing queries. It must not introduce a QueryClient, service, query key, or global status store. Child components receive data/handlers from the page. `TaskRow` receives `task: Task` and `onOpen: (taskId: string) => void`; its action logic is added in Task 7.

- [ ] Create a test renderer in `testSupport.tsx` using a fresh QueryClient with retries disabled, QueryClientProvider, MemoryRouter, and initialized i18n. Reset auth/localStorage/cache between tests. Keep this helper test-only.
- [ ] Write integration tests mocking the service boundary, not the Query hooks, so query parameters and caching are exercised. Return `PaginatedResponse<Task>` and real-shaped Stat fixtures. Include at least 12 tasks and valid 24-hex IDs for detail compatibility.
- [ ] Test initial request, trimmed Unicode search, status submission, page reset, server pagination, global stats vs page count, zero stats, missing dates/references, loading, empty, filtered empty, tasks-only error, stats-only error, retry, and cached refetch failure.
- [ ] Run `pnpm exec vitest run src/features/v2/test/DashboardPage.test.tsx` before implementation. Verify assertions fail because behavior is absent.
- [ ] Implement the model using the existing hook call:

```ts
const tasksQuery = useTasksQuery({
  pageNo,
  pageSize: 10,
  sort: "dueDate:asc_createdAt:desc",
  search: submittedSearch.trim() || undefined,
  status: status || undefined,
});
const statsQuery = useStatsQuery();
```

- [ ] Keep submitted search separate from its draft. Submit/status change/clear resets page atomically to 1. Use `pageInfo.totalPage` to disable/clamp pagination; do not clamp against stale placeholder metadata while the next page is fetching.
- [ ] Implement summary from Stat fields and task list from `data.data`. Use `getLocale()` for dates and `getApiErrorMessage` for failures. Optional/missing values render useful labels, never raw `undefined`, invalid dates, or object IDs as names.
- [ ] Add `Manage in V1` as a client link to `/dashboard`. Loading/error/empty states keep this escape accessible. No hardcoded sample users/tasks or extra project/category queries purely to decorate the page.
- [ ] Rerun dashboard tests and task query/service regression suites. Confirm filtering does not mutate V1's store.
- [ ] Suggested commit: `feat(frontend): connect V2 dashboard to shared task data`.

## Task 7: Add task details, start/finish, and cache-continuity tests

**Files:** Create `TaskDetailsDialog.tsx`; extend `TaskRow.tsx` and `DashboardPage.tsx`; create `TaskActions.test.tsx`, `TaskDetailsDialog.test.tsx`, `sessionContinuity.test.tsx`.

**Interfaces:**

```ts
type TaskDetailsDialogProps = {
  taskId: string;
  onClose: () => void;
};
// TaskDetailsDialog reads shared useTaskQuery; it does not mutate tasks.
```

- [ ] Write action tests: pending → start, in-progress → finish, completed/given-up → no state action; double click produces one request; service failure preserves state and exposes an error; success invalidates task/detail/project/stat queries.
- [ ] Write detail tests: valid ID triggers shared service; invalid ID never fetches; loading, 403, 404, 500/retry, populated/null references, close query handling, and V1 edit href. Browser tests handle actual focus/top-layer semantics that jsdom cannot prove.
- [ ] Add shared-session tests under real QueryProvider/AuthCacheBoundary with a single injected QueryClient: cache survives a version route change; a mutation refreshes V1-visible data; logout/session replacement removes A's data before B renders. Resolve a deferred A request after B logs in and assert it cannot paint A's content.
- [ ] Run `pnpm exec vitest run src/features/v2/test/TaskActions.test.tsx src/features/v2/test/TaskDetailsDialog.test.tsx src/features/v2/test/sessionContinuity.test.tsx` and record the red phase.
- [ ] Invoke the existing mutations without passing replacement `onSuccess` handlers. Example action sequence inside a task row:

```ts
const start = useStartTaskMutation();
const finish = useFinishTaskMutation();
const pending = start.isPending || finish.isPending;
// Handler also uses an immediate ref lock to guard repeated clicks before rerender.
// On success, shared hooks have awaited invalidation; announce success locally.
// On failure, catch the error and render getApiErrorMessage(error, fallback).
```

- [ ] Implement an immediate per-row in-flight lock with cleanup in `finally`, plus disabled/aria-busy controls. Use only the action corresponding to the current domain status; backend remains authoritative if state changed elsewhere.
- [ ] Open detail by updating only `taskId` with `setSearchParams`; close removes that parameter with replace. Fetch valid IDs through the shared detail query and pass content into V2Dialog. Do not mount V1 TaskDetailButton/FormDialog.
- [ ] Add `Edit in V1` with `URLSearchParams`-encoded task ID. This navigation intentionally keeps the saved V2 preference.
- [ ] Handle an empty final list page after successful mutation by selecting the last valid page, without repeated request loops. Verify list and summary update together through existing invalidation.
- [ ] Run new tests plus existing AuthCacheBoundary/AuthBootstrap/auth mutations/HTTP client/task mutation suites. Investigate any isolation failure instead of masking it with a V2-only cache clear.
- [ ] Suggested commit: `feat(frontend): add V2 task details and shared status actions`.

## Task 8: Browser, visual, lazy-loading, and production checks

**Files:** Add E2E fixture/specs and dedicated production Playwright config from the ownership map. Change `nginx.conf` only if a failing hosting test proves a need. Keep existing E2E configuration behavior intact.

**Fixture interface:**

```ts
import type { Page } from "@playwright/test";
export async function installV2Fixture(
  page: Page,
  options?: {
    authenticated?: boolean;
    preferredVersion?: "v1" | "v2";
    theme?: "light" | "dark";
    language?: "en" | "vi";
    scenario?: "populated" | "empty" | "tasks-error" | "stats-error";
  },
): Promise<void>;
```

The fixture initializes real auth storage keys, intercepts the existing `/api/*` contracts, and maintains mutable tasks/statistics for start/finish. It supports login/register/logout and user-switch scenarios. Use valid IDs, controlled dates, server filtering/pagination, detail 403/404, and a 5xx switch for retry tests. Unexpected requests should fail loudly rather than silently return `{}`. Existing V1 helpers are reference material, not a reason to weaken their tests.

- [ ] Write E2E tests before adjusting implementation. Example shared behavior:

```ts
import { expect, test } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";

test("URL wins over preference and switching is bidirectional", async ({
  page,
}) => {
  await installV2Fixture(page, {
    authenticated: true,
    preferredVersion: "v2",
    language: "en",
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Try V2", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try V2", exact: true }).click();
  await expect(page).toHaveURL(/\/v2\/dashboard$/);
  await page.getByRole("button", { name: "Back to V1", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(
    await page.evaluate(() => localStorage.getItem("orbit.ui-version")),
  ).toBe("v1");
  await page.goBack();
  await expect(page).toHaveURL(/\/v2\/dashboard$/);
});
```

- [ ] Cover all rows of spec section 9's test matrix. Include V1 calendar → V2 dashboard fallback, V2 unknown path, auth return priority, refresh, preference storage errors, and an external-tab storage event that must not navigate the current tab.
- [ ] Run `pnpm exec playwright test e2e/frontend-v2.spec.ts e2e/frontend-v2-visual.spec.ts`; record missing behavior and correct application code rather than loosening assertions.
- [ ] Run visual/browser checks at all specified viewports/themes/locales. Assert no horizontal overflow, switcher visibility, usable keyboard controls, dialog focus trap/Escape/restoration, and cleanup after navigation. Test 200% zoom manually and record it; viewport resizing alone is not zoom verification.
- [ ] Capture stable screenshots with deterministic fixture dates, animations disabled for image capture, and loaded fonts. Do not blindly accept generated snapshots. Compare V1 before/after, especially after visiting V2 first.
- [ ] Measure contrast on actual glass backgrounds; inspect focus, forced colors, reduced motion, and solid fallback. If no-blur needs a test override, use test-injected styles or a browser without support; do not add a production settings feature just for tests.
- [ ] Add `playwright.v2-production.config.ts` extending the existing config, limiting testMatch to `frontend-v2.production.spec.ts` and serving the built frontend with `pnpm exec vite preview --host 127.0.0.1 --port 5001 --strictPort`, baseURL port 5001, `reuseExistingServer: false`. Keep development tests on port 5000.
- [ ] Build with a temporary manifest using the existing build/type-check script plus `pnpm exec vite build --manifest`. Inspect `dist/.vite/manifest.json` and network requests from fresh contexts for V1-only and V2-only entries. Do not commit dist or rely solely on filename substrings; trace imported/dynamic chunk dependencies to the exclusive modules.
- [ ] Simulate a V2-exclusive JavaScript chunk returning a network error, then verify the independent error boundary and HTML V1 escape. Capture a clean cold-load trace afterward without interception.
- [ ] Run production tests:

```bash
# Working directory: frontend
pnpm run build
pnpm exec vite build --manifest
pnpm exec playwright test --config playwright.v2-production.config.ts
```

- [ ] Verify actual hosting separately; Vite preview is not evidence that Nginx fallback works. In the existing Docker/test environment or staging, request and reload `/v2/dashboard`, `/v2/dashboard?taskId=507f1f77bcf86cd799439011`, and `/v2/missing`. For default Compose exposure:

```bash
curl -i http://localhost:3636/v2/dashboard
curl -i 'http://localhost:3636/v2/dashboard?taskId=507f1f77bcf86cd799439011'
curl -i http://localhost:3636/v2/missing
```

- [ ] Expect HTTP 200 HTML for SPA paths, correct client routing after auth, valid JS/CSS assets, and no HTML masquerading as API responses. If the required service/environment is unavailable, mark AC14 unverified with the exact blocker.
- [ ] Use a disposable real-backend test account for a smoke flow: same task appears in V1/V2, start/finish in V2 persists after a reload in V1, logout protects both versions. Mocked E2E alone is not proof of backend persistence. Do not mutate real user tasks.
- [ ] Suggested commit: `test(frontend): verify V2 coexistence and visual contracts`.

## Task 9: Final quality gate and handoff

**Files:** Acceptance report; update spec/plan only for actual agreed scope/implementation clarifications.

- [ ] Inspect the diff for duplicate data services/query keys/providers, global CSS leakage, eager V2 imports, V1 feature removal, placeholder content, dead controls, secrets, and unrelated refactors.
- [ ] Run full tests and regression E2E after the last application changes:

```bash
# Working directory: frontend
pnpm test
pnpm run test:e2e
```

```bash
# Working directory: backend
pnpm test
```

- [ ] Run frontend lint, then formatting. Use project-local Prettier on the exact changed files first; do not reformat unrelated legacy source. Record any existing whole-tree formatting failures separately.

```bash
# Working directory: frontend
pnpm run lint
pnpm run format:check
```

- [ ] If formatting fails in changed files, format those files and rerun their tests/lint as appropriate, then rerun the format check. If whole-tree formatting remains blocked solely by baseline files, include both the baseline evidence and a passing changed-file check; do not claim the whole-tree command passed.
- [ ] Finish with build/type-check and whitespace validation:

```bash
# Working directory: frontend
pnpm run build
# This script includes pnpm run typecheck (tsc -b).
```

```bash
# Working directory: backend
pnpm run build
```

```bash
# Working directory: repository root
git diff --check
git status --short
```

- [ ] Recheck the production route/chunk test if build inputs changed after Task 8. Do not rerun unrelated checks repeatedly without a new change or unresolved concern.
- [ ] Write the review report with actual results using this structure:

```markdown
# Frontend V2 implementation evidence

## Delivered revision and scope

Record the commit SHA, baseline, implementation scope, and intentional exclusions.

## Acceptance matrix

For every AC01–AC15, record Passed / Failed / Not verified,
the exact test or artifact, and any remaining correction.

## Verification commands

Record working directory, exact command, exit code, test counts,
baseline failures, and checks that could not run.

## Browser and visual evidence

Link screenshots/traces and document viewport, theme, locale, browser,
zoom, keyboard, contrast, motion, and fallback results.

## Production and real-backend evidence

Separate mocked browser tests, production chunk checks, hosting fallback,
and disposable-account persistence/session checks.

## Remaining limitations

Describe only actual limitations, failures, or unverified paths.
```

- [ ] Provide the user with the branch/commit, report path, exact checks, and review-ready screenshots. Do not deploy, merge, or mark acceptance complete merely because implementation is finished.
- [ ] Suggested commit: `docs(frontend): record V2 verification and handoff`.

## Reviewer acceptance procedure

The document author will use this procedure when the user supplies the implementation:

1. Read the implementation diff and report against the spec, with special attention to V1 changes, redirects, shared session/cache, and CSS imports.
2. Check AC01–AC15 evidence. Rerun targeted tests first, then required quality gates when accepting corrections.
3. Exercise both interfaces in a browser, including mobile, light/dark, direct entry, switch fallback, task mutation, detail deep links, and logout/login with isolated test identities.
4. Compare actual visual output with the design contract; verify glass readability, focus, overflow, error/empty states, and V1 round-trip stability.
5. List defects with severity, file/location, reproduction, and violated AC. Fix scoped defects with regression coverage; keep the spec current if the user changes requirements.
6. Report accepted criteria and outstanding blockers honestly. Do not label foundation accepted if a required behavior or mandatory verification remains unresolved.

## Handoff instruction to the implementer

> Read the linked English specification and this plan in full. Implement Tasks 1–9 in order using the repository's test-first workflow. Keep V1 functional, reuse existing authentication and Query services, isolate Liquid Glass presentation under `features/v2`, and do not expand into the deferred V2 pages. Deliver the commit and evidence report mapping AC01–AC15 to actual tests and visual/production checks. The user will have the result independently reviewed and corrected before acceptance.

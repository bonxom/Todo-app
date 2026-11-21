# Frontend architecture

Read this for changes in `frontend/`. Orbit uses React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, and Zustand. For visual styles and interaction patterns, use the [Orbit UI/UX guide](../design/ui-ux.md).

---

## 1. High-Level Architecture & Import Direction

The codebase enforces a strict unidirectional dependency graph:

```text
src/
├── app/        ── Entrypoint, route composition, bootstrap & cache boundaries
│    ↓
├── features/   ── Feature domains (auth, tasks, calendar, categories, profile, statistics, landing, errors)
│    ↓
├── shared/     ── Common UI components, HTTP services, layouts, domain types, utilities
└── stores/     ── Global client-only Zustand state (auth, UI filter preferences)
```

### Import rules

1. **`app/`** can import from `features/`, `shared/`, `stores/`, `config/`.
2. **`features/`** can import from `shared/`, `stores/`, `config/`, and feature-local files.
3. **Cross-Feature Imports:** Features should import other features only through their canonical entry point (`@/features/<name>`) or shared contracts.
4. **`shared/` and `stores/`** MUST NEVER import from `features/` or `app/`.

---

## 2. Directory Structure

```text
src/
├── app/
│   ├── App.tsx                    # Top-level application shell with providers
│   ├── AuthBootstrap.tsx          # Initial session hydration & synchronization
│   ├── AuthCacheBoundary.tsx      # Render-blocking cache isolation boundary
│   ├── guardDecisions.ts          # Pure routing decision helpers
│   ├── routeGuards.tsx            # ProtectedGuard, PublicOnlyGuard, RootGuard
│   ├── router.tsx                 # createBrowserRouter route definitions
│   └── QueryProvider.tsx          # React Query client provider & configuration
├── features/
│   ├── auth/                      # Authentication domain (login, register)
│   ├── tasks/                     # Task management & todos workspace
│   ├── calendar/                  # Calendar planning & drag-and-drop scheduling
│   ├── categories/                # Category & project organization
│   ├── agent/                     # Agent workspace and personal skills
│   ├── notifications/             # Notification history and actions
│   ├── profile/                   # User profile, avatars, security settings
│   ├── statistics/                # Productivity metrics, heatmaps, charts
│   ├── v2/                        # /v2 layouts, page composition, and styles
│   ├── landing/                   # Public landing page
│   └── errors/                    # Error pages (404, 403, 500, etc.)
├── shared/
│   ├── components/                # Reusable UI components (Sidebar, Topbar, DateTimeInput, ErrorBoundary)
│   ├── layouts/                   # MainLayout with Outlet shell & assistant slot
│   ├── services/                  # httpClient, apiError, authService, authStorage
│   ├── types/                     # Domain contracts (domain.ts, api.ts)
│   └── utils/                     # Pure helpers (dateTime, projectColor, projectStatus, taskDrag)
├── stores/
│   ├── useAuthStore.ts            # Client session tokens & user profile state
│   └── useTaskFilterStore.ts      # Global in-progress task toggle state
├── styles/
│   └── index.css                  # Tailwind entry, theme tokens, shared rules
└── main.tsx                       # React 19 root bootstrap
```

[`src/app/router.tsx`](../../frontend/src/app/router.tsx) composes feature routes and lazily loads V1 and V2 presentation. [`src/features/v2/routes.tsx`](../../frontend/src/features/v2/routes.tsx) owns the `/v2` route tree. Reuse domain state and API logic when working on the V2 presentation. Follow the [Tailwind styling convention](../design/ui-ux.md#tailwind-styling). Both themes share [`src/styles/index.css`](../../frontend/src/styles/index.css) as their Tailwind entry. Localized copy lives in [`shared/i18n/locales/`](../../frontend/src/shared/i18n/locales/).

---

## 3. State Management Principles

### Client State (Zustand)

- **`useAuthStore`**: Stores client session state (`token`, `refreshToken`, `user`, `isAuthReady`, `sessionRevision`).
  - Persists `token`, `refreshToken`, and `user` to `localStorage` (matching legacy keys).
  - Increments `sessionRevision` on `setSession` and `clearSession` to isolate user caches.
  - Does NOT increment `sessionRevision` on `updateTokens` (token rotation) or `syncUser` (profile refresh).
- **`useTaskFilterStore`**: Stores UI-only task filtering preferences (`onlyInProgress`, `toggleOnlyInProgress`).

### Server State (React Query / TanStack Query v5)

- Server data is owned strictly by React Query with typed query keys.
- Never duplicate server data into Zustand or React component local state for long-term caching.
- Stale times:
  - Standard queries: `60s` stale time, `5m` gcTime.
  - Static lists / User profile: `5m` stale time.

### Session and API boundaries

[`App.tsx`](../../frontend/src/app/App.tsx) composes `ErrorBoundary` → `QueryProvider` → `AuthCacheBoundary` → `AuthBootstrap` → `RouterProvider`. `AuthCacheBoundary` isolates the React Query cache on a session change. `AuthBootstrap` checks a persisted session through `GET /api/auth/me` before protected navigation is ready. Protected routes send guests to `/login` and public-only auth routes send signed-in users to `/dashboard`.

- Use the typed services in [`shared/services/`](../../frontend/src/shared/services/) and the shared [`httpClient.ts`](../../frontend/src/shared/services/httpClient.ts) for JSON requests. Keep endpoint and response normalization in the service layer.
- The shared Axios client attaches the access token, retries eligible requests after refresh, and clears the session on terminal authentication failures. [`authSession.ts`](../../frontend/src/shared/services/authSession.ts) shares one in-flight refresh across callers and updates both tokens. Axios requests to `/api/ai/` use a longer timeout.
- Use [`chatStreamService.ts`](../../frontend/src/shared/services/chatStreamService.ts) for SSE. It uses Fetch and shares the auth session logic. See [agent chat architecture](../agent-chat-architecture.md#streaming-chat-turns--real-time-progress-sse) for the stream lifecycle.

---

## 4. Query Key Factory Pattern

All queries use centralized query key factories to guarantee consistency:

```ts
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...taskKeys.lists(), filters] as const,
  calendar: (range: { startDate: string; endDate: string }) =>
    [...taskKeys.all, "calendar", range] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
```

**Rule:** Ad hoc string query keys (e.g. `['tasks']`) in feature components are strictly forbidden. Always use `taskKeys.*()`, `projectKeys.*()`, `categoryKeys.*()`, `statKeys.*()`, or `userKeys.*()`.

---

## 5. Optimistic Mutations Lifecycle

Calendar and task mutations follow a robust snapshot-rollback pattern:

1. **`onMutate`**:
   - Cancel in-flight queries via `queryClient.cancelQueries()`.
   - Take snapshot of existing query data across affected query keys.
   - Optimistically update collections using collision-safe temporary IDs (e.g. `temp-${Date.now()}-${random}`).
   - Return `{ snapshot, temporaryId }` context.
2. **`onError`**:
   - Restore query cache from `context.snapshot`.
3. **`onSuccess` / `onSettled`**:
   - Replace temporary ID with server response.
   - Invalidate affected domain queries (`invalidateTaskDomain(queryClient)`).

---

## 6. Creating a New Feature

Use the validated feature generator:

```bash
pnpm create-feature <feature-name>
# Example:
pnpm create-feature notifications
```

To preview without writing files:

```bash
pnpm create-feature notifications --dry-run
```

This scaffolds:

- `src/features/<feature-name>/<PascalName>Page.tsx`
- `src/features/<feature-name>/api/index.ts`
- `src/features/<feature-name>/components/index.ts`
- `src/features/<feature-name>/routes.tsx`
- `src/features/<feature-name>/index.ts`

To mount the feature, import `<camelName>Routes` in `src/app/router.tsx`.

---

## 7. TypeScript & Migration Policy

- All infrastructure (`app/`, `stores/`, `shared/services/`, `shared/types/`, `api/` hooks, routes) is written in **strict TypeScript**.
- Existing leaf UI components (`.jsx`) remain valid using `allowJs: true` in `tsconfig.json`.
- When refactoring leaf components, rename to `.tsx` and type props against `src/shared/types/domain.ts`.

---

Use [local development](../development.md) to start the app and the [verification workflow](../workflow.md#verification-and-handoff) to choose tests, lint, formatting, and build checks.

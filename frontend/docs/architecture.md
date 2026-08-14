# Frontend Architecture Guide

This document outlines the architectural standards, directory structure, state management principles, data-fetching patterns, and development workflows for the TodoApp frontend.

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

### Import Rules:
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
│   ├── profile/                   # User profile, avatars, security settings
│   ├── statistics/                # Productivity metrics, heatmaps, charts
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
│   ├── index.css                  # Global tokens, resets, Tailwind base
│   └── app.css                    # Shared design system rules & utilities
└── main.tsx                       # React 19 root bootstrap
```

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

---

## 4. Query Key Factory Pattern

All queries use centralized query key factories to guarantee consistency:

```ts
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) => [...taskKeys.lists(), filters] as const,
  calendar: (range: { startDate: string; endDate: string }) => [...taskKeys.all, 'calendar', range] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
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

## 8. Development & Verification Commands

```bash
# Start Vite development server on port 5000
pnpm dev

# Run Vitest unit & integration tests
pnpm test

# Run Playwright E2E browser test suite
pnpm test:e2e

# Run TypeScript type check
pnpm typecheck

# Run ESLint check
pnpm lint

# Build production bundle
pnpm build
```

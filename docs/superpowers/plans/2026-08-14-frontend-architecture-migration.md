# Frontend Architecture Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `frontend` into feature-owned modules, introduce a staged TypeScript foundation, and replace Context/manual server refresh state with Zustand and React Query without changing routes, UI, API contracts, or optimistic calendar behavior.

**Architecture:** New TypeScript infrastructure lives in `app`, `config`, `stores`, and feature API modules while existing complex leaf UI remains JSX under feature-owned folders. Zustand is the in-memory owner of authentication and task-filter state; React Query owns user-scoped server data, typed query keys, invalidation, and calendar optimistic updates. Transitional service barrels and compatibility hooks keep the application buildable between migration checkpoints.

**Tech Stack:** React 19.2, React Router 7.11, Vite 7.2, TypeScript 5.9, Zustand 5, TanStack React Query 5, Axios 1.13, Tailwind CSS 4, Vitest 4, Testing Library, jsdom, pnpm 11.21.

**Spec:** `docs/superpowers/specs/2026-08-14-frontend-architecture-migration-design.md`

## Global Constraints

- Preserve every current URL, visible UI state, stylesheet, public asset, API endpoint, request payload, and response normalization behavior.
- Preserve local-storage keys exactly as `token`, `refreshToken`, and `user`.
- Zustand is the active in-memory session source; every login, registration, logout, profile update, and refresh rotation updates Zustand and local storage through shared actions.
- A terminal authentication failure clears Zustand, persisted auth, the pending refresh queue, and user-scoped query data; network and 5xx failures do not clear a valid session.
- Replacing one authenticated session with another clears all user-scoped React Query data.
- Every server-state key is created by a typed key factory with normalized serializable parameters.
- Calendar task/project interactions retain optimistic cache updates, collision-safe temporary IDs, rollback, server reconciliation, and settled invalidation.
- Existing JSX leaf components remain JSX; all new infrastructure, stores, route files, query hooks, and tests are TypeScript.
- Do not add Ant Design, shadcn/ui, i18n, or merchant-cms business/UI code.
- Use pnpm only and update `frontend/pnpm-lock.yaml` through pnpm commands.
- Keep the application buildable at every commit by retaining compatibility exports until all consumers move.

## Target File Map

New infrastructure files:

```text
frontend/src/
├── app/
│   ├── App.tsx
│   ├── AuthBootstrap.tsx
│   ├── AuthCacheBoundary.tsx
│   ├── QueryProvider.tsx
│   ├── queryClient.ts
│   ├── routeGuards.tsx
│   └── router.tsx
├── config/env.ts
├── shared/
│   ├── components/{DateTimeInput,ErrorBoundary,Sidebar,Topbar}.jsx
│   ├── layouts/MainLayout.jsx
│   ├── services/{httpClient,authStorage,apiError,sessionCache,projectHelpers,authService,taskService,categoryService,projectService,userService,aiService,statService,index}.ts
│   ├── types/domain.ts
│   └── utils/{dateTime,projectColor,projectStatus,taskDrag}.js
├── stores/{useAuthStore,useTaskFilterStore}.ts
├── styles/{app,auth,index,landing}.css
└── test/setup.ts
```

Feature ownership moves:

```text
page/AuthPage.jsx                  -> features/auth/AuthPage.jsx
feature/Auth/*                     -> features/auth/components/*
page/TodoPage.jsx                  -> features/tasks/TodoPage.jsx
feature/Todo/*                     -> features/tasks/components/*
feature/Project/*                  -> features/tasks/components/project/*
feature/Dialog/*                   -> features/tasks/components/dialogs/*
feature/Category/TaskCard.jsx       -> features/tasks/components/category/TaskCard.jsx
component/ChatBuble/*               -> features/tasks/components/chat/*
utils/taskCompletion.js             -> features/tasks/utils/taskCompletion.js (pure helpers only)
page/CalendarPage.jsx              -> features/calendar/CalendarPage.jsx
feature/Calendar/*                 -> features/calendar/components/*
page/CategoryPage.jsx              -> features/categories/CategoryPage.jsx
remaining feature/Category/*       -> features/categories/components/*
page/ProfilePage.jsx               -> features/profile/ProfilePage.jsx
feature/Profile/*                  -> features/profile/components/*
page/StatisticsPage.jsx            -> features/statistics/StatisticsPage.jsx
feature/Statics/*                  -> features/statistics/components/*
page/LandingPage.jsx               -> features/landing/LandingPage.jsx
feature/Landing/*                  -> features/landing/components/*
page/ErrorPage.jsx                 -> features/errors/ErrorPage.jsx
App.css                            -> styles/app.css
index.css                          -> styles/index.css
```

Each route-owning feature also receives `routes.tsx`. Query and mutation modules live in `features/<domain>/api/`; cross-feature task/project/category/stat hooks are imported from their owning feature rather than reconstructed in consuming pages.

---

### Task 1: TypeScript, aliases, environment, and test harness

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.node.json`
- Modify: `frontend/pnpm-lock.yaml`
- Rename: `frontend/vite.config.js` to `frontend/vite.config.ts`
- Modify: `frontend/eslint.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/config/env.ts`
- Test: `frontend/src/config/env.test.ts`

**Interfaces:**
- Produces: `env.serverUrl: string | undefined`, `env.apiDebug: boolean`, `parseEnv(source: ImportMetaEnv): AppEnv`, and the `@/* -> src/*` alias.
- Produces: `pnpm test`, `pnpm typecheck`, and a `pnpm build` command that type-checks before bundling.

- [ ] **Step 1: Install runtime and test dependencies through pnpm**

Run from `frontend`:

```bash
pnpm add @tanstack/react-query@^5.90.12 zustand@^5.0.9
pnpm add -D typescript@~5.9.3 typescript-eslint@^8.46.4 @types/node@^24.10.1 vitest@^4.1.10 jsdom@^26.1.0 @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.9.1 @testing-library/user-event@^14.6.1 axios-mock-adapter@^2.1.0
```

- [ ] **Step 2: Update scripts and configure mixed TypeScript/JavaScript builds**

Set these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5000",
    "typecheck": "tsc -b",
    "build": "pnpm run typecheck && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  }
}
```

Set root `tsconfig.json` to `files: []` with references to `tsconfig.app.json` and `tsconfig.node.json`. Both referenced configs use `composite: true`, `noEmit: true`, and a `tsBuildInfoFile` under `node_modules/.tmp/` so `tsc -b` never creates untracked metadata. In `tsconfig.app.json`, set `target: "ES2022"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `module: "ESNext"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `strict: true`, `allowJs: true`, `checkJs: false`, `types: ["vite/client"]`, `baseUrl: "."`, and `paths: { "@/*": ["./src/*"] }`; include `src`. Configure `tsconfig.node.json` with `target/lib: "ES2023"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `types: ["node"]`, the alias, and includes for both `vite.config.ts` and `vitest.config.ts`.

- [ ] **Step 3: Add Vite, ESLint, and Vitest configuration**

Rename the Vite config and add the alias without changing the existing React/Tailwind plugins:

```ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": sourceRoot } },
});
```

Configure Vitest with `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`, `clearMocks: true`, `restoreMocks: true`, `unstubGlobals: true`, and the same alias. Import `@testing-library/jest-dom/vitest` and register `afterEach(cleanup)` explicitly in setup; do not enable Vitest globals. Test-only QueryClients use `retry: false`, `retryDelay: 0`, and `gcTime: Infinity` to avoid timers.

Use separate flat ESLint blocks: JS/JSX keeps `js.configs.recommended`, TS/TSX uses `typescript-eslint` recommended rules with base `no-unused-vars` disabled and `@typescript-eslint/no-unused-vars` enabled, React Hooks applies to JSX/TSX, and React Refresh applies only to JSX/TSX application files.

- [ ] **Step 4: Write the failing environment parser test**

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("normalizes optional URL and debug values", () => {
    expect(parseEnv({ VITE_SERVER_URL: " https://api.example.com ", VITE_API_DEBUG: "true" })).toEqual({
      serverUrl: "https://api.example.com",
      apiDebug: true,
    });
    expect(parseEnv({ VITE_SERVER_URL: "", VITE_API_DEBUG: "false" })).toEqual({
      serverUrl: undefined,
      apiDebug: false,
    });
  });
});
```

- [ ] **Step 5: Run the focused test and confirm it fails**

Run: `pnpm exec vitest run src/config/env.test.ts`

Expected: FAIL because `src/config/env.ts` does not exist.

- [ ] **Step 6: Implement typed environment access**

```ts
export interface AppEnv {
  serverUrl: string | undefined;
  apiDebug: boolean;
}

type EnvSource = Pick<ImportMetaEnv, "VITE_SERVER_URL" | "VITE_API_DEBUG">;

export const parseEnv = (source: EnvSource): AppEnv => ({
  serverUrl: source.VITE_SERVER_URL?.trim() || undefined,
  apiDebug: source.VITE_API_DEBUG === "true",
});

export const env = parseEnv(import.meta.env);
```

Declare both Vite variables as optional strings in `vite-env.d.ts`.

- [ ] **Step 7: Verify the foundation**

Run:

```bash
pnpm exec vitest run src/config/env.test.ts
pnpm lint
pnpm build
```

Expected: environment test PASS, lint PASS, typecheck PASS, and Vite writes `dist/`.

- [ ] **Step 8: Commit the tooling foundation**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/vitest.config.ts frontend/eslint.config.js frontend/src/vite-env.d.ts frontend/src/test/setup.ts frontend/src/config
git commit -m "build(frontend): add typed application foundation"
```

---

### Task 2: Domain contracts, authentication store, and split services

**Files:**
- Create: `frontend/src/shared/types/domain.ts`
- Create: `frontend/src/shared/services/authStorage.ts`
- Create: `frontend/src/shared/services/httpClient.ts`
- Create: `frontend/src/shared/services/authService.ts`
- Create: `frontend/src/shared/services/taskService.ts`
- Create: `frontend/src/shared/services/categoryService.ts`
- Create: `frontend/src/shared/services/projectService.ts`
- Create: `frontend/src/shared/services/userService.ts`
- Create: `frontend/src/shared/services/aiService.ts`
- Create: `frontend/src/shared/services/statService.ts`
- Create: `frontend/src/shared/services/projectHelpers.ts`
- Create: `frontend/src/shared/services/apiError.ts`
- Create: `frontend/src/shared/services/sessionCache.ts`
- Create: `frontend/src/shared/services/index.ts`
- Create: `frontend/src/stores/useAuthStore.ts`
- Modify: `frontend/src/api/apiService.js`
- Modify: `frontend/src/api/axiosInstance.js`
- Modify: `frontend/src/api/authStorage.js`
- Modify: `frontend/src/api/projectHelpers.js`
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/context/useAuth.js`
- Test: `frontend/src/shared/services/authStorage.test.ts`
- Test: `frontend/src/stores/useAuthStore.test.ts`
- Test: `frontend/src/shared/services/projectHelpers.test.ts`
- Test: `frontend/src/shared/services/httpClient.test.ts`
- Test: `frontend/src/shared/services/apiError.test.ts`
- Test: `frontend/src/shared/services/sessionCache.test.ts`
- Test: `frontend/src/context/AuthContext.test.jsx`

**Interfaces:**
- Produces: `User`, `Task`, `Project`, `Category`, `Stat`, `AuthSession`, mutation payload, and API error types.
- Produces: `useAuthStore.getState()` with `setSession`, `updateTokens`, `clearSession`, `syncUser`, and `setAuthReady`.
- Produces: one typed service object per backend domain and a stable `@/shared/services` barrel.
- Preserves: old `src/api/*` imports as temporary re-exports until Task 5 removes them.

- [ ] **Step 1: Define frontend domain contracts**

Create `domain.ts` with string IDs and response-compatible optional fields:

```ts
export type EntityId = string;
export type TaskStatus = "pending" | "in-progress" | "completed" | "given-up";
export type TaskPriority = "Low" | "Medium" | "High";
export type ProjectStatus = "active" | "completed";

export interface User {
  _id?: EntityId;
  id?: EntityId;
  email: string;
  name: string;
  dob?: string;
  nationality?: string;
  role: "USER" | "ADMIN";
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category { _id: EntityId; name: string; description?: string; }
export interface ProjectSummary {
  totalTasks: number;
  finishedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  givenUpTasks: number;
  scheduledTasks: number;
  canComplete: boolean;
  completionRate: number;
}
export interface Project { _id: EntityId; name: string; description: string; color: string; status: ProjectStatus; summary?: ProjectSummary; }
export interface ProjectWithSummary extends Project { summary: ProjectSummary; }
export interface Task {
  _id: EntityId;
  id?: EntityId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: EntityId | Category | null;
  projectId: EntityId | Project | null;
  startDate: string;
  dueDate?: string;
  completedAt?: string | null;
  isOverDue?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession { token?: string; accessToken?: string; refreshToken?: string; user?: User; }
export interface AuthSnapshot { token: string | null; refreshToken: string | null; user: User | null; }
export interface DailyCategoryStat { categoryId: EntityId; categoryName: string; count: number; }
export interface DailyStat {
  date: string;
  completedTasks: number;
  completedOfEachCategory: DailyCategoryStat[];
  givenUpTasks: number;
  givenUpOfEachCategory: DailyCategoryStat[];
}
export interface Stat {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  givenUpTasks: number;
  dailyStats: DailyStat[];
}
// Write models are separate from read models: mutation payloads use
// plain EntityId references, never populated response objects.
export type TaskMutationPayload = Partial<{
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: EntityId | null;
  projectId: EntityId | null;
  startDate: string;
  dueDate: string | null;
}>;
export type ProjectMutationPayload = Partial<Pick<Project, "name" | "description" | "color" | "status">>;
export type CategoryMutationPayload = Partial<Pick<Category, "name" | "description">>;
export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload extends LoginPayload { name: string; dob: string; nationality?: string; }
export type UpdateProfilePayload = Partial<Pick<User, "email" | "name" | "dob" | "nationality" | "avatarUrl">>;
export interface ChangePasswordPayload { currentPassword: string; newPassword: string; }
export interface GenerateTasksPayload { userRequirement: string; }
export interface ChatPayload { userInput: string; }
export interface ApiEnvelope<T> { success: boolean; message: string; data: T; }
export type GenerateTasksResponse = ApiEnvelope<Task[]>;
export type ChatResponse = ApiEnvelope<string>;
```

Keep response envelopes permissive where the backend currently returns either an entity or `{ task }`/`{ project }`.

- [ ] **Step 2: Write failing storage and auth-store tests**

Cover legacy hydration, token rotation without replacing the user, full session replacement, user sync, and full clear:

```ts
it("rotates tokens in memory and in legacy storage without replacing the user", () => {
  const user = { email: "a@example.com", name: "A", role: "USER" as const };
  useAuthStore.getState().setSession({ accessToken: "old", refreshToken: "refresh-1", user });
  useAuthStore.getState().updateTokens({ accessToken: "new", refreshToken: "refresh-2" });

  expect(useAuthStore.getState()).toMatchObject({ token: "new", refreshToken: "refresh-2", user });
  expect(localStorage.getItem("token")).toBe("new");
  expect(localStorage.getItem("refreshToken")).toBe("refresh-2");
  expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
});
```

Reset localStorage and store state in `beforeEach` so tests do not leak sessions.

- [ ] **Step 3: Run the store tests and confirm they fail**

Run: `pnpm exec vitest run src/shared/services/authStorage.test.ts src/stores/useAuthStore.test.ts`

Expected: FAIL because the storage module and Zustand store do not exist.

- [ ] **Step 4: Implement legacy-compatible storage and the Zustand store**

`authStorage.ts` must expose `readAuthSnapshot`, `persistAuthSession`, `updateStoredTokens`, `updateStoredUser`, and `clearStoredAuth`. `useAuthStore.ts` initializes from `readAuthSnapshot()` and uses one internal setter per public action:

```ts
export const useAuthStore = create<AuthState>((set) => ({
  ...readAuthSnapshot(),
  isAuthReady: false,
  sessionRevision: 0,
  setSession: (session) => {
    const snapshot = persistAuthSession(session);
    set((state) => ({ ...snapshot, isAuthReady: true, sessionRevision: state.sessionRevision + 1 }));
  },
  updateTokens: (tokens) => {
    const snapshot = updateStoredTokens(tokens);
    set((state) => ({ token: snapshot.token, refreshToken: snapshot.refreshToken, user: state.user }));
    // sessionRevision is NOT incremented: token rotation is not a session change.
  },
  clearSession: () => {
    clearStoredAuth();
    set((state) => ({ token: null, refreshToken: null, user: null, isAuthReady: true, sessionRevision: state.sessionRevision + 1 }));
  },
  syncUser: (user) => {
    updateStoredUser(user);
    set({ user });
    // sessionRevision is NOT incremented: profile sync is not a session change.
  },
  setAuthReady: (isAuthReady) => set({ isAuthReady }),
}));
```

`sessionRevision` tracks identity-level session changes (login, register, logout, terminal failure) and is used by `AuthCacheBoundary` to decide when to clear user-scoped query data. Token rotation (`updateTokens`) and profile sync (`syncUser`) do not change the session identity and must not increment the revision.

Return normalized snapshots from storage writes so local storage and memory cannot diverge.
`persistAuthSession` is a full replacement operation: it removes any omitted old token, refresh token, or user value before writing the new session, preventing account A data from surviving a switch to account B. `updateStoredTokens` is the only partial operation and must preserve the current user.

- [ ] **Step 5: Move normalization helpers with characterization tests**

Copy the exact current `normalizeEntityResponse`, `normalizeCollectionResponse`, `buildTaskMutationPayload`, `normalizeProject`, `normalizeProjects`, and `normalizeProjectTasks` behavior into TypeScript. Test array/envelope responses and `projectId: "" -> null` while preserving an omitted `projectId`.

- [ ] **Step 6: Split services, define cancellable reads, and retain transitional exports**

Move each domain object from `apiService.js` into one typed module. Service methods return `response.data`, and project/task helpers retain current normalization. Auth `login` and `register` become pure HTTP methods; session persistence occurs only through `useAuthStore.setSession`. Auth `logout` posts the stored refresh token but does not clear state itself, allowing a single logout coordinator to clear cache and store in `finally`.

Every GET method accepts an optional final request-options argument so query cancellation is consistent while legacy calls remain valid:

```ts
export type RequestOptions = Pick<AxiosRequestConfig, "signal">;

getAllTasks(options?: RequestOptions): Promise<Task[]>;
getTasksByDateRange(startDate: string, endDate: string, options?: RequestOptions): Promise<Task[]>;
getAllProjects(options?: RequestOptions): Promise<ProjectWithSummary[]>;
getAllCategories(options?: RequestOptions): Promise<Category[]>;
getUserStats(options?: RequestOptions): Promise<Stat>;
getMe(options?: RequestOptions): Promise<User>;
```

Pass `options` as the Axios request config. Keep positional calendar dates because the old `CalendarPage` uses that signature until Task 4.

Replace old files with re-exports:

```js
export * from '../shared/services/index';
```

```js
export { default } from '../shared/services/httpClient';
```

Use equivalent re-exports for `authStorage.js` and `projectHelpers.js`.

- [ ] **Step 7: Write interceptor and normalized-error tests**

Use a mocked Axios adapter and fake location to cover bearer injection, 30-second default timeout, 60-second AI timeout, one refresh request for concurrent 401s, `updateTokens` before queued replay, and queue rejection. Test terminal refresh 401/403 cleanup and redirect separately from transient refresh network/5xx rejection, which must preserve the session and avoid redirecting.

Add `ApiError` characterization tests for backend messages, HTTP status, timeout (`kind: "timeout"` and original code), network/no-response (`kind: "network"`), and ordinary HTTP failures (`kind: "http"`). `getApiErrorMessage(error, fallback)` returns the backend/normalized message for migrated UI consumers.

- [ ] **Step 8: Port the Axios refresh interceptor to the store**

Use `env.serverUrl`/`env.apiDebug`. Requests read `useAuthStore.getState().token`. A successful refresh calls `updateTokens` before processing queued requests. Define terminal refresh failure as a refresh response with status 401 or 403: reject/reset the queue with the normalized `ApiError`, call the framework-independent `resetUserCache()` coordinator, call `clearSession`, and redirect outside `/login` and `/register`. For refresh network/no-response or 5xx failures, reject/reset the queue with the same normalized error but preserve the store/local session and do not redirect. Preserve the 30-second default timeout and 60-second AI timeout.

`sessionCache.ts` owns a no-op reset callback plus `registerUserCacheReset(handler)` and `resetUserCache()`. It does not import React or `app`. Task 3's `QueryProvider` registers `() => queryClient.removeQueries()` and unregisters it on cleanup. This lets terminal interceptor failure clear query data synchronously without a shared-to-app dependency; the render-blocking boundary remains defense in depth for any direct store action.

Keep errors inspectable:

```ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly kind: "http" | "network" | "timeout" = "http",
    public readonly code?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

Convert **all** failures to `ApiError`, including refresh failures. Do not clear auth for no-response/network failures or non-401/403 HTTP responses. Downstream consumers rely on `status`, `kind`, and `code`; raw AxiosError must not leak past the interceptor.

- [ ] **Step 9: Bridge AuthContext to Zustand for transition safety**

Modify `AuthContext.jsx` so that it imports the focused `@/shared/services/authService` directly and its `setSession`, `clearSession`, and `syncUser` actions delegate to `useAuthStore.getState()` instead of managing independent React state. This ensures that existing JSX consumers (AuthPage, Sidebar, ProfilePage, Topbar, AppRouter) continue to work through the context API while the Zustand store is the single source of truth. The context provider remains until Task 6 removes it; it must not import the transitional `src/api` barrel.

```jsx
// AuthContext.jsx — compatibility bridge
const setSession = useCallback((session) => {
  useAuthStore.getState().setSession(session);
}, []);

const clearSession = useCallback(() => {
  useAuthStore.getState().clearSession();
}, []);

const syncUser = useCallback((nextUser) => {
  useAuthStore.getState().syncUser(nextUser);
}, []);
```

The context `token`, `user`, and `isAuthReady` values must be derived from `useAuthStore` via a subscription so React re-renders correctly when Zustand state changes.

Replace the provider's interim restoration effect as well: no stored token calls `setAuthReady(true)`; `/api/auth/me` success calls `syncUser(user)` then `setAuthReady(true)`; status 401/403 calls `clearSession()`; network/no-status and 5xx failures retain the hydrated token/user and only call `setAuthReady(true)`. The provider must never write its own parallel token/user state. Test each branch so this checkpoint cannot remain stuck on the session-loading screen.

- [ ] **Step 10: Verify services and compatibility imports**

Run:

```bash
pnpm exec vitest run src/shared/services src/stores/useAuthStore.test.ts src/context/AuthContext.test.jsx
pnpm lint
pnpm build
```

Expected: tests PASS and all existing JSX consumers still bundle through the old `src/api` re-exports. Login through AuthPage must produce an authenticated httpClient request (verify that `useAuthStore.getState().token` is set after `setSession` is called through the compatibility context).

- [ ] **Step 11: Commit service and auth-state foundations**

```bash
git add frontend/src/shared frontend/src/stores/useAuthStore.ts frontend/src/api frontend/src/context
git commit -m "refactor(frontend): centralize session and API services"
```

---

### Task 3: Query client, filter store, typed keys, queries, and invalidation mutations

**Files:**
- Create: `frontend/src/app/queryClient.ts`
- Create: `frontend/src/app/QueryProvider.tsx`
- Create: `frontend/src/app/AuthCacheBoundary.tsx`
- Create: `frontend/src/stores/useTaskFilterStore.ts`
- Create: `frontend/src/features/tasks/api/taskKeys.ts`
- Create: `frontend/src/features/tasks/api/taskQueries.ts`
- Create: `frontend/src/features/tasks/api/taskMutations.ts`
- Create: `frontend/src/features/tasks/api/invalidation.ts`
- Create: `frontend/src/features/tasks/api/projectKeys.ts`
- Create: `frontend/src/features/tasks/api/projectQueries.ts`
- Create: `frontend/src/features/tasks/api/projectMutations.ts`
- Create: `frontend/src/features/categories/api/categoryKeys.ts`
- Create: `frontend/src/features/categories/api/categoryQueries.ts`
- Create: `frontend/src/features/categories/api/categoryMutations.ts`
- Create: `frontend/src/features/statistics/api/statKeys.ts`
- Create: `frontend/src/features/statistics/api/statQueries.ts`
- Create: `frontend/src/features/profile/api/userKeys.ts`
- Create: `frontend/src/features/profile/api/userQueries.ts`
- Create: `frontend/src/features/profile/api/userMutations.ts`
- Create: `frontend/src/features/auth/api/authMutations.ts`
- Create: `frontend/src/features/tasks/api/aiMutations.ts`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/page/AuthPage.jsx`
- Modify: `frontend/src/context/useTaskFilter.js`
- Delete: `frontend/src/context/TaskFilterContext.jsx`
- Delete: `frontend/src/utils/taskFilters.js`
- Test: `frontend/src/stores/useTaskFilterStore.test.ts`
- Test: `frontend/src/features/tasks/api/queryKeys.test.ts`
- Test: `frontend/src/features/tasks/api/invalidation.test.ts`
- Test: `frontend/src/features/tasks/api/queryCancellation.test.ts`
- Test: `frontend/src/features/auth/api/authMutations.test.ts`
- Test: `frontend/src/features/profile/api/userMutations.test.ts`
- Test: `frontend/src/app/AuthCacheBoundary.test.tsx`

**Interfaces:**
- Produces: a singleton `queryClient` with stable defaults and `QueryProvider`.
- Produces: exact key factories required by the spec and normalized filter objects.
- Produces: typed read hooks and invalidation-only mutation hooks for all current non-calendar interactions.
- Produces: compatibility `useTaskFilter` and `useVisibleTasks` hooks without Context providers.
- Preserves: `TaskRefreshContext` and numeric `refreshTrigger` until page consumers are migrated in Task 4.
- Produces: render-blocking user-cache isolation as soon as React Query enters the application.

- [ ] **Step 1: Write failing filter-store and key-factory tests**

Assert toggle/filter behavior and exact stable key shapes:

```ts
expect(taskKeys.list({ status: undefined, projectId: "p1" })).toEqual([
  "tasks", "list", { projectId: "p1" },
]);
expect(taskKeys.calendar({
  startDate: "2026-08-01T00:00:00.000Z",
  endDate: "2026-08-31T23:59:59.999Z",
})).toEqual([
  "tasks", "calendar", {
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.999Z",
  },
]);
```

Cover `projectKeys.list/detail/tasks`, `categoryKeys.list/detail/tasks`, `statKeys.summary/activity`, and `userKeys.me` in the same test suite.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `pnpm exec vitest run src/stores/useTaskFilterStore.test.ts src/features/tasks/api/queryKeys.test.ts`

Expected: FAIL because stores and factories do not exist.

- [ ] **Step 3: Implement the query client and client filter state**

Configure the query client to preserve current fetch-on-mount behavior:

```ts
queries: {
  retry: 1,
  staleTime: 0,
  gcTime: 10 * 60 * 1000,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
}
```

`staleTime: 0` and `refetchOnMount: true` match the current behavior where every page fetches fresh data on mount. `refetchOnReconnect: true` adds resilience for unstable connections. `QueryProvider.tsx` registers `queryClient.removeQueries()` with the Task 2 session-cache coordinator, unregisters it on cleanup, and wraps children with `QueryClientProvider`; temporarily add that provider to the existing `App.jsx`.

Implement `useTaskFilterStore` with `onlyInProgress`, `setOnlyInProgress`, `toggleOnlyInProgress`, and a pure exported `filterTasks(tasks, onlyInProgress)` function. Replace the `useTaskFilter` context hook with a Zustand selector.

Remove `TaskFilterProvider` from the transitional `App.jsx`, then delete `TaskFilterContext.jsx` and the superseded `utils/taskFilters.js`. This prevents Task 5 from deleting a utility that a retained provider still imports.

Add `AuthCacheBoundary` inside `QueryProvider` now, not in Task 6. It watches `sessionRevision` and uses a handled-revision state plus `useLayoutEffect`: on a revision change it renders the existing session-loading fallback instead of children, calls `queryClient.removeQueries()`, records the handled revision, and only then renders children. Tests seed user-A cache, switch/clear the session, and use a child probe to prove user-A data is never observed; token rotation and `syncUser` must preserve cache and never activate the gate.

**Do not replace `useTaskRefresh` yet.** The `TaskRefreshContext` with its numeric `refreshTrigger` must remain intact because TodoPage, CategoryPage, and CalendarPage depend on `refreshTrigger` as a `useEffect` dependency to trigger re-fetches. These pages are not migrated to React Query until Task 4. Replacing the hook now would cause a regression where external triggers (e.g., AI chat task generation) no longer refresh page data.

The `useTaskRefresh` compatibility hook will be replaced with a React Query invalidation wrapper in Task 4 Step 5, after all page consumers have been migrated to query hooks. The `TaskRefreshContext` provider is finally removed in Task 6 Step 8.

- [ ] **Step 4: Implement normalized query-key factories**

Use one helper that removes `undefined` and empty-string optional filters, then sorts remaining object keys before returning the object. **Do not strip `null`** — `null` carries business meaning (e.g., `{ projectId: null }` means "tasks without a project", which is distinct from `{}` meaning "no project filter"). Define these public members exactly:

```ts
taskKeys.all
taskKeys.lists()
taskKeys.list(filters)
taskKeys.detail(taskId)
taskKeys.calendarRoot()
taskKeys.calendar({ startDate, endDate })
projectKeys.all
projectKeys.list()
projectKeys.detail(projectId)
projectKeys.tasks(projectId)
categoryKeys.all
categoryKeys.list()
categoryKeys.detail(categoryId)
categoryKeys.tasks(categoryId)
statKeys.all
statKeys.summary()
statKeys.activity(filters)
userKeys.all
userKeys.me()
```

- [ ] **Step 5: Add domain read hooks**

Implement:

```ts
useTasksQuery(filters?)
useTaskQuery(taskId)
useCalendarTasksQuery({ startDate, endDate })
useProjectsQuery()
useProjectQuery(projectId)
useProjectTasksQuery(projectId)
useCategoriesQuery()
useCategoryQuery(categoryId)
useCategoryTasksQuery(categoryId)
useStatsQuery()
useActivityQuery(filters)
useCurrentUserQuery(options?)
```

Each hook must use its factory key and focused service. Normalize task list envelope responses once in `taskQueries.ts`, not in components. Calendar parameters passed to the service and key are ISO strings. Every query function forwards its React Query abort signal through the service's optional final request options; calendar calls `getTasksByDateRange(startDate, endDate, { signal })`. Add a query test whose mocked Axios request observes `signal.aborted === true` after `queryClient.cancelQueries()`.

- [ ] **Step 6: Write the failing dependent-invalidation test**

Seed a `QueryClient` with task, project, category, and stat queries, call `invalidateTaskDependents(client)`, and assert all four roots are stale while `userKeys.me()` remains untouched.

```ts
it("invalidates task dependents without invalidating the current user", async () => {
  const client = new QueryClient();
  client.setQueryData(taskKeys.list({}), []);
  client.setQueryData(projectKeys.list(), []);
  client.setQueryData(categoryKeys.list(), []);
  client.setQueryData(statKeys.summary(), { totalTasks: 0 });
  client.setQueryData(userKeys.me(), { email: "a@example.com" });

  await invalidateTaskDependents(client);

  expect(client.getQueryState(taskKeys.list({}))?.isInvalidated).toBe(true);
  expect(client.getQueryState(projectKeys.list())?.isInvalidated).toBe(true);
  expect(client.getQueryState(categoryKeys.list())?.isInvalidated).toBe(true);
  expect(client.getQueryState(statKeys.summary())?.isInvalidated).toBe(true);
  expect(client.getQueryState(userKeys.me())?.isInvalidated).toBe(false);
});
```

- [ ] **Step 7: Implement mutation hooks and invalidation policy**

Create invalidation helpers:

```ts
export const invalidateTaskDependents = async (client: QueryClient) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: taskKeys.all }),
    client.invalidateQueries({ queryKey: projectKeys.all }),
    client.invalidateQueries({ queryKey: categoryKeys.all }),
    client.invalidateQueries({ queryKey: statKeys.all }),
  ]);
};
```

Add create/update/delete/start/finish/give-up/restore task hooks; create/update/delete project hooks; create/update/delete category hooks; update-profile/change-password hooks; login/register/logout hooks; and AI chat/generate-task hooks. Non-calendar hooks may invalidate on success. AI task generation invalidates task, project, category, and stat roots.

Define and test the invalidation matrix rather than allowing hook-local choices:

| Mutation | Invalidated roots |
| --- | --- |
| task create/update/status/delete | task, project, category, stat |
| project create | project, task, stat |
| project update/delete | task, project, category, stat |
| category create | category, task, stat |
| category update/delete | task, project, category, stat |
| AI task generation | task, project, category, stat |
| profile update | `userKeys.me()` via direct cache replacement |

Export `invalidateWorkspaceQueries(client)` for task/project/category/stat roots and use it from AI task generation and the temporary refresh compatibility hook.

The update-profile mutation normalizes `response.user ?? response`, calls `useAuthStore.getState().syncUser(user)`, and calls `queryClient.setQueryData(userKeys.me(), user)`. Test that Topbar/store state, legacy local storage, and the user query all receive the same returned user.

Login/register call `queryClient.removeQueries()` before `setSession` so a replacement session cannot see old data. Use `removeQueries()` instead of `clear()` to avoid destroying the Mutation Cache. Migrate `AuthPage.jsx` to these hooks in this task so no direct login/register path bypasses the cache-removal contract. Logout posts through `authService.logout()` and, in `finally`, calls `queryClient.removeQueries()` and `clearSession()`.

- [ ] **Step 8: Verify state/query foundations**

Run:

```bash
pnpm exec vitest run src/stores src/features/tasks/api src/features/categories/api src/app/AuthCacheBoundary.test.tsx
pnpm lint
pnpm build
```

Expected: all new tests PASS and the existing application still renders beneath `QueryProvider`.

- [ ] **Step 9: Commit query-state foundations**

```bash
git add frontend/src/app frontend/src/stores frontend/src/features frontend/src/context frontend/src/App.jsx
git commit -m "feat(frontend): add query state and domain hooks"
```

---

### Task 4: Preserve calendar optimism and migrate server-state consumers

**Files:**
- Create: `frontend/src/features/calendar/api/calendarRanges.ts`
- Create: `frontend/src/features/calendar/api/calendarCache.ts`
- Create: `frontend/src/features/calendar/api/useCalendarMutations.ts`
- Test: `frontend/src/features/calendar/api/calendarCache.test.ts`
- Test: `frontend/src/features/calendar/api/useCalendarMutations.test.tsx`
- Modify: `frontend/src/page/TodoPage.jsx`
- Modify: `frontend/src/page/CalendarPage.jsx`
- Modify: `frontend/src/page/CategoryPage.jsx`
- Modify: `frontend/src/page/ProfilePage.jsx`
- Modify: `frontend/src/page/StatisticsPage.jsx`
- Modify: every JSX consumer currently importing `apiService` or `useTaskRefresh`
- Modify: `frontend/src/utils/taskCompletion.js`
- Modify: `frontend/src/context/useTaskRefresh.js`

**Interfaces:**
- Produces: `getBufferedCalendarRange`, `getVisibleCalendarRange`, normalized `CalendarRangeParams`, and cache update/snapshot helpers.
- Produces: `useCalendarMutations()` with optimistic `changeTaskStatus`, `deleteTask`, `changeTaskDueDate`, `copyTask`, and `changeProjectStatus` mutations.
- Removes: page-owned copies of task/project/category/stat server data and numeric refresh dependencies.

- [ ] **Step 1: Extract and characterize calendar range/cache utilities**

Move the current pure range, entity ID, merge, replace, and due-date-in-range functions out of `CalendarPage.jsx`. Test merging by `_id`/`id`, removal when a task loses its due date, and stable ISO range generation.

- [ ] **Step 2: Write failing optimistic cache tests**

Use a fresh `QueryClient` with one calendar task list and one project list. First characterize pure snapshot/write/restore helpers:

```ts
it("restores a calendar task snapshot after a rejected due-date move", () => {
  const client = new QueryClient();
  const key = taskKeys.calendar({
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.999Z",
  });
  const task = { ...makeTask("t1"), dueDate: "2026-08-14T09:00:00.000Z" };
  client.setQueryData(key, [task]);

  const snapshot = snapshotTaskCollections(client);
  upsertTaskInCollections(client, { ...task, dueDate: "2026-08-15T09:00:00.000Z" });
  expect(client.getQueryData<Task[]>(key)?.[0].dueDate).toBe("2026-08-15T09:00:00.000Z");

  restoreSnapshot(client, snapshot);
  expect(client.getQueryData<Task[]>(key)?.[0].dueDate).toBe("2026-08-14T09:00:00.000Z");
});

it("replaces a collision-safe temporary copy with the server task", () => {
  const client = new QueryClient();
  const key = taskKeys.calendar({
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.999Z",
  });
  client.setQueryData(key, []);
  vi.stubGlobal("crypto", { randomUUID: () => "temp-uuid" });
  const temporaryId = `optimistic-${crypto.randomUUID()}`;
  const optimisticTask = { ...makeTask(temporaryId), dueDate: "2026-08-15T09:00:00.000Z" };
  const serverTask = { ...optimisticTask, _id: "server-task" };

  upsertTaskInCollections(client, optimisticTask);
  expect(client.getQueryData<Task[]>(key)?.map((task) => task._id)).toEqual([temporaryId]);
  upsertTaskInCollections(client, serverTask, temporaryId);
  expect(client.getQueryData<Task[]>(key)?.map((task) => task._id)).toEqual(["server-task"]);
});
```

Then use `renderHook` with a `QueryClientProvider`, deferred service promises, and the real `useCalendarMutations` hook to assert the full lifecycle: optimistic state exists before resolution; rejected due-date, delete, and project-status requests restore their snapshots; a successful copy replaces the temporary ID; status transitions choose finish/start/restore/give-up endpoints correctly; and every settlement invalidates the documented roots. Restore the stubbed `crypto` after each test (Vitest also uses `unstubGlobals: true`).

- [ ] **Step 3: Implement reusable optimistic cache helpers**

Snapshot all matching task collections and the project list before writing:

```ts
interface CacheSnapshot<T> { entries: Array<[QueryKey, T | undefined]>; }

const snapshotTaskCollections = (client: QueryClient) => ({
  entries: client.getQueriesData<Task[]>({ queryKey: taskKeys.calendarRoot() }),
});
```

Implement `restoreSnapshot`, `upsertTaskInCollections`, `removeTaskFromCollections`, and `replaceProjectInList`. Avoid applying array transforms to detail-query cache values.

Optimistic collection updates must be **filter-aware for calendar range queries**. Before inserting or retaining a task in a calendar collection, evaluate whether its `dueDate` falls within the `{ startDate, endDate }` range encoded in that query key. Remove the task from a calendar cache when its updated `dueDate` falls outside the cached range (e.g., when dragging a task to a different month).

Do not optimistically write `taskKeys.lists()` caches: the key factory supports future status/project filters, and blind insertion would corrupt filtered results. Existing non-calendar views were not optimistic before this migration, so invalidate those list caches on settlement instead.

- [ ] **Step 4: Implement calendar mutations using the full React Query lifecycle**

For every optimistic hook:

1. `onMutate` cancels affected task/project roots, captures snapshots, and writes the optimistic entity.
2. `onError` restores every captured key.
3. `onSuccess` replaces the optimistic entity with the normalized server entity.
4. `onSettled` calls the relevant invalidation helper.

Create copied task IDs with:

```ts
const temporaryId = `optimistic-${crypto.randomUUID()}`;
```

The status mutation selects `finishTask`, `startTask`, `restoreTask`, or `giveUpTask` based on current and next status exactly as the current page does.

- [ ] **Step 5: Migrate route pages to query data**

Keep local UI state such as modals, search text, selected status/view/project, calendar date, and view mode. Replace only backend-derived state:

- `TodoPage`: `useTasksQuery`, `useProjectsQuery`, and task/project mutation hooks; retry calls both query `refetch` functions.
- `CategoryPage`: `useCategoriesQuery`, `useProjectsQuery`, and `useTasksQuery`; remove both fetch effects and `refreshTrigger`.
- `CalendarPage`: `useCalendarTasksQuery(buffered ISO range)`, `useProjectsQuery`, and `useCalendarMutations`; use `placeholderData` to keep prior tasks during adjacent navigation; remove `cachedRanges`, `runCalendarMutation`, and manual cache state.
- `ProfilePage`: `useCurrentUserQuery`, `useTasksQuery`, `useCategoriesQuery`, update-profile mutation, and change-password mutation; derive stats with `useMemo`.
- `StatisticsPage`: `useStatsQuery`; retry uses `refetch`.

All query hooks must pass the React Query `signal` through to the Axios service call so that `cancelQueries()` in `onMutate` can actually abort in-flight requests, preventing stale responses from overwriting optimistic cache data:

```ts
useQuery({
  queryKey: taskKeys.calendar(range),
  queryFn: ({ signal }) => taskService.getTasksByDateRange(range.startDate, range.endDate, { signal }),
});
```

After all pages are migrated, replace `useTaskRefresh` with a React Query invalidation wrapper:

```ts
export const useTaskRefresh = () => {
  const queryClient = useQueryClient();
  return {
    triggerRefresh: () => invalidateWorkspaceQueries(queryClient),
  };
};
```

This maintains the same call-site API for remaining leaf consumers (e.g., chat components) while routing through React Query invalidation. Leave the now-unused provider mounted until the consolidated provider cleanup in Task 6 so this checkpoint changes only server-state ownership.

Strip `MainLayout` wrappers only in Task 6 when the router outlet exists.

- [ ] **Step 6: Migrate leaf service consumers to hooks**

Update these groups without converting their JSX syntax:

- Task forms/dialogs/cards use task/category/project query and mutation hooks.
- Category and project cards use category/project/task mutation hooks.
- `ActivityHeatmap` uses an enabled activity-detail query keyed by selected date.
- `AvatarUpload` uses the update-profile mutation and synchronizes `userKeys.me()`.
- `DetailRequestModal` and chat use AI mutation hooks.
- Chat task generation invalidates workspace queries through `useTaskRefresh().triggerRefresh` until that compatibility hook is removed in Task 6.
- Sidebar uses the logout mutation so cache and session always clear in `finally`.
- Replace every `error.response`, `error.request`, and Axios-specific timeout branch with `ApiError.status`, `ApiError.kind`, `ApiError.code`, or `getApiErrorMessage`. Preserve the current auth, AI timeout/network, and backend-message copy with characterization tests.
- Make `utils/taskCompletion.js` pure (task ID and next-status selection only); all HTTP calls move into task mutation hooks. No utility or component may import the transitional API barrel after this step.

Do not leave direct `apiService` calls in page, feature, component, or utility files; the only temporary non-hook service consumer is the Task 2 authentication compatibility provider, which Task 6 removes.

- [ ] **Step 7: Run migration checks**

Run:

```bash
rg -n "refreshTrigger|api/apiService|error\.response|error\.request" src
pnpm exec vitest run src/features/calendar/api src/features/tasks/api src/shared/services/apiError.test.ts
pnpm lint
pnpm build
```

Expected: ripgrep returns no legacy server-refresh/API/Axios-error consumers, optimistic lifecycle tests PASS, lint PASS, and build PASS.

- [ ] **Step 8: Commit server-state migration**

```bash
git add frontend/src
git commit -m "refactor(frontend): migrate server state to React Query"
```

---

### Task 5: Move source into feature and shared ownership boundaries

**Files:**
- Move: files listed in **Target File Map**
- Create: `frontend/src/features/*/index.ts`
- Modify: all moved-file imports
- Delete after moves: empty `frontend/src/page`, `frontend/src/feature`, `frontend/src/component`, `frontend/src/layout`, and `frontend/src/utils` directories
- Delete after compatibility expires: `frontend/src/api/*`

**Interfaces:**
- Produces: imports through `@/features`, `@/shared`, `@/stores`, and same-feature relative paths.
- Preserves: all default component exports so the later lazy routes resolve without UI changes.

- [ ] **Step 1: Move shared shell, chat, services, and utilities**

Move `Sidebar`, `Topbar`, `DateTimeInput`, `ErrorBoundary`, `MainLayout`, and shared utility files to the exact targets in the file map. Move the stateful chat assistant to `features/tasks/components/chat` so shared code never imports feature mutation/key modules. Move `App.css` to `styles/app.css` and `index.css` to `styles/index.css`; keep both files and `styles/auth.css`/`styles/landing.css` byte-for-byte unchanged. Update imports to `@/` aliases.

- [ ] **Step 2: Move authentication, landing, profile, statistics, and error modules**

Move pages and leaf components to their feature folders. Add an `index.ts` per feature that exports its page. Use feature-relative imports for feature-owned components and `@/shared/...` for cross-feature dependencies.

- [ ] **Step 3: Move task, project, dialog, category, and calendar modules**

Use these ownership rules:

- Project cards/forms belong to `features/tasks` because the approved spec groups task/project editing there.
- The reusable current `Category/TaskCard.jsx` belongs to `features/tasks`; category screens import it one-way, and project components never import the categories component barrel.
- Remaining category-specific cards belong to `features/categories`.
- Calendar-only view components and `calendarUtils.js` belong to `features/calendar`.
- Shared drag/date/project-color/project-status helpers remain under `shared/utils` because at least three features consume them.
- Import specific cross-feature API/component files rather than feature barrels where a barrel would create a tasks/categories evaluation cycle.

- [ ] **Step 4: Replace transitional API imports and delete old re-export files**

Run `rg -n "@/api|src/api|\.\./api|\.\./\.\./api" src`. Replace every result with focused `@/shared/services` or feature hook imports. Delete `src/api` only when ripgrep shows no consumers.

- [ ] **Step 5: Verify ownership and imports**

Run:

```bash
rg -n "src/(page|feature|component|layout|api)|from ['\"][.][.]/(page|feature|component|layout|api)" src
pnpm lint
pnpm build
```

Expected: no imports from the directories retired in this task; the temporary auth/refresh compatibility files under `src/context` remain until Task 6; lint PASS and build PASS.

- [ ] **Step 6: Commit structural moves separately**

```bash
git add frontend/src
git commit -m "refactor(frontend): organize source by feature ownership"
```

---

### Task 6: Data router, auth bootstrap, shared outlet layout, and provider cleanup

**Files:**
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/AuthBootstrap.tsx`
- Modify: `frontend/src/app/AuthCacheBoundary.tsx`
- Create: `frontend/src/app/routeGuards.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/features/auth/routes.tsx`
- Create: `frontend/src/features/tasks/routes.tsx`
- Create: `frontend/src/features/calendar/routes.tsx`
- Create: `frontend/src/features/categories/routes.tsx`
- Create: `frontend/src/features/profile/routes.tsx`
- Create: `frontend/src/features/statistics/routes.tsx`
- Create: `frontend/src/features/landing/routes.tsx`
- Create: `frontend/src/features/errors/routes.tsx`
- Modify: `frontend/src/shared/layouts/MainLayout.jsx`
- Rename: `frontend/src/main.jsx` to `frontend/src/main.tsx`
- Modify: `frontend/index.html`
- Delete: `frontend/src/App.jsx`
- Delete: `frontend/src/route/AppRouter.jsx`
- Delete: `frontend/src/context/*`
- Test: `frontend/src/app/routeGuards.test.tsx`
- Test: `frontend/src/app/AuthBootstrap.test.tsx`
- Modify: `frontend/src/app/AuthCacheBoundary.test.tsx`

**Interfaces:**
- Produces: `browserRouter`, `ProtectedGuard`, `PublicOnlyGuard`, `RootGuard`, `AuthBootstrap`, and `AuthCacheBoundary`.
- Produces: one lazy route array per feature and a single protected `MainLayout` outlet.
- Removes: all Context providers, manual refresh context, and nested per-page layout shells.

- [ ] **Step 1: Write failing route-guard tests**

Export pure decision helpers used by the guard components and test every state before rendering integration tests:

```ts
describe("route guard decisions", () => {
  it("waits until authentication bootstrap completes", () => {
    expect(getProtectedDecision({ isAuthReady: false, token: null })).toBe("loading");
    expect(getPublicOnlyDecision({ isAuthReady: false, token: "token" })).toBe("loading");
  });

  it("redirects protected guests and admits authenticated users", () => {
    expect(getProtectedDecision({ isAuthReady: true, token: null })).toBe("/login");
    expect(getProtectedDecision({ isAuthReady: true, token: "token" })).toBe("outlet");
  });

  it("redirects authenticated users away from public-only routes", () => {
    expect(getPublicOnlyDecision({ isAuthReady: true, token: "token" })).toBe("/dashboard");
    expect(getPublicOnlyDecision({ isAuthReady: true, token: null })).toBe("outlet");
  });

  it("selects the root destination", () => {
    expect(getRootDecision({ isAuthReady: true, token: "token" })).toBe("/dashboard");
    expect(getRootDecision({ isAuthReady: true, token: null })).toBe("landing");
  });
});
```

Then render each guard inside a memory router, reset `useAuthStore` between tests, and use a probe route to assert `/login` and `/dashboard` navigation plus the visible session-check loading copy.

- [ ] **Step 2: Implement guards against Zustand state**

`ProtectedGuard`, `PublicOnlyGuard`, and `RootGuard` render `<Outlet />` on success. `RootGuard` redirects authenticated users to `/dashboard` and admits guests to the lazy landing child route. All three share one `AuthLoadingScreen`. Derive `isAuthenticated` from `Boolean(token)`; never duplicate that flag in persisted state.

- [ ] **Step 3: Write failing bootstrap tests for terminal and non-terminal failures**

Mock `authService.getMe` and assert:

- no stored token skips the request and marks ready;
- success calls `syncUser` and marks ready;
- `ApiError` status 401/403 clears the session and marks ready;
- network/no-status and status 500 failures retain token/user and mark ready.

The bootstrap query must not retry terminal 401 responses:

```ts
retry: (failureCount, error) =>
  error instanceof ApiError && ![401, 403].includes(error.status ?? 0) && failureCount < 1
```

- [ ] **Step 4: Implement AuthBootstrap and confirm session cache isolation**

Use a disabled-by-default current-user query enabled only when a token exists. Use the `retry` function above to skip retries on 401/403. In effects, synchronize or conditionally clear based on terminal status; always mark ready after the query settles.

Retain the Task 3 render-blocking `AuthCacheBoundary` unchanged unless bootstrap integration tests reveal a defect. It watches `sessionRevision`, gates children during a changed revision, clears user-scoped queries in a layout effect, and only then releases the new session UI. This distinguishes login/logout/replacement from token rotation/profile sync.

Use `removeQueries()` instead of `clear()` because the requirement is to clear user-scoped query data, not mutation state.

Add tests that:
- cache user A data, call `setSession` with user B credentials, and assert query cache is empty;
- cache data, call `clearSession`, and assert query cache is empty;
- cache data, call `updateTokens` (token rotation), and assert query cache is **preserved**;
- cache data, call `syncUser`, and assert query cache is **preserved**.

- [ ] **Step 5: Add lazy feature route objects and compose the router**

Each feature route uses React Router's `RouteObject.lazy` property (not `React.lazy`) to defer loading route modules until navigation. The route definition file exports a `lazy` function that resolves to the `Component` (and optionally `loader`/`action`). Supply the shared session/loading treatment through `RouterProvider.fallbackElement` for initial lazy route discovery, and add a root `errorElement` backed by the existing error page. Compose:

```tsx
const routes: RouteObject[] = [
  { element: <RootGuard />, children: [...landingRoutes] },
  { element: <PublicOnlyGuard />, children: [...authRoutes] },
  {
    element: <ProtectedGuard />,
    children: [{ element: <MainLayout assistant={<ChatBubble />} />, children: [
      ...taskRoutes,
      ...categoryRoutes,
      ...calendarRoutes,
      ...statisticsRoutes,
      ...profileRoutes,
    ] }],
  },
  ...errorRoutes,
];
```

Maintain exact paths `/login`, `/register`, `/dashboard`, `/categories`, `/calendar`, `/statistics`, `/profile`, explicit error paths, and wildcard 404.

- [ ] **Step 6: Convert MainLayout to one outlet shell**

Replace the `children` prop with `<Outlet />` and accept an optional `assistant` slot rendered after the shell. The shared layout never imports feature code; the app router injects the task assistant. Remove `MainLayout` and chat wrappers from every protected page, including loading/error branches, without altering their inner page markup.

- [ ] **Step 7: Compose the final application entry**

`App.tsx` composition:

```tsx
export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthCacheBoundary>
          <AuthBootstrap>
            <RouterProvider router={browserRouter} />
          </AuthBootstrap>
        </AuthCacheBoundary>
      </QueryProvider>
    </ErrorBoundary>
  );
}
```

`main.tsx` imports both `@/styles/index.css` and `@/styles/app.css`, then renders `<App />` under `StrictMode`. Feature pages continue importing `auth.css` and `landing.css` from their new alias paths. Update `index.html` from `/src/main.jsx` to `/src/main.tsx` in the same step so the checkpoint boots.

- [ ] **Step 8: Remove obsolete providers and compatibility hooks**

Replace remaining `useAuth`, `useTaskFilter`, and `useTaskRefresh` compatibility imports with direct store/query hooks. Delete `src/context`, old router, and old `App.jsx` only after:

```bash
rg -n "AuthProvider|TaskFilterProvider|TaskRefreshProvider|refreshTrigger|useTaskRefresh|src/context|@/context" src
```

returns no matches.

- [ ] **Step 9: Verify routes, bootstrap, and production build**

Run:

```bash
pnpm exec vitest run src/app
pnpm lint
pnpm build
```

Expected: guard/bootstrap/cache tests PASS, lint PASS, and production build PASS with lazy route chunks.

- [ ] **Step 10: Commit application composition**

```bash
git add frontend/index.html frontend/src
git commit -m "refactor(frontend): compose lazy feature routes"
```

---

### Task 7: Feature generator, architecture guide, and end-to-end verification

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/README.md`
- Create: `frontend/scripts/create-feature.mjs`
- Create: `frontend/docs/architecture.md`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/app.spec.ts`
- Modify if verification finds issues: affected `frontend/src/**/*`

**Interfaces:**
- Produces: `pnpm create-feature <kebab-name>` generating a page, `routes.tsx`, `index.ts`, `components/`, and `api/` under `src/features/<name>`.
- Documents: ownership rules, import direction, state ownership, query-key rules, optimistic mutation lifecycle, commands, and staged TypeScript policy.

- [ ] **Step 1: Implement a validated feature generator**

Accept only `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`, refuse to overwrite an existing directory, derive a PascalCase component name, and generate:

```text
src/features/<name>/
├── <PascalName>Page.tsx
├── api/index.ts
├── components/index.ts
├── index.ts
└── routes.tsx
```

The generated route exports `<camelName>Routes: RouteObject[]`, uses `RouteObject.lazy`, and uses `path: "/<name>"`. Add `"create-feature": "node ./scripts/create-feature.mjs"` to package scripts. Support `--dry-run` to print target paths without writing files, and ignore a standalone `--` argument so both pnpm invocation styles work.

- [ ] **Step 2: Verify generator validation and dry-run output**

Run:

```bash
pnpm create-feature -- sample-feature --dry-run
pnpm create-feature -- Invalid_Name --dry-run
```

Expected: the first command lists five target files and exits 0; the second prints the kebab-case requirement and exits non-zero without creating files.

- [ ] **Step 3: Replace the template README and add architecture documentation**

Document:

- development, test, lint, typecheck, build, preview, and feature-generation commands;
- `app -> features -> shared` import direction, with stores/query infrastructure explicitly allowed where consumed;
- when code belongs in a feature versus shared;
- Zustand for client state and React Query for server state;
- the exact query-key factories and rule against ad hoc keys;
- optimistic mutation snapshot/rollback/reconcile/invalidate lifecycle;
- local environment variables and unchanged Docker behavior;
- the mixed TS/JS rule and how to convert leaf components later.

- [ ] **Step 4: Add reproducible browser automation**

Run `pnpm add -D @playwright/test@^1.55.0`, add `"test:e2e": "playwright test"`, include `playwright.config.ts` in `tsconfig.node.json`, and configure Chromium with `baseURL: "http://127.0.0.1:5000"` plus a web server command of `pnpm dev`. The test suite intercepts `/api/**` so it needs no MongoDB, API key, or pre-existing account:

- guest landing and protected redirect use empty auth storage;
- authenticated tests seed the three legacy storage keys with `page.addInitScript` and mock `/api/auth/me`, task, project, category, and stat responses;
- login/register submit against mocked success envelopes and assert `/dashboard`;
- optimistic rollback delays then rejects the relevant task/project request and asserts the pre-mutation UI returns;
- AI task generation uses a mocked success envelope and asserts the invalidated task query refetches;
- every test fails on uncaught `pageerror` or unexpected console error.

Run `pnpm exec playwright install chromium` once during setup. During execution, use the repository's `webapp-testing` skill for browser diagnostics and screenshots if a smoke flow fails.

- [ ] **Step 5: Run the complete automated verification suite**

Run from `frontend`:

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
```

Expected: every command exits 0. Record test totals and the Vite output summary for handoff.

- [ ] **Step 6: Run optional live-backend smoke tests**

When MongoDB and valid backend environment values are available, start the existing frontend/backend development stack and verify these additional live flows:

1. Guest `/` renders landing; `/dashboard` redirects to `/login`.
2. `/login` and `/register` switch without route or style regressions.
3. A valid stored session restores through `/api/auth/me` before protected UI renders.
4. Authenticated `/login` redirects to `/dashboard`.
5. Dashboard, categories, calendar, statistics, and profile navigation render inside one shell.
6. Task status, due-date drag, delete, copy, and project-status changes update optimistically.
7. AI task generation updates task-backed views through query invalidation when `AI_API_KEY` is configured.
8. Logout clears persisted session and user-scoped cache, then returns to `/`.

Capture browser console errors and fix any regression before completion. Report unavailable credentials/services as skipped live checks; the deterministic mocked Playwright suite remains mandatory.

- [ ] **Step 7: Check architecture invariants mechanically**

Run:

```bash
rg -n "refreshTrigger|TaskRefreshContext|AuthContext|TaskFilterContext|src/(page|feature|component|layout|context|api)" src
rg -n "from ['\"]@/app" src/shared src/features
rg -n "queryKey:\s*\[" src/features -g '!**/*Keys.ts' -g '!**/*.test.*'
git diff --check
git status --short
```

Expected: no legacy state/directory references; no shared/feature imports from app; no ad hoc feature query arrays outside key-factory definitions/tests; no whitespace errors; and a clean worktree after the final commit.

- [ ] **Step 8: Commit documentation, browser tests, and final corrections**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/tsconfig.node.json frontend/README.md frontend/docs frontend/scripts frontend/playwright.config.ts frontend/e2e frontend/src
git commit -m "docs(frontend): codify feature architecture workflow"
```

- [ ] **Step 9: Prepare the completion handoff**

Report the implemented architecture, preserved behaviors, exact automated/browser verification performed, commit list, and any untested external dependency such as unavailable backend credentials. Do not claim browser flows passed if a runnable authenticated environment was unavailable.

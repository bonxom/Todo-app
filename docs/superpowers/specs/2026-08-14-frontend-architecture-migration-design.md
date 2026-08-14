# Frontend Architecture Migration Design

## Context

`TodoApp/frontend` is a React 19 and Vite 7 application whose current source is organized across generic `page`, `feature`, `component`, `context`, `api`, `layout`, and `utils` directories. The application works, but ownership boundaries are unclear: pages fetch server data directly, one API module contains every domain service, route configuration imports every page eagerly, and manual refresh counters coordinate server-state updates.

`merchant-cms` demonstrates a clearer model built around feature-owned modules, a small shared layer, centralized application composition, lazy route objects, explicit environment configuration, and dedicated state-management tools. TodoApp will adopt those structural principles without copying merchant-specific UI libraries or business behavior.

## Goals

- Organize the frontend around cohesive feature modules with explicit shared infrastructure.
- Add a TypeScript foundation while allowing existing complex JSX leaf components to migrate incrementally.
- Move client-owned state to Zustand and backend-derived state to React Query.
- Replace manual refresh signaling with query invalidation.
- Centralize application providers, routing, route guards, environment configuration, and API transport.
- Preserve current routes, rendered UI, styling, assets, API contracts, authentication semantics, and backend behavior.
- Add focused automated tests for the new architectural foundation.
- Make the intended structure repeatable through documentation and a feature generator.

## Non-Goals

- Converting every existing JSX component to TypeScript in this stage.
- Redesigning the user interface or changing product behavior.
- Adopting Ant Design, shadcn/ui, i18n, or other merchant-cms-specific dependencies.
- Changing backend endpoints, payloads, authentication contracts, or domain rules.
- Rewriting stable feature UI merely to conform to a different component style.

## Architecture

The source tree will use the following top-level boundaries:

```text
src/
├── app/                 # Application startup, providers, router, guards, query client
├── config/              # Typed environment access
├── features/            # Route-level business modules
│   ├── auth/
│   ├── calendar/
│   ├── categories/
│   ├── errors/
│   ├── landing/
│   ├── profile/
│   ├── statistics/
│   └── tasks/
├── shared/              # Cross-feature components, layouts, services, utilities
│   ├── components/
│   ├── layouts/
│   ├── services/
│   └── utils/
├── stores/              # Zustand stores for client-owned state
├── styles/              # Global and cross-feature styles
└── main.tsx             # Browser entry point
```

Feature directories own their route page, route definition, feature-specific components, React Query hooks, and domain-only utilities. Cross-feature code belongs in `shared` only when multiple features genuinely depend on it. `app` composes the system but contains no domain behavior.

Vite and TypeScript will define `@/` as an alias for `src/`. TypeScript will use bundler module resolution, React JSX support, strict checks for TypeScript files, and `allowJs` so existing JSX remains part of the build during the staged migration.

## Feature Migration

Existing code will move according to domain ownership:

- Authentication pages and form components move to `features/auth`.
- Dashboard/todo pages and task/project editing components move to `features/tasks`.
- Calendar, category, profile, statistics, landing, and error pages move into matching feature directories with their components.
- Generic shell components such as `Sidebar`, `Topbar`, `DateTimeInput`, and `ErrorBoundary` move under `shared`.
- `MainLayout` moves to `shared/layouts` and renders an `<Outlet />` for protected feature routes.
- Cross-domain utilities move to `shared/utils`; domain-only utilities stay beside their feature.

Complex leaf UI stays JSX in this stage. New application infrastructure, route definitions, stores, query hooks, configuration, and tests use TypeScript.

## Application Composition

`src/app/App.tsx` will contain the root provider composition. The browser entry point imports global styles and renders the application. Provider order will ensure that React Query is available to authentication bootstrap and every feature route.

The application-level units are:

- A configured `QueryClient` with conservative retry and refetch defaults.
- A root error boundary for unexpected render failures.
- An authentication bootstrap component that validates a persisted session before protected routing resolves.
- A `RouterProvider` using the central browser router.

The obsolete task refresh provider will be removed after consumers use query invalidation. Authentication and task-filter contexts will be replaced by Zustand-backed hooks.

## State Ownership

### Authentication

`useAuthStore` owns the access token, refresh token, current user, authentication readiness, and session actions. Its persisted representation uses the existing local-storage keys (`token`, `refreshToken`, and `user`) so current sessions remain compatible.

The Zustand authentication store is the in-memory source of truth for the active session. The existing local-storage entries are its persisted representation, not a separate source of application state. Every session change must update both the in-memory store and local storage through shared session actions. This includes login, registration, logout, profile synchronization, and refresh-token rotation.

The store exposes actions equivalent to the current context contract:

- `setSession` updates the in-memory and persisted session (tokens and user information).
- `updateTokens` synchronizes rotated access and refresh tokens without replacing the current user.
- `clearSession` removes all in-memory and persisted authentication state.
- `syncUser` updates the current user and persisted user record.
- `setAuthReady` marks session restoration complete.

An authentication bootstrap query calls `/api/auth/me` when a stored access token exists. Success synchronizes the returned user. Terminal failure clears the session. In either case, bootstrap marks authentication ready.

The Axios transport may access the store through the framework-independent `useAuthStore.getState()` API, but must not call React hooks or depend on React rendering. The existing single-flight refresh queue, rotated refresh-token persistence, AI timeout, terminal-401 cleanup, and auth redirects remain intact. After a successful token refresh, the interceptor must update both Zustand and local storage through `updateTokens` before processing the queued requests.

Terminal authentication failure clears the Zustand session, removes all persisted authentication values, rejects the pending refresh queue, and redirects to `/login`. Network failures and server-side 5xx responses are not terminal authentication failures and must not automatically clear a valid persisted session.

Logout and replacement of one authenticated session with another must remove all user-scoped React Query data so cached data from a previous user cannot be exposed to the next session.

### Task Filtering

`useTaskFilterStore` owns the `onlyInProgress` preference and exposes setter, toggle, and filtering behavior. Compatibility hooks keep the existing component call sites stable while the underlying context provider is removed.

### Server State

React Query owns tasks, projects, categories, statistics, and user-derived backend data. Every domain defines a typed query-key factory. Query hooks fetch data through focused service modules; mutation hooks call the corresponding service and invalidate affected keys on success.

Invalidation must follow domain effects rather than a global counter. A task mutation may invalidate:

- task collections and task details;
- project task collections and project summaries;
- category task views;
- calendar date-range views;
- statistics summaries and activity data.

This replaces `TaskRefreshContext` and its incrementing `refreshTrigger`.

#### Query Keys

Every server-state domain defines a typed query-key factory. Components and mutation hooks must not construct ad hoc query keys.

The minimum key hierarchy is:

- `taskKeys.all`
- `taskKeys.lists()`
- `taskKeys.list(filters)`
- `taskKeys.detail(taskId)`
- `taskKeys.calendar({ startDate, endDate })`
- `projectKeys.all`
- `projectKeys.list()`
- `projectKeys.detail(projectId)`
- `projectKeys.tasks(projectId)`
- `categoryKeys.all`
- `categoryKeys.list()`
- `categoryKeys.detail(categoryId)`
- `categoryKeys.tasks(categoryId)`
- `statKeys.all`
- `statKeys.summary()`
- `statKeys.activity(filters)`
- `userKeys.me()`

Query-key parameters must be serializable and normalized. Dates use stable string representations, and optional filters must be normalized before being included in a key.

#### Optimistic Updates

Existing optimistic user interactions must be preserved during the React Query migration. Calendar task and project mutations currently update the interface before the request completes and roll back when the request fails; this behavior must not be replaced by invalidation-only mutations.

Optimistic mutations use the React Query lifecycle as follows:

- `onMutate` cancels affected queries, captures their previous cached values, and applies the optimistic update with `setQueryData`.
- `onError` restores the captured cache snapshot.
- `onSuccess` replaces temporary or optimistic entities with the server response when necessary.
- `onSettled` invalidates affected queries to reconcile the cache with the server.

Temporary entities created optimistically must use collision-safe temporary IDs (such as nanoid or crypto.randomUUID) and must be replaced or removed after the request settles.

Invalidation-only mutations remain acceptable where the existing UI does not provide optimistic behavior.

## Service Layer

The existing monolithic `apiService.js` will be split into focused modules under `shared/services`:

- `httpClient` owns Axios configuration and interceptors.
- `authStorage` owns storage serialization and cleanup.
- `authService`, `taskService`, `categoryService`, `projectService`, `userService`, `aiService`, and `statService` own endpoint calls for one domain each.
- A barrel export provides a stable transitional import surface for JSX components.

Existing project normalization and task payload helpers remain behaviorally unchanged and move to the most specific shared or feature-owned location supported by their consumers.

API errors will be normalized to `Error` instances with useful messages. Components retain their current user-facing error handling. Unexpected render errors continue to be caught by the root error boundary.

## Routing

React Router's data-router API will replace the component-level `<BrowserRouter>` and `<Routes>` tree. Each route-owning feature exports lazy-loaded route objects. The central router composes them into these boundaries:

- `/` remains the public landing/root redirect behavior.
- `/login` and `/register` are public-only routes and redirect authenticated users to `/dashboard`.
- `/dashboard`, `/categories`, `/calendar`, `/statistics`, and `/profile` are protected routes rendered inside one shared `MainLayout`.
- `/403`, `/404`, `/500`, and `/503` remain explicit error routes.
- The wildcard route renders the 404 screen.

Route guards wait until authentication bootstrap completes. While waiting, they render the existing session-check loading treatment. Guests accessing protected routes are redirected to `/login`; authenticated users accessing public-only auth routes are redirected to `/dashboard`.

Lazy route elements use a shared loading fallback so chunk loading does not show a blank page.

## Testing and Verification

The frontend will add Vitest, Testing Library, and jsdom. Tests focus on architectural behavior with high regression value:

- persisted authentication hydration and session actions;
- authentication bootstrap success and terminal failure;
- protected and public-only guard decisions;
- task-filter store actions and filtering;
- domain query-key stability and mutation invalidation;
- environment default and override behavior;
- service/storage compatibility for existing local sessions.

ESLint will cover JavaScript, JSX, TypeScript, and TSX. The production build will run TypeScript checking before Vite bundling. Final verification includes lint, unit tests, the production build, and browser smoke tests for landing, login/register redirects, protected navigation, session restoration, logout, and task updates.

## Migration Sequence

1. Add TypeScript, testing, aliases, environment configuration, and app-level foundations.
2. Split shared services while preserving the transitional barrel API.
3. Add Zustand stores and migrate authentication and filtering consumers.
4. Add the React Query client, query-key factories, domain query/mutation hooks, and invalidation behavior.
5. Move pages and components into feature/shared ownership boundaries and update imports.
6. Replace routing with lazy feature route objects and a shared outlet layout.
7. Remove obsolete contexts and refresh-counter code after all consumers migrate.
8. Add the feature generator and architecture documentation.
9. Run automated checks and browser smoke tests, fixing regressions without changing UI behavior.

Each sequence step must leave the application buildable or have an immediately paired compatibility layer. File moves and behavioral state migration should not be combined blindly: imports are updated and verified at each boundary.

## Success Criteria

- The frontend builds and runs with the same route URLs and visible behavior.
- New infrastructure and state/query modules are TypeScript and pass strict type checking.
- Existing JSX leaf components remain supported through `allowJs`.
- Authentication persists and restores sessions using the existing storage keys.
- Token refresh remains single-flight and terminal failures clear authentication.
- Zustand replaces authentication and task-filter contexts.
- React Query replaces page-level server-data fetching and manual refresh counters.
- Feature routes are lazy loaded and composed centrally.
- Source ownership follows `app`, `config`, `features`, `shared`, and `stores` boundaries.
- Lint, tests, production build, and defined browser smoke flows pass.

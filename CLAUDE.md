# CLAUDE.md

Guidance for coding agents working in this repository.

## Project layout and toolchain

- `backend/`: Node 22, Express 5, TypeScript, Mongoose, Zod, and the OpenAI-compatible SDK.
- `frontend/`: React 19, Vite 7, Tailwind CSS 4, and plain JavaScript/JSX.
- The frontend and backend are separate pnpm projects. There is no root `package.json` or root workspace.
- Both packages pin `pnpm@11.21.0`. Use pnpm only; do not recreate `package-lock.json`.
- Run package commands from the corresponding package directory.

## Setup and common commands

Enable the package manager once:

```bash
corepack enable
```

Install exactly from the committed lockfiles:

```bash
cd backend && pnpm install --frozen-lockfile
cd frontend && pnpm install --frozen-lockfile
```

Backend commands:

```bash
cd backend
pnpm run dev       # tsx watch; default http://0.0.0.0:3001
pnpm run start     # run server.ts without watch mode
pnpm run build     # TypeScript type-check (tsc --noEmit)
```

Frontend commands:

```bash
cd frontend
pnpm run dev       # Vite on http://0.0.0.0:5000
pnpm run lint      # ESLint
pnpm run build     # production bundle in dist/
pnpm run preview   # preview the production bundle
```

There is currently no automated test suite. The backend `pnpm test` script is a failing placeholder; do not report it as a passing test. For normal changes, the minimum verification is:

```bash
cd backend && pnpm run build
cd frontend && pnpm run lint && pnpm run build
```

When a dependency changes, run `pnpm install` in that package and commit the matching `pnpm-lock.yaml`. Do not edit lockfiles manually.

## Running locally

Create `backend/.env` from `backend/.env.example`, then supply valid secrets and MongoDB settings. Run backend and frontend in separate terminals. The Vite config has no development proxy, so point the browser app directly at the local API:

```bash
cd backend && pnpm run dev
cd frontend && VITE_SERVER_URL=http://localhost:3001 pnpm run dev
```

Useful health check:

```bash
curl http://localhost:3001/healthz
```

`/healthz` validates the backend environment and MongoDB connection; it is not a process-only liveness check.

## Environment variables

Backend variables validated at startup:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN` (for example, `15m`)
- `JWT_REFRESH_EXPIRES_IN` (for example, `7d`)
- `SALT_ROUNDS` (positive integer)

Optional backend configuration:

- `MONGO_NAME`: database name.
- `ALLOWED_ORIGINS`: comma-separated CORS origins; replaces the built-in allowlist when set.
- `HOST` and `PORT`: defaults are `0.0.0.0` and `3001`.
- `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL_NAME`: all are required when using `/api/ai/*` endpoints.
- `VERCEL`: suppresses `app.listen()` in `server.ts` when set by the deployment environment.

The current code does not read `API_KEY` or `JWT_EXPIRES_IN`; use `AI_API_KEY` and `JWT_ACCESS_EXPIRES_IN` instead.

Frontend variables:

- `VITE_SERVER_URL`: Axios base URL. Set it to `http://localhost:3001` for separate local dev servers. Leave it unset in Docker so requests remain relative and Nginx proxies `/api/`.
- `VITE_API_DEBUG=true`: enables verbose Axios request/response logging.

Never commit real `.env` files or secrets.

## Docker harness

```bash
docker compose build backend frontend
docker compose up -d
docker compose down
```

- Backend is exposed at `http://localhost:4000` and receives `backend/.env` through Compose.
- Frontend is exposed at `http://localhost:3636` and is served by Nginx.
- Frontend Nginx proxies `/api/` to `backend:4000` and falls back to `index.html` for client-side routes.
- Each Docker build context is its package directory and uses its own frozen pnpm lockfile.
- Docker ignore files are lowercase `.dockerignore`; filenames are case-sensitive on Linux.

## Backend runtime and architecture

### Startup

- `backend/server.ts` loads dotenv, validates server environment, connects to MongoDB, and listens unless `VERCEL` is set.
- `backend/app.ts` creates the Express app and exports it. Its memoized `ensureAppReady()` also validates configuration and connects to MongoDB before `/healthz` and all application routes. Failed initialization clears the promise so a later request can retry.
- Routes are mounted at `/api/auth`, `/api/users`, `/api/categories`, `/api/projects`, `/api/tasks`, `/api/ai`, and `/api/stats`.

### Request flow

Keep backend changes in the existing direction:

```text
route -> middleware/validation -> controller -> service -> repository -> Mongoose model
```

- Routes compose `protect`, optional `authorize`, Zod `validate(...)`, and a controller.
- Validated JSON is stored on `req.validatedBody`; use it instead of reparsing validated input from `req.body`.
- Controllers translate HTTP input/output and pass failures to `next(error)`. Keep domain rules and database queries out of controllers.
- Services own business rules, authorization/ownership checks, cross-repository orchestration, and stats updates.
- Repositories own Mongoose queries, population, aggregation, and persistence details.
- Throw the typed errors from `backend/utils/errors.ts` for expected failures. The central error middleware maps `AppError` instances to HTTP responses.
- Authenticated request typing is augmented in `backend/types/express.d.ts` as `req.user` and `req.validatedBody`.

This is NodeNext ESM TypeScript. Relative imports in `.ts` source intentionally use `.js` suffixes; preserve that convention.

### Important domain invariants

- Tasks have no direct `userId`. Non-admin access is derived from category and project ownership in `taskService`; admin users bypass that ownership filter.
- Normal task creation resolves a missing category to the user's `Uncategorized` category. A project is optional, and completed projects cannot receive new task assignments.
- Deleting a category reassigns its tasks to that user's `Uncategorized` category when available. Deleting a project clears `projectId` on its tasks.
- New users receive Work, Personal, Health, and Uncategorized categories through the User model post-save flow.
- Stats are rebuilt when fetched and are also adjusted incrementally during task mutations. Task lifecycle changes must keep stats consistent.
- Access tokens and rotating refresh tokens use different secrets. Used refresh tokens are stored in `InvalidatedToken` and cannot be reused.

## Frontend architecture

The provider hierarchy in `src/App.jsx` is:

```text
ErrorBoundary
  -> AuthProvider
    -> TaskRefreshProvider
      -> TaskFilterProvider
        -> AppRouter
```

- Pages in `src/page/` are composition shells. Feature UI belongs in `src/feature/`; reusable application UI belongs in `src/component/`.
- All backend calls should go through `src/api/apiService.js` and the shared `axiosInstance`. Keep endpoint normalization in API helpers rather than scattering it across components.
- `axiosInstance` attaches the access token, uses a 60-second timeout for AI calls, serializes concurrent refresh attempts through one queue, rotates tokens, and clears auth on terminal 401 failures. Preserve this behavior when changing authentication.
- Auth state persists `token`, `refreshToken`, and `user` in local storage. `AuthProvider` verifies an existing session through `GET /api/auth/me` before setting `isAuthReady`.
- Protected routes redirect guests to `/login`; public-only auth routes redirect signed-in users to `/dashboard`.
- Tailwind CSS is provided through the Vite plugin. The project also uses `App.css`, `index.css`, and feature-specific CSS, so follow the styling pattern of the area being changed.

## Change discipline

- Preserve user changes already present in the worktree and keep unrelated edits out of the task.
- Do not edit `node_modules/`, `dist/`, generated lockfile internals, or real environment files.
- Add or update Zod validation for request-body contract changes.
- Keep authorization and ownership checks in place for every user-scoped read or mutation.
- After changing routes or API response shapes, update both the backend service/controller and the corresponding frontend API helper/consumer.
- Report the exact verification commands run and any remaining warnings or untested paths.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Backend (`backend/`)
```bash
npm run dev          # Start with nodemon (auto-reload on changes)
npm start            # Production start (node index.js)
```

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server on port 5000 (--host 0.0.0.0)
npm run build        # Vite production build → dist/
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Docker
```bash
docker compose up --build    # Build and start both services
docker compose down           # Stop both
# Backend exposed on :4000, frontend on :3636
```

### Environment Variables

**Backend** (`backend/.env`):
- `MONGO_URI` — MongoDB connection string (required)
- `MONGO_NAME` — database name (optional)
- `JWT_SECRET` — JWT signing secret (required)
- `JWT_EXPIRES_IN` — token expiry, e.g. `7d` (required)
- `SALT_ROUNDS` — bcrypt salt rounds, positive integer (required)
- `API_KEY` — Google Gemini API key for AI features
- `ALLOWED_ORIGINS` — comma-separated CORS origins (overrides defaults)
- `PORT` / `HOST` — server bind config (default: 3001 / 0.0.0.0)
- `VERCEL` — set automatically on Vercel; skips `app.listen()` when present

**Frontend** (`frontend/.env`):
- `VITE_SERVER_URL` — API base URL for axios (falls back to relative path if unset)

## Architecture

### Backend — Express 5 + Mongoose (ES Modules)

Entry is `backend/index.js`. The server uses **lazy startup**: DB connection is deferred until the first request arrives (via `ensureAppReady` middleware wrapping all routes and the `/healthz` endpoint). This allows the app to export without listening when deployed on Vercel.

**Task ownership model** — Tasks do not have a direct `userId` field. Instead, ownership is derived transitively through `categoryId` (Category → User) or `projectId` (Project → User). The `buildTaskAccessQuery` helper in `taskController.js` builds this query. Admin users bypass all ownership checks. This pattern means:
- Tasks always belong to a category (default "Uncategorized" is enforced on creation).
- When a category is deleted, its tasks are reassigned to the user's "Uncategorized" category.
- When a project is deleted, its tasks get `projectId` set to `null`.

**Standard route pattern**: Each route file uses `express.Router()`, imports controllers, and applies `protect` middleware (and optionally `authorize` for admin routes). Routes are mounted under `/api/<resource>` in `index.js`.

**Default data on user creation**: When a User document is first saved, a post-save hook in the User model calls `createDefaultCategories()`, which creates four categories (Work, Personal, Health, Uncategorized) and assigns them to the user. Admin users are skipped.

**Stats system**: `Stat` documents hold aggregate counters per user (`totalTasks`, `completedTasks`, etc.) and a `dailyStats` array of per-day records (with per-category breakdowns). Stats are updated incrementally by task controller actions (finish, giveUp, start) rather than computed on-the-fly. There's also a `initializeStats` function for recalculating from scratch.

### Frontend — React 19 + Vite + Tailwind CSS v4

**Context hierarchy** (in `App.jsx`):
```
AuthProvider → TaskRefreshProvider → TaskFilterProvider → AppRouter
```
- `AuthContext` — Stores JWT token and user object. On mount, tries to restore the session by calling `GET /api/auth/me`. Tracks `isAuthReady` to avoid flash-of-login-page.
- `TaskRefreshContext` — Just an incrementing counter (`refreshTrigger`). Components call `triggerRefresh()` to signal that task lists should re-fetch.
- `TaskFilterContext` — A global toggle for filtering tasks to "in-progress only". Provides `filterTasks(tasks)` which components use to filter before rendering.

**API layer** (`src/api/`):
- `axiosInstance.js` — Axios singleton with request interceptor (attaches Bearer token, extends timeout for `/api/ai/` endpoints to 60s) and response interceptor (logs errors, clears auth on 401 session failures and redirects to `/login`).
- `apiService.js` — Organized as service objects (`authService`, `taskService`, `categoryService`, `projectService`, `aiService`, `statService`, `userService`). Each method wraps an axios call.
- `authStorage.js` — localStorage helpers for token and user JSON (SSR-safe with `typeof window` guard).
- `projectHelpers.js` — Normalizes project-related API responses.

**Routing** (`src/route/AppRouter.jsx`):
- `RootRoute` — `/` shows LandingPage for guests, redirects to `/dashboard` if authenticated.
- `ProtectedRoute` — Redirects to `/login` if not authenticated. Wraps all app pages.
- `PublicOnlyRoute` — Redirects to `/dashboard` if already authenticated. Wraps login/register.

**Page/Feature pattern**: Each page is a thin wrapper in `src/page/` that composes feature components from `src/feature/<FeatureName>/`. Shared components live in `src/component/` (Sidebar, Topbar, ChatBuble). The layout shell is `MainLayout` which provides the responsive sidebar + topbar chrome.

**Drag and drop**: Tasks can be dragged between categories/projects. `utils/taskDrag.js` provides `setTaskDragData` / `getTaskDragData` using the native HTML5 Drag and Drop API. Task data (id, categoryId, projectId, dueDate) is serialized into the `dataTransfer` object.

**Calendar**: Built with custom components (not a library). Uses `date-fns` for date math. The calendar supports a "Project Focus" mode that filters to tasks of a specific project.

**Key dependencies**: Chart.js + react-chartjs-2 for statistics charts, lucide-react for icons, date-fns for date utilities, Tailwind CSS v4 (Vite plugin, no separate config file needed).

### Data Model Relationships

```
User ──< Category (userId)
User ──< Project (userId)
User ──< Stat (userId, one-to-one)
Category ──< Task (categoryId)
Project ──< Task (projectId, optional)
```

### Vercel Deployment

Both frontend and backend have `.vercel` directories with their own Vercel project configurations. The backend `index.js` checks `process.env.VERCEL` and skips `app.listen()` when set, exporting `app` as a serverless function instead.

# Local development

Read this for setup, runtime configuration, or package commands. The [development workflow](workflow.md) lists delivery checks.

## Package setup

`backend/` and `frontend/` are separate projects with separate lockfiles and no root pnpm workspace. Use Node.js 22 and the pinned pnpm version in each `package.json` (currently `11.21.0`). Enable Corepack if needed and install from the committed lockfiles.

```bash
corepack enable
(cd backend && pnpm install --frozen-lockfile)
(cd frontend && pnpm install --frozen-lockfile)
```

## Run the app

Create `backend/.env` from [`backend/.env.example`](../backend/.env.example) if needed and provide MongoDB and local credentials. Start the packages in separate terminals from the repository root.

```bash
cd backend
pnpm run dev
```

```bash
cd frontend
VITE_SERVER_URL=http://localhost:3001 pnpm run dev
```

- Backend `dev` starts a `tsx` watcher on `127.0.0.1` and enables local MCP. `pnpm run start` runs `server.ts` without watching. Outside the dev script the default bind address is `0.0.0.0`. The default port is `3001`.
- Vite listens on `0.0.0.0:5000` and has no local API proxy. Use `pnpm run preview` to serve the built frontend locally.
- `curl http://localhost:3001/healthz` checks API readiness after MongoDB connects.

## Environment variables

| Scope | Variables and behavior |
| --- | --- |
| Backend startup | `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` (for example, `15m`), `JWT_REFRESH_EXPIRES_IN` (for example, `7d`), and `SALT_ROUNDS` (positive integer). |
| Backend options | `MONGO_NAME` selects the database. `ALLOWED_ORIGINS` accepts a comma-separated list that replaces the default REST CORS allowlist when supplied. `HOST` and `PORT` configure the standalone listener. `VERCEL` disables that listener when set. |
| AI provider | Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL_NAME` for endpoints that invoke the AI provider. |
| Frontend | `VITE_SERVER_URL` sets the base URL. Leave it unset in Docker to use same-origin `/api/` requests. `VITE_API_DEBUG=true` enables verbose Axios logging. |

For feature-specific environment variables, follow the linked operational guide in the [documentation index](README.md). Use test credentials for local verification and keep real `.env` files out of Git.

## Docker Compose

From the repository root, with `backend/.env` configured:

```bash
docker compose up --build -d
docker compose down
```

The [Compose configuration](../docker-compose.yml) exposes Nginx at `http://localhost:3636` and the backend at `http://localhost:4000`. It also defines the notification worker using the backend image. [Nginx](../frontend/nginx.conf) proxies `/api/` to `backend:4000` and serves `index.html` for client-side routes. The backend and frontend use separate build contexts, lowercase `.dockerignore` files, and frozen pnpm lockfiles.

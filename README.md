# Orbit

Orbit is a task management application with a React frontend and a TypeScript/Express backend. Users can organize tasks into categories and projects, track due dates and progress, view statistics, and generate tasks through an OpenAI-compatible AI provider.

## Features

- JWT authentication, user profiles, and avatar uploads
- Tasks with status, priority, category, project, dates, search, and filters
- Category and project management
- Calendar and productivity statistics
- Optional AI task generation
- Agent chat modes: Auto keeps the normal tool workflow; Ask offers choices through `grill_user` and requires confirmation before creating or changing tasks. Pending questions survive reloads and can be answered or cancelled in chat.
- Local read-only MCP server for AI clients

## Stack

- **Backend:** Node.js 22, Express 5, TypeScript, MongoDB, Mongoose, Zod
- **MCP:** `@modelcontextprotocol/sdk` with Streamable HTTP
- **Frontend:** React 19, Vite, Tailwind CSS
- **Package manager:** pnpm 11.21.0; backend and frontend are separate packages

## Repository layout

```text
backend/
  config/          Runtime configuration and MongoDB connection
  controllers/     REST controllers
  error/           Application and MCP errors
  libs/            AI client and shared libraries
  middlewares/     Authentication and request middleware
  mcp/             MCP HTTP routes, tools, schemas, and DTO mappers
  models/          Mongoose models
  repositories/    Database queries
  routes/          REST API routes
  services/        Business logic and authorization
  test/            Backend tests
  scripts/         Local utilities, including the MCP smoke client
frontend/
  src/             React application
  public/          Static files
```

## Requirements

- Node.js 22
- pnpm 11.21.0, available through Corepack
- MongoDB (local or Atlas)

Enable pnpm if needed:

```bash
corepack enable
```

## Run locally

### Backend

```bash
cd backend
pnpm install --frozen-lockfile
cp .env.example .env
```

Edit `backend/.env` and set `MONGO_URI`, a strong `JWT_SECRET`, and a different strong `JWT_REFRESH_SECRET`. The sample file includes the other required authentication settings. AI generation is optional; set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL_NAME` when you configure a compatible provider.

Start the API:

```bash
pnpm run dev
```

The default backend address is `http://localhost:3001`. Check `http://localhost:3001/healthz` after MongoDB connects.

### Frontend

In another terminal:

```bash
cd frontend
pnpm install --frozen-lockfile
VITE_SERVER_URL=http://localhost:3001 pnpm run dev
```

Vite serves the app at `http://localhost:5000` by default.

### Docker Compose

Create and configure `backend/.env` as described above, then run from the repository root:

```bash
docker compose up --build
```

The app is available at `http://localhost:3636`; the backend API is exposed at `http://localhost:4000`.

```bash
docker compose down
```

## MCP server (local, read-only)

The MCP endpoint is **disabled by default** and intended for local development. It uses Orbit access tokens and only accepts direct loopback connections. It does not provide OAuth, stdio transport, write tools, or public deployment support.

Run the backend directly on the host with a `USER` account and separate access and refresh token secrets:

```bash
cd backend
pnpm run dev
```

This development script sets `MCP_ENABLED=true`, `HOST=127.0.0.1`, and `NODE_ENV=development` before starting the watcher. The Inspector is still a separate client application: start it separately and connect it to the MCP URL below.

The `dev` script enables MCP automatically and binds the backend to `127.0.0.1`; REST and MCP run in the same backend process. The endpoint is `http://127.0.0.1:3001/mcp`. `pnpm start` and Docker Compose do not enable MCP automatically. Docker Compose binds the backend inside its container and is not the supported way to expose this local MCP endpoint.

MCP tools:

| Tool                    | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `orbit_list_tasks`      | List accessible tasks with search, filters, and pagination |
| `orbit_get_task`        | Read one accessible task by ID                             |
| `orbit_list_projects`   | List the current user's projects                           |
| `orbit_list_categories` | List the current user's categories                         |

MCP does not allow `ADMIN` accounts. Task access follows the existing category-or-project ownership rule. Results use a small DTO and omit owner details. Project and category pagination currently happens after loading the user's records, so use a small local dataset.

### Connect with MCP Inspector

Start the backend with MCP enabled, then run:

```bash
cd backend
pnpm dlx @modelcontextprotocol/inspector@2.11.0
```

Select Streamable HTTP and enter `http://127.0.0.1:3001/mcp`. Configure the `Authorization` header as `Bearer <Orbit access token>` using the Inspector authentication controls. Use an access token, not a refresh token. If Inspector sends an `Origin` header, add its exact HTTP loopback origin to `MCP_ALLOWED_ORIGINS` in `backend/.env` and restart the backend. Do not use a wildcard or public origin.

For the full local setup, token handling, and smoke test instructions, see [docs/mcp/local-development.md](docs/mcp/local-development.md).

## API overview

REST endpoints are mounted under `/api`:

- `/api/auth` — register, login, refresh, and logout
- `/api/tasks` — task lifecycle, search, and filters
- `/api/categories` and `/api/projects` — organize tasks
- `/api/users` — profile management
- `/api/stats` — productivity statistics
- `/api/ai` — optional AI task generation

The MCP HTTP endpoint also exposes read-only JSON routes:

- `GET /mcp/tasks`
- `GET /mcp/tasks/:taskId`
- `GET /mcp/projects`
- `GET /mcp/categories`

These routes use the same local-only checks and Bearer authentication as the MCP transport.

## Checks

Run backend checks from `backend/`:

```bash
pnpm run build
pnpm test
```

The MCP MongoDB integration suite requires a disposable MongoDB instance on loopback. It creates and drops a uniquely named test database:

```bash
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm run test:mcp:integration
```

Run frontend checks from `frontend/`:

```bash
pnpm run lint
pnpm run build
```

## License

ISC

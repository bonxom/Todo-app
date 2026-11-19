# Backend architecture

Read this for changes in `backend/` or changes to an API or data contract. Orbit's backend runs on Node 22 with Express 5, TypeScript, Mongoose, Zod, and an OpenAI-compatible SDK.

## Startup and entry points

- [`server.ts`](../../backend/server.ts) loads dotenv. For the standalone server it validates configuration, connects to MongoDB, recovers interrupted chat runs, and starts listening. The `VERCEL` flag suppresses the standalone listener.
- [`app.ts`](../../backend/app.ts) exports the Express app. Its memoized `ensureAppReady()` validates configuration and connects to MongoDB before serving application routes. On failure it clears the promise so the next request can retry. `/healthz` checks readiness, including MongoDB.
- REST routes mount under `/api/auth`, `/api/users`, `/api/categories`, `/api/projects`, `/api/tasks`, `/api/ai`, `/api/stats`, and `/api/notifications`. The separate `/mcp` entry point has its own [transport and access policy](../mcp/local-development.md).

## Request flow

```text
routes -> middleware and Zod validation -> controllers -> services -> repositories -> Mongoose models
```

| Layer | Responsibility |
| --- | --- |
| [Routes](../../backend/routes/) | Compose `protect`, `authorize` where applicable, `validate(...)`, and the controller. |
| [Middleware](../../backend/middlewares/) and [validation](../../backend/validations/) | Authenticate requests and parse request input. Use `req.validatedBody` for validated JSON. Request type augmentation lives in [`types/orbit/index.d.ts`](../../backend/types/orbit/index.d.ts). |
| [Controllers](../../backend/controllers/) | Translate HTTP input and output and forward failures to the central error handler. |
| [Services](../../backend/services/) | Own business rules, resource authorization, orchestration, and stats updates. |
| [Repositories](../../backend/repositories/) | Own Mongoose queries, population, aggregation, and persistence. |
| [Models](../../backend/models/) | Define stored fields, indexes, and existing persistence hooks. |

For expected failures, use [`AppError`](../../backend/error/AppError.ts) and the existing [error definitions](../../backend/error/definitions/). The middleware maps errors to HTTP responses. Backend TypeScript uses NodeNext ESM. Use the `.js` extension for relative imports that resolve to `.ts` sources.

## Domain invariants

- **Task access.** The task model has no direct `userId`. [`taskService.ts`](../../backend/services/taskService.ts) scopes list/readable queries to a category or project owned by the user. Its REST ownership helper resolves the category owner first and falls back to the project owner. Preserve the check used by the entry point you are editing. The task service grants `ADMIN` bypasses for those ownership checks. MCP has a separate role policy.
- **Task assignment.** Normal task creation resolves a missing category to the user's `Uncategorized` category. A project is optional. Check ownership on assignment and reject new assignments to completed projects.
- **Category and project lifecycle.** New users receive Work, Personal, Health, and Uncategorized through the User post-save flow. `Uncategorized` is protected against renaming and deletion. Category deletion reassigns affected tasks to the owner's `Uncategorized` category when it exists, otherwise to `null`. Project deletion sets affected tasks' `projectId` to `null`. Preserve the model hooks when changing deletion queries.
- **Statistics.** [`statService.ts`](../../backend/services/statService.ts) rebuilds stats on read. Task mutations also adjust stats incrementally, so changes to the task lifecycle must account for both paths.
- **Token rotation.** Access and refresh tokens use separate secrets. Used refresh tokens are recorded through the [`InvalidatedToken` model](../../backend/models/InvalidatedToken.ts) and cannot be reused.

For chat and agent tools, continue with [agent chat architecture](../agent-chat-architecture.md). For runtime settings, see [local development](../development.md).

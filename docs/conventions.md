# Engineering conventions

Read this when making a code or dependency change. The [backend](architecture/backend.md) and [frontend](architecture/frontend.md) guides describe the rules specific to each package.

## Scope and dependencies

- Preserve changes already in the worktree. Keep edits and formatting within the task scope.
- Run pnpm commands in the package they affect. Use the pinned version and the committed lockfile. After changing dependencies, run `pnpm install` in the affected package and include its updated `pnpm-lock.yaml` with the change.
- Leave `node_modules/`, `dist/`, and generated lockfile internals to their tools. Keep real environment files and credentials out of changes.

## API contracts and access

- For a request-body change, update the backend Zod schema and consume the validated input in the controller.
- For an endpoint or response change, trace the route through the controller and service, then update the frontend service, shared types or normalization, and affected consumers together. Check existing callers and supported stored data against the new contract.
- Keep authorization and ownership checks on every user-scoped read and mutation. Reuse the business rules in the service layer when REST, MCP, and agent tools act on the same data, while preserving the access policy of each entry point.
- When a mutation affects multiple records or cached views, trace how retries, failures, and concurrent requests affect those records and views. Use the relevant [backend invariants](architecture/backend.md#domain-invariants) and [frontend cache lifecycle](architecture/frontend.md#5-optimistic-mutations-lifecycle).

Use the [workflow](workflow.md#verification-and-handoff) for lint, format, tests, and final reporting.

# AGENTS.md

Orbit has separate `backend/` and `frontend/` pnpm packages. Run package commands from the corresponding directory using the pinned pnpm version.

## Always apply

- Preserve existing worktree changes and keep edits within the task scope.
- Keep credentials and real environment files out of changes. Use pnpm and let it update lockfiles.
- Before implementing any new feature, including a small one, read the [mandatory development workflow](docs/workflow.md). It requires an agreed design, spec and plan, failing tests before implementation, then tests, lint, format checks, and build/type-check.
- Preserve authorization and ownership checks for user-scoped operations. For API contract changes, update backend validation and affected frontend consumers together.
- Report the exact verification commands, their results, and any remaining gaps.

## Read on demand

Open the guides that match the task. For cross-layer changes, follow the links for both packages. Read the applicable skill instructions in full before starting the work they cover.

| Task | Guide |
| --- | --- |
| Backend or API changes | [Backend architecture](docs/architecture/backend.md) |
| Frontend code, routes, or state | [Frontend architecture](docs/architecture/frontend.md) |
| Web layouts, visual style, or interactions | [Orbit UI/UX guide](docs/design/ui-ux.md) |
| Code, API contract, or dependency conventions | [Engineering conventions](docs/conventions.md) |
| Specs, plans, tests, and delivery checks | [Development workflow](docs/workflow.md) |
| Setup, environment variables, and Docker | [Local development](docs/development.md) |
| Choosing and applying a project skill | [Skill routing](docs/skills.md) |
| Agent chat, MCP, A2UI, storage, notifications, or deployment | [Engineering docs index](docs/README.md) |

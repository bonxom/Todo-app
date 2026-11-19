# Development workflow

Read this before implementing any new feature or deciding how to verify a change. Use the [skill routing guide](skills.md) to find context for the task.

## New features

Every new feature, including a small one, follows this order.

1. **Brainstorm.** Clarify the goal, scope, constraints, and edge cases. Compare approaches and settle on a design.
2. **Write the spec.** Use `docs/superpowers/specs/YYYY-MM-DD-<feature>.md`. Cover expected behavior, acceptance criteria, non-goals, affected API/data/UI contracts, error handling, and testable edge cases.
3. **Write the plan.** Use `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` and reference the spec. List ordered tasks, affected files, test cases, and verification commands. Complete both documents before implementation.
4. **Run failing tests.** Derive automated tests from the acceptance criteria and confirm they fail because the behavior is missing. If the area has no harness, include appropriate tooling in the plan. Record any manual or browser checks.
5. **Implement.** Keep changes scoped to the plan. Update the spec and plan if implementation reveals a necessary design change.
6. **Rerun tests and verify in the browser.** Run the new tests and relevant regression and integration suites. Personally exercise the affected browser flows with Playwright and confirm the expected outcomes before reporting that testing passed.
7. **Lint and check formatting.** Use the affected packages' configured tools. Fix issues and rerun checks. Include required tooling in the plan if a lint or format command is missing.
8. **Build and type-check.** Run the affected builds and the repository's baseline checks below. Record the commands and results.

Small, unambiguous maintenance or documentation edits can use checks appropriate to the change. For a bug fix, reproduce the reported behavior and verify the correction through the affected entry point. Apply the Playwright requirement below whenever reporting an application change as tested.

## Verification and handoff

### When testing counts as passed

The agent delivering an application change must personally run Playwright against the app in a browser and observe the expected outcome for each affected flow. Run the relevant Playwright specs or drive the browser directly with Playwright. For a backend change with a browser consumer, use the affected UI flow against the changed API.

Report Vitest and integration results individually. The overall test status is **passed** only when all required tests pass and the agent has observed the required Playwright browser checks passing. If a required test fails, report testing as **failed**. If a required browser check is blocked or skipped, report browser verification as **incomplete** and name the affected flow and the reason.

### Commands

Run commands from the relevant package directory. For normal code changes, the repository baseline is:

```bash
(cd backend && pnpm run build && pnpm test)
(cd frontend && pnpm run lint && pnpm run build)
```

For the feature workflow, use these commands in the affected packages in addition to the baseline, running tests before lint and format, then build/type-check.

| Check | Backend | Frontend |
| --- | --- | --- |
| Automated tests | `pnpm test` (Vitest) | `pnpm test` (Vitest) |
| Browser tests | Verify the affected app flow against the changed API when it has a browser consumer | `pnpm run test:e2e` (Playwright, see [configuration](../frontend/playwright.config.ts)) |
| Lint | `pnpm run lint` | `pnpm run lint` |
| Format | `pnpm run format:check` | `pnpm run format:check` |
| Build/type-check | `pnpm run build` runs TypeScript without emitting files | `pnpm run build` type-checks and builds with Vite |

Run focused tests with `pnpm exec vitest run <path>` when iterating. For database-backed tests, follow the setup for the affected subsystem, such as [MCP integration](mcp/local-development.md#kiểm-thử) or [chat streaming operations](ai/chat-streaming-operations.vi.md). Use disposable test databases.

Report the exact verification commands, the Playwright scenarios exercised and their observed results, and any remaining warnings or untested paths. State blockers and skipped checks when they limit verification.

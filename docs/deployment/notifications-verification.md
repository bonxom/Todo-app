# Notification verification — 2026-11-09

Implemented on `feat/noti`; no merge, push or deployment performed. Feature commits:
`0885d79`, `f42f918`, `99aaf37`, `f46765f`, `632bdae`, `f9d5246`.

## Commands and results

Run from repository root unless stated otherwise:

| Command                                                                                                                          | Result                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27030/ pnpm --dir backend run test --maxWorkers=2`                                 | 64 files, 542 tests passed; no skips. Disposable MongoDB replica set.                                        |
| `pnpm --dir frontend test`                                                                                                       | 77 files, 336 tests passed.                                                                                  |
| `pnpm --dir frontend exec playwright test e2e/notifications.spec.ts --workers=1`                                                 | 7 passed.                                                                                                    |
| `pnpm --dir backend run lint`                                                                                                    | Passed, 13 existing warnings in taskProposalActions.test.ts.                                                 |
| `pnpm --dir frontend run lint`                                                                                                   | Passed without warnings.                                                                                     |
| `pnpm --dir backend run build`                                                                                                   | Passed TypeScript check.                                                                                     |
| `pnpm --dir frontend run build`                                                                                                  | Passed typecheck and Vite production build. Existing large-chunk and mixed ErrorPage import warnings remain. |
| `pnpm run format:check` (backend directory)                                                                                      | Failed on 8 unchanged baseline files listed below.                                                           |
| `pnpm run format:check` (frontend directory)                                                                                     | Failed on 8 unchanged baseline files listed below.                                                           |
| `git diff --relative --name-only -z 01d912e -- .                                                                                 | xargs -0 pnpm exec prettier --check` (each package directory)                                                | All changed files passed. |
| `git diff --check`                                                                                                               | Passed during implementation.                                                                                |
| `docker compose config --quiet`                                                                                                  | Passed. No Compose services deployed.                                                                        |
| `MONGO_URI=mongodb://127.0.0.1:27030/ MONGO_NAME=orbit_notification_smoke pnpm --dir backend run notifications:generate` (twice) | First run inserted 1, second inserted 0; database count remained 1.                                          |

Worker process smoke launched `node --import tsx workers/notificationWorker.ts`
from backend with the same disposable MongoDB settings, sent SIGTERM after its
initial scan, and observed exit 0. A separate inline Node smoke exercised the real
Express app, JWT protect middleware, MongoDB, generation and notification API:
owner list 200, other ADMIN mark-read 404, owner mark-read 200, unread count 0.
Only uniquely named throwaway databases were used; test containers were stopped
at the end.

Initial baseline: backend 422 passed / 83 integration tests skipped without URI;
frontend 321 passed. An attempted all-suite run against standalone MongoDB failed
transaction-dependent existing tests; rerunning against a disposable replica set
resolved it. Limiting backend workers avoided import timeout under concurrent load.

## Behavior and visual verification

Deadline boundaries at 10h and due time; status/deadline changes; owner resolution;
concurrent deduplication; stable history/read state; pagination; authentication;
read-all request-start cutoff; retry/shutdown; user-scoped cache; paused background
polling; failed mutation retention; preserved unsaved task draft on refetch.

Browser coverage includes bell → history → page 2 → unavailable task, read-all,
unread filter, keyboard Escape/focus, mobile controls without overlap, English and
Vietnamese, light and dark themes. Screenshots generated in frontend/test-results
were visually inspected, including mobile dark bell and desktop light history.
Browser API fixtures are mocked; the separate backend integration and HTTP smoke
provide real persistence/auth evidence. No production environment was tested.

Independent review identified two P2 issues: editor unmount on refetch and late
read-all cutoff. Both received failing regression tests before fixes, then passed
focused and full suites. JSDOM navigation warnings already present in baseline
remain in the frontend suite; Playwright emits NO_COLOR/FORCE_COLOR environment
warnings. None caused test failures.

## Existing formatting failures left unchanged

Backend:

- mcp/resources/skills.ts
- mcp/routes/mcpRoute.ts
- mcp/server.ts
- services/test/agentSkillService.test.ts
- services/test/attachmentService.test.ts
- skills/registry.ts
- skills/test/policy.test.ts
- validations/agentValidation.ts

Frontend:

- pnpm-lock.yaml
- src/features/agent/skills/test/SkillEditorPage.test.tsx
- src/features/agent/skills/test/SkillReadBadge.test.tsx
- src/features/agent/skills/test/SkillsPage.test.tsx
- src/features/tasks/hooks/afterTaskUncovered.js
- src/features/tasks/hooks/taskStatusTransitions.ts
- src/features/tasks/hooks/useTaskStatusEffect.js
- src/features/tasks/hooks/useTransitionTasks.js

Full repository formatting is therefore not green; feature files are formatted.
To enable generation, run the worker as documented in [notifications.md](notifications.md).

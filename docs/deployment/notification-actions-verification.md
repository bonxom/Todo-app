# Notification actions verification — 2026-11-10

Scope: per-item read buttons, popup mark-all, confirmed delete-all in popup/history,
recipient-scoped soft deletion preserving reminder deduplication keys. No package
dependencies or worker deployment behavior changed.

## Commands and outcomes

Commands run from repository root unless stated otherwise:

| Command                                                                                          | Result                                                                                         |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27030/ pnpm --dir backend run test --maxWorkers=2` | 64 files / 546 tests passed, no skips, disposable replica-set MongoDB.                         |
| `pnpm --dir frontend test`                                                                       | 77 files / 346 tests passed.                                                                   |
| `pnpm --dir frontend exec playwright test e2e/notifications.spec.ts --workers=1`                 | 10 browser cases passed.                                                                       |
| `pnpm --dir backend run lint`                                                                    | No errors; 13 existing warnings in taskProposalActions.test.ts.                                |
| `pnpm --dir frontend run lint`                                                                   | Passed without warnings.                                                                       |
| `pnpm --dir backend run build`                                                                   | TypeScript passed.                                                                             |
| `pnpm --dir frontend run build`                                                                  | Typecheck/Vite build passed; existing large chunks and mixed ErrorPage import warnings remain. |
| `pnpm --dir backend run format:check`                                                            | Fails on eight unchanged baseline files.                                                       |
| `pnpm --dir frontend run format:check`                                                           | Fails on eight unchanged baseline files.                                                       |
| `git ls-files -z --modified --others --exclude-standard -- .                                     | xargs -0 pnpm exec prettier --check` (each package directory, before commit)                   | Changed/new feature files pass. |
| `git diff --check`                                                                               | Passed.                                                                                        |

The formatting baseline list is recorded in [the original feature report](notifications-verification.md).
No unrelated formatting fixes or generated lockfile changes were made. Full-repo
format verification is not green. Frontend tests retain the baseline JSDOM
navigation warning; Playwright reports NO_COLOR/FORCE_COLOR environment warnings.
A test-only TypeScript error caused by using Playwright's `exact` option in a
Testing Library query was corrected; final typecheck/build passed.

## Coverage

- Deletion includes all read/unread pages, scopes to the caller (including ADMIN),
  rejects unauthenticated requests and injected recipient IDs, uses request-start
  cutoff even during readiness delay, and preserves notifications created later.
- Legacy documents lacking deletedAt remain visible. Deleted documents disappear
  from list/count/read/read-all; reinsert and concurrent worker calls preserve the
  tombstone. Another reminder type can still be generated.
- Popup read-one does not navigate or close; read-all refreshes badge and lists.
  Delete needs confirmation, Cancel makes no API call, errors preserve content,
  pending state disables conflicting actions. Delete resets history page to 1.
- Deletion still works when Unread filter is empty but read history exists.
- Keyboard focus is restored after cancellation and row removal; Escape cancels
  even when focus is outside confirmation controls. Existing popup focus trap works.
- Browser coverage: desktop/mobile, English/Vietnamese, light/dark, popup actions,
  history pagination and deletion, missing-task handling. Mobile confirmation and
  Vietnamese dark popup screenshots were visually inspected.

The browser uses API fixtures; repository tests exercise real MongoDB. The new
DELETE endpoint is exercised through Supertest/auth mocks plus the real repository
suite. No production data was deleted or production service deployed. The disposable
MongoDB container was stopped after verification.

Independent code review findings were resolved before final verification. Changes
were committed on the current main branch for deployment through the normal release process.

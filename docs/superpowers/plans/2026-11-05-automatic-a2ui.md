# Automatic A2UI implementation plan

**Goal:** Let the agent select task proposal UI without a composer mode.
**Spec:** ../specs/2026-11-05-automatic-a2ui.md
**Architecture:** Expose a local propose_tasks tool under the feature flag;
validate and persist its result through the existing proposal pipeline.
**Constraints:** pnpm only; A2UI-only source under A2UI folders; preserve legacy
intent compatibility; no dynamic catalogs; confirmation remains the write boundary.

1. Add failing cases to backend/services/test/agentService.test.ts: ordinary
   intent-free proposal, direct creation bypass blocked, disabled proposals
   rejected, and Auto clarification. Extend conversation integration to omit
   intent from the initial proposal request.
2. Modify backend/services/agentService.ts: use isTaskProposalsEnabled() for
   tool availability, reject orbit_create_task when enabled before execution,
   add automatic selection instructions and permit clarification in Auto.
   Keep explicit legacy proposal mode's stricter read-only filtering.
3. Remove Plan tasks control/chip from ChatToolbar.jsx and ChatField.jsx;
   remove local intent preference and outbound intent from useConversationChat.ts.
   Keep pending request replay unchanged. Replace default-toggle tests with
   assertions that ordinary chat has no forced intent and proposal surfaces work.
4. Reproduce CalendarTaskDetailCard.test.jsx failure, inspect layout history,
   and correct obsolete assertions if the current side-badge UI is intentional.
5. Run targeted RED/GREEN tests, full backend/frontend tests, MongoDB integration,
   browser proposal tests, lint, changed-file Prettier and build/type-check.
   Document skipped paths and remaining warnings.

## Completion and verification

All five steps completed. Calendar's side badges were intentionally introduced
by commit 7fee810; the obsolete test was updated to verify their current group,
labels, truncated content and metadata. No Calendar layout change was necessary.

Behavioral RED: four agent routing/protection tests failed before implementation;
the existing Calendar test reproduced the old DOM-order failure. GREEN checks:

- Backend: `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27029/ pnpm test`:
  39 files, 353 tests passed (no skipped tests); `pnpm run lint` and
  `pnpm run build` passed. Lint retains 13 existing no-explicit-any test warnings.
- Frontend: `pnpm test`: 47 files, 214 tests passed; `pnpm run lint` and
  `pnpm run build` passed. Vite retains large-chunk and ErrorPage mixed-import
  warnings.
- Frontend: `pnpm exec playwright test e2e/task-proposals.spec.ts`: 4 passed.
  Includes sending ordinary text without intent and receiving an interactive
  proposal, plus save/reload/subset creation, retry and mobile cancellation.
- `pnpm exec prettier --check` on changed source/tests/docs and
  `git diff --check`: passed.

Integration uses a disposable MongoDB 7 replica set; browser HTTP and AI provider
responses are mocked. No live-provider routing-quality claim is made. Temporary
database/container resources are removed after verification.

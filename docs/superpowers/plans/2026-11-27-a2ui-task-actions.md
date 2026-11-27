# A2UI Task Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Subagents require separate user authorization.

**Goal:** Let a user complete an existing in-progress task using an A2UI Button backed by the same application commands as MCP.

**Architecture:** Extract existing transactional task commands from MCP into transport-neutral application modules. Add a thin, finite A2UI action adapter and an interactive catalog; preserve existing REST lifecycle calls and all legacy proposal contracts. Derive outcomes from committed shared command receipts instead of adding an A2UI business or receipt subsystem.

**Tech Stack:** Existing Express/TypeScript/Mongoose/Zod backend, React/TanStack Query frontend, A2UI v0.9, Vitest, Playwright; no new packages.

**Spec:** [A2UI task actions](../specs/2026-11-27-a2ui-task-actions.md). Read the [roadmap](../specs/2026-11-27-a2ui-evolution-roadmap.md) for excluded milestones.

## Global Constraints

- A2UI is an interaction adapter; task rules, authorization, transactions, statistics and idempotency remain shared application capabilities.
- Keep A2UI protocol v0.9 and the installed @a2ui/react and @a2ui/web_core versions 0.15.0; no dependency upgrades.
- Use pnpm@11.21.0 from each affected package directory.
- Preserve legacy catalogs and Task Proposal save/confirm/cancel contracts.
- Keep shared frontend modules independent of features and app modules.
- No model-authored JavaScript, handlers, API URLs, ownership fields or executable catalogs.
- Only task.complete is registered in the first release; no implicit start, create, delete or metadata update.
- Existing surface limits remain 100 nodes, depth 10, 128 KiB and 16 A2UI messages; at most 10 task actions per interactive surface.

## Execution preparation

- [ ] Confirm design/spec review before application implementation. This document does not authorize later roadmap milestones.
- [ ] Follow the worktree skill at execution time, inspect `git status --short` and preserve unrelated changes. Read `docs/workflow.md`, both architecture guides, engineering conventions and UI/UX guidance.
- [ ] Run `pnpm --version` in both packages; expected `11.21.0`. Use `pnpm exec vitest run <path>` for focused tests; `pnpm test -- <path>` can run the whole suite with the pinned pnpm.
- [ ] Provision a disposable loopback MongoDB replica set for integration tests using `ORBIT_MCP_TEST_MONGO_URI`. Follow safeguards in `backend/mcp/test/writes.integration.test.ts`; its URI must match `mongodb://127.0.0.1:<port>/` or `mongodb://localhost:<port>/`. Never use the application's real database.

## File ownership map

| Area                   | Files and responsibilities                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared task commands   | `backend/services/taskCommandService.ts`, `backend/types/ITaskCommand.ts`, `backend/validations/taskCommandValidation.ts`, `backend/validations/taskDtoValidation.ts`, `backend/utils/taskDto.ts`, `backend/utils/entitySerialization.ts`, `backend/repositories/taskCommandRepository.ts`: existing commands, contract, serializer and receipts moved out of MCP |
| Compatibility adapters | Existing `backend/mcp/services/taskWriteService.ts`, `backend/mcp/models/TaskWrite.ts`, `backend/mcp/models/Task.ts`, `backend/mcp/mapper/taskMapper.ts`, `backend/mcp/mapper/shared.ts`, `backend/mcp/repositories/writeRepository.ts`: preserve imports and MCP policy                                                                                          |
| Interactive surface    | New `backend/types/A2UI/IUiAction.ts`, `backend/validations/A2UI/interactiveUiValidation.ts`, `backend/services/A2UI/interactiveUiService.ts`; extend existing surface union/compiler/presenter without altering legacy validation                                                                                                                                |
| Action transport       | New `backend/services/A2UI/uiActionService.ts`, `backend/controllers/A2UI/uiActionController.ts`, `backend/validations/A2UI/uiActionValidation.ts`, `backend/error/definitions/A2UI/uiActionErrors.ts`; route registration in existing `backend/routes/aiRoutes.ts`                                                                                               |
| Agent/history          | Existing `agentUiService.ts`, `agentService.ts`, `conversationTurnService.ts`, `conversationService.ts`, `backend/utils/conversationView.ts`, `backend/models/ChatTurn.ts`, `backend/types/IChatTurn.ts`, `backend/types/IChatStream.ts`; internal tool, persisted surface, turn identity and verified outcomes                                                   |
| Frontend presentation  | New `frontend/src/shared/A2UI/interactiveSchema.ts`, `interactiveComponents.tsx`, `interactiveCatalog.ts`; extend catalog registration and shared surface/action types                                                                                                                                                                                            |
| Frontend adapter       | New `frontend/src/shared/services/uiActionService.ts`, `frontend/src/features/tasks/hooks/A2UI/useUiAction.ts`, `frontend/src/features/tasks/components/chat/A2UI/InteractiveSurfaceMessage.tsx`; integrate existing UiSurfaceMessage, ChatField, stream reducer, domain types and cache invalidation                                                             |

`shared/A2UI` receives callbacks and state from the feature adapter. It never imports feature hooks or task APIs. Backend shared command modules never import MCP modules.

## Task 1: Extract shared task commands without changing behavior

**Files:** Shared command and compatibility files in the map; tests `backend/services/test/taskCommand.test.ts`, `backend/mcp/test/writes.integration.test.ts`, `backend/services/test/taskCommand.integration.test.ts`.

**Interfaces:**

```ts
// backend/types/ITaskCommand.ts
type TaskCommandContext = Readonly<{
  user: IUserDocument;
  requestId: string;
  beforeWrite?: () => Promise<void>;
  origin?: UiCommandOrigin;
}>;
type UiCommandOrigin = {
  channel: "a2ui";
  conversationId: string;
  turnId: string;
  surfaceId: string;
  actionId: string;
};
type TaskCommandOutput = { task: TaskDto; deleted?: true };
// create/update/delete retain existing input schemas and output values.
taskCommandService.update(raw: unknown, context: TaskCommandContext): Promise<TaskCommandOutput>;
taskCommandService.create(raw: unknown, context: TaskCommandContext): Promise<TaskCommandOutput>;
taskCommandService.delete(raw: unknown, context: TaskCommandContext): Promise<TaskCommandOutput>;
```

`TaskDto` and its schema move from MCP to `backend/validations/taskDtoValidation.ts`. Move write schemas unchanged, retaining `.describe()` metadata, and reuse equivalent ObjectId/date validation without importing MCP primitives. Move `referenceId`/`isoDate` to `backend/utils/entitySerialization.ts`; old serializer paths re-export. Move repository implementation while keeping Mongo model/collection names and receipt canonicalization unchanged.

- [ ] Write a failing unit test that imports `taskCommandService` from the new path and uses `vi.spyOn` on shared repository/lifecycle methods. Assert the transaction callback surrounds mutation, stats and receipt; a rejected `beforeWrite` prevents all mutation. Cover completed-target no-op and pending/given-up rejection using existing lifecycle tests rather than a copied state machine.
- [ ] Add this replica-set test under the same disposable database setup used in `writes.integration.test.ts` (copy setup into the new test file, retaining loopback/drop guards):

```ts
it("shares the same saved result between application and MCP adapters", async () => {
  const ctx = context(); // local fixture from the copied existing test setup
  const input = { title: "shared command", idempotencyKey: randomUUID() };
  const direct = await taskCommandService.create(input, {
    user: ctx.user,
    requestId: ctx.requestId,
  });
  const replay = await taskWriteService.create(input, ctx);
  expect(replay).toEqual(direct);
  expect(await Task.countDocuments({ title: "shared command" })).toBe(1);
});
```

- [ ] Run from backend: `pnpm exec vitest run services/test/taskCommand.test.ts services/test/taskCommand.integration.test.ts`; confirm failure is due to missing extraction, not a skipped database suite.
- [ ] Move the existing implementation to the mapped shared paths. Keep `WriteError`/`WriteOperation` compatibility exports and make MCP wrappers enforce USER/`tasks:write` before delegation. Do not move MCP scope checks into application commands or remove the shared ownership checks.

```ts
// MCP wrapper shape; use the existing WriteError identity/export.
if (context.user.role !== "USER" || !context.scopes?.includes("tasks:write")) {
  throw new WriteError(
    "FORBIDDEN",
    "This session does not have tasks:write permission.",
  );
}
return taskCommandService.update(raw, {
  user: context.user,
  requestId: context.requestId,
  beforeWrite: context.beforeWrite,
});
```

- [ ] Add optional origin to the shared receipt. Within the transaction, a previous receipt with a supplied origin must match every origin field; missing/different origin conflicts. Preserve old fingerprints. Roll back the entire command if receipt creation fails. Add a user/conversation/createdAt index for the later outcome projection without renaming collections.
- [ ] Run `pnpm exec vitest run services/test/taskCommand.test.ts services/test/taskCommand.integration.test.ts mcp/test/writes.integration.test.ts services/test/taskService.test.ts`; verify MCP role/scope failures, old receipts, rollback, completion timestamps/stats and internal guard remain intact. Run existing REST status regressions as part of the backend full suite at delivery.
- [ ] Review and commit only this extraction after checks, using `refactor: share task commands across interaction channels`.

## Task 2: Define and compile bounded interactive surfaces

**Files:** New `IUiAction.ts`, `interactiveUiValidation.ts`, `interactiveUiService.ts`; existing `IUiSurface.ts`, `uiSurfaceService.ts`, `uiPresentationService.ts`, `backend/config/A2UI/composition.ts`; tests `backend/services/test/interactiveUi.test.ts`, `backend/validations/test/interactiveUiValidation.test.ts`; new fixture `frontend/src/test/fixtures/a2ui-interactive-v09.json`.

**Interfaces:**

```ts
type UiActionSpec = { name: "task.complete"; taskId: string };
type UiActionBinding = UiActionSpec & { id: string; key: string };
type ButtonNode = { id: string; component: "Button"; label: string; actionKey: string };
// InteractiveSurfaceSpec: legacy presentation nodes plus Button; no proposal nodes.
// Fields: fallbackText, components, displayData, actions: Record<string, UiActionSpec>.
type StoredInteractiveSurface = {
  catalogId: "urn:orbit:a2ui:interactive:v1";
  surfaceId: string;
  spec: InteractiveSurfaceSpec;
  actionBindings: UiActionBinding[];
};
interactiveUiService.prepare(spec: InteractiveSurfaceSpec, user: IUserDocument): Promise<StoredInteractiveSurface>;
interactiveUiService.compile(stored: StoredInteractiveSurface): UiSurfaceEnvelope;
```

Separate validation from preparation: parsing is pure; preparation validates ownership using `taskService.getReadableById`, deduplicates at most 10 targets and assigns UUIDs. Current-state eligibility is projected on the client through authenticated task reads, not baked into model-authored flags. Use a separate interactive schema; do not add Button to legacy read-only/proposal catalogs.

- [ ] Write failing tests for a Card/Text/Button tree, undefined and unreferenced action keys, invalid IDs, unknown action names, supplied handler/endpoint fields, more than 10 actions and proposal nodes. Reuse legacy fixture checks for graph limits rather than duplicating a second graph algorithm.

```ts
import { parseInteractiveSpec } from "../../validations/A2UI/interactiveUiValidation.js";
const spec = {
  fallbackText: "Complete the selected task",
  components: [
    {
      id: "root",
      component: "Button",
      label: "Hoàn thành",
      actionKey: "finishTask",
    },
  ],
  displayData: {},
  actions: {
    finishTask: { name: "task.complete", taskId: "0123456789abcdef01234567" },
  },
};
expect(parseInteractiveSpec(spec)).toEqual(spec);
expect(() => parseInteractiveSpec({ ...spec, actions: {} })).toThrow();
expect(() => parseInteractiveSpec({ ...spec, actionBindings: [] })).toThrow();
```

- [ ] Run `pnpm exec vitest run validations/test/interactiveUiValidation.test.ts services/test/interactiveUi.test.ts`; observe missing behavior failures.
- [ ] Implement the separate schema/catalog identity and server bindings. Refactor only shared graph checks needed to reuse existing limits, while retaining all legacy test results. `prepare` must not call any task command. Compile a `dispatch` event whose context has only `actionId`; Button disabled presentation binds `/actionState/<key>`.
- [ ] Persist and reload the discriminated stored surface through existing turn repository paths. All generated executable bindings must survive replay unchanged. Extend stored-surface readers with catalog dispatch; do not relax legacy catalog literals globally.
- [ ] Create one canonical v0.9 fixture using fixed server UUIDs; backend and frontend tests consume it. Its data model includes display content and initial disabled/loading action state, no caller-editable ownership or endpoints.
- [ ] Run `pnpm exec vitest run validations/test/interactiveUiValidation.test.ts services/test/interactiveUi.test.ts validations/test/uiSurfaceValidation.test.ts services/test/uiSurface.test.ts services/test/uiPresentation.test.ts`. Review and commit `feat: define bounded interactive A2UI surfaces`.

## Task 3: Add the action adapter and durable outcome projection

**Files:** Action transport files in the map; shared command repository; `backend/services/conversationService.ts`, `backend/utils/conversationView.ts`, `backend/types/IChatStream.ts`; new tests `backend/services/test/uiAction.test.ts`, `backend/services/test/uiAction.integration.test.ts`, `backend/controllers/test/uiActionController.test.ts`.

**Interfaces:**

```ts
type UiActionInput = { requestId: string; actionId: string };
type UiActionLocation = { conversationId: string; turnId: string; surfaceId: string };
type UiActionResult = { requestId: string; actionId: string; outcome: "succeeded"; task: TaskDto };
type UiActionOutcome = UiActionResult & { turnId: string; surfaceId: string; committedAt: string };
uiActionService.execute(location: UiActionLocation, input: UiActionInput, user: IUserDocument): Promise<UiActionResult>;
uiActionService.recentOutcomes(userId: string, conversationId: string): Promise<UiActionOutcome[]>;
// recentOutcomes: up to 3 receipts, sorted createdAt descending then _id descending.
```

- [ ] Write HTTP validation tests for strict body/UUIDs, forged fields, USER restriction, uniform foreign/missing reference 404, non-completed source turn, wrong surface/catalog/action and runtime flag-off. Spy on `taskCommandService.update`; no rejected request may reach it.
- [ ] Add database tests using real stored completed turns and owned tasks: successful finish; ownership reassigned after presentation; same-request replay; request reused for another task/origin; two concurrent dispatches; concurrent MCP completion; receipt-save failure rollback; pending/given-up/target-completed cases. Assert task status, stable completedAt, correct stats and a single authoritative receipt per request.
- [ ] Run `pnpm exec vitest run services/test/uiAction.test.ts services/test/uiAction.integration.test.ts controllers/test/uiActionController.test.ts`; verify red for the adapter behavior.
- [ ] Register the route from spec §5 in `aiRoutes.ts`, with strict param/body validation and central errors. Resolve bindings only from the stored, owned source turn; never accept taskId from the request. The finite registry contains this handler:

```ts
const output = await taskCommandService.update(
  {
    taskId: binding.taskId,
    changes: { status: "completed" },
    idempotencyKey: `ui_${input.requestId}`,
  },
  {
    user,
    requestId: input.requestId,
    origin: { channel: "a2ui", ...location, actionId: binding.id },
  },
);
return {
  requestId: input.requestId,
  actionId: binding.id,
  outcome: "succeeded",
  task: output.task,
};
```

- [ ] Map unsupported/disabled/not-found/idempotency/transaction errors to spec §5. A nonterminal source turn returns 409 (the separate 404 rule applies to missing/foreign references). Do not catch failed commits and return success.
- [ ] Implement the bounded receipt projection with user+conversation filters; attach `uiActionOutcomes` to conversation history and assistant message/result types. Include explicit `turnId` in public message projections; clients must not parse it out of `${turnId}:bot` IDs. Keep projection work read-only and independent of old turn finalResult snapshots.
- [ ] Test no receipt before commit, no projection to another user/conversation, deterministic sort/limit, no manufactured activity write and safe fallback when a source surface cannot render. Run focused tests plus `pnpm exec vitest run services/test/conversationService.integration.test.ts services/test/uiPresentation.test.ts`.
- [ ] Review and commit `feat: dispatch A2UI actions through shared task commands`.

## Task 4: Render Button and perform verified task actions

**Files:** Frontend files in the map; `frontend/src/shared/types/domain.ts`, `chatStream.ts`, `A2UI/uiSurface.ts`; existing `ChatField.jsx`, `UiSurfaceMessage.tsx`, `chatStreamReducer.ts`; locale files under `frontend/src/shared/i18n/locales/`; tests `frontend/src/shared/A2UI/test/interactiveProtocol.test.tsx`, `frontend/src/features/tasks/components/test/InteractiveSurfaceMessage.test.tsx`, `frontend/src/features/tasks/hooks/A2UI/test/useUiAction.test.tsx`, `frontend/src/shared/services/test/uiActionService.test.ts`.

**Interfaces:**

```ts
// shared service, strict response normalization at this boundary
uiActionService.submit(location: UiActionLocation, input: UiActionInput): Promise<UiActionResult>;
// feature hook; source identity comes from server message fields
useUiAction(options: { location: UiActionLocation; bindings: UiActionBinding[]; disabled?: boolean });
// returns { states, dispatch(actionId): Promise<void>, retry(actionId): Promise<void> }
// state per action: loading | ready | pending | uncertain | succeeded | unavailable
```

- [ ] Write a renderer test with the canonical fixture: keyboard-accessible named Button dispatches exactly its server action ID; unknown components/actions fall back; no action is possible before current-state loading completes. The shared catalog receives state/callbacks from feature code, not imports of feature services.
- [ ] Write hook/service tests that return real REST task shapes for initial reads and the command TaskDto shape for submit. Verify the request has only requestId/actionId, a retry reuses both fields, a double click sends one request, and account/conversation switch prevents stale completion from updating the new session cache.

```ts
// Request contract test; location and UUIDs are literal test fixtures.
const location = {
  conversationId: "conversation-1",
  turnId: "turn-1",
  surfaceId: "11111111-1111-4111-8111-111111111111",
};
const input = {
  requestId: "22222222-2222-4222-8222-222222222222",
  actionId: "33333333-3333-4333-8333-333333333333",
};
// Spy on the existing httpClient.post and provide a validated TaskDto fixture.
await uiActionService.submit(location, input);
expect(postSpy).toHaveBeenCalledWith(
  `/api/ai/conversations/${location.conversationId}/turns/${location.turnId}/surfaces/${location.surfaceId}/actions`,
  input,
);
```

Define `postSpy` with `vi.spyOn(axiosInstance, "post")` in this test and mock a response matching `UiActionResult`; do not send a real request from unit tests.

- [ ] Run from frontend: `pnpm exec vitest run src/shared/A2UI/test/interactiveProtocol.test.tsx src/shared/services/test/uiActionService.test.ts src/features/tasks/hooks/A2UI/test/useUiAction.test.tsx src/features/tasks/components/test/InteractiveSurfaceMessage.test.tsx`; observe red before implementation.
- [ ] Implement interactive catalog/validation and Button component. Reuse presentation components. Add interactive registry dispatch without modifying the allowlist of old registries. The feature component supplies action state via the A2UI data model and performs bounded, deduplicated reads through the existing taskService.
- [ ] Implement the feature hook and HTTP service. Treat network/5xx unknown outcomes as uncertain; permit only exact retry. On 422 reload task state; on 403/404 disable safely; on 409 require authoritative refresh. Never invoke a new command key automatically after uncertainty.
- [ ] On confirmed success, validate the TaskDto and use its status for action feedback; do not cast it to frontend Task or insert it into task caches (IDs and nullable dates differ). Call `invalidateTaskDependents` from `features/tasks/api/invalidation.ts`; invalidate existing conversation query keys as well. Recheck current session revision before cache writes. Do not optimistically mark completion before commit.
- [ ] Carry turn identity and receipt outcomes through legacy HTTP result, live terminal result, reducer and history paths. Render `InteractiveSurfaceMessage` only for its catalog; preserve companion text and text fallback without duplication. Add Vietnamese/English labels and an announced result/error region.
- [ ] Run focused tests and `pnpm exec vitest run src/shared/A2UI/test/compositionProtocol.test.tsx src/features/tasks/components/test/ChatField.test.jsx src/features/tasks/hooks/test/chatStreamReducer.test.ts`. Review and commit `feat: complete tasks from interactive chat buttons`.

## Task 5: Expose the internal tool and reconcile later agent context

**Files:** Existing `backend/config/A2UI/composition.ts`, `backend/services/agentUiService.ts`, `agentService.ts`, `conversationTurnService.ts`, `conversationService.ts`, `backend/types/IChatTurn.ts`, `backend/models/ChatTurn.ts`; `backend/skills/content/ui-composition/SKILL.md` and manifest; tests `backend/services/test/agentUiCapability.test.ts`, `agentUiRuntime.test.ts`, `agentService.test.ts`, `conversationService.integration.test.ts`.

**Interfaces:** Internal tool name `present_interactive_ui`; input `companionText` plus `InteractiveSurfaceSpec`; internal result `{ interactiveSurface: StoredInteractiveSurface; companionText?: string }`. Conversation turn service persists that result before publishing executable controls. No new SSE event type is needed in this milestone.

- [ ] Write capability tests for both flags and missing skill; default false for `A2UI_INTERACTIVE_ENABLED`. Add a runtime test proving the new tool is hidden/rejected during explicit task-proposal generation and proposal continuations.
- [ ] Add a mocked-provider agent test resolving an existing task, calling the interactive tool and finishing with persisted UI. Spy that `taskCommandService.update` was never called merely to generate it. Verify an ordinary direct completion request still exposes/uses `orbit_update_task` under the existing policy.
- [ ] Add a context test: commit an action through the HTTP adapter, start a later turn and inspect provider input for up to 3 receipt-backed outcomes; foreign-conversation receipts and uncommitted attempts are absent. Ensure task titles are labelled as data and the instruction requires fresh reads before another write.
- [ ] Run `pnpm exec vitest run services/test/agentUiCapability.test.ts services/test/agentUiRuntime.test.ts services/test/agentService.test.ts services/test/conversationService.integration.test.ts`; confirm intended failures.
- [ ] Extend capability composition/tool definitions and skill requirements. Update code-owned skill content to describe Button/action authoring, actual limits and the no-write-during-presentation rule. Preserve existing role/skill/intent gates and turn budgets.
- [ ] Persist the prepared interactive result using existing checkpoint/finalization paths. Propagate turnId/surface through synchronous and SSE terminal responses. Do not add progressive rendering or continue after this terminal tool.
- [ ] Inject bounded receipt outcomes before the next model call using `uiActionService.recentOutcomes`, alongside existing proposal outcomes without replacing them. Add capabilities `interactiveUi` and `uiActions` while preserving existing fields. Runtime flag-off rejects mutation with 409 and uses text fallback for history.
- [ ] Rerun focused tests. Review and commit `feat: expose verified task action surfaces to the agent`.

## Task 6: Exercise browser flows against the changed backend and deliver

**Files:** New `frontend/e2e/interactive-task-actions.spec.ts`, `frontend/e2e/interactive-task-actions-live.spec.ts`, `frontend/playwright.interactive.config.ts`, `backend/scripts/seed-interactive-action-test.ts`; shared fixture from task 2; update `docs/agent-chat-architecture.md`, `docs/a2ui-task-proposals.md`, `docs/README.md` and the spec/plan if implementation changes any contract.

**Interfaces:** `pnpm exec tsx scripts/seed-interactive-action-test.ts serve` uses `ORBIT_MCP_TEST_MONGO_URI`, creates a uniquely named disposable `orbit_ui_actions_test_<pid>_<timestamp>` database with owned/foreign users, categories, in-progress/pending/completed tasks and completed turns with prepared interactive surfaces, and starts the backend at `127.0.0.1:4011`. It prints only test resource IDs/base URL configuration. SIGINT/SIGTERM shuts down that process and drops its exact generated database. It rejects non-loopback URIs and databases without that prefix. No real credentials or environments are written to the repo.

The launcher starts the backend child with an explicit test environment: MONGO_URI from the guarded test URI, MONGO_NAME from the generated name, HOST=127.0.0.1, PORT=4011, ALLOWED_ORIGINS=http://127.0.0.1:5000, JWT_SECRET/JWT_REFRESH_SECRET generated in memory, JWT_ACCESS_EXPIRES_IN=1h, JWT_REFRESH_EXPIRES_IN=1d, SALT_ROUNDS=4 and both A2UI flags true. Keep unrelated storage/provider configuration out of the child environment. Create test accounts with deterministic test-only credentials in the fixture code and log in normally; do not print passwords or tokens.

- [ ] Add deterministic mocked-browser scenarios using the canonical fixture, then run `pnpm exec playwright test e2e/interactive-task-actions.spec.ts`; capture the red missing-component/action behavior before final integration.
- [ ] Implement the live fixture/seed launcher described above. Add `frontend/playwright.interactive.config.ts` extending the base config with `testMatch: "interactive-task-actions-live.spec.ts"`, `webServer.reuseExistingServer: false` and `webServer.env: { VITE_SERVER_URL: "http://127.0.0.1:4011" }`. Frontend env parsing uses VITE_SERVER_URL, not VITE_API_URL. Stop any existing test frontend occupying port 5000 before this isolated run. No live LLM is necessary: seeded stored surfaces exercise rendering and real HTTP mutations.
- [ ] Live Playwright tests must not intercept task read/write, action or stats endpoints. Navigate to the seeded conversation, click the Button, observe success, navigate to dashboard/calendar and verify status; reload the conversation and verify completion persists. Use isolated seeded resources per test so reruns are meaningful.
- [ ] Cover these browser scenarios: keyboard activation; narrow viewport (390px); lost response after real commit followed by exact-request retry (drop the response with Playwright routing after `route.fetch()` reaches the real API); stale task changed through ordinary API; foreign target blocked; flag-off fallback; conversation/account switch during a delayed request. Verify task and stats through authenticated real API reads after each committed write.
- [ ] From backend run `pnpm exec tsx scripts/seed-interactive-action-test.ts serve` with the guarded test URI exported. From frontend run `pnpm exec playwright test --config playwright.interactive.config.ts` personally against that changed API and record observed outcomes. Stop the launcher afterwards to clean up. A skipped live suite is incomplete browser verification, even if mock tests pass.
- [ ] Run the package checks in order below, record counts/skips/failures and fix failures caused by this change. Identify unrelated failures explicitly rather than reporting an overall pass. Do not broaden scope to unrelated fixes without review.
- [ ] Update operational docs with the default-off flag, shared command boundary, registered command, retries, source-turn behavior and rollout limits. Add links from the engineering index; leave older proposal documentation accurate for its own catalog.
- [ ] Self-review A1–A10 against the evidence, preserve unrelated changes, inspect final diff and commit `test: verify interactive task actions across chat and task views` once required checks pass.

### Exact verification commands

Run from `backend/`, with the disposable replica-set URI already exported:

```bash
pnpm test
pnpm run lint
pnpm run format:check
pnpm run build
```

Run from `frontend/`, with the test backend already configured for live browser checks:

```bash
pnpm test
pnpm exec playwright test e2e/interactive-task-actions.spec.ts e2e/ui-composition.spec.ts e2e/task-proposals.spec.ts
pnpm exec playwright test --config playwright.interactive.config.ts
pnpm run lint
pnpm run format:check
pnpm run build
```

The frontend build includes type-check. Record the actual disposable database setup and browser/backend launch commands in the execution log; never include passwords/tokens. If the existing navigation test fails again, report its exact name/result separately and assess whether the new changes touch it.

### Acceptance coverage

| Spec | Tasks/evidence                                                       |
| ---- | -------------------------------------------------------------------- |
| A1   | Task 1 shared/MCP/REST regressions and old receipt replay            |
| A2   | Tasks 2 and 5 generation with zero business writes                   |
| A3   | Tasks 3, 4 and 6 database plus real browser/cache checks             |
| A4   | Tasks 1 and 3 transaction/concurrency/replay tests                   |
| A5   | Tasks 2 and 3 stored binding/ownership/tampering tests               |
| A6   | Tasks 1, 3, 4 and live stale-state scenario                          |
| A7   | Tasks 3 and 4 rollback/uncertain retry; task 6 dropped real response |
| A8   | Tasks 3 and 5 bounded verified outcomes; task 6 reload               |
| A9   | Tasks 2, 4, 5 plus existing fixture/browser regressions              |
| A10  | Task 4 session isolation and task 6 keyboard/mobile/navigation       |

## Handoff

This plan is proposed for review. All checkboxes remain unchecked until execution. Do not implement block messages, form controls or progressive rendering under this plan. Review the spec and the shared-command extraction first; execution can proceed inline after that review.

# A2UI Task Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users generate, edit, save and confirm task proposals inside chat without premature or duplicate task creation.

**Architecture:** Persist domain proposals separately from chat turns and generate a versioned A2UI surface from their current state. Keep proposal generation read-only and handle confirmation directly through existing task services in one transaction. Render an allowlisted React catalog inside the existing chat, retaining text fallback and shared authentication.

**Tech Stack:** Existing Express/TypeScript/Mongoose/Zod 4 backend; React 19/Vite/TanStack Query frontend; A2UI v0.9 with `@a2ui/react@0.15.0`, `@a2ui/web_core@0.15.0`, frontend `zod@3.25.76`; existing Vitest, Testing Library, Playwright, ESLint and Prettier.

**Spec:** `docs/superpowers/specs/2026-11-04-a2ui-task-proposals-design.md`

## Global Constraints

- Generate 1–20 draft items with stable server-assigned item IDs.
- Generation and draft editing create no tasks and change no task statistics.
- Commit all selected items or none.
- Use existing timezone/date normalization; start must not follow due date when both are supplied.
- Missing category resolves to the user's Uncategorized category.
- Gate the feature behind backend `A2UI_TASK_PROPOSALS_ENABLED`, default false.
- Do not change the legacy generate-tasks endpoint or ordinary chat behavior.
- Use pnpm only, per-package lockfiles, NodeNext `.js` source imports and existing service/repository boundaries.
- Each implementation task starts with failing behavioral tests, ends with targeted passing tests, and receives a scoped commit. Do not commit unrelated work.
- Execute inline; this plan does not require subagents. Apply the local node skill during backend work, frontend-design during UI work, and webapp-testing for browser checks.

## Verified compatibility and implementation decisions

Read-only checks completed during planning:

```sh
# frontend/
pnpm view @a2ui/react version peerDependencies dependencies exports --json
pnpm view @a2ui/web_core version exports --json
```

Both packages returned 0.15.0. Published tarball README and declarations confirm
`A2uiSurface` and `createComponentImplementation` from `@a2ui/react/v0_9`, and
`MessageProcessor` and `Catalog` from `@a2ui/web_core/v0_9`. The processor accepts
`(catalogs, actionHandler, options)`, exposes `processMessages`, `getSurfaces` and
`dispose`, and supports strict validation. Do not use the differently capitalized
surface name from general website prose. Runtime compatibility is not yet tested.

Use a small custom catalog with one root `TaskProposalForm` component. It receives
the proposal model through bindings and renders native application controls; its
save/confirm/cancel buttons use A2UI actions. This is a real A2UI component and
message pipeline, not a custom JSON format merely labelled A2UI. Avoid importing
the entire basic catalog or accepting arbitrary component names.

Contract limits: 20 items; 128 KiB proposal action body and emitted surface; at
most 16 protocol messages per envelope. Use UUIDs for proposal, item and request
IDs. New tasks use the existing `taskService.create` default `in-progress` status.
Draft expiration is not introduced. Existing conversation removal, if added later,
must also remove proposals and receipts; no new deletion endpoint is in scope.

## Shared interfaces and file responsibilities

All A2UI-only source files live in an `A2UI` subdirectory of their existing layer.
Test files keep their existing locations; shared routes/controllers stay in place.
This naming applies to subsequent implementation tasks as well.

Backend types belong in `backend/types/A2UI/ITaskProposal.ts`; frontend wire types in
`frontend/src/shared/types/A2UI/taskProposal.ts`. Keep protocol dependency out of backend
production code: validate the narrow emitted envelope with Zod and verify it against
the actual A2UI processor in frontend contract tests. Maintain one checked-in sample
at `docs/superpowers/fixtures/a2ui-task-proposal-v09.json`, tested by both packages.

```ts
type ProposalIntent = "task_proposal";
type ProposalStatus = "draft" | "created" | "cancelled";
type ProposalItem = {
  id: string;
  title: string;
  description?: string;
  priority?: "Low" | "Medium" | "High";
  categoryId?: string;
  projectId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
};
type ProposalView = {
  id: string;
  conversationId: string;
  turnId: string;
  revision: number;
  status: ProposalStatus;
  protocolVersion: "v0.9";
  catalogId: "urn:orbit:a2ui:task-proposals:v1";
  items: ProposalItem[];
  selectedItemIds: string[];
  createdTasks: { itemId: string; taskId: string; title: string }[];
};
type ProposalAction = { requestId: string; revision: number } & (
  | {
      action: "save" | "confirm";
      items: ProposalItem[];
      selectedItemIds: string[];
    }
  | { action: "cancel" }
);
type ProposalEnvelope = {
  proposal: ProposalView;
  text: string;
  a2ui?: {
    protocolVersion: "v0.9";
    catalogId: string;
    surfaceId: string;
    messages: Record<string, unknown>[];
  };
};
```

Persist `userId`, timestamps and originating turn identity internally; never expose
execution tokens or receipt fingerprints. Store receipts separately, keyed by
owner + requestId, with proposal ID, canonical input fingerprint and resulting
ProposalView. Each successful mutation, including save/cancel, has a receipt.
Replay returns that action's committed result; history returns current state.

Capability discovery: add `GET /api/ai/conversations/capabilities` before the
`:conversationId` route, returning `{ taskProposals: boolean }`. This works before
the first conversation exists and preserves the existing null-latest contract.
Also include capabilities in non-null conversation snapshots. The frontend uses
the capability endpoint initially and refreshes from snapshots.

## Task 1: Domain contracts, capability and persistence

**Files**

- Create `backend/types/A2UI/ITaskProposal.ts`, `backend/validations/A2UI/taskProposalValidation.ts`.
- Create `backend/models/A2UI/TaskProposal.ts`, `backend/models/A2UI/TaskProposalReceipt.ts`.
- Create `backend/repositories/A2UI/taskProposalRepository.ts`.
- Create `backend/config/A2UI/a2ui.ts`, `backend/error/definitions/A2UI/taskProposalErrors.ts`.
- Modify `backend/routes/aiRoutes.ts`, `backend/controllers/aiController.ts`, `backend/.env.example`.
- Test `backend/validations/test/taskProposalValidation.test.ts`, `backend/services/test/taskProposalCapability.test.ts`.

**Interfaces:** `isTaskProposalsEnabled(): boolean`; schemas
`proposalItemsSchema`, `proposalActionSchema`, `proposalParamsSchema`;
repository `findOwned(userId, conversationId, proposalId)`,
`findByTurn(userId, turnId)`, `findReceipt(userId, requestId)`,
`saveReceipt(receipt)`, `saveRevision(userId, conversationId, proposalId, revision, update)`.
All queries execute within the caller's transaction when present.

- [ ] Write schema and capability tests before production files, including this case:

```ts
it("rejects duplicate items, whitespace titles and injected identity", () => {
  const item = { id: "00000000-0000-4000-8000-000000000001", title: "Read" };
  expect(proposalItemsSchema.safeParse([item, item]).success).toBe(false);
  expect(
    proposalItemsSchema.safeParse([{ ...item, title: "  " }]).success,
  ).toBe(false);
  expect(
    proposalItemsSchema.safeParse([{ ...item, userId: "other" }]).success,
  ).toBe(false);
});
```

- [ ] Run `pnpm test -- validations/test/taskProposalValidation.test.ts services/test/taskProposalCapability.test.ts` in backend. Record expected missing-contract failures; establish runnable test imports before accepting behavioral red evidence.
- [ ] Implement strict schemas using task field limits, trimmed titles and the date normalizer; reject duplicate or unknown selected IDs, invalid date order, unknown keys and empty confirm selection. Save may have zero selected items. Save/confirm must contain exactly the stored item ID set; adding/removing rows is outside MVP.

```ts
export const isTaskProposalsEnabled = () =>
  process.env.A2UI_TASK_PROPOSALS_ENABLED === "true";
// Mongo index declarations, in the respective model modules:
proposalSchema.index({ userId: 1, turnId: 1 }, { unique: true });
receiptSchema.index({ userId: 1, requestId: 1 }, { unique: true });
```

- [ ] Define typed errors: inaccessible 404, disabled 409, stale revision/request conflict 409, invalid references 422, transaction unavailable 503. Use existing AppError/error response conventions with item/field details where supported.
- [ ] Add authenticated capability controller, route ordering test and flag example. Pre-initialize proposal/receipt indexes before first transaction, following existing repository patterns.
- [ ] Rerun targeted tests and backend type-check, then commit `feat: define task proposal contracts and capability`.

## Task 2: Persist read-only proposal generation in conversations

**Files**

- Modify `backend/validations/aiValidation.ts`, `backend/types/IChatTurn.ts`, `backend/types/IAgent.ts`, `backend/models/ChatTurn.ts`.
- Modify `backend/services/agentService.ts`, `backend/services/conversationService.ts`, `backend/services/conversationTurnService.ts`.
- Modify `backend/repositories/chatTurnRepository.ts`, `backend/utils/conversationView.ts`, `backend/controllers/aiController.ts`.
- Create `backend/services/A2UI/taskProposalGenerationService.ts`.
- Test `backend/services/test/taskProposalGeneration.test.ts`; extend `backend/services/test/conversationService.integration.test.ts`, `backend/services/test/agentService.test.ts` and `backend/services/test/conversationHistory.test.ts`.

**Interfaces:** optional `intent` on ChatPayload/ChatTurn/AgentMemory;
agent result extends its current union with `{ proposalItems: Omit<ProposalItem, 'id'>[] }`;
`taskProposalGenerationService.prepare(items, context): Promise<ProposalItem[]>`;
`chatTurnRepository.finishWithProposal(turnId, executionToken, preparedItems)`
persists the draft, proposal reference, final text and conversation release in one
transaction. `resultFor` and `turnMessages` accept an optional hydrated envelope.

- [ ] Extend fake provider tests to request `orbit_create_task` during proposal mode, followed by a valid proposal tool result. Assert no MCP write execution occurs. Repeat after a clarification answer that omits intent. Include an ordinary chat write regression.

```ts
expect(writeSpy).not.toHaveBeenCalled();
expect(await Task.countDocuments({ title: "Read chapter 1" })).toBe(0);
expect(
  snapshot.messages.some((message) => message.proposal?.items.length === 1),
).toBe(true);
```

- [ ] Run `pnpm test -- services/test/taskProposalGeneration.test.ts services/test/agentService.test.ts services/test/conversationHistory.test.ts`; observe missing proposal behavior.
- [ ] Add a local structured `propose_tasks` tool with 1–20 schema-validated items. Assign UUIDs server-side; resolve category/project IDs with owned reads and default category handling. Do not call `aiService.generateTasks` because it writes tasks.
- [ ] Filter write tools out of proposal mode and reject prohibited tool names at dispatch as well. Carry the restriction in MCP context `beforeWrite` as defense in depth; allow only explicitly identified read tools plus existing skill loaders, clarification and `propose_tasks`.

```ts
// Inside dispatch, before calling mcpClient.callTool:
if (memory.intent === "task_proposal" && !proposalAllowedTools.has(name)) {
  throw new AppError(TASK_PROPOSAL_ERROR.WRITE_FORBIDDEN);
}
```

- [ ] Persist intent during claim and compare it in duplicate-request matching. Resolve clarification continuation intent from the pending source turn in the same claim transaction; clients cannot remove that restriction with omitted or altered intent. Explicit new messages without a selection remain ordinary chat unless they request proposal intent.
- [ ] Implement guarded atomic finish. A stale execution token must not publish an orphan proposal or release another worker's turn. Keep the model call outside transactions. A malformed proposal finishes with textual retry guidance and no writes.
- [ ] Batch hydrate proposals for the 50 visible turns to avoid one query per message; include terminal summaries even with feature disabled. Preserve attachments, menus and existing pagination. Retry of a completed turn returns its proposal without another model call.
- [ ] Rerun unit tests and the conversation integration suite using the disposable MongoDB setup in Task 6; commit `feat: generate durable task drafts from chat`.

## Task 3: Atomic proposal actions and retry receipts

**Files**

- Create `backend/services/A2UI/taskProposalActionService.ts`, `backend/controllers/A2UI/taskProposalController.ts`.
- Modify `backend/routes/aiRoutes.ts`, `backend/repositories/A2UI/taskProposalRepository.ts`.
- Reuse `backend/mcp/repositories/writeRepository.ts`, `backend/services/taskService.ts`, category/project repositories and existing stats updates.
- Test `backend/services/test/taskProposalActions.test.ts`, `backend/services/test/taskProposalActions.integration.test.ts`.

**Interface:** `taskProposalActionService.apply(userId, conversationId, proposalId, action): Promise<ProposalView>`. The controller validates using middleware, calls this service and later wraps the result with the adapter from Task 4.

- [ ] Write unit rejection tests and real-Mongo tests for subset selection, exact edited fields, no writes on save/cancel, same-ID replay, different-payload conflict, concurrent different-ID confirms, stale revisions and cross-user access.

```ts
const responses = await Promise.all([postAction(first), postAction(second)]);
expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
expect(await Task.countDocuments()).toBe(2);
// A separate test injects failure in the second task/stat update:
expect(await Task.countDocuments()).toBe(0);
expect((await loadProposal()).status).toBe("draft");
expect(await TaskProposalReceipt.countDocuments()).toBe(0);
```

- [ ] Run `pnpm test -- services/test/taskProposalActions.test.ts services/test/taskProposalActions.integration.test.ts` with the test URI. A skipped integration suite is not red/green evidence.
- [ ] Implement one user-scoped transaction. Check feature availability and access, then look up receipt before checking revision so a successful retry remains valid. Canonicalize object keys and selected ID ordering for fingerprinting while retaining item order in the saved draft. Fingerprint includes proposal, conversation, revision, action and edited data.

```ts
return writeRepository.transaction(userId, async () => {
  // Verify ownership; replay matching receipt; reject mismatched reuse.
  // Require draft state and matching revision, then validate all references.
  // For confirm, execute sequentially inside this transaction:
  for (const item of selectedItems) {
    const { id: itemId, ...fields } = item;
    const task = await taskService.create(fields, userId);
    if (!task) throw new AppError(TASK_PROPOSAL_ERROR.CREATE_FAILED);
    createdTasks.push({ itemId, taskId: String(task._id), title: item.title });
  }
  // Persist next revision/status and receipt before returning the domain view.
});
```

- [ ] Use taskService directly, not `taskWriteService`, which starts its own transaction. Create receipts only after all writes succeed. Cancel and save use the same lock/receipt discipline. Verify all payload references; errors identify item/field without leaking foreign entity details.
- [ ] Mount authenticated POST action route with strict params/body validation and a 128 KiB limit; test global JSON parsing interaction so oversized bodies are rejected before costly processing. No action endpoint calls an AI provider.
- [ ] Test transaction-unavailable response, response-loss replay, stats consistency, project completed after draft, missing default category, invalid date/timezone and cancel-versus-confirm races. Rerun targeted checks and commit `feat: confirm task proposals atomically`.

## Task 4: A2UI adapter and real renderer contract

**Files**

- Create `backend/services/A2UI/taskProposalUiService.ts`, `backend/validations/A2UI/a2uiValidation.ts`.
- Modify `backend/services/conversationService.ts`, `backend/services/conversationTurnService.ts`, `backend/controllers/A2UI/taskProposalController.ts`.
- Create `frontend/src/shared/types/A2UI/taskProposal.ts`.
- Create `frontend/src/features/tasks/components/chat/A2UI/taskProposalCatalog.tsx`, `TaskProposalForm.tsx`, `TaskProposalSurface.tsx` in that same directory.
- Create `docs/superpowers/fixtures/a2ui-task-proposal-v09.json`.
- Modify `frontend/package.json`, generated `frontend/pnpm-lock.yaml`.
- Test `backend/services/test/taskProposalUi.test.ts`, `frontend/src/features/tasks/components/test/TaskProposalProtocol.test.tsx`.

**Interfaces:** `taskProposalUiService.present(view, enabled): ProposalEnvelope`;
`TaskProposalSurface({ envelope, onAction, onDirtyChange, onReload })`;
`TaskProposalForm` accepts bound editable fields, owned choices and action callbacks.
`onAction(action: ProposalAction): Promise<ProposalEnvelope>` is supplied in Task 5.

- [ ] Add pinned frontend dependencies using `pnpm add --save-exact @a2ui/react@0.15.0 @a2ui/web_core@0.15.0 zod@3.25.76`. Keep backend Zod 4 unchanged.
- [ ] Write a renderer contract test feeding the fixture through the actual processor. Assert visible title and editable binding, action context after editing, terminal disabled controls, unknown catalog/component/action rejection and malformed-payload text fallback. Add an adapter test comparing structural output to the fixture while normalizing the random surface ID.
- [ ] Run frontend `pnpm test -- src/features/tasks/components/test/TaskProposalProtocol.test.tsx` and backend `pnpm test -- services/test/taskProposalUi.test.ts`; record missing adapter/form behavior, not only missing imports.
- [ ] Implement a v0.9 envelope with `createSurface`, `updateComponents` and `updateDataModel`. Use catalog `urn:orbit:a2ui:task-proposals:v1`, root component ID `root`, bound fields under `/proposal`, and server actions named `save`, `confirm`, `cancel`. Build messages in backend; validate size, message count and strict envelope before returning.

```tsx
import { A2uiSurface } from "@a2ui/react/v0_9";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
const processor = new MessageProcessor([taskProposalCatalog], handleAction, {
  version: "v0.9",
});
processor.processMessages(envelope.a2ui.messages);
const surface = processor.getSurfaces().get(envelope.a2ui.surfaceId);
// In the React wrapper, render only after validation:
return surface ? <A2uiSurface surface={surface} /> : <p>{envelope.text}</p>;
```

- [ ] Define the form API with `CommonSchemas` dynamic bindings and Action schemas, and register via `createComponentImplementation` and `Catalog`. Use injected setters for two-way binding, native labelled inputs and controlled selection. Fetch owned choices through existing shared services; disabled/deleted choices remain visible as field errors until changed.
- [ ] Keep processor construction/message processing in a lifecycle-safe hook; dispose on unmount/replacement. Allocate a fresh surface ID per presentation; use proposal ID as stable message identity. Never replace a dirty form due to unrelated history refresh. Reject action names or IDs not matching the current surface/proposal.
- [ ] Render created task controls with the existing task-detail interaction, not invented URL routes. Use textContent/native React text for proposal strings. No raw HTML/remote script or catalog fetching.
- [ ] Run both targeted suites plus frontend type-check; commit `feat: render task proposals through A2UI`.

## Task 5: Chat intent, draft UX and authenticated actions

**Files**

- Modify `frontend/src/shared/services/aiService.ts`, `frontend/src/shared/types/domain.ts`.
- Modify `frontend/src/features/tasks/hooks/useConversationChat.ts`, `useConversationSession.ts` in the same directory.
- Create `frontend/src/features/tasks/hooks/A2UI/useTaskProposal.ts`.
- Modify `frontend/src/features/tasks/api/aiMutations.ts`, existing invalidation helpers only if necessary.
- Modify `frontend/src/features/tasks/components/chat/ChatField.jsx`, `ChatToolbar.jsx`; create `A2UI/taskProposal.css` alongside the catalog.
- Test `frontend/src/features/tasks/components/test/TaskProposalChat.test.tsx`, extend `frontend/src/features/tasks/api/test/aiMutations.test.tsx`.

**Interfaces:** `aiService.getConversationCapabilities()`;
`aiService.applyProposalAction(conversationId, proposalId, action)`;
`useTaskProposal(envelope)` exposes `submit`, `pendingAction`, `error`, `dirty`,
`setDirty`, `reload`. Wire requests exclusively through the shared axios instance.

- [ ] Write behavior tests: capability controls entry visibility; selected entry sends intent; edits save and restore; zero selection disables confirm; confirm submits edited selection; terminal actions disable; auth refresh preserves one logical request; stale replies after conversation/user switch do not update current UI.

```tsx
await user.click(screen.getByRole("button", { name: "Plan tasks" }));
await user.type(
  screen.getByRole("textbox", { name: /message/i }),
  "Learn TypeScript",
);
await user.click(screen.getByRole("button", { name: /send/i }));
expect(sendMock).toHaveBeenCalledWith(
  expect.objectContaining({ intent: "task_proposal" }),
);
// Assert pending request ID and full payload are reused after a network failure.
expect(retryPayload).toEqual(firstPayload);
```

- [ ] Run `pnpm test -- src/features/tasks/components/test/TaskProposalChat.test.tsx src/features/tasks/api/test/aiMutations.test.tsx` and observe expected missing entry/action behavior.
- [ ] Add the explicit composer entry without a second conversation mode. Store intent in the pending chat payload and recovered turns. Restore the standard composer intent after the proposal turn; server continuation rules remain authoritative.
- [ ] Preserve optional proposal envelopes in immediate responses and history. Add the new renderer beside existing text/interaction branches without suppressing legacy messages or attachments.
- [ ] Generate one UUID per action; freeze its payload while uncertain. Disable edits during in-flight/uncertain confirmation, offer retry with the same ID, and expose reload. Deterministic 4xx errors release pending state; 409 asks to reload and reconcile; timeouts retain the original payload. Do not automatically send changed edits under the same ID.

```ts
const result = await aiService.applyProposalAction(
  conversationId,
  proposalId,
  pendingAction,
);
if (!isCurrentConversation()) return;
setEnvelope(result);
setDirty(false);
// Confirm success (including replay) invalidates task/project/category/stats queries.
await invalidateWorkspaceQueries(queryClient);
```

- [ ] Invalidate on uncertain confirm outcomes too, because the transaction may have committed before the response was lost. Save/cancel do not need workspace invalidation. Do not replace shared refresh-token or timeout logic.
- [ ] Show unsaved state and guard new/open conversation with an in-app discard choice; support browser unload warning. Save clears dirty state only after server success. Render inline field errors, submitting status and confirmation count. Mobile controls must fit 360 px width and remain keyboard accessible.
- [ ] Rerun targeted component/API tests and existing chat tests; commit `feat: connect proposal editing and confirmation in chat`.

## Task 6: End-to-end evidence, rollout and full verification

**Files**

- Create `frontend/e2e/task-proposals.fixture.ts`, `frontend/e2e/task-proposals.spec.ts`.
- Complete `backend/services/test/taskProposalActions.integration.test.ts` and conversation integration coverage.
- Create `docs/a2ui-task-proposals.md` with enable/disable instructions, transaction prerequisite and retry behavior.
- Update spec/plan checkboxes and record measured verification outcomes.

**Interfaces:** browser fixture intercepts capabilities, conversation reads/chat, and action endpoint, stores proposal revisions and receipts, and counts committed tasks. Real database tests remain the source of evidence for transaction atomicity; browser mocks cannot prove it.

- [ ] Add Playwright cases before final UI fixes: Plan tasks → receive two rows → edit one → deselect one → save → reload → confirm → terminal state → reload again. Assert one selected task and matching edited title. Add cancel, stale revision, timeout/retry, malformed surface, keyboard-only and mobile variants.

```ts
await page.getByRole("button", { name: "Save draft" }).click();
await page.reload();
await expect(page.getByRole("textbox", { name: "Task 1 title" })).toHaveValue(
  "Read chapter 2",
);
await page.getByRole("button", { name: /Create 1 task/ }).click();
await expect(page.getByRole("status")).toContainText("Created 1 task");
await page.reload();
await expect(
  page.getByRole("button", { name: /Create 1 task/ }),
).toBeDisabled();
```

- [ ] Use a disposable loopback MongoDB replica set. Follow the existing integration suite's `ORBIT_MCP_TEST_MONGO_URI` requirement (`mongodb://127.0.0.1:<port>/`) and unique database names. Never point tests at backend/.env or real data. Example isolated harness:

```sh
docker run -d --name todo-a2ui-test-mongo -p 127.0.0.1:27019:27017 mongo:8 --replSet rs0 --bind_ip_all
docker exec todo-a2ui-test-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
docker exec todo-a2ui-test-mongo mongosh --quiet --eval 'db.hello().isWritablePrimary'
# backend/; wait for true before running tests
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27019/ pnpm test -- services/test/taskProposalActions.integration.test.ts services/test/conversationService.integration.test.ts
```

If container replica-set discovery requires it, configure the test-only mongoose
connection with `directConnection: true`; retain the loopback URI safeguard. If
Docker/browser binaries are unavailable, report the blocker instead of marking
integration/browser checks passed. Remove only the specifically created test
container after collecting results.

- [ ] Run browser tests: `pnpm exec playwright test e2e/task-proposals.spec.ts` in frontend. Inspect screenshots at desktop and 360 px, browser console and network failures; use actual renderer in these tests. Fix discovered defects and rerun affected cases.
- [ ] Run final package checks in this order:

```sh
# backend/
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27019/ pnpm test
pnpm run lint
# frontend/
pnpm test
pnpm run lint
```

- [ ] Format-check only changed source/docs with each package's local Prettier. Capture touched paths safely, excluding lockfiles and generated outputs:

```python
# Execute from repo root; covers staged/unstaged/untracked implementation files.
import pathlib, subprocess
root = pathlib.Path.cwd()
paths = set()
for args in [['git','diff','--name-only','590c1b0'],
             ['git','ls-files','--others','--exclude-standard']]:
    paths.update(subprocess.check_output(args, text=True).splitlines())
for package in ['backend', 'frontend']:
    files = [str(root / p) for p in sorted(paths)
             if p.startswith(package + '/') and pathlib.Path(p).suffix
             in {'.ts','.tsx','.js','.jsx','.json','.css','.md'}]
    if package == 'backend':
        files += [str(root / p) for p in sorted(paths) if p.startswith('docs/') and p.endswith(('.md','.json'))]
    if files:
        subprocess.run(['pnpm','exec','prettier','--check',*files], cwd=root/package, check=True)
```

Use `--write` on that same explicit file list only when checks identify formatting
issues, then rerun `--check`. Report pre-existing unrelated lint failures separately.

- [ ] Run backend `pnpm run build`, frontend `pnpm run build` (includes type-check), then root `git diff --check`. Rerun tests after any semantic fix.
- [ ] Document rollback: disable the backend flag; deny new proposal intents/actions, show existing proposal text and task results, preserve records and already-created tasks. Test disabling between generation and confirmation.
- [ ] Commit `test: verify A2UI task proposal workflow`. Summarize exact commands, passing counts, skips, warnings and any unavailable real-provider/browser/database paths. Do not claim live model quality from mocked provider tests.

## Acceptance coverage and execution handoff

| Spec acceptance                               | Implementation and evidence                                   |
| --------------------------------------------- | ------------------------------------------------------------- |
| Read-only proposal intent and continuation    | Task 2 dispatch, context guard and provider/integration tests |
| Draft/save/cancel do not write tasks or stats | Tasks 2–3 database assertions                                 |
| Edited subset and correct stats               | Tasks 3 and 6 real transaction tests                          |
| Retry/concurrency/lost response               | Tasks 3 and 5 receipt and frontend pending-payload tests      |
| Atomic rollback                               | Tasks 3 and 6 real replica-set failure injection              |
| Ownership/validation/revision/project state   | Tasks 1 and 3                                                 |
| History restoration and compatibility         | Tasks 2 and 5; Task 6 reload checks                           |
| Actual protocol/renderer validity             | Task 4 shared fixture and renderer tests                      |
| Accessible/mobile/error UX                    | Tasks 5–6                                                     |
| Disabled flag and existing flows              | Tasks 1, 2, 5 and 6 regressions                               |

Planning is complete when the document and pinned-version spec pass formatting
and diff checks. No feature code or dependencies are changed during planning.
On an instruction to implement, read the approved spec and this plan, invoke the
local executing-plans skill, and proceed inline through the tasks in order.

## Task 1 review fixes and verification — 2026-11-04

Task 1 review fixes are implemented; no work from Tasks 2–6 is claimed complete.
Calendar/time overflow is rejected before normalization, conversation route IDs
require UUIDs, and revision updates are scoped to owner + conversation + proposal.
Capability tests restore their environment and spies. The model formatting issue
is fixed. Changes remain staged for review, without a new commit.

Behavioral RED evidence: date/UUID regression tests ran against existing modules
and produced six assertion failures. After adding the conversation parameter to
the repository signature but before fixing its filter, the real MongoDB test
returned the wrong conversation ID (one assertion failure, four tests passed).
This supplements the earlier missing-module RED report; it does not retroactively
establish a behavioral RED phase for every original Task 1 requirement.

GREEN commands executed from `backend/`:

```sh
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27029/ pnpm exec vitest run validations/test/taskProposalValidation.test.ts services/test/taskProposalCapability.test.ts repositories/test/taskProposalRepository.integration.test.ts
# 3 files, 33 tests passed.
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27029/ pnpm test
# 35 files, 306 tests passed; no skipped tests.
pnpm run lint
pnpm run build
pnpm exec prettier --check config/A2UI/a2ui.ts controllers/aiController.ts error/definitions/A2UI/taskProposalErrors.ts error/errorCodes.ts models/A2UI/TaskProposal.ts models/A2UI/TaskProposalReceipt.ts repositories/A2UI/taskProposalRepository.ts repositories/test/taskProposalRepository.integration.test.ts routes/aiRoutes.ts services/test/taskProposalCapability.test.ts types/A2UI/ITaskProposal.ts validations/A2UI/taskProposalValidation.ts validations/test/taskProposalValidation.test.ts ../docs/superpowers/plans/2026-11-04-a2ui-task-proposals.md
```

All checks above passed. From `frontend/`, `pnpm run lint` and `pnpm run build`
passed. Vite reported mixed static/dynamic imports for ErrorPage and chunks over
500 kB. No frontend source changes or browser checks were part of this fix.

Real database evidence covers unique turn/proposal/receipt indexes, owner isolation,
receipt persistence, stale revisions, cross-conversation update isolation and
rollback of proposal + receipt with an explicit session. MongoDB 8 could not start
on the host kernel; a disposable MongoDB 7 replica set on loopback port 27029 was
used instead, with isolated test databases. The temporary containers are removed
after verification. Full task-batch confirmation atomicity is still Task 3 scope.

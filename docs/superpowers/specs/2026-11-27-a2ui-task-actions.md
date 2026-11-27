# A2UI task actions: shared commands and Button

Status: draft for review; no implementation started.

Related: [roadmap](2026-11-27-a2ui-evolution-roadmap.md), [implementation plan](../plans/2026-11-27-a2ui-task-actions.md).

## 1. Problem and expected behavior

Orbit can render read-only A2UI and editable Task Proposals. It cannot attach an existing-task operation to a chat button. The agent can already perform the same operation through `orbit_update_task`.

When a user asks for an interactive component for an existing task, the agent resolves that task with existing read tools and presents a Button labelled in the user's language. Clicking it completes an in-progress task through shared application commands, updates the surface and affected application queries, and records an authoritative outcome. Generating the surface never completes the task.

An example is a Card with the task title, explanatory Text and a “Hoàn thành” Button. Other existing presentation nodes remain composable around it.

## 2. Global constraints

- A2UI is an interaction adapter; task rules, authorization, transactions, statistics and idempotency remain shared application capabilities.
- Keep A2UI protocol v0.9 and the installed @a2ui/react and @a2ui/web_core versions 0.15.0; no dependency upgrades.
- Use pnpm@11.21.0 from each affected package directory.
- Preserve legacy catalogs and Task Proposal save/confirm/cancel contracts.
- Keep shared frontend modules independent of features and app modules.
- No model-authored JavaScript, handlers, API URLs, ownership fields or executable catalogs.
- Only task.complete is registered in the first release; no implicit start, create, delete or metadata update.
- Existing surface limits remain 100 nodes, depth 10, 128 KiB and 16 A2UI messages; at most 10 task actions per interactive surface.

## 3. Architecture and reuse

```text
MCP adapter (existing USER + tasks:write gate) ─┐
                                             ├─ shared taskCommandService
A2UI adapter (authenticated USER + binding) ──┘       │
                                                     ├─ taskService lifecycle/ownership
Existing REST task endpoints ────────────────────────┤
                                                     └─ existing statistics infrastructure
```

Extract command orchestration currently in `backend/mcp/services/taskWriteService.ts` into `backend/services/taskCommandService.ts`. Preserve create/update/delete behavior, canonical fingerprints, per-user write serialization, receipt replay and internal `beforeWrite` guards. Move its schemas, DTO serialization and repository dependencies to transport-neutral locations. MCP paths can re-export shared contracts for compatibility and keep their access gates. The application service must not import from `backend/mcp/`.

Keep the MongoDB model/collection identities `McpWriteReceipt` and `McpWriteLock` during extraction, including receipt hashes and fingerprints, so historical retries still resolve. Their legacy names do not justify a second receipt store or a destructive rename.

Existing REST endpoints continue calling the same lifecycle services with their existing response bodies, ownership rules and ADMIN behavior. This milestone does not retrofit the REST API with new mandatory idempotency keys. A2UI and MCP share the existing transactional command wrapper above that common lifecycle.

The A2UI dispatcher is a finite registry translating a verified stored `task.complete` binding into `taskCommandService.update({ taskId, changes: { status: "completed" }, idempotencyKey }, context)`. It does not duplicate `taskService.finish`, statistics logic or task persistence.

## 4. Authoring and persisted surface contract

Introduce a separate catalog `urn:orbit:a2ui:interactive:v1`; keep `urn:orbit:a2ui:composition:v1` unchanged. Interactive surfaces reuse presentation components and add Button. Task Proposal nodes cannot appear in this catalog.

Expose `present_interactive_ui` as an internal agent tool gated by the existing code-owned `ui-composition` skill. It takes `companionText`, the usual presentation spec fields and an `actions` record. It ends the turn like current `present_ui`; multiple surfaces are deferred to the block milestone.

Example authored action and component:

```json
{
  "actions": {
    "finishTask": {
      "name": "task.complete",
      "taskId": "0123456789abcdef01234567"
    }
  },
  "button": {
    "id": "finishButton",
    "component": "Button",
    "label": "Hoàn thành",
    "actionKey": "finishTask"
  }
}
```

The example shows fragments, not a complete surface. All existing graph/binding constraints still apply. Action keys use the existing safe identifier rules. Reject unknown fields, missing/redundant action definitions, unregistered action names and Task Proposal nodes. Multiple buttons may reference the same declared action. The task ID must resolve to an accessible task before the surface is saved; it is checked again at execution. Pending/given-up/completed tasks may be displayed with a disabled action and a reason; they never trigger implicit transitions.

The server assigns stable UUID action IDs, stored as `actionBindings: Array<{ id, key, name: "task.complete", taskId }>` alongside the interactive spec. It assigns the surface UUID and persists both before returning executable UI. The model cannot supply action IDs or binding records.

Extend `StoredUiSurface` as a discriminated union by catalog ID, preserving the exact old shape for existing catalogs. Do not reinterpret old surfaces as interactive. Compile each Button to one `dispatch` event containing only the server-issued action ID. Add a server-projected `/actionState/<key>` binding for disabled/busy/result presentation; it is not model authority. The interactive registry allowlists `dispatch` only. Labels are plain text and have an accessible name.

## 5. Action HTTP contract

```text
POST /api/ai/conversations/:conversationId/turns/:turnId/surfaces/:surfaceId/actions
Content-Type: application/json

{ "requestId": "<UUID>", "actionId": "<UUID>" }
```

Body schema is strict. Caller-supplied task IDs, action names, command arguments, endpoints or user IDs are rejected. The handler uses `protect`, request validation and the application's central error handler.

The adapter verifies the authenticated role is USER, conversation ownership, turn membership/ownership, terminal successful source turn (`completed`), stored surface/catalog identity and binding membership. Missing and foreign conversation/turn/surface/action references return the same 404 response. Then the shared command checks current task ownership and lifecycle; possession of an action ID never bypasses these checks. Task permissions errors use the existing domain definitions without leaking titles/content.

Response 200:

```ts
type UiActionResult = {
  requestId: string;
  actionId: string;
  outcome: "succeeded";
  task: TaskDto; // existing command DTO, snapshot of committed result
};
```

The client validates this DTO explicitly (`id` is not the frontend Task `_id`, and nullable dates also differ). Use its status for action feedback and invalidate task queries; do not cast it to a frontend Task or insert it directly into existing task caches. An HTTP 200 is shown only after the command transaction commits. The response is the saved command result on retry; a separate authoritative read may be newer than that result.

Errors: 400 malformed input, 403 unsupported account or current task access denied, 404 unavailable reference/resource, 409 conflicting idempotency payload, disabled capability or non-completed source turn, 422 invalid lifecycle transition, and 503 when transaction infrastructure is unavailable. Reuse existing errors where they match; register adapter-specific errors in the central error definitions. Unknown commit/network outcomes remain uncertain in the UI and are safe to retry with the same request.

## 6. Shared execution, retries and concurrency

`TaskCommandContext` contains authenticated `user`, `requestId`, optional server-owned `beforeWrite` and optional action origin. It contains no MCP scopes; those are enforced by the MCP adapter. A2UI passes no synthetic MCP token or invented scope.

The shared idempotency key is `ui_` plus the submitted request UUID. Do not include a random suffix or generate another key on retry. Existing command receipt fingerprinting covers operation, task ID and changes. Same key/different command arguments is a conflict. A matched replay still checks current resource access as the command layer already does.

The existing update command treats already-at-target status as a successful no-op. Completing an already completed task does not repeat timestamps or statistics. Pending/given-up transitions are rejected by the shared lifecycle; the adapter never starts them first. Per-user serialization protects concurrent A2UI/MCP commands. Do not promise stronger concurrency with legacy REST writes than the existing lifecycle provides; record that limit in verification.

Receipt and business mutation commit in one transaction. Add optional indexed server-owned origin metadata to the existing shared receipt schema:

```ts
type UiCommandOrigin = {
  channel: "a2ui";
  conversationId: string;
  turnId: string;
  surfaceId: string;
  actionId: string;
};
```

Origin is execution context, never part of model-supplied command arguments. On an A2UI receipt replay, require matching origin as well as the existing fingerprint; do not retroactively alter fingerprints for older MCP receipts. A committed replay cannot be rebound to another surface/conversation. A committed business write must never be followed by a separately required receipt write.

The source turn is already completed, so clicking does not resume its runner or acquire a chat run slot. A different active chat turn does not block an ordinary domain operation; it has the same concurrency limitations as other app mutations. Do not inject an outcome into a provider call already running. Future turns see the verified receipt and re-read task state before further writes.

## 7. UI lifecycle and model context

- A button is enabled only after successful source-turn persistence and current readable task state is `in-progress`. Initially load bounded live action states using the existing authenticated task read service; keep buttons disabled while loading. Fetch at most 10 targets per surface and deduplicate task IDs.
- Click allocates one request UUID and freezes that exact action request while pending/uncertain. Disable duplicate submissions. Retry keeps the original request UUID and action ID.
- On success, show completion, update local action state and call existing `invalidateTaskDependents`; invalidate conversation history as well so committed outcomes can be read. No optimistic “completed” message before confirmation.
- A 422 causes authoritative task reload and a disabled reason. A 404/403 disables the affected control without revealing task data. A 409 requires a fresh authoritative read; never silently generate a new request to repeat an uncertain mutation.
- Reload reconstructs current task state through normal task reads, while command receipts remain the source for whether this conversation performed an action. A task completed elsewhere is shown completed, without attributing it to this button.
- Conversation navigation and account/session changes isolate in-memory requests. An unmounted response must not populate a different account's cache. Reload may lose the in-memory request UUID; a new intent still becomes a no-op if the task is already completed. Durable client request storage is outside this release.
- No automatic model continuation or synthetic user message. Before a later agent turn, inject at most 3 most recent committed A2UI command receipts scoped by authenticated user and conversation. Include task ID, saved result status and commit time; label titles as data and require fresh reads before writes. Do not claim these snapshots are current task state.
- History exposes a bounded `uiActionOutcomes` projection derived from those same receipts, associated to source turn/surface/action. Do not create a second activity write or claim success from button clicks alone. Existing model-generated activities and proposal outcomes remain intact.
- A failure rendering interactive UI uses text fallback and exposes no executable controls. Unknown catalogs/action names cannot reach the dispatcher.

## 8. Agent policy and rollout

`present_interactive_ui` is available only when `A2UI_COMPOSITION_ENABLED=true`, `A2UI_INTERACTIVE_ENABLED=true` and the developer UI skill is available. `A2UI_INTERACTIVE_ENABLED` defaults to false for this first rollout. Disabled capability hides the tool, rejects action execution with 409 and renders stored surfaces as text fallback.

Add `interactiveUi` and `uiActions: ["task.complete"]` to conversation capabilities when enabled (false/empty when disabled). Existing fields retain their meaning.

Agent guidance: read the actual task first; offer a button when requested; never execute the task merely to construct a surface. A clear request to perform the operation immediately can continue using `orbit_update_task`. Ask and Auto both permit presenting the surface; the click authorizes exactly the bound operation. Explicit `task_proposal` turns and proposal continuations retain their current tool restrictions and cannot invoke this new tool.

## 9. Acceptance criteria

| ID  | Observable result                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | MCP create/update/delete and old receipts behave identically after extraction; MCP role/scope and beforeWrite guards remain enforced.                         |
| A2  | A requested existing-task button renders with verified title/target; generation alone produces no task write.                                                 |
| A3  | Clicking completes an owned in-progress task with correct completedAt/stats through shared services; dashboard/calendar refresh.                              |
| A4  | Double click, concurrent MCP/A2UI completion and same-request retry do not repeat completion/stat updates; same key/different arguments or origin conflicts.  |
| A5  | Foreign task/conversation/turn/surface/action and tampered body cannot authorize a mutation. Ownership removed after presentation is checked again.           |
| A6  | Pending/given-up tasks cannot be completed implicitly; already completed task is a safe no-op. Stale controls reload authoritative state.                     |
| A7  | A network/commit-unknown failure permits exact retry, retains controls safely disabled while uncertain, and never claims success without commit.              |
| A8  | Reload and later agent turns distinguish current task state from the committed action snapshot; no false attribution when another interface completed it.     |
| A9  | Flag-off, unsupported catalog and malformed surface use safe fallback; all legacy proposal and read-only fixtures still work.                                 |
| A10 | Keyboard and mobile users can activate the button, read the pending/result/error state, and switch conversations/accounts without cross-session cache writes. |

## 10. Verification and non-goals

Use failing contract/unit tests first, database integration tests with a disposable replica set and personally observed Playwright flows against the changed API. Mocked browser tests are supplementary; neither they nor a live LLM response prove the committed business outcome. Exact commands and scenarios are in the plan. A missing database/browser environment is incomplete verification, never a pass.

Non-goals: block messages, partial rendering, Input/Select/Slider, arbitrary task edits, deletion, generic tool execution, automatic continuation, additional receipt stores, mandatory REST idempotency migration, stronger legacy REST concurrency, dynamic catalogs and upgrades to protocol/runtime versions. See the roadmap for later work.

# General A2UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Inline execution is the default; use subagents only if the user selects delegation.

**Goal:** Let the Agent compose persistent A2UI interfaces from general presentation components and reliable task components using reusable developer-authored guidance.

**Architecture:** Keep A2UI v0.9 as the browser protocol. Validate a bounded model-authored surface specification, compile it server-side, and persist the layout independently from authoritative proposal state. Reuse existing skill-context evidence, proposal transactions and action handlers; retain the old catalog for historical messages.

**Tech Stack:** Existing Node/Express/TypeScript, Mongoose, backend Zod 4, React/TypeScript, frontend Zod 3, @a2ui/react and @a2ui/web_core 0.15.0, Vitest, Testing Library and Playwright. Separate pnpm packages; no root workspace.

**Spec:** `docs/superpowers/specs/2026-11-07-general-a2ui-design.md`

## Global constraints

- Initial authoring limits: 100 components, nesting depth 10, 50 rows and 12 columns per table, and 128 KiB total serialized envelope.
- Keep the existing maximum of 16 A2UI messages.
- Support a read-only general surface or a surface with one task proposal per turn.
- No model-provided HTML, CSS, JavaScript, URLs to component implementations, or arbitrary API handlers.
- Personal skills remain advisory and cannot register components, enable tools or grant action permissions.
- Rendering or replay never performs writes.
- Keep TaskProposalForm available as the complete existing task workflow.
- Preserve authorization, revisions, request IDs, idempotency, failed-request retry and existing conversation leases.
- Follow Test -> Code -> Test -> Lint -> Format check -> Build/type-check. Use pnpm only. Do not modify real environment files or unrelated user edits.

## Repository findings and preparation

The current worktree contains the new spec, with no application edits. Both packages already have test, lint and format:check scripts; frontend build includes type checking. No new dependencies are planned.

`chatTurnRepository.finishWithProposal` already creates the proposal, finishes the turn and releases the conversation in one Mongo transaction. Extend that boundary. `taskProposalController` currently renders a new legacy surface after every action; it must project the stored layout. `useTaskProposal` replaces its saved envelope with action responses, so merely changing the initial chat renderer would lose the composed layout.

The existing proposal flag defaults to true in code. Preserve that default. Add `A2UI_COMPOSITION_ENABLED`, default false. Do not silently make the old proposal capability dependent on the new skill.

At execution start, read applicable AGENTS.md, inspect git status, and isolate implementation through the worktree skill if needed. Run existing baseline checks before editing application code and record pre-existing failures. Keep each task's test/code cycle sequential. Suggested commit messages below are checkpoints; never include unrelated changes.

## Contracts and file responsibilities

New backend units:

- `types/A2UI/IUiSurface.ts`: authoring, stored surface and public envelope types.
- `validations/A2UI/uiSurfaceValidation.ts`: strict discriminated schemas, graph and binding checks.
- `services/A2UI/uiSurfaceService.ts`: pure compilation to A2UI.
- `services/A2UI/uiPresentationService.ts`: authorized retrieval and projection of stored layouts with current proposal state.
- `config/A2UI/composition.ts`: capability flag and developer skill attachment configuration.
- `services/agentUiService.ts`: tool definitions, capability resolution and input parsing, keeping composition-specific logic outside agentService.
- `skills/content/ui-composition/{manifest.json,SKILL.md}`: reusable developer instructions.

New frontend units:

- `shared/types/A2UI/uiSurface.ts`: public wire types.
- `shared/A2UI/compositionSchema.ts`: strict client contracts and graph validation.
- `shared/A2UI/presentationComponents.tsx`: Column, Row, Card, Text and Table implementations.
- `shared/A2UI/composition.css`: finite responsive layout tokens using existing theme variables.
- `features/tasks/components/chat/A2UI/compositionCatalog.tsx`: compose general and task registrations without making shared UI depend on the task feature.
- `features/tasks/components/chat/A2UI/{TaskList,TaskProposalActions,UiSurfaceMessage}.tsx`: task parts and message integration.
- `features/tasks/hooks/A2UI/useTaskProposalEditor.ts`: shared editing/choice/validation/submission state extracted from TaskProposalForm.

Use the following exact conceptual types; Zod schemas must enforce these structures rather than accepting free-form model properties:

```ts
type DisplayScalar = string | number | boolean | null;
type Spacing = "none" | "sm" | "md" | "lg";
type DisplayValue = { literal: DisplayScalar } | { path: string };
type UiNode =
  | {
      id: string;
      component: "Column" | "Row";
      children: string[];
      gap: Spacing;
    }
  | { id: string; component: "Card"; children: string[] }
  | {
      id: string;
      component: "Text";
      value: DisplayValue;
      emphasis: "normal" | "muted" | "heading";
    }
  | {
      id: string;
      component: "Table";
      columns: { key: string; label: string }[];
      rowsPath: string;
    }
  | {
      id: string;
      component: "TaskProposalForm" | "TaskList" | "TaskProposalActions";
    };
type SurfaceSpec = {
  fallbackText: string;
  components: UiNode[];
  displayData: Record<string, DisplayScalar | Record<string, DisplayScalar>[]>;
};
type StoredUiSurface = {
  catalogId: "urn:orbit:a2ui:composition:v1";
  surfaceId: string;
  spec: SurfaceSpec;
};
type UiSurfaceEnvelope = {
  text: string;
  a2ui: {
    protocolVersion: "v0.9";
    catalogId: string;
    surfaceId: string;
    messages: Record<string, unknown>[];
  };
};
```

The root ID is `root`. Display bindings are exactly `/display/<key>`, where keys match `[A-Za-z][A-Za-z0-9_]{0,63}`; no prototype names or arbitrary JSON pointers. Text binds to scalars; Table binds to arrays of strict scalar records whose keys match its unique columns. Table has 1–12 columns and 0–50 rows. Empty children are allowed for presentation containers; the graph must be a tree, with depth counting root as 1. Fallback text must be nonempty and at most 8,000 characters. Node IDs use the same key grammar. Read-only mode forbids all task nodes; proposal mode requires one form OR exactly one list plus one actions node. Server adds `/proposal` and `/requestId`; those are never authorable display paths.

Public chat results/history gain `surface?: UiSurfaceEnvelope`. Proposal responses keep existing fields and gain the same optional `surface`; keep old `a2ui` as the legacy representation for old clients. The 128 KiB bound covers the complete response envelope including legacy fields, not just the new surface. If the composed response exceeds that bound, return the legacy proposal presentation or read-only text fallback as appropriate.

## Task 1: Validate and compile the general surface contract

**Files:** Create the backend type/schema/compiler listed above; create `backend/validations/test/uiSurfaceValidation.test.ts`, `backend/services/test/uiSurface.test.ts`, `frontend/src/test/fixtures/a2ui-composition-v09.json`, and `frontend/src/test/fixtures/ui-composition-spec.json`.

**Interfaces:**

```ts
parseSurfaceSpec(input: unknown, mode: "readonly" | "proposal"): SurfaceSpec;
compileSurface(stored: StoredUiSurface, proposal?: ProposalView): UiSurfaceEnvelope;
```

- [ ] Write a valid read-only fixture with root Column, heading Text, Table and display data. Write a proposal fixture with Text, TaskList and TaskProposalActions. Give the compiled fixture a fixed UUID and the new catalog ID.
- [ ] Add failing tests for both valid modes and the complete graph/binding limits. Example core regression:

```ts
it("rejects a cycle before processing messages", () => {
  expect(() =>
    parseSurfaceSpec(
      {
        fallbackText: "Plan",
        components: [
          { id: "root", component: "Column", children: ["root"], gap: "md" },
        ],
        displayData: {},
      },
      "readonly",
    ),
  ).toThrow();
});
```

Also test duplicate and missing IDs, multiple parents, unreachable nodes, depth 11, count 101, unknown properties, unsupported actions, HTML treated as plain text, `/proposal` injection, table column mismatch, valid boundary values and oversized Unicode payloads.

- [ ] Run `cd backend && pnpm test -- validations/test/uiSurfaceValidation.test.ts services/test/uiSurface.test.ts`. Establish tests collect correctly with contract stubs, then confirm failures are assertions for unsupported behavior, not missing dependencies.
- [ ] Implement strict Zod discriminated unions and iterative graph validation; inspect byte size before graph traversal. Implement the compiler: createSurface, updateComponents, updateDataModel. Lower `value` to Text's declared binding property; use catalog-supported child references. Resolve actual installed A2UI child rendering APIs during Task 5, and adjust the wire fixture consistently if necessary.
- [ ] Inject domain bindings/actions server-side; model task nodes contain only id/component. Include `save`, `confirm`, `cancel` only on form/actions implementations. Require proposal data for proposal mode and reject proposal data in read-only mode.
- [ ] Re-run targeted tests until green, then backend build. Commit checkpoint: `feat: define composable A2UI surface contract`.

## Task 2: Attach developer UI guidance to the Agent capability

**Files:** Create `backend/config/A2UI/composition.ts`, `backend/services/agentUiService.ts`, the ui-composition manifest and skill; modify `backend/skills/policy.ts`, `backend/services/agentSkillService.ts`, `backend/services/agentService.ts`; create `backend/services/test/agentUiCapability.test.ts`; extend `backend/services/test/agentSkillsRuntime.test.ts` and `backend/skills/test/registry.test.ts`.

**Interfaces:**

```ts
type UiCapability = { enabled: boolean; skillIds: readonly string[] };
resolveUiCapability(registry: SkillRegistry): UiCapability;
// Config exports UI_SKILL_IDS = ["ui-composition"] as const.
// Required context: entrypoint for every configured UI skill.
// Extend createAgentSkillSession(registry, requirements?) with a per-session
// map of additional tool requirements; merge without weakening existing policy.
```

- [ ] Test all flag combinations, missing configured UI skill, a working registry without specialist tools, and unchanged personal skill behavior. The capability is disabled if configured guidance is unavailable; emit a bounded diagnostic containing skill ID/code only.
- [ ] Test evidence enforcement: invented present_ui calls fail before loading guidance; merely listing a skill does not enable a tool; previous-turn history is insufficient; the accepted provider payload containing the loader exchange enables it.

```ts
expect(session.canExecute("present_ui", requestIdWithoutDocument)).toBe(false);
expect(session.canExecute("present_ui", requestIdWithDocument)).toBe(true);
```

These request IDs must come from real `snapshot`/`acceptProviderContext` calls in test setup, using existing skill runtime test helpers rather than fabricated evidence.

- [ ] Run `cd backend && pnpm test -- services/test/agentUiCapability.test.ts services/test/agentSkillsRuntime.test.ts skills/test/registry.test.ts` and record the expected failing assertions.
- [ ] Implement explicit skill attachment by unioning configured UI skill IDs into the trusted loader allowlist when enabled. Expose summaries in the system context separately from personal skills. Do not rely on the MCP tool list to discover UI guidance.
- [ ] Write manifest with id `ui-composition`, entrypoint `SKILL.md`, documents `["SKILL.md"]`. Write instructions covering both levels, text-only answers, data provenance, read-only versus task interfaces, fixed action boundaries and gym/IELTS/comparison examples using the same catalog. Give examples valid against Task 1 schemas.
- [ ] Supply the versioned catalog schema through tool parameters generated from the Zod contract; skill text names the components and composition rules, without maintaining a second JSON schema.
- [ ] Preserve standard propose_tasks availability without guidance; only its optional presentation requires UI evidence. Extend the system prompt's broad “all skills are user authored” wording to distinguish code-owned developer guidance from personal advisory content, with neither granting business permissions.
- [ ] Re-run tests and backend build. Commit checkpoint: `feat: attach reusable developer UI guidance`.

## Task 3: Generate surfaces through Agent tool calls

**Files:** Modify `backend/services/agentUiService.ts`, `backend/services/agentService.ts`, `backend/types/IAgent.ts`; create `backend/services/test/agentUiRuntime.test.ts`; extend `backend/services/test/agentService.test.ts`.

**Interfaces:** Extend chatWithMcp's result union with `{ surfaceSpec: SurfaceSpec }`, and extend its proposal branch to `{ proposalItems: Omit<ProposalItem, "id">[]; text?: string; presentation?: SurfaceSpec }`. Export `presentUiTool` and `parseUiToolInput(input, mode)` from agentUiService; the parser delegates to Task 1. Reuse the existing proposed-item validation downstream.

- [ ] Mock provider sequences: load guidance -> read data -> present_ui; load guidance -> propose_tasks with presentation; legacy propose_tasks without presentation; malformed present_ui -> corrected tool call; budget exhaustion; unauthorized write attempt inside UI properties.
- [ ] Add explicit test proving a forged optional presentation cannot bypass guidance evidence and cannot discard valid task items:

```ts
expect(result).toMatchObject({ proposalItems: validItems });
expect(result).not.toHaveProperty("presentation");
```

- [ ] Run `cd backend && pnpm test -- services/test/agentUiRuntime.test.ts services/test/agentService.test.ts` and confirm missing behavior fails.
- [ ] Add present_ui to tool exposure after accepted skill evidence and verify exposure/source-request evidence again at execution. Successful present_ui is terminal; checkpoint its tool result before returning, following the existing propose_tasks pattern.
- [ ] Extend propose_tasks parameters conditionally with presentation. For invalid/unauthorized presentation, drop that field and keep valid items; do not retry or repeat task writes. For invalid read-only input, append an `INVALID_UI_SPEC` unexecuted tool result with bounded issue paths and allow the normal loop to correct it.
- [ ] Ensure final-only exhaustion returns useful text without claiming UI success. UI tool calls share existing deadlines and attempt limits. Retain argument cap 16,000 characters for other tools; allow UI authoring calls up to the existing envelope byte ceiling, checking UTF-8 bytes before JSON parsing and enforcing final compiled size separately.
- [ ] Re-run targeted tests and backend build. Commit checkpoint: `feat: generate structured surfaces from agent tools`.

## Task 4: Persist, replay and refresh composed surfaces atomically

**Files:** Modify `backend/types/IChatTurn.ts`, `backend/models/ChatTurn.ts`, `backend/repositories/chatTurnRepository.ts`, `backend/services/conversationTurnService.ts`, `backend/services/conversationService.ts`, `backend/utils/conversationView.ts`, `backend/types/A2UI/ITaskProposal.ts`, `backend/controllers/A2UI/taskProposalController.ts`; create `backend/services/A2UI/uiPresentationService.ts`, `backend/services/test/uiPresentation.test.ts`, `backend/repositories/test/uiSurfacePersistence.integration.test.ts`; extend existing conversation and proposal-action integration suites.

**Interfaces:** Add `uiSurface?: StoredUiSurface` to ChatTurn. Append optional uiSurface arguments to `finish` and `finishWithProposal` to preserve existing call sites. Add `chatTurnRepository.findByProposal(userId, conversationId, proposalId)` scoped by all three values. Expose:

```ts
uiPresentationService.forTurn(turn: ChatTurn, proposal?: ProposalView):
  { surface?: UiSurfaceEnvelope; proposal?: ProposalView; a2ui?: unknown; text: string };
uiPresentationService.forProposal(userId: string, proposal: ProposalView):
  Promise<ProposalEnvelope>; // ProposalEnvelope gains optional surface.
```

- [ ] Write persistence tests for a read-only result, proposal/layout transaction rollback, lease expiry and repeat request IDs. A rejected or expired finalization cannot create a proposal or release another active turn.
- [ ] Write replay tests using the same saved surface ID: completed and cancelled proposals resolve current status, missing/deleted/foreign proposals do not leak data, unsupported catalog gives text fallback, and history does not call the provider.
- [ ] Write action integration tests: save and confirm return the original layout plus new proposal revision, duplicate confirm returns no duplicate tasks, stale revision returns the existing conflict response, and unrelated users cannot retrieve a layout by proposal ID.
- [ ] Run `cd backend && pnpm test -- services/test/uiPresentation.test.ts repositories/test/uiSurfacePersistence.integration.test.ts services/test/conversationHistory.test.ts services/test/taskProposalActions.integration.test.ts`. Follow the existing Mongo integration harness setup; record missing database prerequisites as blockers, never passes.
- [ ] Persist validated spec and server-generated identity inside existing completion transactions. Keep proposal schema identity as the legacy catalog; only the independent surface record uses the composition catalog. General surfaces finish through the normal turn completion boundary.
- [ ] Route initial responses, history, request replay and post-action envelopes through uiPresentationService. Keep database queries in the repository; controller calls the service after action success. Validate final response size including both legacy and composed representations. Proposal overflow/invalid layout uses legacy envelope; read-only projection failure uses saved fallback text.
- [ ] On proposal refresh, overwrite only server proposal data; do not replay old persisted statuses. When composition is disabled, suppress new composed projection, retain stored layout for re-enable, and return text/legacy form. No database migration is required for optional fields.
- [ ] Re-run targeted integration tests, `services/test/conversationService.integration.test.ts`, `repositories/test/taskProposalRepository.integration.test.ts` and backend build. Commit checkpoint: `feat: persist and replay agent UI layouts`.

## Task 5: Render the general catalog with client validation

**Files:** Create the frontend shared types, schema, presentation components and CSS listed above; create `frontend/src/shared/A2UI/test/compositionProtocol.test.tsx`; modify `frontend/src/shared/A2UI/catalogRegistry.ts` only for reusable pre-processing validation hooks.

**Interfaces:** Export `presentationComponents`, `validateCompositionPayload(payload, mode)` and `UiSurfaceEnvelope`. Extend CatalogRegistration with optional `validatePayload(payload: SurfacePayload): void` executed before MessageProcessor. Keep existing legacy registration behavior.

- [ ] Read installed @a2ui package declarations/source for child rendering and binderless APIs; use repo-local artifacts rather than guessing SDK signatures. Write a real-processor test consuming Task 1's compiled fixture.
- [ ] Add failing tests for Text rendering and binding, row order, nested cards, table headers, invalid graph/model paths, unknown actions/catalogs, processor cleanup and fallback. Verify strings containing markup appear as text.
- [ ] Run `cd frontend && pnpm test -- src/shared/A2UI/test/compositionProtocol.test.tsx` and confirm expected behavioral failures.
- [ ] Implement components with actual SDK child rendering and signal APIs. Use semantic table/thead/tbody and readable boolean/null formatting; implement finite gap/emphasis classes, wrapping Row and local table overflow. Avoid changing app-wide typography or theme.
- [ ] Implement strict matching schemas using frontend Zod 3 and validate the complete model/properties before the processor. Validate at most one create/components/model sequence for this compiled catalog; reject extra mutation/delete messages, mismatched IDs and undefined model locations. Keep generic host support for the old catalog.
- [ ] Use a fixture conformance matrix in both packages to prevent schema drift (valid boundaries and invalid graphs/bindings). Assert the compiled fixture passes the installed A2UI schema and renders with the new presentation catalog.
- [ ] Re-run targeted tests and `pnpm run typecheck`. Commit checkpoint: `feat: render general A2UI presentation components`.

## Task 6: Extract composable task components sharing one editor

**Files:** Create `frontend/src/features/tasks/hooks/A2UI/useTaskProposalEditor.ts`, `frontend/src/features/tasks/components/chat/A2UI/TaskList.tsx`, `TaskProposalActions.tsx`, `compositionCatalog.tsx`, and `taskProposalEditorContext.ts`; modify `TaskProposalForm.tsx`, `taskProposalCatalog.tsx`, `TaskProposalSurface.tsx`, `taskProposalContext.ts`, `taskProposal.css`; create `frontend/src/features/tasks/components/test/TaskComposition.test.tsx`.

**Interfaces:** Export the existing form props as `TaskProposalEditorProps`. Move state/handlers into `useTaskProposalEditor(props: TaskProposalEditorProps)`. Define its return type using `ReturnType<typeof useTaskProposalEditor>` for the editor context. TaskList and TaskProposalActions consume that one context; TaskProposalForm wraps the same two views in the existing section/header/status markup. Export a composition catalog combining Task 5 presentation implementations with all three task nodes.

- [ ] Add a regression test for the old form before extraction. Add split-layout tests for editing title/date/category/project, selection, dirty state, unavailable choices, saving, cancellation, confirm with no selection, duplicate click, terminal state and opening created tasks.

```tsx
await user.clear(screen.getByLabelText("Task 1 title"));
expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeDisabled();
await user.type(screen.getByLabelText("Task 1 title"), "Read chapter 1");
await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
expect(onAction).toHaveBeenCalledTimes(1);
```

Use the existing mock category/project APIs and fixture proposal; wait for choice loading before interaction.

- [ ] Run `cd frontend && pnpm test -- src/features/tasks/components/test/TaskComposition.test.tsx src/features/tasks/components/test/TaskProposalProtocol.test.tsx` and confirm the new split behavior fails.
- [ ] Extract current validation, option fetching, busy ref, error and submit construction without changing domain rules. Mount one editor provider per surface above A2uiHost, not one per task node. Keep draft synchronization to AgentSessionContext and A2UI data model in one bridge.
- [ ] Wire task actions through the same A2UI dispatch path and existing identity/revision checks. Disabled/terminal state locks both parts. Keep status and errors visible even if actions and list are placed in separate cards. Fallback for a valid authorized proposal renders the legacy complete form with the same editor state; no silent discard of dirty edits.
- [ ] Re-run new tests plus TaskProposalProtocol, TaskProposalChat, TaskProposalRetry and hook tests. Run frontend typecheck. Commit checkpoint: `refactor: share task editor across composed UI parts`.

## Task 7: Integrate new surfaces into conversation UI and API types

**Files:** Create `frontend/src/features/tasks/components/chat/A2UI/UiSurfaceMessage.tsx`; modify `frontend/src/shared/types/A2UI/taskProposal.ts`, `frontend/src/shared/types/domain.ts`, `frontend/src/shared/services/aiService.ts`, `frontend/src/features/tasks/components/chat/A2UI/TaskProposalMessage.tsx`, `TaskProposalSurface.tsx`, `frontend/src/features/tasks/components/chat/ChatField.jsx`, `frontend/src/features/tasks/hooks/A2UI/useTaskProposal.ts`, `frontend/src/features/tasks/hooks/useConversationSession.ts`, `frontend/src/features/agent/agentSessionContext.ts`, `AgentSessionProvider.tsx`; create `frontend/src/features/tasks/components/test/UiSurfaceMessage.test.tsx`; extend AgentSessionProvider and task hook tests.

**Interfaces:** `UiSurfaceMessage` receives `{ surface: UiSurfaceEnvelope; proposalEnvelope?: ProposalEnvelope; disabled?: boolean; onDirtyChange?: (id: string, dirty: boolean) => void }`. Extend chat/history message types and ProposalEnvelope with `surface?: UiSurfaceEnvelope`. Read-only surfaces use no proposal hook; proposal surfaces delegate to the existing proposal message lifecycle with the composition payload.

- [ ] Add failing tests: immediate response and history render the same UI once; read-only UI works without proposal; a proposal response containing both surface and legacy a2ui renders only the new one; old messages still render.
- [ ] Add hook/session tests proving save/confirm/reload preserve composed layout, navigation retains dirty drafts, uncertain requests retain their request ID, stale auth responses cannot update the session, and unsupported catalog falls back.
- [ ] Run `cd frontend && pnpm test -- src/features/tasks/components/test/UiSurfaceMessage.test.tsx src/features/tasks/hooks/test/useTaskProposal.test.tsx src/features/agent/test/AgentSessionProvider.test.tsx` and record failures.
- [ ] Preserve surface through API normalization, response-to-message conversion, history paging and session state. In ChatField use the order `surface -> legacy proposal -> ordinary message`. Do not instantiate task providers for read-only messages.
- [ ] Ensure action API results include and retain the new optional surface. On mixed-version responses without a surface, safely retain the known validated layout only while updating its authoritative proposal binding; otherwise fall back to legacy form. Never show stale draft data after terminal status.
- [ ] Re-run targeted suites and frontend typecheck. Commit checkpoint: `feat: integrate composed surfaces into chat history`.

## Task 8: Browser verification, documentation and full checks

**Files:** Create `frontend/e2e/ui-composition.spec.ts` and `frontend/e2e/ui-composition.fixture.ts`; modify `backend/.env.example` and this spec/plan with final implementation notes. Reuse `frontend/e2e/task-proposals.fixture.ts` patterns. No real secrets or live environment changes.

- [ ] Write browser tests before final UI adjustments: read-only comparison, composed proposal edit/save/confirm/reopen, failed action then retry, revision conflict, disabled capability, and unknown catalog fallback. Mock API boundaries using the existing auth/session fixtures.
- [ ] Run `cd frontend && pnpm exec playwright test e2e/ui-composition.spec.ts` and inspect failures. Check at desktop 1280px and mobile 375px; assert no document-level horizontal overflow and all controls reachable by keyboard. Capture screenshots and inspect focus/error/terminal states.
- [ ] Fix only defects exposed by those checks. For browser-based work use the webapp-testing skill; for visual changes follow the area's established design with frontend-design guidance.
- [ ] Document `A2UI_COMPOSITION_ENABLED=false`, developer skill attachment through UI_SKILL_IDS, component registration, limits, legacy fallback and the fact skill edits require process restart. Update spec if concrete contract choices differ.
- [ ] Run full backend tests, then frontend tests and browser regressions:

```bash
cd backend
pnpm test
cd ../frontend
pnpm test
pnpm exec playwright test e2e/ui-composition.spec.ts e2e/task-proposals.spec.ts e2e/agent-workspace.spec.ts
```

- [ ] Run `cd backend && pnpm run lint` and `cd frontend && pnpm run lint`. Record the implementation base commit in `.git` metadata at execution start, then run this changed-file formatter check from the repository root. It includes committed changes since that base and new task files, and passes paths as argument arrays:

```python
from pathlib import Path
import subprocess

root = Path.cwd()
# At execution start, before the first implementation commit:
# git rev-parse HEAD > "$(git rev-parse --git-path ui-composition-base)"
base_path = subprocess.check_output(
    ["git", "rev-parse", "--git-path", "ui-composition-base"], text=True
).strip()
base = Path(base_path).read_text().strip()
changed = subprocess.check_output(
    ["git", "diff", "--name-only", "--diff-filter=ACMR", "-z", base]
).decode().split("\0")
new = subprocess.check_output(
    ["git", "ls-files", "--others", "--exclude-standard", "-z"]
).decode().split("\0")
paths = sorted({p for p in changed + new if p and (root / p).is_file()})
for package in ("backend", "frontend"):
    selected = [str(root / p) for p in paths if p.startswith(package + "/")]
    if package == "backend":
        selected += [str(root / p) for p in paths if p in {
            "docs/superpowers/specs/2026-11-07-general-a2ui-design.md",
            "docs/superpowers/plans/2026-11-07-general-a2ui.md",
        }]
    if selected:
        subprocess.run(
            ["pnpm", "exec", "prettier", "--check", "--ignore-unknown", *selected],
            cwd=root / package, check=True,
        )
```

Use prettier --write only on failing task files, then repeat the check. Keep unrelated user changes out of the selected list if present. Package-wide format:check may be reported separately if the baseline is clean.

- [ ] After lint and format pass, run `cd backend && pnpm run build` and `cd frontend && pnpm run build` (includes frontend typecheck).
- [ ] Run `git diff --check`; review the final diff for authorization bypass, duplicate task mutations, response shape drift and accidental environment changes. Report exact commands/results, skipped Mongo/browser/live-provider paths, and existing warnings. Live-provider quality evaluation is optional and must not be represented as covered by mocks.
- [ ] Commit checkpoint: `test: verify composed UI flows and document capability`.

## Coverage and execution order

Tasks 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8. No delegation is required. Keep the capability off until the complete path passes.

| Spec acceptance criterion                                     | Tasks         |
| ------------------------------------------------------------- | ------------- |
| Developer skill attachment and provider evidence              | 2, 3          |
| Reusable layouts across domains                               | 1, 2, 3, 5, 8 |
| Split proposal editing/actions                                | 4, 6, 7, 8    |
| Legacy tools and historical messages                          | 3, 4, 6, 7    |
| Stable history, current proposal status                       | 4, 7, 8       |
| Invalid graphs, limits, bindings and fallback                 | 1, 3, 4, 5, 7 |
| Ownership, conflict and idempotency                           | 4, 6, 7, 8    |
| Valid tasks survive invalid presentation; atomic finalization | 3, 4          |
| Responsive, labelled, keyboard-operable UI                    | 5, 6, 8       |
| Independent capability flags                                  | 2, 3, 4, 8    |

Plan review completed against all ten acceptance criteria. Application implementation and test execution have not begun as part of writing this plan.

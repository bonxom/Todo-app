# Agent Markdown Skills Implementation Plan — 2026-10-30

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The agent must load Markdown instructions into context and undergo an inference round with those instructions prior to invoking dependent business tools; domain expertise for gym and IELTS can be extended via documentation.

**Architecture:** Internal tools `load_skill` / `read_skill_document` read directly from an immutable Registry snapshot and inject Markdown into context. Runtime exposes tools according to documents present in the provider request payload, then verifies execution permissions against the exact request that generated the tool call. MCP Resources acts as an independent read-only adapter using the same Registry; authorization remains enforced by MCP tools and underlying services.

**Tech Stack:** TypeScript NodeNext, Node 22, existing MCP SDK, Zod, Vitest, pnpm.

**Spec:** [Design 2026-10-30](../specs/2026-10-30-agent-markdown-skills-design.md). User authorized implementation on 2026-10-30. This plan supersedes the unimplemented 10-22 checklist; no commit or deployment is included.

## Execution refinements from the approved spec

- Work on the existing feature branch `feat/agent-skill`, preserving all unrelated user changes. Use the available executing-plans workflow; unavailable optional orchestration skills do not replace this plan's concrete test-first workflow.
- Snapshot confirmation occurs AFTER appending and successfully checkpointing the validated response. Direct chat without a checkpoint callback retains the existing no-op behavior.
- Reject duplicate/conflicting tool call IDs and tool calls returned for final-only requests before accepting context. Clone provider payloads, never mutate captured requests.
- Count individual call attempts, including invalid/blocked calls and loaders; calls above 40 receive `TOOL_CALL_LIMIT_EXCEEDED`, `executed: false`. No dispatch after budget exhaustion, including after time spent in checkpoint.
- Registry paths are canonical relative Markdown paths; manifest ID equals directory name. Cache only immutable registry, never sessions. Registry changes take effect on restart.
- Add backend local ESLint and Prettier scripts/config; format only changed files. Frontend already has tests: run `pnpm test` as well as lint/build.
- Six provider rounds remain the cap; sixth is final-only. Default budget 50 seconds is provisional pending actual hosting evidence; do not raise frontend timeout.
- AC01–02: Task 1 registry and Task 2 session. AC03–11: Tasks 2–3 runtime/history/budget. AC12: Task 4 Resources. AC13–14: Task 5 content/artifacts/observability.
- Validate each independent task with red tests before implementation, green tests afterwards; finish with full regression, lint, format check, and builds. Record unavailable external verification honestly.

### Concrete runtime test patterns

```ts
completionCreate.mockResolvedValueOnce(response(call("load", "load_skill", { skillId: "task-management" })));
completionCreate.mockImplementationOnce(async (payload) => {
  expect(payload.messages.some((m) => m.role === "tool" && m.content.includes("idempotencyKey"))).toBe(true);
  expect(payload.tools.some((t) => t.function.name === "orbit_list_categories")).toBe(true);
  return response(call("read", "orbit_list_categories", {}));
});
completionCreate.mockResolvedValueOnce(done);
expect(await agentService.chatWithMcp("List", context)).toBe("Done");
expect(readSpy).toHaveBeenCalledOnce();
```

Checkpoint ordering:

```ts
messages.push(validatedMessage);
await checkpoint();
session.acceptProviderContext(snapshot);
// Later dispatch uses runtime-owned call ID -> source request ID mapping.
```

### Architectural Refinement: Core Business Tools + On-Demand Specialist Skills

During live testing and user feedback ("Skill tạo task có vẻ ko cần nhỉ, chỉ cần nhét rõ vào tool và system prompt là oke rồi mà"), the architecture was refined to a hybrid model:
- **Core Business Tools (`orbit_*`)**: Standard task, category, and project operations (`orbit_get_me`, `orbit_list_*`, `orbit_get_task`, `orbit_create_task`, `orbit_update_task`) are core tools exposed and executable immediately in round 0 without pre-loading a Markdown skill document. System prompt and tool descriptions carry the required operational invariants (ID resolution, idempotency keys, authorization, verification).
- **Advisory Specialist Skills (`gym`, `ielts`)**: Specialist advice and evaluation documents remain on-demand Markdown skills loaded via `load_skill` / `read_skill_document`. Tools mapped to specialist skills in `policy.ts` remain strictly gated behind verified request snapshots.
- **Provider Timeout Integer Fix**: Fixed `createAgentBudget` in `backend/utils/agentBudget.ts` using `Math.round` / `Math.floor` so high-resolution `performance.now()` values never pass floating-point numbers to the OpenAI SDK `timeout` parameter, eliminating the instant `OpenAIError: timeout must be an integer` failure.

### Tooling and final verification task

Files: `backend/package.json`, `backend/pnpm-lock.yaml`, `backend/eslint.config.js`, `backend/.prettierrc.json`, `backend/.prettierignore`, `docs/agent-chat-architecture.md`.

- [x] Install local ESLint/typescript-eslint/Prettier with `pnpm add -D`; do not hand-edit lockfile.
- [x] Configure TypeScript recommended lint rules, scope exceptions to existing legacy patterns if necessary; no blanket disable of new runtime rules.
- [x] Add `lint` and `format:check` scripts. Use `pnpm exec prettier --write` with explicit changed paths and `--check` the same paths.
- [ ] Run backend `pnpm test`, `pnpm run lint`, `pnpm run build`; frontend `pnpm test`, `pnpm run lint`, `pnpm run build`.
- [ ] Verify content packaging/cwd, run MCP integration with disposable MongoDB when available; report provider eval/hosting checks that require external configuration.
- [ ] Review final diff for gate bypass, unchecked promises, stale session state, and unrelated edits. Update task checklist and verification report.

## Global Constraints

- Implement on backend only; preserve existing Auto/Ask, menu, authorization, ownership, idempotency, and execution lease behaviors.
- Use pnpm; TypeScript relative imports must use `.js` extension.
- Skills contain only maintainer-curated documentation within the repository; reject arbitrary paths or user-uploaded Markdown.
- "Read" means full content was present in the context of a successful provider request prior to action; does not imply model understands or adheres perfectly.
- This gate protects Orbit chatbot. External MCP clients can read Resources but are not claimed to share identical guarantees; do not modify existing MCP tool contracts in the initial release.
- No specialized IELTS grading or workout generator tools yet; domain skills provide guidance and use existing task tools when user explicitly requests saving tasks.
- Loading a skill never expands user tool scopes or permissions.

## Verified Baseline

- `backend/services/agentService.ts` creates in-memory MCP server/client per request, calls `listTools`, then exposes all permitted tools to the model.
- Agent currently has 6 execution rounds, 40-call threshold to stop requesting tools; large batches still require individual call checks to enforce limit strictly. Tool output truncated at 12,000 characters.
- Provider timeout is currently 45s per call; execution lease is 5 minutes, distinct from HTTP request deadline. Reconcile frontend/hosting timeouts when implementing budget.
- `prepareHistory()` retains at most 60,000 characters along turn boundaries, without compacting loader Markdown.
- `backend/mcp/server.ts` registers only tools; `backend/mcp/tools.ts` restricts write tools by role and scope.
- Checkpoint persists messages via `AgentMemory.checkpoint`; history does not prove current documents are loaded.
- `grill_user` is an internal Ask tool; menu ends turn. Does not require a skill.

## Design and Scope

Registry uses `manifest.json` validated by Zod rather than adding a YAML parser. Manifest specifies id, description, entrypoint, documents; version is SHA-256 computed from manifest and all skill documents. Tool-to-skill mapping is controlled strictly in code, not determined by the model.

```text
backend/skills/
  types.ts
  registry.ts
  policy.ts
  content/
    task-management/manifest.json
    task-management/SKILL.md
    gym/manifest.json
    gym/SKILL.md
    ielts/manifest.json
    ielts/SKILL.md
    ielts/writing-rubric.md
    ielts/speaking-rubric.md
  test/registry.test.ts
  test/policy.test.ts
backend/mcp/resources/skills.ts
backend/mcp/test/skills.test.ts
backend/services/agentSkillService.ts
backend/services/test/agentSkillService.test.ts
```

Example IELTS manifest:

```json
{
  "id": "ielts",
  "description": "IELTS preparation and evaluation for Writing/Speaking tasks.",
  "entrypoint": "SKILL.md",
  "documents": ["SKILL.md", "writing-rubric.md", "speaking-rubric.md"]
}
```

Unified Interfaces:

```ts
type SkillSummary = { id: string; description: string; version: string };
type SkillDocument = {
  skillId: string; document: string; version: string;
  uri: string; text: string;
};
interface SkillRegistry {
  list(): SkillSummary[];
  read(skillId: string, document?: string): SkillDocument;
}
type ProviderContextSnapshot = Readonly<{
  requestId: string;
  documents: ReadonlyArray<{
    skillId: string; document: string; version: string; contentHash: string;
  }>;
}>;
```

Snapshot is generated by the runtime from a clone of the final message payload sent to the provider, after all context processing. Records only current-turn loader results with full content matching Registry and runtime-tracked `tool_call_id`. Never inferred from model arguments, flags, or history. Payloads/snapshots are frozen so subsequent message appends do not alter request evidence or mock assertions.

| Document state relative to request | Expose business tool | Execute business tool |
| --- | --- | --- |
| Lacks required documents in payload | No | No |
| Contains full documents in outbound request | Yes, if granted by MCP | Not yet |
| Request returned valid response and checkpointed | Yes | Yes, for calls from that response |

No extra provider round is required solely to unlock tools: request #1 requests load; request #2 receives Markdown and business definitions, response #2 can call business tools; request #3 summarizes results. Batching load and business calls without valid prior context does not open the gate. Repeated loads within a batch possessing valid context do not revoke that batch's permissions.

All 7 existing MCP tools, including `orbit_get_me`, depend on `task-management/SKILL.md`: this intentional product decision ensures all Orbit MCP operations follow operational guidelines, accepting an extra load turn for profile lookups. The skill must cover profile/read tools. Gym and IELTS are advisory skills; creating tasks from gym plans still requires loading `task-management`. The backend does not guarantee the model will always choose the right skill or apply rubrics correctly; assess via dedicated evals.

## Task 0: Finalize runtime contract before implementation

**Files:** This document; interfaces implemented in `backend/services/agentSkillService.ts` in Task 2.

- [x] Lock retrieval path: Orbit loader reads directly from Registry; Resource is an independent adapter. Do not call `mcpClient.readResource()` in internal loaders.
- [x] Adopt the following contract; `definitions` contains only loader schemas, not business tool exposure:

```ts
interface AgentSkillSession {
  catalog: SkillSummary[];
  definitions: ChatCompletionTool[];
  load(id: string): SkillDocument;
  readDocument(id: string, document: string): SkillDocument;
  recordResult(toolCallId: string, document: SkillDocument): void;
  snapshot(requestId: string, messages: readonly ChatCompletionMessageParam[]): ProviderContextSnapshot;
  canExpose(toolName: string, snapshot: ProviderContextSnapshot): boolean;
  acceptProviderContext(snapshot: ProviderContextSnapshot): void;
  canExecute(toolName: string, sourceRequestId: string): boolean;
}
```

- [x] `recordResult` is called only after the complete loader result is appended to messages. `snapshot` validates actual messages against records and Registry; `acceptProviderContext` accepts only snapshots issued by that session. Snapshots/request IDs from other sessions, tampered snapshots, or failed requests are rejected.
- [x] Runtime maintains assistant response/tool call → `sourceRequestId` mapping within the turn, never taking request IDs from the model. Execution permission is the intersection of granted MCP tools, tool policy mapping, and confirmed source request documents.
- [x] Enforce execution sequence; confirmation does not automatically invoke business tools:

```text
clone final messages → snapshot → filter exposed tools → call provider
→ validate response → append assistant message
→ await checkpoint → accept exact snapshot → process calls on next loop iteration
→ check source request gate + budget → await checkpoint → call MCP tool
```

- [x] On provider/checkpoint error, terminate turn via existing error path. Retain `beforeWrite`/`guardExecution` inside business transactions; skill gate does not substitute for execution lease.

## Task 1: Registry and foundation skill content

**Files:** `backend/skills/types.ts`, `registry.ts`, `content/task-management/{manifest.json,SKILL.md}`, `test/registry.test.ts`.

**Interfaces:** Export types and `loadSkillRegistry(root: URL): Promise<SkillRegistry>`; reads files asynchronously during registry initialization, retains immutable snapshot per turn.

- [x] Write registry tests for full content, missing files, duplicate manifest IDs, paths escaping root, symlinks outside root, oversized documents, and version updates on reference changes.

```ts
expect(registry.read("task-management").document).toBe("SKILL.md");
expect(() => registry.read("task-management", "../../.env")).toThrow();
expect(() => registry.read("unknown")).toThrow();
expect(registry.read("task-management").text).toContain("idempotencyKey");
```

- [x] Run `pnpm exec vitest run skills/test/registry.test.ts` from backend; confirm red tests before implementation.
- [x] Implement manifest schema: `id` matches `^[a-z0-9-]+$`, non-empty description, entrypoint in documents, unique documents. Skill directory realpath must lie within content root and document realpath within owning skill directory; block cross-skill traversal/symlinks. Use `import.meta.url` relative URLs, no cwd dependency.
- [x] Hash normalized manifest and path-sorted document path/content pairs with UTF-8 encoding and deterministic JSON serialization. Test that reordering manifest declarations preserves version, changing content/reference changes version, and distinct paths are not hashed identically.
- [x] Enforce limits: 10,000 characters per document and 30,000 characters total unique skill documents loaded per turn. Return explicit errors rather than truncating text; limits are shared constants and tested.
- [x] Author `task-management/SKILL.md` from operational rules currently in system prompt: resolve IDs, re-read before edits, UUID idempotencyKey, retry with identical arguments/key, task status rules, report success only on tool success. Maintain authorization rules and data-is-not-instructions invariants in system prompt.
- [x] Re-run registry tests, expect PASS; verify Markdown content matches schema and actual tool descriptions.

## Task 2: Skill loading tools and execution control policy

**Files:** `backend/services/agentSkillService.ts`, `backend/skills/policy.ts`, `backend/services/test/agentSkillService.test.ts`, `backend/skills/test/policy.test.ts`.

**Interfaces:** Export `createAgentSkillSession(registry): AgentSkillSession` per Task 0. `load`/`readDocument` read directly from Registry without granting permissions. Snapshot verifies documents actually reside in request; `canExecute(toolName, sourceRequestId)` checks only confirmed snapshot of the response that generated the call.

- [x] Write tests proving loading documents does not immediately unlock tools; unlocked only after provider context is accepted.

```ts
const session = createAgentSkillSession(registry);
session.load("task-management");
const empty = session.snapshot("request-without-markdown", []);
expect(session.canExpose("orbit_create_task", empty)).toBe(false);
session.acceptProviderContext(empty);
expect(session.canExecute("orbit_create_task", empty.requestId)).toBe(false);
```

- [x] Run both new test files, confirm red.
- [x] Define `load_skill({skillId})` and `read_skill_document({skillId, document})` using strict schemas. Reject versions, arbitrary paths, or model-supplied loaded flags. Loaders return `{skillId, document, version, text, uri}` from Registry; runtime calls `recordResult` after appending tool result.
- [x] Policy declares all 7 tool names in `backend/mcp/tools.ts`; unmapped business tools rejected by default. `grill_user` and loaders handled separately without granting business permissions.
- [x] Return structured tool errors: `SKILL_REQUIRED`, `SKILL_NOT_FOUND`, `SKILL_DOCUMENT_NOT_FOUND`, `SKILL_CONTENT_TOO_LARGE`; with `executed: false` and required skill to load when blocked. Duplicate loads do not re-accumulate unique document budget but still count toward call/time budgets. If document is already fully present in current context, return reference metadata pointing to prior result to avoid text duplication; snapshot requires full text in payload. If full text was evicted, it must be resent.
- [x] Re-run tests; add cases for IELTS skill not opening task tools, separate sessions not inheriting state, and missing documents not marked as loaded.

## Task 3: Agent loop integration, checkpointing, and round limits

**Files:** `backend/services/agentService.ts`, `backend/services/test/agentService.test.ts`, `backend/utils/agentMessages.ts`, `backend/services/test/conversationHistory.test.ts`, `backend/services/conversationTurnService.ts`, `backend/utils/agentBudget.ts`, `backend/services/test/agentBudget.test.ts`, `backend/services/test/agentSkillsRuntime.test.ts`. Extend `backend/types/IAgent.ts` for deadline propagation.

**Interfaces:** Agent uses Task 2 session; `toolsByName` continues scoping MCP tools by user/scope. Compute business definitions using `canExpose(name, currentSnapshot)`, not `canExecute` to filter outbound requests. Initial request contains only loaders and `grill_user` (in Ask). `canExecute` checks `sourceRequestId` of the response currently being processed.

- [x] Add mock-provider tests for `load_skill → model receives Markdown → business call → final` sequence; verify MCP business tool is not invoked before model receives document.
- [x] Add test for model calling load and business in same batch: business receives `SKILL_REQUIRED`, does not execute; executes only in subsequent model round. Test direct business calls while tool is hidden are blocked.
- [x] Run `pnpm exec vitest run services/test/agentService.test.ts`, confirm new cases red.
- [x] Inject catalog names/descriptions into system context. Instruct model to select appropriate skill before advice, load `task-management` before data operations, and read references required by `SKILL.md`. Skill content is maintainer guidance, not elevation of user data to instructions.
- [x] Handle loader output separately from 12,000-character business truncation: supply full verified Markdown in tool response. `recordResult` after append; snapshot from final payload; accept exact snapshot after valid response and successful checkpoint. Any new context transformation must run before snapshot, never after.
- [x] Check `canExecute(name, sourceRequestId)` immediately before `mcpClient.callTool`. All blocked calls return tool result matching ID with `executed: false`; unknown/unmapped tools do not dispatch. Do not auto-retry blocked calls; model must generate new call. Menus continue using `completeMenuMessages` and concluding turn.
- [x] Create new session per turn. History containing prior load results does not open tools; model must reload. Checkpoint preserves tool-call/result pairs; checkpoint/provider errors leave no usable loaded state in subsequent requests.
- [x] Compact prior-turn loader results in `prepareHistory` before checking 60,000-character limit: identify by assistant function name + `tool_call_id`, transform successful results into `{skillId, document, version, previouslyLoaded: true, validForCurrentTurn: false}`. Preserve errors, pairing, business results, and stored checkpoints; do not mutate turn objects. Full Markdown in current turn must be preserved for provider requests.
- [x] Update all legacy mock flows calling business tools directly to load → provider receives Markdown → action. Helpers construct responses without setting state. Assert new provider call counts intentionally and preserve user, ownership, idempotency, menu, and outcome assertions. Mock captures clone payload at invocation time to avoid observing mutated messages.
- [x] Keep 6 provider round limit in initial release; drop automatic increase to 8. Suggest changes only after eval. Maintain 40 total calls including loaders, blocked calls, and `grill_user`; check before each dispatch, oversized batch receives `executed: false` responses for remaining calls. Final round uses `tool_choice: "none"`; write results from final action round are summarized if provider has remaining budget.
- [x] Implement budget per Execution budget section below; fake-clock tests before implementation. Do not increase frontend timeout or alter lease/idempotency.
- [x] Add integration tests: request #2 has both Markdown and business definitions, response #2 executes immediately; only partial pending docs in payload confirms only those docs; provider failure/malformed response, stale snapshot, checkpoint failure do not dispatch; expired lease blocked by `beforeWrite`.
- [x] Test Auto/Ask, menu ending turn then answered in new turn, retry write not repeating success, concurrent users, provider failure after load, unknown tool, and history containing load requiring reload.
- [x] Re-run agent tests and `services/test/conversationHistory.test.ts`, expect PASS.

## Task 4: MCP Resources for shared document source

**Files:** `backend/mcp/resources/skills.ts`, `backend/mcp/test/skills.test.ts`, `backend/mcp/server.ts`, `backend/mcp/routes/mcpRoute.ts`, and HTTP tests in `backend/mcp/test/mcp.integration.test.ts`.

**Interfaces:** `registerSkillResources(server: McpServer, registry: SkillRegistry): void`; resource URI `skill://{skillId}/{document}`, MIME `text/markdown`.

- [x] Write integration tests via `InMemoryTransport`: `listResources` includes `SKILL.md`, `readResource` returns exact content/version matching registry; invalid URIs do not return files outside registry.

```ts
const result = await client.readResource({ uri: "skill://task-management/SKILL.md" });
expect(result.contents[0]).toMatchObject({
  mimeType: "text/markdown",
  text: registry.read("task-management").text,
});
```

- [x] Run `pnpm exec vitest run mcp/test/skills.test.ts`, confirm test red before implementation.
- [x] Use `server.registerResource` per installed SDK types; callback retrieves documents from registry snapshot. Pass identical registry to agent and MCP server to prevent turn version skew.
- [x] Preserve existing MCP tool list and permissions; resource reads create no agent permissions or loaded state.
- [x] Test both `InMemoryTransport` and HTTP MCP client for resources/list, resources/read, unknown URIs, existing auth, and unmodified tool schemas. Return version/contentHash via metadata namespaced under `orbit/skillVersion`, `orbit/contentHash` if SDK supports `_meta`. Markdown text matches Registry exactly, with no header injection altering document.
- [x] Handle registry initialization failures in HTTP route via error handler; update all call sites if factory signature changes. External resource reads do not call `session.recordResult`/`acceptProviderContext`.
- [x] Re-run resource tests and existing server/router tests, expect PASS.

## Task 5: Domain specialization (gym/IELTS), packaging, and verification

**Files:** `backend/skills/content/gym/{manifest.json,SKILL.md}`, `backend/skills/content/ielts/{manifest.json,SKILL.md,writing-rubric.md,speaking-rubric.md}`, `docs/agent-chat-architecture.md`. Inspect `backend/Dockerfile`, `.dockerignore`, and deployment configuration before modifying asset inclusion if needed.

- [x] Author `gym/SKILL.md`: gather goals, experience, schedule, equipment, and movement constraints; schedule according to existing data; save tasks only on request. Do not turn every consultation into a mandatory questionnaire.
- [x] Author `ielts/SKILL.md`: identify skill, goal, current level/submission; Writing must read writing-rubric, Speaking must read speaking-rubric. Align rubrics with official IELTS sources; cite sources and review dates, paraphrasing in original words. Feedback grounded only in actual data; never grade pronunciation from raw text.
- [x] Test registry discovers new skills via manifest without modifying agent loop; test reference reads appear in messages. Do not claim mock tests prove real-world model skill selection.
- [ ] Verify Markdown/JSON assets exist in Docker/deploy artifacts and can be read from alternate cwd. Startup/registry failures report clear configuration errors, never silently opening tools.
- [x] Log minimum `skill_loaded`, `skill_document_loaded`, `tool_blocked_missing_skill` with requestId, skillId, version, toolName; never log full Markdown, prompt, or personal data.
- [x] Record metrics once at turn end on both success and error: `provider_rounds`, `skill_load_count`, `skill_context_chars`, `time_to_first_business_tool_ms`, `turn_duration_ms`, `blocked_tool_count`. Compare no-skill baseline and skill flow on same provider/model, recording sample count and median/p95 latency; never disable production gate for benchmarking.
- [x] Update documentation: how to add folder/manifest, add tool mappings, internal Orbit guarantees vs external MCP clients, and document versioning.
- [ ] Run from backend: `pnpm run build`, `pnpm test`. Run from frontend: `pnpm test`, `pnpm run lint`, `pnpm run build`; report pre-existing errors separately. Integration uses disposable MongoDB when configured; record skipped parts.
- [ ] Smoke test with real provider when configured: view tasks, clear task creation, gym advice without saving, IELTS followed by save request, Writing evaluation reading rubric. Evaluate skill selection, read/execute order, response quality, and latency; do not generate real user data for smoke testing.

## Execution budget (Task 3)

The deadline limits starting new work and caps provider timeouts; it does not claim to cancel running database operations. Initialize clock at start of `runConversationTurn`; direct chat path initializes at start of `chatWithMcp`. Use `performance.now` and pass budget into agent; time spent loading registry/history counts against budget.

Initial default configuration: turn budget 50,000ms, final reserve 10,000ms, persistence reserve 2,000ms. Operational values for testing/measurement, not an SLA; before merge, reconcile with actual frontend/hosting timeouts and lower budget if infrastructure has lower limits. Do not raise frontend timeout. Retain provider cap 45,000ms.

```ts
// backend/utils/agentBudget.ts: contract, clock can be injected for fake tests.
type AgentBudget = {
  remainingMs(): number;
  canStartAction(): boolean;
  providerTimeoutMs(finalOnly: boolean): number;
};
// createAgentBudget(now, totalMs = 50_000): AgentBudget
// remaining = max(0, totalMs - (now() - startedAt))
// canStartAction = remaining > 12_000
// providerTimeoutMs(false) = min(45_000, max(0, remaining - 12_000))
// providerTimeoutMs(true)  = min(45_000, max(0, remaining - 2_000))
```

- [x] Before each provider request: if action budget insufficient, set `tool_choice: "none"`; if final timeout non-positive, proceed to existing error/fallback. Before each business dispatch, re-verify budget. Calls unexecuted due to exhausted budget receive `{ code: "TURN_BUDGET_EXHAUSTED", executed: false }`; do not invoke service.
- [x] Provider timeout or unknown write outcome must not auto-retry write with new key. If action succeeded, preserve result/checkpoint; if no time remains for final summary, use `interruptedReply` based on confirmed result. Never report rollback or success when outcome is unknown.
- [x] Fake-clock tests verify load counts against budget, provider timeout clamped, no action past threshold, no provider call with non-positive timeout, halted batch receives results, and successful write is not repeated after final failure.

```ts
let clockMs = 0;
const budget = createAgentBudget(() => clockMs, 50_000);
expect(budget.providerTimeoutMs(false)).toBe(38_000);
clockMs = 38_000;
expect(budget.canStartAction()).toBe(false);
expect(budget.providerTimeoutMs(true)).toBe(10_000);
clockMs = 50_000;
expect(budget.providerTimeoutMs(true)).toBe(0);
```

Run from backend: `pnpm exec vitest run services/test/agentBudget.test.ts services/test/agentService.test.ts services/test/conversationHistory.test.ts`. Verify provider wrapper maintains `maxRetries: 0`; budget creates no new retry mechanism.

## Acceptance criteria

1. Business tools invoked directly without a skill will not execute, even if the model invents tool names.
2. The agent must have a provider round containing full Markdown prior to business calls; load and action in same batch does not bypass gate.
3. Adding domain expertise requires only manifest and documents; adding business tools requires explicit policy mapping.
4. Do not load all skill contents into every request; catalog remains concise, documents loaded on demand.
5. New chat turns do not trust loaded flags in history; load failures or document truncation do not unlock tools.
6. MCP permissions, idempotency, Ask menus, and tool result reporting preserve existing behavior.
7. Automated tests prove ordering/context and gates; live evals evaluate specialist selection without conflating assurance levels.

## Additional acceptance tests following review

- [x] First request exposes only loaders and `grill_user` in Ask (Task 3).
- [x] Load and action in same batch without context does not bypass; MCP/business service spy count = 0 (Task 3).
- [x] Subsequent request contains full Markdown and exposes business tools immediately; response executes without extra unlock round (Task 3).
- [x] Unmapped tools, fabricated names, wrong skill, or insufficient scope do not dispatch (Tasks 2–3).
- [x] Provider failure, malformed response, foreign/tampered snapshot do not accept context (Tasks 2–3).
- [x] Pending doc not fully present in payload is not confirmed; wrong hash/version or truncated doc rejected (Tasks 2–3).
- [x] Checkpoint failure before dispatch prevents business execution; expired lease before transaction still blocks write (Task 3).
- [x] Old skill version compacted before history size limit; does not grant permissions, mutate persistence, or break pairing (Task 3).
- [x] Duplicate load does not duplicate existing content or document budget, but counts toward calls/time (Tasks 2–3).
- [x] Concurrent sessions for two users remain independent; confirmation state is not shared (Tasks 2–3).
- [x] Action in final permitted action round has model summary in final-only round on provider success; failure uses factual fallback (Task 3).
- [x] Budget checks block new provider/action calls at exact thresholds; blocked batch receives result for each call (Task 3).
- [x] Resources list/read returns exact Registry contents via in-memory and HTTP without granting agent permissions; tool contracts unchanged (Task 4).
- [x] Per-skill path containment, symlink protection, deterministic hashing, registry failure fail closed (Tasks 1, 4).
- [x] Regression Auto/Ask, authorization, ownership, idempotency, and execution lease still pass (Task 3).
- [ ] Live-provider eval separates ordering/context, specialist selection, response quality, and latency (Task 5).

## Delivery sequence

Execute Task 0 → Task 1 → Task 2 → Task 3 → Task 4 → Task 5. MCP Resources follows runtime integration; tasks are numbered in actual implementation order. Task 0 finalizes contract; Registry, session, and agent loop complete core runtime before MCP adapter and specialized content. Each task constitutes an independent review unit when the user requests a commit; this plan does not commit or deploy autonomously.

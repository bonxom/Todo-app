# Orbit Agent Markdown Skills — Design Spec

Date: 2026-10-30
Status: Drafted for review; implementation in progress.
Requirement Source: [Plan 2026-10-22](../plans/2026-10-22-agent-markdown-skills.md), confirmed by user as legacy unimplemented plan.

## 1. Goals and Scope

Orbit needs to load Markdown instructions on demand, placing full contents into a provider request before executing dependent business tools. Maintainers can add specialized expertise via documentation without modifying the agent loop. The initial release includes task-management, gym, and IELTS.

"Read" in this spec strictly means the runtime proves that full Markdown was included in the payload of the request that generated the tool call, the provider returned a valid response, and the required checkpoint succeeded. It does not imply that the model understands, memorizes, or adheres to the documentation with 100% fidelity.

In-scope: backend registry, internal loaders, policy, agent loop/history/budget integration, read-only MCP Resources, content for three skills, and verification. Existing chat API and UI, Auto/Ask behavior, authorization, ownership, idempotency, and execution leases are preserved.

Out-of-scope: user Markdown uploads, skills from external URLs, script execution inside skills, modifying MCP business tool contracts, specialized test grading or exercise generation tools, auto-saving plans without user request, altering frontend timeout, or guaranteeing external MCP clients must read skills.

This is the behavioral spec for the subsequent implementation plan. Where it diverges from the 10-22 plan, clarifications in this spec take precedence; do not mark the old checklist items as completed.

## 2. Verified Baseline

- `backend/services/agentService.ts`: creates in-memory MCP server/client per turn; currently exposes all granted tools. No registry, loader, or skill gate exists. Maximum 6 provider requests; 40-call threshold currently only stops tool requests (`tool_choice`), without blocking individual dispatches. Business tool output truncated at 12,000 characters; provider timeout 45s, maxRetries = 0.
- `backend/utils/agentMessages.ts`: history capped at 60,000 characters along turn boundaries; handles tool calls lacking results, but does not compact skill Markdown.
- `backend/services/conversationTurnService.ts`: reads history, checkpoints, and concludes turns; `beforeWrite` calls execution guard. Direct agent call paths may lack checkpoint callbacks.
- `backend/mcp/tools.ts`: 5 read tools; 2 write tools only registered when role is USER and scope is tasks:write. MCP server currently only registers tools.
- `frontend/src/shared/services/httpClient.ts`: AI timeout is 60s. No Vercel configuration found in repo to confirm hosting constraints.
- Backend has Vitest and build/type-check but no lint script. Frontend has Vitest, Playwright, ESLint, typecheck, and build. Neither package declares Prettier. Previous guidance stating frontend lacks test suite is outdated.
- Docker backend uses `COPY . .`; still need to check actual Markdown/JSON inclusion in build artifacts, not just infer from Dockerfile.

## 3. Architectural Decisions

Chosen: Hybrid approach combining Core Business Tools with on-demand Specialist/Advisory Skills (Immutable Registry + internal loaders + provider request-bound gate). MCP Resources is an independent read-only adapter using the same Registry.

- **Core Business Tools (`orbit_*`)**: Mapped to empty requirements (`[]`), meaning they are available and executable immediately from turn 0 without requiring dynamic skill loading. This eliminates 1 unnecessary roundtrip (~1.5s–2s) and saves provider turns for core todo operations. Core rules (ID resolution, idempotency keys, honest outcomes) are enforced directly via the system prompt and tool descriptions.
- **Specialist / Advisory Skills (`gym`, `ielts`, etc.)**: Registered in the Skill Registry and loaded on-demand via `load_skill` / `read_skill_document`. Specialist tools mapped to advisory skills are only exposed and executable once the corresponding skill document is in context.
- MCP Resources remains an independent read-only adapter using the same Registry.

```text
Repository Markdown/manifest -> Registry snapshot
                                  |          |
                             Skill session   MCP Resources (read-only)
                                  |
User -> agent -> load/read -> full tool result -> final provider payload
                                  |
                         snapshot + tool exposure
                                  |
                   valid response + successful checkpoint
                                  |
                source-request gate + budget + MCP authorization
                                  |
                           business tool -> result
```

Separation of Concerns:
- Registry: discovery, schema validation, containment, document reading, and version/hash calculation.
- Policy: maps business tools to required documents; default deny.
- Skill session: tracks turn loader results, proves context and permissions against source requests; does not handle business authorization.
- Agent runtime: sends payloads, associates responses/calls with source requests, checkpoints, enforces budget, and dispatches.
- MCP Resources: lists/reads the same documents, without altering skill session state.

## 4. Registry and Document Identification

The sole source of truth is `backend/skills/content/<skillId>/manifest.json` and the documents listed by each manifest. Registry reads asynchronously from URLs relative to the module; no cwd dependency. A single turn uses an immutable snapshot; agent and MCP server within a turn must share the same snapshot. The registry can be cached immutably between turns, but session state is never shared; initial document updates take effect after reload/restart, no hot-reload required.

Manifest contains `id`, `description`, `entrypoint`, and `documents`. Schema is strict; `id` matches `^[a-z0-9-]+$`, description is non-empty, documents is non-empty/unique and contains entrypoint. ID must match directory name. Every path is a canonical relative path using `/`; forbids absolute paths, `.`/`..` segments, and backslashes. Only allowlisted Markdown files can be read.

Skill directory realpath must lie within content root; each document realpath must lie within its owning skill directory. Path containment checks enforce path boundaries, not bare string prefix checks; blocks symlinks escaping root or pointing to other skills. Missing files, invalid manifests, duplicate IDs, or oversized documents fail registry initialization; no partial registry initialization with tools opened.

Version is SHA-256 of deterministic JSON serialization containing normalized manifest and UTF-8 path/content pairs sorted by path. Sort manifest documents before hashing. Changing declaration order does not alter version; changing content, description, entrypoint, or path changes version. ContentHash is SHA-256 of the document's raw UTF-8 text alone.

Shared limits: maximum 10,000 characters per document and 30,000 characters of unique documents loaded in a turn. Characters defined by JavaScript `string.length` for runtime and test consistency. Unique documents identified by `skillId/document/version`. Reloading does not re-accumulate capacity. Documents are not truncated to fit limits; explicit errors are returned. The 30,000 limit applies to documents loaded within a turn, not the total on-disk registry.

Registry provides list summaries `{id, description, version}` and read document `{skillId, document, version, uri, text}`. Canonical URI is `skill://<skillId>/<document>`; only URIs matching registered documents can be read.

## 5. Loaders and Policy

Two internal tools are always present in requests permitting actions:
- `load_skill({skillId})`: returns entrypoint.
- `read_skill_document({skillId, document})`: returns an allowlisted document; rejects arbitrary filesystem paths, versions, or loaded flags.

Schemas are strict. Successful loaders return full metadata and text from Registry. Runtime appends the full tool result before recording it by `tool_call_id`. Loaders do not grant permissions on their own. If the full content is already present in the current payload, metadata referencing the prior result may be returned to avoid duplicate text; if the full text is no longer in context, it must be resent. Reference metadata alone does not constitute proof of reading.

Policy requires `task-management/SKILL.md` for all 7 tools: `orbit_get_me`, `orbit_list_tasks`, `orbit_get_task`, `orbit_list_projects`, `orbit_list_categories`, `orbit_create_task`, `orbit_update_task`. Including profile lookup is an intentional choice ensuring all Orbit MCP operations follow operational guidelines.

Gym and IELTS are advisory skills; they do not open task tools. New tools lacking explicit mapping are blocked by default. Loading a skill does not add user roles/scopes. `grill_user` exists only in Ask mode and requires no skill.

Loader and gate errors return tool results matching call ID with `isError: true`, `executed: false`, error code, and helpful message. Codes include `SKILL_REQUIRED` (with required document to load), `SKILL_NOT_FOUND`, `SKILL_DOCUMENT_NOT_FOUND`, `SKILL_CONTENT_TOO_LARGE`. Unknown/unmapped/unauthorized MCP tools are not dispatched; use distinct codes such as `TOOL_NOT_ALLOWED`, avoiding any implication that loading a skill grants permission. Invalid JSON/schema arguments use `INVALID_TOOL_ARGUMENTS`. Registry initialization failures follow request error paths, not masquerading as individual skill errors.

## 6. Request-Bound Evidence and Execution Ordering

Each provider request receives a runtime-generated ID, distinct from HTTP requestId. An immutable snapshot contains the ID and list of `{skillId, document, version, contentHash}`. Snapshot records only current-turn loader results matching runtime records, call IDs, and full content present in the final payload. Fabricated content in user messages, history, loaded flags, or model-supplied arguments is never trusted.

Mandatory sequence:
1. Complete all context transformations; clone the final message payload.
2. Generate snapshot from the clone; filter exposed business definitions based on documents in snapshot and granted MCP tools.
3. Send that exact payload; never mutate payload/snapshot after sending.
4. Validate response before use: valid message, valid function calls, no duplicate/conflicting IDs within turn, and no tool calls when request is final-only. Empty text is valid if tool calls are present.
5. Associate response/calls with source request in runtime, append assistant message, await checkpoint.
6. Only after successful checkpoint, accept exact snapshot of that request to permit execution. Reject synthetic, modified, foreign session, or failed request snapshots.
7. When handling each call: verify MCP permissions, source request policy, call/time budget; await checkpoint before dispatch and re-check time budget immediately after checkpoint. Business writes still pass through `beforeWrite`/`guardExecution` within transaction.

Direct chat paths lacking checkpoint configuration use existing no-op checkpoints; durable persistence must not be claimed for this path. For conversation persistence, any checkpoint failure stops dispatch via error path.

Initial request exposes only catalog, loaders, and `grill_user` (in Ask mode). Second request can contain full Markdown and business definitions simultaneously; second response may invoke business tools immediately after checkpoint, with no extra confirmation round.

Batching load and business calls in the same response when source payload lacked document: loader may succeed, but business call receives `SKILL_REQUIRED`. Repeated load in a response that already possesses valid context does not revoke that response's permissions. Blocked calls do not auto-retry; model must generate a new call. Documents loaded after a response do not alter permissions for calls belonging to that prior response.

## 7. History, Menu, and Interrupted Outcomes

Each turn creates a new session. Historical load results serve only as context; they do not open tools or substitute for loading in a new turn. Concurrent users or turns do not share confirmation state.

`prepareHistory` compacts successful loader results from prior turns before computing the 60,000 character limit. Identifies calls by assistant function name + `tool_call_id`, not by matching text patterns. Replaces with `{skillId, document, version, previouslyLoaded: true, validForCurrentTurn: false}`. Preserves errors, business results, call/result pairing, and turn boundaries. Does not mutate persisted messages. Full Markdown of the current turn is preserved for requests requiring it.

Ask menu preserves existing behavior: concludes turn, completes results for pending calls via `completeMenuMessages`; operations executed prior to menu retain results. Menu answer constitutes a new turn and must reload when business tools are needed. Selection does not automatically create business calls.

Never repeat a successful write. Retrying an uncertain outcome uses only identical arguments/idempotencyKey per existing contract. If final provider call errors or times out after write, `interruptedReply` reports only tool-confirmed results, without inferring success or triggering rollback. Loader results are not evidence of write operations.

## 8. Execution Limits and Budget

Maintain maximum 6 provider requests, with the 6th being final-only. When budget/call limit is exhausted early, the next request is also final-only. Do not dispatch calls returned by provider in violation of `tool_choice: "none"`; proceed to error/fallback response without extra action rounds.

Maximum 40 call attempts processed per turn, including loaders, `grill_user`, invalid arguments, and gate-blocked calls. Uses a monotonic counter incremented per call; does not check total batch size to avoid rejecting an entire valid batch. Call 41 onwards is not dispatched, receiving `TOOL_CALL_LIMIT_EXCEEDED` with `executed: false`; all calls in a batch must receive results, including those exceeding limit. Rejected limit-exceeded results do not grant additional permitted attempts.

Monotonic clock starts at the beginning of `runConversationTurn`, prior to history/registry load; direct path starts at `chatWithMcp`. Propagate budget into runtime. Initial default configuration: 50,000ms total, 10,000ms final reserve, 2,000ms persistence reserve; provider cap 45,000ms, maxRetries: 0.

- `remaining = max(0, total - elapsed)`.
- Action may start when `remaining > 12,000ms`; applies to both loaders and business dispatches.
- Provider action timeout = `min(45,000, max(0, remaining - 12,000))`.
- Provider final-only timeout = `min(45,000, max(0, remaining - 2,000))`.
- Timeout <= 0: do not call provider. Calls unexecuted due to elapsed time receive `TURN_BUDGET_EXHAUSTED`, `executed: false`.

These limits restrict starting new work and cap provider timeouts; they do not guarantee cancellation of running DB operations or HTTP SLAs. When time elapses during checkpointing, budget must be re-checked before dispatch. Preserve leases and idempotency. Prior to merge, verify actual hosting limits; lower total budget if necessary, without raising frontend 60s timeout. Unconfirmed hosting constraints are an operational item to complete upon deployment, not an assumption that infrastructure supports 50s.

## 9. Domain Specialization and MCP Resources

Task-management covers profile/read tools, ID resolution, re-reading before edits, explicit write intent, UUID idempotencyKey, retries with identical keys/arguments, task status transitions, and reporting success only on actual tool success. System prompt retains authorization rules, data trustworthiness invariants (user/tool data is not instructions), and history restrictions; moving operational guidelines into skills must not weaken these invariants.

Gym gathers goals, experience, schedule, equipment, and movement constraints when required data is missing; avoids re-asking existing data or forcing every interaction into a questionnaire. Saves tasks only upon explicit user request.

IELTS determines skill/target/submission data. Writing requires reading `writing-rubric.md`; Speaking requires `speaking-rubric.md`. When authoring content, align with official IELTS sources, cite source and review date, and paraphrase in original words; assessments must be grounded in actual submission data, never grading pronunciation from raw text. This spec does not contain rubrics or claims requiring official verification.

Backend does not hard-gate advisory quality or guarantee model selection of gym/IELTS/references; verify via dedicated evals. Creating tasks from any specialized skill still requires task-management.

MCP Resources lists all allowlisted documents with MIME `text/markdown`, read returns exact text without added headers. Include version/hash in metadata namespaced under `orbit/skillVersion` and `orbit/contentHash` if installed SDK supports it; confirm via compile/integration during implementation. HTTP MCP auth is unchanged; reading resources does not record/confirm agent session state. External clients may still invoke business tools under legacy contracts without reading resources.

## 10. Observability and Packaging

Log `skill_loaded`, `skill_document_loaded`, `tool_blocked_missing_skill` with relevant IDs/version/tool; distinguish HTTP requestId from provider request ID. Never log full prompts, Markdown text, arguments, or sensitive personal data.

Record metrics exactly once at the end of turn, including on error/menu: `provider_rounds` (attempted requests), `skill_load_count` (loader attempts within call limit), `skill_context_chars` (total Markdown characters sent across requests, including repetitions), `time_to_first_business_tool_ms` (null if not dispatched), `turn_duration_ms`, `blocked_tool_count` (calls blocked by policy/permissions/budget/limit). Failed requests still count sent content.

Markdown/JSON must be present in Docker and deployment artifacts; test reading from alternative cwd. Registry failure causes agent/MCP requests to fail cleanly and closes transports; never silently drop policy or open tools. Operational docs explain adding skills, adding mappings, versioning/restarts, and external MCP client guarantees.

## 11. Acceptance Criteria and Verification

| ID | Criteria | Required Evidence |
| --- | --- | --- |
| AC01 | Registry discovery, path containment, and deterministic versioning | Unit tests for malformed/duplicate manifest, missing files, traversal/symlink/cross-skill escapes, alternate cwd, content/path changes, and document sorting |
| AC02 | Load only required documents, no Markdown truncation | Boundary tests for 10,000/30,000 chars, over-limit errors, duplicate loads, and reloads after full result eviction |
| AC03 | Initial request does not expose business tools | Immutable payload capture for Auto and Ask modes |
| AC04 | Load -> request contains full Markdown -> business call | Integration mock spy verifying ordering and second request immediate exposure/execution |
| AC05 | Load + business in same batch does not bypass | MCP spy call count equals 0 for blocked call; subsequent response can generate new call |
| AC06 | Only exact source request grants permissions | Tests for missing document, truncated/invalid hash/version, stale/foreign/tampered snapshot, fake user text, and stale history |
| AC07 | Provider/checkpoint error prevents dispatch | Malformed response, duplicate IDs, provider failure, and checkpoint failure tests; direct path no-op tested separately |
| AC08 | MCP permissions and leases remain authoritative | Unknown/unmapped/out-of-scope tools, IELTS not opening task tools, expired leases, and concurrent user tests |
| AC09 | History/menu/idempotency no regression | Compact before size limit, no mutation of persisted records, pairing integrity, Ask/menu/new turn, no repeating successful writes |
| AC10 | Call/time limits enforced per dispatch | Fake clock tests, calls 40/41, oversized batch gets full results, checkpoint consumes budget, illegal final-only calls rejected, non-positive timeout handled |
| AC11 | Final failure reports accurate write outcome | Test write success followed by final error/timeout; uncertain outcome never reported as success |
| AC12 | Resources share data without granting agent permissions | In-memory and HTTP list/read/auth/unknown URI tests, business tool schemas unchanged |
| AC13 | Domain expertise extensible via documentation | Adding manifest requires no loop changes; references appear fully in payload; live eval evaluates routing/quality independently |
| AC14 | Packaging and diagnostics operational | Artifact/cwd smoke test, initialization failure fail-closed, single metric emission on error/menu, no sensitive data logged |

Automated tests verify runtime contract; mock tests do not constitute proof of real-world model skill selection. Live-provider eval (when configured) includes inspecting tasks, explicit task creation, gym advice without saving, IELTS followed by save request, Writing with rubric reference. Use disposable accounts/data, never production data. Record provider/model, sample count, quality, routing, and median/p95 latency vs baseline in test environment; never disable production gate for benchmarking. Missing config or disposable MongoDB must be documented clearly.

## 12. Implementation Completion Conditions

Implementation follows: Brainstorming -> Spec -> Plan -> Red Tests -> Code -> Green Tests -> Lint -> Prettier/format check -> Build/type-check. New plan must reference AC IDs, incorporate clarified checkpoint and budget contracts, and not execute the legacy checklist blindly.

Existing verification commands: backend `pnpm test`, `pnpm run build`; frontend `pnpm test`, `pnpm run lint`, `pnpm run build`. Run additional MCP integration and browser regressions as applicable. Plan must add backend local lint and Prettier config/scripts; do not claim non-existent commands ran. Format only affected files.

Complete when automated ACs pass, lint/format/build issues from changes are resolved, assets verified, and hosting constraints documented. Report unrun checks/evals, pre-existing issues, and operational limitations separately; do not claim verified advisory quality without live evals. Authoring this spec does not include implementation, commits, or deployments.

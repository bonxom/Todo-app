# Agent chat architecture

## Auto and Ask

Both modes use the same model/tool execution loop in `backend/services/agentService.ts`. Ask adds `grill_user` and prompt guidance to propose useful directions or ask when a decision is needed. Tool descriptions encourage asking before ambiguous writes, but there is no backend Ask approval gate, preview fingerprint, synthetic approved tool call, or tool-name allowlist for Ask.

The model chooses when to ask and which tools to call. After the user answers a menu, that answer becomes a new user turn and the model continues. A clear request does not require a separate confirmation for every create/update call. Existing authorization, input validation, idempotency and execution lease checks remain in place for both modes.

## Skills and Execution Policy Gate

Orbit enforces an on-demand Markdown skill architecture combined with core business tools:
- **Core Business Tools**: Tools managing the primary application domains (`orbit_get_me`, `orbit_list_*`, `orbit_get_task`, `orbit_create_task`, `orbit_update_task`) are core tools exposed and executable immediately in round 0 without requiring skill pre-loading, following rules defined in the system prompt.
- **Skill Registry (`backend/skills/registry.ts`)**: Loads maintainer-authored advisory skill directories from `backend/skills/content/<skillId>/manifest.json` and Markdown files (e.g. `gym`, `ielts`). Manifests are validated with strict schemas, path traversal/symlinks are strictly blocked via `realpath` checks, and each skill's version is a deterministic SHA-256 hash over its normalized manifest and sorted document contents.
- **Internal Loaders**: The model has access to `load_skill({ skillId })` and `read_skill_document({ skillId, document })` for specialist advisory guidance from the catalog.
- **Request-Bound Gate**: In subsequent requests where the payload contains verified full Markdown, specialist tools mapped by policy (`backend/skills/policy.ts`) are exposed. When the provider returns a valid response and the response is successfully checkpointed, the session confirms that request's snapshot. Tool dispatches are verified against the exact `sourceRequestId` that originated the call. Unmapped tools, tools without required skills loaded, or calls in the same batch as the loader are blocked (`SKILL_REQUIRED` / `TOOL_NOT_ALLOWED`).
- **MCP Resources Adapter (`backend/mcp/resources/skills.ts`)**: Independent read-only adapter exposing `skill://{skillId}/{document}` for external MCP clients using the same Registry snapshot. External client resource reads do not mutate or grant agent session execution permissions.

### Operational Guidelines for Skills
- **Adding a skill**: Create `backend/skills/content/<skillId>/manifest.json` with `id`, `description`, `entrypoint` (e.g. `SKILL.md`), and `documents` list. Add the matching `.md` files in that folder. Restart the server to reload the immutable registry.
- **Mapping tools to skills**: Add new tools to `backend/skills/policy.ts`. By default, unmapped business tools are denied execution.
- **Versioning**: Any edit to a skill manifest or document content automatically updates its deterministic SHA-256 version hash upon registry initialization.
- **External MCP clients**: External clients may read documents via MCP Resources (`listResources`, `readResource`). However, Orbit internal skill gates protect the Orbit agent; external MCP tool execution continues using existing role/scope authorization.

## Turn Budget and Execution Limits

- **Monotonic Budget (`backend/utils/agentBudget.ts`)**: Each turn operates under a default 50,000ms budget, with 10,000ms reserved for the final summary round and 2,000ms for persistence. The budget clock begins at turn entry (`runConversationTurn` / `chatWithMcp`) and tracks total elapsed time. If remaining time drops below 12,000ms, new actions are blocked (`TURN_BUDGET_EXHAUSTED`).
- **Call Attempts Limit**: Each turn processes at most 40 call attempts (counting loaders, blocked calls, and business executions). Call 41+ is rejected with `TOOL_CALL_LIMIT_EXCEEDED` (`executed: false`).
- **Provider Rounds**: Up to 6 provider rounds per turn. If limits are reached or on round 6, the provider is invoked with `tool_choice: "none"` for a final summary.

## Ownership

- `agentService.ts`: MCP lifecycle, model/tool loop, skill session integration, checkpoints and final model response.
- `agentSkillService.ts`: Session lifecycle, snapshot validation, loader arguments parsing, and request-bound gate enforcement.
- `skills/registry.ts`: Immutable discovery, schema validation, containment checks, document reading, and deterministic version hashing.
- `skills/policy.ts`: Mapping business tools to required skill documents.
- `mcp/resources/skills.ts`: MCP Resources adapter for registry documents.
- `agentInteractionService.ts`: internal `grill_user` definition and validated menu creation.
- `interactionAnswerService.ts`: menu selection validation and state transitions.
- `conversationService.ts` / `conversationTurnService.ts`: history, turn execution and persistence.
- `chatTurnRepository.ts`: claims, leases, checkpoints, menu persistence and finalization.
- MCP task tools: business input validation, permissions and transactional writes.
- `useConversationChat.ts` / `useConversationSession.ts`: sends, menu answers, recovery and pagination.

## Menu lifecycle

The agent explicitly calls `grill_user` with question, 2–4 options and optional custom answers. A displayed menu completes the current turn and closes outstanding tool calls. The UI submits the choice through `POST /api/ai/chat-mcp` with a new request ID and selection. The claim transaction consumes the menu and starts the new turn. Ordinary text can supersede a menu. Legacy confirmation records remain readable; their selected action is passed as model context rather than automatically executed.

## Final responses

Normal replies are always written by the model after it receives tool results. The final allowed tool round is followed by a model call with `tool_choice: "none"`, giving the model a chance to summarize instead of immediately throwing a step-limit error after a successful write.

On an actual error, confirmed tool results may supply a concise factual fallback. The previous verbose “Đã lưu thành công / Phần trả lời ... bị gián đoạn” wrapper has been removed. Unknown outcomes are not reported as successful. This does not eliminate real provider or hosting timeouts.

## Verification

Backend Vitest suite: 26 test files passed (213 unit/integration tests). Integration tests cover:
- Skill Registry discovery, path containment, traversal/symlink blocking, and deterministic versioning.
- Internal loaders, request-bound snapshots, batching enforcement, and gate bypass prevention.
- MCP Resources read-only adapter and metadata hashes.
- Monotonic budget timer, timeout clamping, and oversized batch execution limits.
- Compacting old loader results in conversation history without mutating stored turns.
- Ask writes, menu lifecycle, and final-round summaries.

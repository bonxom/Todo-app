# Agent chat architecture

## Auto and Ask

Both modes use the same model/tool execution loop in `backend/services/agentService.ts`. Ask adds `grill_user` and prompt guidance to propose useful directions or ask when a decision is needed. Tool descriptions encourage asking before ambiguous writes, but there is no backend Ask approval gate, preview fingerprint, synthetic approved tool call, or tool-name allowlist for Ask.

The model chooses when to ask and which tools to call. After the user answers a menu, that answer becomes a new user turn and the model continues. Clarification selections preserve the active turn mode (Auto or Ask). A clear request does not require a separate confirmation for every create/update call. Existing authorization, input validation, idempotency and execution lease checks remain in place for both modes.

### Task creation and proposal policy

- **Auto mode**: When creation requests and essential details are clear, `orbit_create_task` is exposed and called directly to save tasks immediately. If essential details are missing, the agent asks a focused clarification question using `grill_user`. When the user explicitly requests to plan, suggest tasks, or preview changes, `propose_tasks` is used to present an interactive draft.
- **Ask mode**: Direct task creation (`orbit_create_task`) is blocked with `WRITE_FORBIDDEN` when task proposals are enabled. The agent uses `propose_tasks` to draft editable tasks, and tasks are only created when the user explicitly clicks Confirm on the proposal.
- **Explicit proposal turns**: Any turn with `intent: "task_proposal"` restricts the turn to proposal tools and blocks direct writes.

### Task proposal outcomes in chat and model context

The Confirm transaction is the source of truth for task creation via proposals. Before each model turn, up to 3 recently confirmed proposals (`status: "created"`, sorted by `updatedAt: -1, _id: -1`) owned by the user in the current conversation are read and injected into the system prompt under `Confirmed task proposals (server data):`.
- Contains `proposalId`, `confirmedAt`, and `createdTasks` (projected to `taskId` and `title`).
- Records what was actually created at confirmation time, even if the user edited titles or selected only a subset of items.
- The model treats titles as user data, uses exact IDs for subsequent reads/updates, and requires a new explicit user request before modifying those tasks.
- The next model turn also receives up to 3 recently cancelled proposal IDs and timestamps for the same user and conversation. Committed outcomes supersede the draft state in earlier messages, and a partial confirmation closes the proposal.
- Confirm and Cancel return the saved result in the API envelope. The chat shows a short acknowledgement from that result, including the created count or the cancellation. The response is available immediately and after reloading conversation history. A proposal action does not start a model turn.

## Skills and Execution Policy Gate

Orbit enforces an on-demand Markdown skill architecture combined with core business tools:

- **Core Business Tools**: Tools managing the primary application domains (`orbit_get_me`, `orbit_list_*`, `orbit_get_task`, `orbit_create_task`, `orbit_update_task`, `orbit_delete_task`) are core tools exposed and executable immediately in round 0 without requiring skill pre-loading, following rules defined in the system prompt.
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
- `agentVisionService.ts` / `attachmentVisionService.ts`: internal `analyze_image` tool definition, lightweight attachment metadata formatting, server-side ownership/state/MIME checks, bounded storage streaming, and isolated vision model invocation.
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

## Agent Workspace and Shared Session Architecture

Specification: `docs/superpowers/specs/2026-11-06-agent-workspace.md`

### 1. Single Shared Session (`AgentSessionProvider`)

- Each workspace version shares an `AgentSessionProvider` between its full-page Agent route and floating assistant. On the full-page route, the workspace owns the composer and message view.
- Opening `/agent` or `/v2/agents` from primary navigation starts a blank composer. A `conversation` query parameter opens an explicit conversation. The floating assistant's **Open in Agent** action carries the current conversation or draft into the full-page workspace. A blank chat is persisted on its first message.
- In-memory draft management (`AgentDraft`) stores composer draft text, unuploaded files, and A2UI proposal drafts in memory, keyed by `conversationId` (or `'new'`). No raw files or sensitive drafts are serialized into browser `localStorage`.
- Browser Back/Forward and chat selection check drafts before switching conversations or projects. An explicit assistant handoff uses client-side navigation and keeps the draft, proposal receipts, and any pending request ID.
- Account switching (`sessionRevision` change) immediately resets all in-memory drafts, conversation sessions, and cached responses to prevent cross-account data leakage.

### 2. Conversation Project Context

- `Conversation` models persist `contextProjectId: ObjectId | null`, default `null`.
- V2 groups conversations under Orbit projects using the optional project association returned by `GET /api/ai/conversations`. A new conversation may carry its project on `POST /api/ai/conversations`. The create route validates the project ID and checks ownership before persistence.
- Updated via `PATCH /api/ai/conversations/:conversationId/context` with strict Zod validation (`{ projectId: string | null }`).
- Enforces strict project and conversation ownership checks: users can only assign projects they own to conversations they own.
- Context mutations require an idle conversation lease. If a turn is currently processing (`busyUntil > now`), the context mutation is rejected with `409 CONVERSATION_BUSY`.
- When claiming a turn, `chatTurnRepository.claim` snapshots `contextProjectId` atomically into `ChatTurn`. Retry turns reuse the exact context of the original claim.
- Project context is JSON-encoded and labeled as data (`Active project context data: ...`). This guides the model but is not a prompt-injection security boundary; server-side tool authorization and ownership remain authoritative.
- Completed projects can be chosen as conversational context, but domain invariants reject task creation in completed projects.

### 3. Verified Activity Projections (`AgentActivity`)

- Confirmed tool operations (`task_created`, `task_updated`) are checkpointed with turn messages. Proposal creation and confirmed proposal tasks are projected from committed TaskProposal records, including the saved confirmation request ID, so no best-effort secondary write can lose or falsely report a business outcome.
- Filtered through a strict allowlist projection adapter: only supported action metadata and confirmed task ID/title are exposed; raw tool errors, traces, and connection details are excluded. Input task IDs alone never establish success.
- Persisted with deterministic deduplication keys `(requestId, toolCallId, kind, resourceId)`.
- If an LLM call fails or times out after tools have successfully executed, the confirmed activities remain recorded and available in `resultFor` and `GET /api/ai/conversations/:id`.

## Personal Skills & Advisory Guidance

Specification: `docs/superpowers/specs/2026-11-06-personal-skills.md`
Operational Reference: `docs/ai/personal-skills.md`

- **Advisory Only**: Personal skills provide customizable user Markdown instructions to the Orbit Agent. They are strictly advisory context and cannot satisfy security prerequisites or alter tool permissions.
- **Per-Turn Snapshot**: At the beginning of each turn in `chatWithMcp`, an immutable snapshot of enabled user skills is captured. Changes to skills apply starting on the next turn.
- **In-Turn Discovery**: Model messages are pre-seeded with a valid `list_skills` assistant and tool exchange providing catalog overview without full instruction text, preserving provider rounds.
- **On-Demand Reading & Deduplication**: Model calls `read_skill({ skillId, version })` to read full instructions within a 30,000-character turn budget. Repeated reads of the same version deduplicate content without inflating budget.
- **History Sanitization**: Prior turn `read_skill` tool responses are compacted to metadata-only summaries (`validForCurrentTurn: false`) to prevent stale instructions from re-executing.
- **Read Badges**: Persisted read records (`skillsRead: [{ id, name, version }]`) are projected on bot chat messages, linking directly to the editor with version change indicators.

## Verification

Backend Vitest suite: 26 test files passed (213 unit/integration tests). Integration tests cover:

- Skill Registry discovery, path containment, traversal/symlink blocking, and deterministic versioning.
- Internal loaders, request-bound snapshots, batching enforcement, and gate bypass prevention.
- MCP Resources read-only adapter and metadata hashes.
- Monotonic budget timer, timeout clamping, and oversized batch execution limits.
- Compacting old loader results in conversation history without mutating stored turns.
- Ask writes, menu lifecycle, and final-round summaries.

## Task deletion

`orbit_delete_task` deletes one explicitly requested, owned task using `taskId` and `idempotencyKey`. Deletion, stats rebuild and receipt persistence share the existing per-user write transaction. A matching deletion retry returns the owned receipt without looking up the deleted resource. Verified results include `deleted: true` and produce `task_deleted` activities without a detail link. Explicit proposal-generation turns continue to forbid direct writes.

## On-demand image analysis (`analyze_image`)

Specification: `docs/superpowers/specs/2026-11-21-agent-vision-tool-design.md`

- **Synchronous Storage on Upload**: Image uploads validate bytes and store original bytes synchronously in MinIO/S3 (`attachmentService.upload`), matching document uploads. No vision model call occurs at upload time.
- **Metadata-Only Turn Context**: `conversationTurnService` attaches lightweight untrusted file metadata (`id`, `name`, `mimeType`, `kind`) to the user message and sets `hasConversationImages` when the current turn or an earlier turn in the same conversation has an attached image.
- **Conditional Internal Tool**: `agentService` exposes `analyze_image({ attachmentId, prompt })` only when `conversationId` and `hasConversationImages` are present, including inside Auto, Ask, and task proposal flows (`PROPOSAL_ALLOWED_TOOLS`). It is not exposed on external MCP HTTP endpoints.
- **Isolated Vision Execution**: `attachmentVisionService.analyzeImage` enforces server-side `userId`, `conversationId`, `state === "attached"`, and `image/*` checks, streams bounded bytes (`MAX_ATTACHMENT_BYTES`), and invokes `visionClient.analyzeImage` with the agent's custom prompt and prompt-injection resistance. Multiple calls with different prompts (including parallel calls and follow-up turns) are supported within the turn budget, 20s per-call timeout ceiling, and streaming abort cancellation. Image bytes and base64 data URLs never enter chat messages, checkpoints, or history.

## Streaming Chat Turns & Real-time Progress (SSE)

- Lượt chat hỗ trợ streaming thời gian thực qua Server-Sent Events (SSE) theo đặc tả `docs/superpowers/specs/2026-11-18-chat-streaming.md`.
- `POST /api/ai/conversations/:id/turns`: Khởi tạo turn mới, trả HTTP 202 kèm initial snapshot và deadline 300s. Kiểm tra quota 3 runs/tài khoản và 1 run/hội thoại bằng transaction trên collection `ChatRunSlot`.
- `GET /api/ai/conversations/:id/turns/:turnId/events?after=:seq`: Đăng ký nhận stream sự kiện có sequence number tăng dần (`turn.started`, `assistant.delta`, `tool.started`, `tool.finished`, `turn.finished`). Hỗ trợ resume stream liền mạch khi mất kết nối hoặc reload.
- `POST /api/ai/conversations/:id/turns/:turnId/cancel`: Hủy turn đang chạy, chuyển trạng thái `stopping` -> `cancelled`, dừng provider call tức thì.
- Phục hồi sự cố: Server restart tự động chuyển các turn dở dang sang `interrupted`, đánh dấu unfinished tools là `unknown` và giải phóng quota slot.
- Nginx reverse proxy được cấu hình `proxy_buffering off`, `proxy_cache off` và `gzip off` cho endpoint events.
- Tài liệu vận hành chi tiết: `docs/ai/chat-streaming-operations.vi.md`.

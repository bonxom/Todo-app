# Thinking Blocks & Localized Agent Process Timeline

Date: 2026-11-21
Status: Approved

## Overview & Goal

1. **Fix hardcoded Vietnamese tool step labels in English UI & eliminate redundant wording:** Previously, `agentService.ts` hardcoded Vietnamese `label` and `summary` strings on `tool.started` / `tool.finished` events, and `AgentProcessPanel.tsx` rendered both side by side (`Đang tìm kiếm công việc · Đã tìm kiếm công việc`) regardless of the user's selected language.
2. **Stream and render live + persisted Thinking blocks:** Previously, `readAiStream` discarded `delta.reasoning_content` / `delta.reasoning` from thinking models. This design streams reasoning tokens live over SSE (`reasoning.delta`), interleaves them chronologically with tool calls in a unified timeline inside `AgentProcessPanel`, persists bounded reasoning blocks on `ChatTurn`, and collapses the completed process into a single localized summary toggle.

## Non-Goals

- Synthesizing fake `<think>` tags for non-reasoning models; thinking blocks appear only when the configured provider/model emits reasoning tokens (`reasoning_content` or `reasoning`).
- Breaking existing persisted turns or tests that only have legacy `toolProgress` items without `toolName` or `order`.
- Changing authentication, turn quotas, or non-streaming HTTP chat endpoints.

## Data Model & SSE Protocol

### Shared Types (`backend/types/IChatStream.ts`, `frontend/src/shared/types/chatStream.ts`, `frontend/src/shared/types/domain.ts`)

- `ToolProgress`:
  ```ts
  export interface ToolProgress {
    toolCallId: string;
    toolName?: string;
    label?: string;
    status: "started" | "succeeded" | "failed" | "unknown";
    summary?: string;
    order?: number;
  }
  ```
- `ReasoningBlock`:
  ```ts
  export interface ReasoningBlock {
    blockId: string;
    text: string;
    order?: number;
  }
  ```
- New SSE event `reasoning.delta`:
  ```ts
  | {
      type: "reasoning.delta";
      payload: { blockId: string; text: string };
    }
  ```
- `tool.started` adds `toolName?: string`; `tool.finished` adds `toolName?: string`.
- `TurnSnapshot` adds `reasoningBlocks?: ReasoningBlock[]`.
- `ChatTurn` (`backend/models/ChatTurn.ts`, `backend/types/IChatTurn.ts`) adds `reasoningBlocks?: ReasoningBlock[]` (persisted in MongoDB on finish, projected in `conversationView.turnMessages` onto bot messages and interaction messages).
- `ConversationMessage` (`frontend/src/shared/types/domain.ts`) adds `reasoningBlocks?: ReasoningBlock[]`.

## Backend Architecture

### 1. Reasoning Stream Extraction (`backend/libs/aiStream.ts`)
- Extend `readAiStream` options with optional `onReasoning?: (text: string) => Promise<void>`.
- Extract reasoning token from `delta.reasoning_content` (falling back to `delta.reasoning` only when `reasoning_content` is absent/empty so providers returning both never double-emit).
- Accumulate `accumulatedReasoning` and include `reasoning_content` on the returned assistant message when non-empty.
- Never emit reasoning tokens through `onText`.

### 2. Batched Reasoning Emission, Cap & `toolName` (`backend/services/agentService.ts`)
- For each provider round `step`, compute `blockId = \`${memory.turnId || context.requestId}:r${step}\``.
- Coalesce rapid reasoning chunks before emitting `reasoning.delta` (flush when buffered length >= 48 chars or >= 50ms since last flush, and always flush before emitting the first `assistant.delta` and at the end of `readAiStream`) to maintain smooth live rendering while avoiding excessive SSE event counts.
- Enforce a per-turn reasoning ceiling of **32,000 characters** (`MAX_REASONING_CHARS`): once reached, truncate the final emitted slice to fit and silently stop emitting additional `reasoning.delta` events so verbose thinking never triggers `CHAT_OUTPUT_LIMIT` or interrupts the assistant's answer.
- Include `toolName: name` on every `tool.started` and `tool.finished` SSE event (retaining `label`/`summary` fallbacks for backward compatibility).

### 3. Live Bus & Persistence (`backend/services/chatStreamBus.ts`, `backend/repositories/chatStreamRepository.ts`, `backend/utils/conversationView.ts`)
- `ChatStreamBus`:
  - Track `reasoningBlocks: ReasoningBlock[]` on `LiveTurnState` and return copies in `getLiveSnapshot`.
  - On `reasoning.delta`: append `payload.text` to the matching `blockId` block, or push `{ blockId, text, order: seq }` if new.
  - On `tool.started` / `tool.finished`: persist `toolName` and set `order: seq` when creating a new `ToolProgress` item.
- `chatStreamRepository`:
  - `toSnapshot` / `getSnapshot`: include `reasoningBlocks`.
  - `append`: handle `reasoning.delta` (bounded to 32,000 chars total across blocks) and preserve `toolName` + `order: nextSeq` on `tool.started` / `tool.finished`.
  - `finishInSession`: persist `finalReasoningBlocks` onto `turn.reasoningBlocks`.
- `conversationView.turnMessages`: include `reasoningBlocks` on bot and interaction messages when non-empty.

## Frontend Architecture

### 1. Stream Reducer (`frontend/src/features/tasks/hooks/chatStreamReducer.ts`)
- Handle `reasoning.delta`: append `payload.text` to the matching `blockId` in `updatedSnapshot.reasoningBlocks` (creating `{ blockId, text, order: event.data.seq }` if new) and re-project messages.
- Handle `tool.started` / `tool.finished`: preserve `toolName` and assign `order: event.data.seq` when creating new entries.
- `projectMessage`: project `reasoningBlocks` onto the streaming `ConversationMessage` when non-empty.
- Keep `useConversationChat.ts` detecting live process activity when either `toolProgress` or `reasoningBlocks` has items.

### 2. Localized Tool Step Labels (`frontend/src/features/tasks/components/chat/toolProcessText.ts`)
- Shared pure helper `formatToolProcessStep(tool, t)` returning `{ primary: string; detail?: string }`:
  - When `tool.toolName` matches a known tool (`orbit_list_tasks`, `orbit_get_task`, `orbit_create_task`, `orbit_update_task`, `orbit_delete_task`, `orbit_list_categories`, `orbit_list_projects`, `orbit_get_me`, `orbit_web_search`, `propose_tasks`, `present_ui`, `analyze_image`, `load_skill`, `read_skill_document`, `list_skills`, `read_skill`, `grill_user`):
    - Status `started`: returns localized running phrase (`toolSteps.<key>.running`), no duplicate detail.
    - Status `succeeded`: returns localized succeeded phrase (`toolSteps.<key>.succeeded`), no duplicate detail.
    - Status `failed`: returns localized failed phrase (`toolSteps.<key>.failed` or generic `toolSteps.default.failed`), no duplicate detail.
    - Status `unknown`: returns localized unknown phrase (`toolSteps.default.unknown`), no duplicate detail.
  - When `tool.toolName` is absent (legacy persisted turns or custom fixtures): preserves legacy rendering (`primary = tool.label || t("processingTask")`, `detail = tool.summary`).
- Used by both `AgentProcessPanel.tsx` and `ChatRunStatus.tsx`.
- Complete English and Vietnamese translations added to `frontend/src/shared/i18n/locales/en/agent.json` and `frontend/src/shared/i18n/locales/vi/agent.json`.

### 3. Unified Thinking + Tool Timeline (`frontend/src/features/tasks/components/chat/AgentProcessPanel.tsx`, `ChatField.jsx`, `frontend/src/styles/index.css`)
- `AgentProcessPanel` accepts `reasoningBlocks?: ReasoningBlock[]` in addition to `toolProgress?: ToolProgress[]`.
- Merges `reasoningBlocks` (filtered to non-empty trimmed text) and `toolProgress` into a single chronological list sorted by `order` (preserving relative order when `order` is absent).
- **Live state (`isLive === true`)**:
  - Renders interleaved thinking prose blocks (`data-testid="reasoning-block-${block.blockId}"`, muted prose, `whitespace-pre-wrap`, scrollable `max-h-40` during live stream) and localized tool steps.
  - Shows generic `"Thinking…"` spinner row (`data-testid="agent-process-thinking-step"`) when no tool is running, no response text has started, and no reasoning block has text yet (or after tools finish while waiting for next reasoning/answer).
- **Completed state (`isLive === false`)**:
  - Visible whenever `toolProgress.length > 0 || nonEmptyReasoningBlocks.length > 0`.
  - Localized summary header:
    - Thinking only (`toolProgress.length === 0`): `"Thought"` / `"Đã suy nghĩ"`
    - Thinking + tools (no errors): `"Thought · Completed {{count}} step(s)"` / `"Đã suy nghĩ · Đã thực hiện {{count}} bước"`
    - Thinking + tools (with errors): `"Thought · {{count}} step(s) (with issues)"` / `"Đã suy nghĩ · {{count}} bước (có lỗi)"`
    - Tools only: existing `processSteps` / `processStepsWithErrors`.
  - Collapsed by default; clicking expands the full chronological timeline of thinking blocks and localized tool steps.
- `ChatField.jsx` passes `reasoningBlocks={message.reasoningBlocks}` to `AgentProcessPanel` and treats messages with `reasoningBlocks` as live-visible.

## Acceptance Criteria

1. Switching UI language to English renders all new tool steps (running and completed) in English without Vietnamese leakage, and switching to Vietnamese renders them in Vietnamese.
2. Completed tool steps with `toolName` display a single concise outcome sentence (e.g., `"Searched tasks"` / `"Đã tìm kiếm công việc"`) instead of duplicating running + completed text.
3. Legacy persisted turns without `toolName` continue displaying their stored `label` / `summary`.
4. When a reasoning model streams `reasoning_content` or `reasoning` chunks, `reasoning.delta` events stream live to the UI without leaking into `assistant.delta` / final answer text, and `reasoning_content` is preserved on the returned assistant message.
5. Reasoning blocks exceeding 32,000 characters are safely truncated without failing the turn.
6. Live and expanded completed views display thinking blocks interleaved chronologically with tool steps, and persisted `reasoningBlocks` survive conversation reload.
7. All backend Vitest, frontend Vitest, ESLint, Prettier, TypeScript/Vite builds, and Playwright E2E checks pass.

# Spec: Collapsible Agent Process Panel & Unified Composer Stop Button

Date: 2026-11-21

## Problem Statement

1. **Missing visibility while the agent is thinking and calling tools:**
   - Immediately after `POST /api/ai/conversations/:id/turns` returns (`status: "processing"`), `chat.sending` resets to `false` and `projectMessage()` projects an empty bot message (`text: ""`). Because `ChatField` gates its `"Processing..."` indicator on `isTyping && !chat?.runStream?.streamingMessage`, no thinking indicator is rendered while the model is reasoning or generating tool arguments.
   - `propose_tasks` and `present_ui` in `backend/services/agentService.ts` return before emitting `tool.started` / `tool.finished` events, even though `getToolLabel()` and `getToolSummary()` already define labels for them.
   - Completed turns persist `turn.toolProgress` in MongoDB (`chatStreamRepository.finish`), yet `backend/utils/conversationView.ts` (`turnMessages()`) omits `toolProgress` from serialized messages, and `ChatField` clears `activeRun` upon completion. As a result, tool progress vanishes immediately after a turn completes or reloads.
2. **Bubble chat composer still does not swap Send for Stop:**
   - `ChatField.jsx` restricts `showStop` to `Boolean(workspaceComposer && activeRun && chat?.stop)`, so compact/docked bubble chats (`V2AgentChatBubble` and `SmallChat`) keep Send disabled instead of switching the composer action button into Stop.

## Goals & Acceptance Criteria

1. **Live Thinking & Process Visibility (Expanded while running):**
   - While a turn is actively running (`activeRun.status` is `"processing"` or `"stopping"`) or submitting (`isTyping` before `activeRun` arrives), the agent response displays a collapsible process panel (`AgentProcessPanel`) expanded by default unless the user explicitly collapses it.
   - Before any tool starts, the panel displays an active thinking header (e.g., `"Thinking…"` / `"Đang suy nghĩ…"`) and a live status row (`"Analyzing your request…"` / `"Đang phân tích yêu cầu…"`).
   - As `tool.started` and `tool.finished` events arrive, each step renders in order with its status icon (spinner, checkmark, error, or unknown), label, and summary (without exposing raw tool arguments or internal keys).
   - When all started tools have finished and no assistant text has started streaming yet, the panel displays a trailing live synthesis row (`"Synthesizing response…"` / `"Đang tổng hợp câu trả lời…"`).
2. **Collapsible Persisted Process History (Collapsed after completion):**
   - Backend `turnMessages()` in `backend/utils/conversationView.ts` includes `toolProgress` on serialized bot messages when `turn.toolProgress` is non-empty.
   - Backend `agentService.ts` emits `tool.started` and `tool.finished` for `propose_tasks` and `present_ui` tool executions.
   - Frontend `chatStreamReducer.ts` projects `toolProgress` onto `botMessage` on `SET_SNAPSHOT`, `tool.started`, `tool.finished`, `assistant.delta`, and `turn.finished`, and `useConversationChat.ts` retains fallback streaming messages that have `toolProgress` until canonical reload finishes.
   - When a message is no longer actively streaming and has `toolProgress.length > 0`, `AgentProcessPanel` defaults to **collapsed** showing a compact summary pill (e.g. `"Completed 2 steps"` / `"Đã thực hiện 2 bước"`) and toggles smoothly on click (`aria-expanded`).
   - User toggle state is preserved for that message if they manually expand/collapse it.
   - `ChatField` hides duplicate tool progress in `ChatRunStatus` while keeping connection banners (offline, reconnecting, error) and terminal status badges intact.
3. **Unified Stop Button in Composer (Workspace + Bubble Chat):**
   - `ChatField` sets `showStop = Boolean(activeRun && chat?.stop)` across all chat surfaces (V2 Agents workspace, V2 Assistant bubble/docked panel, V1 Agent page, and V1 SmallChat).
   - While processing, the composer action button renders a Stop icon (`Square`) and calls `chat.stop()` on click (switching to a spinner while stopping, and showing an inline error if stopping fails).
   - `ChatRunStatus` does not render a duplicate Stop button inside `ChatField` (standalone `<ChatRunStatus onStop={...} />` usage and tests remain supported).
   - `V2AgentChatBubble` shows the active pulse dot on its trigger button while `chat.sending || chat.isStreaming`.
4. **Design & Accessibility:**
   - Styled in Apple Liquid Glass (`--v2-*` tokens inside `.v2-app`, `--color-*` fallback in V1), supporting Light & Dark modes across all 4 V2 palettes, `prefers-reduced-transparency`, and `prefers-reduced-motion`.
   - Full EN and VI i18n translations in `agent.json`.
   - Keyboard-accessible toggle button with `aria-expanded` and `aria-controls`; live process container uses `role="status"` and `aria-live="polite"` while active.

## Non-Goals

- Exposing raw chain-of-thought reasoning tokens or raw JSON tool arguments/outputs to the user.
- Re-introducing the V1 right-hand `AgentActivityList` sidebar in V2 `/v2/agents`.
- Changing SSE wire framing or database schema (`ChatTurn.toolProgress` already exists in MongoDB).

## Affected Contracts & Files

- **Backend:**
  - `backend/utils/conversationView.ts`: include `toolProgress` in `turnMessages()` bot/interaction messages when non-empty.
  - `backend/services/agentService.ts`: emit `tool.started` / `tool.finished` for `present_ui` and `propose_tasks`.
- **Frontend:**
  - `frontend/src/shared/types/domain.ts`: add optional `toolProgress?: ToolProgress[]` to `ConversationMessage`.
  - `frontend/src/features/tasks/hooks/chatStreamReducer.ts`: include `toolProgress` in `projectMessage()` and re-project `messages` on `tool.started` / `tool.finished`.
  - `frontend/src/features/tasks/hooks/useConversationChat.ts`: retain `lastCompletedMessageRef` when `streamingMessage` has `text` or `toolProgress`.
  - `frontend/src/features/tasks/components/chat/AgentProcessPanel.tsx`: new collapsible Apple Liquid Glass process component.
  - `frontend/src/features/tasks/components/chat/ChatRunStatus.tsx`: add optional `hideToolProgress?: boolean` prop (default `false` for backward compatibility).
  - `frontend/src/features/tasks/components/chat/ChatField.jsx`: render `AgentProcessPanel` inside active/completed bot messages, enable unified `showStop` for bubble + workspace composers, pass `hideToolProgress` and `onStop={undefined}` to `ChatRunStatus`.
  - `frontend/src/features/v2/components/V2AgentChatBubble.tsx`: pulse trigger on `chat.sending || chat.isStreaming`.
  - `frontend/src/styles/index.css`: Liquid Glass styling for `.agent-process-panel` and bubble chat Stop button.
  - `frontend/src/shared/i18n/locales/{en,vi}/agent.json`: localized thinking & collapsible process step copy.

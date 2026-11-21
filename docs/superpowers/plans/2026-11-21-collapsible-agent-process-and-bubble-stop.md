# Plan: Collapsible Agent Process Panel & Unified Composer Stop Button

Spec: `docs/superpowers/specs/2026-11-21-collapsible-agent-process-and-bubble-stop.md`

## Ordered Tasks

1. **Write failing unit tests (TDD):**
   - Backend: extend `backend/utils/test/conversationView.test.ts` (or create if absent) to assert `turnMessages()` returns `toolProgress` when present on a turn and omits it when empty.
   - Frontend:
     - Extend `frontend/src/features/tasks/hooks/test/chatStreamReducer.test.ts` to assert `projectMessage()` and `tool.started` / `tool.finished` propagate `toolProgress` onto `state.messages[0]`.
     - Extend `frontend/src/features/tasks/components/test/ChatField.test.jsx` to assert:
       1. Live thinking state renders expanded process panel when `activeRun.status === "processing"` with `toolProgress: []` and empty `partialResponse`.
       2. Completed message with `toolProgress` renders collapsed by default and expands on click to show step labels & summaries.
       3. Bubble chat (`workspaceComposer={false}`) replaces Send with Stop button when `activeRun` is active and invokes `chat.stop()` without rendering a duplicate Stop button.
   - Run targeted Vitest suites to confirm the new tests fail before implementation.

2. **Backend updates:**
   - Update `backend/utils/conversationView.ts` to expose `toolProgress` on bot messages (and interaction messages) when `turn.toolProgress?.length` is non-empty.
   - Update `backend/services/agentService.ts` to emit `tool.started` and `tool.finished` around `present_ui` and `propose_tasks` execution (including validation errors).

3. **Frontend state & reducer updates:**
   - Add `toolProgress?: ToolProgress[]` to `ConversationMessage` in `frontend/src/shared/types/domain.ts`.
   - Update `frontend/src/features/tasks/hooks/chatStreamReducer.ts` so `projectMessage()` attaches `toolProgress` and `tool.started` / `tool.finished` update `messages`.
   - Update `frontend/src/features/tasks/hooks/useConversationChat.ts` so `lastCompletedMessageRef` preserves messages with `text` or `toolProgress`.

4. **Frontend UI & styling:**
   - Add i18n strings to `frontend/src/shared/i18n/locales/en/agent.json` and `frontend/src/shared/i18n/locales/vi/agent.json`.
   - Create `frontend/src/features/tasks/components/chat/AgentProcessPanel.tsx` with Apple Liquid Glass collapsible UX (auto-expanded while running, auto-collapsed once finished, respects user manual toggle).
   - Update `frontend/src/features/tasks/components/chat/ChatRunStatus.tsx` with `hideToolProgress?: boolean`.
   - Update `frontend/src/features/tasks/components/chat/ChatField.jsx`:
     - Show `AgentProcessPanel` on streaming & completed bot messages (and during initial `isTyping` before `activeRun` arrives).
     - Enable `showStop = Boolean(activeRun && chat?.stop)` for both workspace and bubble composers, and pass `hideToolProgress` + `onStop={undefined}` to `ChatRunStatus`.
   - Update `frontend/src/features/v2/components/V2AgentChatBubble.tsx` to pulse indicator during `chat.sending || chat.isStreaming`.
   - Add Apple Liquid Glass styling for `.agent-process-panel` in `frontend/src/styles/index.css`.

5. **Playwright E2E browser verification:**
   - Add E2E spec `frontend/e2e/agent-process-and-bubble-stop.spec.ts` covering:
     1. `/v2/agents`: live thinking panel expanded -> `tool.started` -> `tool.finished` -> `assistant.delta` -> `turn.finished` auto-collapses into summary pill -> clicking expands/collapses cleanly.
     2. V2 Assistant Bubble Chat (on `/v2/dashboard`): sending a message switches the bubble composer Send button into Stop, displays live collapsible process steps, and clicking Stop cancels the active turn.
     3. Reloading a conversation with persisted `toolProgress` renders the collapsed process pill and expands on click.
   - Capture screenshots in Light & Dark modes and inspect them visually.

6. **Verification commands:**
   - Backend: `cd backend && pnpm exec vitest run utils/test/ services/test/chatRunService.test.ts && pnpm run lint && pnpm run format:check && pnpm run build`
   - Frontend: `cd frontend && pnpm exec vitest run src/features/tasks/hooks/test/chatStreamReducer.test.ts src/features/tasks/components/test/ChatField.test.jsx src/features/tasks/components/test/ChatStreaming.test.tsx src/features/agent/test/AgentPage.test.tsx && pnpm playwright test e2e/agent-process-and-bubble-stop.spec.ts e2e/apple-liquid-glass-audit.spec.ts e2e/v2-workspace-layout.spec.ts && pnpm run lint && pnpm run format:check && pnpm run build`

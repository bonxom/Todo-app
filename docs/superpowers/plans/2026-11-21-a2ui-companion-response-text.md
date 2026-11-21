# Plan: Preserve Agent Companion Text Alongside A2UI Surfaces & Proposals

Spec: `docs/superpowers/specs/2026-11-21-a2ui-companion-response-text.md`

## Ordered Tasks

1. **Write failing unit tests (TDD):**
   - Backend:
     - Extend `backend/services/test/agentUiRuntime.test.ts` to assert `chatWithMcp` returns `companionText` when the model emits text before/alongside `present_ui` or `propose_tasks`.
     - Extend `backend/utils/test/conversationView.test.ts` to assert `turnMessages()` includes `companionText` when provided on the presentation envelope and omits it otherwise.
   - Frontend:
     - Extend `frontend/src/features/tasks/hooks/test/chatStreamReducer.test.ts` to assert `turn.finished` with `surface` preserves `companionText` from `result.companionText` or `partialResponse`.
     - Extend `frontend/src/features/tasks/components/test/ChatField.test.jsx` to assert `ChatField` renders both `companionText` markdown and `<UiSurfaceMessage />` when present, and does not duplicate fallback text when `companionText` is absent.
   - Run targeted Vitest tests to verify they fail before implementation.

2. **Backend implementation:**
   - Update `backend/types/IChatStream.ts` (`PublicChatResult.companionText`).
   - Update `backend/services/agentService.ts` (`extractCompanionText` helper + return on `present_ui` and `propose_tasks`).
   - Update `backend/services/A2UI/uiPresentationService.ts` (`TurnPresentation.companionText`).
   - Update `backend/services/conversationTurnService.ts`, `backend/services/conversationService.ts`, and `backend/utils/conversationView.ts`.

3. **Frontend implementation:**
   - Update `frontend/src/shared/types/domain.ts` (`ChatResponse.companionText`, `ConversationMessage.companionText`).
   - Update `frontend/src/features/tasks/hooks/chatStreamReducer.ts` (`ResultEnvelope.companionText` + `projectMessage()`).
   - Update `frontend/src/features/tasks/hooks/useConversationSession.ts` (`receive()`).
   - Update `frontend/src/features/tasks/components/chat/ChatField.jsx` (render `<MarkdownText text={companionText} />` above A2UI surface/proposal).

4. **Browser verification & full checks:**
   - Add Playwright test in `frontend/e2e/agent-process-and-bubble-stop.spec.ts` verifying streamed assistant text + A2UI surface both remain visible after `turn.finished` and after conversation reload, and visually inspect the screenshot.
   - Run backend & frontend Vitest, ESLint, Prettier checks, and TypeScript/Vite builds.

# Agent Auto/Ask Implementation Plan

> **For agentic workers:** Use executing-plans to implement task-by-task; review changes and tests before completion.

**Goal:** Add Auto/Ask chat modes and durable human input through grill_user.

**Architecture:** Retain MCP business tools and the existing conversation database. Add an internal grill_user handler, backend write approvals, and durable resume. UI consumes interaction DTOs without sending write arguments.

**Tech Stack:** TypeScript, Express, Zod, Mongoose, React, Vitest, pnpm.

**Spec:** docs/superpowers/specs/2026-10-19-agent-auto-ask-design.md

## Global Constraints

- Auto is the default; preserve current chat behavior and existing uncommitted edits.
- Ask can read automatically; every business write requires exact approval.
- No new runtime dependencies. Keep auth and idempotency checks.
- One question at a time; 2–4 options; custom text only for clarification.
- Persist pending interactions; never expire them using the processing lease.

## Task 1: Interaction contract and runner

Files: backend/services/agentInteraction.ts (new), backend/services/aiService.ts, backend/services/test/aiService.test.ts.

Interfaces: AgentMode = auto | ask; AgentInteraction contains id, kind, question, options, allowCustomAnswer, status, toolCallId, optional approved write payload and answer. chatWithMcp accepts mode, resumeMessages, interactions, approvedInteraction, checkpoint and returns string | { interaction }.

- [x] Write tests showing an Ask write cannot call the MCP write before approval, while Auto and reads still run; grill_user returns a pause.
- [x] Run `pnpm exec vitest run services/test/aiService.test.ts` in backend.
- [x] Validate and normalize write arguments, resolve display names, persist task/reference preconditions, and provide deterministic confirmation details. Register grill_user only for Ask.
- [x] Resume unresolved calls in order; use only stored approved arguments; add clarification results with matching tool_call_id. Bound calls and interaction count. Preserve existing system prompt/profile functionality.
- [x] Run tests and backend typecheck.

## Task 2: Durable conversation transitions and API

Files: backend/models/ChatTurn.ts, backend/models/Conversation.ts, backend/repositories/conversationRepository.ts, backend/services/conversationService.ts, backend/validations/aiValidation.ts, backend/controllers/aiController.ts, backend/routes/aiRoutes.ts, backend/services/test/conversationService.integration.test.ts.

Interfaces: claim(..., mode = auto); checkpoint(id, messages, executionToken); pause(id, interaction, executionToken); answer(userId, conversationId, interactionId, input, cancel); finish guarded by executionToken. POST answer receives { requestId, optionId? , customAnswer? }; cancel receives { requestId }. Snapshot includes mode and active interaction separately from paged messages.

- [x] Add MongoDB integration scenarios: no write before approval, reload pending state, cross-user access denied, double/concurrent answers execute once, new turns blocked while awaiting, cancel closes calls.
- [x] Add awaiting_user/cancelled states, interactions and executionToken. Use transactions for answer claiming and conversation lock changes; await state has null busyUntil and cannot be reclaimed by timed-out processing claim.
- [x] Validate answer against stored options; bind retries to same answer payload. Reject conflicting answers; repeat accepted request returns current turn state without re-execution.
- [x] Wire services/controllers/routes, preserve expired-turn behavior, filter awaiting turns from history repair, include visible resolved choices.
- [x] Run backend tests/build, with disposable replica-set MongoDB if available.

## Task 3: Chat interaction UI and recovery

Files: frontend/src/shared/types/domain.ts, frontend/src/shared/services/aiService.ts, frontend/src/features/tasks/api/aiMutations.ts, frontend/src/features/tasks/hooks/useConversationChat.ts, frontend/src/features/tasks/components/chat/SmallChat.jsx, ChatField.jsx, InteractionCard.jsx (new), associated tests.

Interfaces: snapshot { mode, interaction, pending, messages }; response { status, data, interaction? }; answerInteraction(conversationId, interactionId, payload), cancelInteraction(...). Hook returns mode/setMode, interaction, answer/cancel and retry state.

- [x] Test radio option selection, custom answer, exact confirmation display, disabled submitting state, answered history, cancellation, restore, and retry identity.
- [x] Add Auto/Ask select in Chat composer only. Disable changes while active, lock composer during awaiting_user, replace typing indicator with waiting status.
- [x] Persist/load latest conversation on reopen; guard async results against unmount/session changes. Keep answer request ID across network retries and offer reload/retry controls.
- [x] Invalidate workspace queries after every resume attempt, including failure after a write.
- [x] Run frontend tests/lint/build.

## Task 4: Review and validation

- [x] Review all paths for authorization, stale approval, valid tool history, multiple calls, duplicate answers, worker lease expiry and cancellation.
- [x] Run backend `pnpm run build` and `pnpm test`; frontend `pnpm test`, `pnpm run lint`, `pnpm run build`.
- [x] Record tested behavior and any environmental limitation; do not include unrelated user changes in commits.

## Verification completed

- Backend: `pnpm run build` passed; `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm test` passed, 183 tests across 22 files. Used a disposable localhost MongoDB 7 replica set.
- Frontend: `pnpm run lint` and `pnpm run build` passed. Vite reports the existing ErrorPage mixed static/dynamic import warning.
- Frontend: `pnpm test` ran 129 tests: 128 passed, one existing CalendarTaskDetailCard layout-order assertion failed. The same failure was reproduced from clean HEAD in a temporary baseline copy. All 12 ChatBubble tests pass.
- Read-only review identified a lease gap between checkpoint and business write. Fixed by validating the execution token and lease inside the business transaction and incrementing Conversation.executionRevision to fence competing claims. Regression test expires the old lease and claims a new turn before mutation; the old write is blocked and the new turn stays active.
- Tests use a mocked AI provider with real MCP and MongoDB integration. No live-provider or browser end-to-end run was performed.
- Existing unrelated worktree changes were preserved; implementation files have not been committed.

# Chat Conversation List Lazy Loading Implementation Plan

[Design spec](../specs/2026-11-25-conversation-list-lazy-loading-design.md)

## Task 1 — Backend cursor pagination for `GET /api/ai/conversations`

**Files:**
- Update `backend/validations/aiValidation.ts`
- Update `backend/routes/aiRoutes.ts`
- Update `backend/repositories/conversationRepository.ts`
- Update `backend/services/conversationService.ts`
- Update `backend/controllers/aiController.ts`
- Add `backend/services/test/conversationListPagination.test.ts`

**Steps:**
- [ ] Write failing unit tests in `backend/services/test/conversationListPagination.test.ts` covering validation of `limit`/`cursor`/`search`, cursor encoding/decoding, `limit + 1` slicing (`hasMore`, `nextCursor`), tie-breaking on equal `updatedAt`, invalid cursor rejection, and user scoping.
- [ ] Run `pnpm exec vitest run services/test/conversationListPagination.test.ts` in `backend/` to confirm failure.
- [ ] Implement Zod `listConversationsQuerySchema`, wire into `aiRoutes.ts`, implement cursor + search pagination in `conversationRepository.ts`, `conversationService.ts`, and `aiController.ts`.
- [ ] Rerun tests and `pnpm run build` in `backend/`.

## Task 2 — Frontend shared infinite conversation hook & UI consumers

**Files:**
- Update `frontend/src/shared/services/aiService.ts`
- Add `frontend/src/features/agent/useInfiniteConversations.ts`
- Update `frontend/src/features/v2/pages/AgentsPage.tsx` & `frontend/src/features/v2/components/AgentProjectSidebar.tsx`
- Update `frontend/src/features/agent/AgentHistoryList.tsx`
- Update `frontend/src/features/tasks/components/chat/RecentConversations.jsx`
- Update `frontend/src/shared/i18n/locales/en/agent.json` & `vi/agent.json`
- Add `frontend/src/features/agent/test/useInfiniteConversations.test.tsx` & extend `frontend/src/features/v2/test/AgentsPage.test.tsx` & `frontend/src/features/tasks/components/test/RecentConversations.test.jsx`
- Add Playwright E2E coverage in `frontend/e2e/v2-agents-review.spec.ts` (or a new `frontend/e2e/v2-conversation-lazy-load.spec.ts`)

**Steps:**
- [ ] Write failing tests for `useInfiniteConversations`, `AgentProjectSidebar` scroll-triggered loading + continuation error retry, `AgentHistoryList` lazy loading, and `RecentConversations` scroll lazy loading.
- [ ] Run focused Vitest tests to confirm failure.
- [ ] Implement `aiService.listConversationsPage`, `useInfiniteConversations`, and integrate into `AgentsPage`/`AgentProjectSidebar`, `AgentHistoryList`, and `RecentConversations`.
- [ ] Run full frontend Vitest, lint, format:check, build, and Playwright E2E (including visual inspection of `/v2/agents` and chat bubble history screenshots).

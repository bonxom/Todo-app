# Thinking Blocks & Localized Agent Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize all agent tool progress steps cleanly in English and Vietnamese (eliminating duplicate running+completed wording) and stream, persist, and render chronological model thinking blocks inside `AgentProcessPanel`.

**Architecture:** Extend `ToolProgress` with `toolName` and `order`, add `ReasoningBlock` + SSE event `reasoning.delta`, extract `reasoning_content`/`reasoning` in `readAiStream` with batched emission and a 32,000-character per-turn cap in `agentService`, persist `reasoningBlocks` in `ChatTurn` and `conversationView`, and merge thinking blocks with localized tool steps chronologically in `AgentProcessPanel`.

**Tech Stack:** TypeScript, Express, Mongoose, OpenAI SDK, React 19, i18next, Tailwind CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-thinking-blocks-and-localized-process-design.md`

## Global Constraints

- Never emit reasoning tokens via `assistant.delta` / `onText`.
- Cap emitted/stored reasoning text per turn at 32,000 characters; exceeding the cap must silently stop emitting further reasoning without failing the turn.
- Preserve backwards compatibility for legacy `ToolProgress` records lacking `toolName` or `order`.
- Follow TDD: failing tests first -> verify red -> minimal implementation -> verify green -> commit.

---

### Task 1: Backend Reasoning Stream, Bus, Repository & Turn Projection

**Files:**
- Modify: `backend/types/IChatStream.ts`
- Modify: `backend/types/IChatTurn.ts`
- Modify: `backend/models/ChatTurn.ts`
- Modify: `backend/libs/aiStream.ts`
- Modify: `backend/services/chatStreamBus.ts`
- Modify: `backend/repositories/chatStreamRepository.ts`
- Modify: `backend/utils/conversationView.ts`
- Modify: `backend/services/agentService.ts`
- Tests: `backend/libs/test/aiStream.test.ts`, `backend/services/test/chatStreamBus.test.ts`, `backend/services/test/agentStreaming.test.ts`, `backend/utils/test/conversationView.test.ts`

- [ ] **Step 1: Add failing tests** in `aiStream.test.ts` (`onReasoning` for `reasoning_content` and `reasoning` fallback without double emission, preserving `reasoning_content` on returned message, never passing reasoning to `onText`), `chatStreamBus.test.ts` (`reasoning.delta` aggregation + `toolName` + `order`), `agentStreaming.test.ts` (emits `reasoning.delta` with `blockId`, enforces 32,000-char cap without throwing, emits `toolName` on `tool.started`/`tool.finished`), and `conversationView.test.ts` (projects `reasoningBlocks` on bot messages when non-empty).
- [ ] **Step 2: Run backend tests to verify RED**:
  `(cd backend && pnpm exec vitest run libs/test/aiStream.test.ts services/test/chatStreamBus.test.ts services/test/agentStreaming.test.ts utils/test/conversationView.test.ts)`
- [ ] **Step 3: Implement backend changes** across `IChatStream.ts`, `IChatTurn.ts`, `ChatTurn.ts`, `aiStream.ts`, `chatStreamBus.ts`, `chatStreamRepository.ts`, `conversationView.ts`, and `agentService.ts`.
- [ ] **Step 4: Run backend tests, lint, format:check, build**:
  `(cd backend && pnpm test && pnpm run build)`
- [ ] **Step 5: Commit backend changes**.

---

### Task 2: Frontend Stream Reducer, Localized Tool Process Helper & Unified Thinking Timeline UI

**Files:**
- Modify: `frontend/src/shared/types/chatStream.ts`
- Modify: `frontend/src/shared/types/domain.ts`
- Modify: `frontend/src/features/tasks/hooks/chatStreamReducer.ts`
- Modify: `frontend/src/features/tasks/hooks/useConversationChat.ts`
- Create: `frontend/src/features/tasks/components/chat/toolProcessText.ts`
- Modify: `frontend/src/features/tasks/components/chat/AgentProcessPanel.tsx`
- Modify: `frontend/src/features/tasks/components/chat/ChatRunStatus.tsx`
- Modify: `frontend/src/features/tasks/components/chat/ChatField.jsx`
- Modify: `frontend/src/shared/i18n/locales/en/agent.json`
- Modify: `frontend/src/shared/i18n/locales/vi/agent.json`
- Modify: `frontend/src/styles/index.css`
- Tests: `frontend/src/features/tasks/hooks/test/chatStreamReducer.test.ts`, `frontend/src/features/tasks/components/test/AgentProcessPanel.test.tsx` (new)

- [ ] **Step 1: Write failing frontend tests** in `chatStreamReducer.test.ts` (`reasoning.delta` creates/appends `reasoningBlocks` with `order`, `tool.started`/`tool.finished` preserve `toolName` and `order`, `projectMessage` projects `reasoningBlocks`) and `AgentProcessPanel.test.tsx` (English and Vietnamese localized tool step rendering with single completed phrase, no duplicate wording, legacy fallback without `toolName`, live & collapsed chronological thinking+tool timeline, thinking-only summary header).
- [ ] **Step 2: Run frontend tests to verify RED**:
  `(cd frontend && pnpm exec vitest run src/features/tasks/hooks/test/chatStreamReducer.test.ts src/features/tasks/components/test/AgentProcessPanel.test.tsx)`
- [ ] **Step 3: Implement frontend changes** across types, reducer, `useConversationChat.ts`, `toolProcessText.ts`, `AgentProcessPanel.tsx`, `ChatRunStatus.tsx`, `ChatField.jsx`, `en/agent.json`, `vi/agent.json`, and `index.css`.
- [ ] **Step 4: Run frontend unit tests, lint, format:check, build**:
  `(cd frontend && pnpm test && pnpm run lint && pnpm run build)`
- [ ] **Step 5: Commit frontend changes**.

---

### Task 3: Playwright E2E Verification & Final Checks

**Files:**
- Modify: `frontend/e2e/agent-process-and-bubble-stop.spec.ts`

- [ ] **Step 1: Extend `frontend/e2e/agent-process-and-bubble-stop.spec.ts`** to stream `reasoning.delta` interleaved with `toolName`-tagged `tool.started`/`tool.finished` events, asserting:
  - Live thinking prose renders in `agent-process-live`.
  - Tool steps display localized English text (`Searching tasks` -> `Searched tasks`, `Analyzing image` -> `Analyzed image`) with zero Vietnamese strings when English is active and no duplicate running+completed wording.
  - After completion, header collapses to `"Thought · Completed N steps"` and expands on click to show chronological thinking blocks and localized tool steps.
- [ ] **Step 2: Run Playwright E2E**:
  `(cd frontend && pnpm exec playwright test e2e/agent-process-and-bubble-stop.spec.ts)`
- [ ] **Step 3: Run full verification** (`backend`: vitest + eslint on touched + prettier + build; `frontend`: vitest + eslint + prettier + build + playwright) and commit.

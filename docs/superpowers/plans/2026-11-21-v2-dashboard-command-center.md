# V2 Dashboard Command Center & Smooth Agent Chat Handoff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `/v2/dashboard` to the Option 1 Daily Command Center with an inline "Chat Now" agent launchpad (between Today's Focus and Projects + Tasks) and make both the Dashboard-to-Agents handoff and `/v2/agents` first-message transition smoothly zoom out without stutter.

**Architecture:** Extend `useDashboardModel` with project filtering (`projectId`, `useProjectsQuery`) and focus tasks computation; add `DashboardFocusStrip`, `DashboardChatNow`, and `DashboardProjectsRail` components; update `useConversationChat` and `useAgentNavigation` for instant optimistic message rendering and zero-flicker handoff; add zoom-out CSS transitions in `index.css`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, TanStack Query, React Router v7, i18next, Vitest, Playwright.

---

### Task 1: Failing Unit Tests for Dashboard Command Center, Chat Now Handoff, and Agents Smooth First-Turn

**Files:**

- Modify: `frontend/src/features/v2/test/DashboardPage.test.tsx`
- Modify: `frontend/src/features/v2/test/AgentsPage.test.tsx`

- [ ] **Step 1: Add unit tests in `DashboardPage.test.tsx`** covering:
  - Rendering Today's Focus section with urgent/due tasks and opening task details from it.
  - Rendering the inline "Chat Now" section between Today's Focus and Projects/Tasks, typing a message, submitting it, calling `chat.send`, and navigating to `/v2/agents` with `{ state: { assistantHandoff: true, entryTransition: "zoom-out" } }`.
  - Rendering the Projects Rail from `useProjectsQuery` and filtering `taskService.getAllTasks` by `projectId` when a project is clicked.
- [ ] **Step 2: Add unit tests in `AgentsPage.test.tsx`** covering:
  - Transitioning from `newChat` to active conversation view immediately when `chat.sending` starts or a message is sent (`data-chat-stage="active"`).
- [ ] **Step 3: Run Vitest on those test files and confirm they fail before implementation.**

---

### Task 2: Smooth Optimistic Send & Handoff Navigation (`useConversationChat.ts`, `useAgentNavigation.ts`, `AgentsPage.tsx`)

**Files:**

- Modify: `frontend/src/features/tasks/hooks/useConversationChat.ts`
- Modify: `frontend/src/features/agent/useAgentNavigation.ts`
- Modify: `frontend/src/features/v2/pages/AgentsPage.tsx`
- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1: Optimistic message insertion in `useConversationChat.ts`**
  - When `!payload && files.length === 0`, generate `optimisticRequestId = generateUUID()` and append the user message to `messages` immediately before `await aiService.createConversation(...)`.
  - Reuse `optimisticRequestId` when building `payload` after `id` resolves, and clean up the optimistic message if `createConversation` throws.
- [ ] **Step 2: Prevent `resolving` flash on `assistantHandoff` in `useAgentNavigation.ts`**
  - When `assistantHandoff` is true and `!activeConversationId`, mark `resolvedKey` as resolved without resetting the conversation, and exclude `assistantHandoff` from `resolving`.
- [ ] **Step 3: Smooth Zoom-Out Transition on `AgentsPage.tsx` and `index.css`**
  - Compute `newChat = !activeConversationId && !chat.messages.length && !chat.sending && !chat.interaction`.
  - Track transition from `newChat` -> `!newChat` (or `location.state?.entryTransition === "zoom-out"`) and apply `data-chat-stage={newChat ? "starter" : "active"}` and `data-zoom-transition="true"` on `.v2-agent-center`.
  - Add smooth zoom-out keyframes (`v2-agent-zoom-out` and composer morphing) in `frontend/src/styles/index.css` with `@media (prefers-reduced-motion: reduce)` support.

---

### Task 3: V2 Dashboard Command Center Components & Translations

**Files:**

- Modify: `frontend/src/shared/i18n/locales/en/v2.json`
- Modify: `frontend/src/shared/i18n/locales/vi/v2.json`
- Modify: `frontend/src/features/v2/hooks/useDashboardModel.ts`
- Modify: `frontend/src/features/v2/components/DashboardSummary.tsx`
- Create: `frontend/src/features/v2/components/DashboardFocusStrip.tsx`
- Create: `frontend/src/features/v2/components/DashboardChatNow.tsx`
- Create: `frontend/src/features/v2/components/DashboardProjectsRail.tsx`
- Modify: `frontend/src/features/v2/pages/DashboardPage.tsx`
- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1: Add English and Vietnamese i18n keys in `v2.json`.**
- [ ] **Step 2: Enhance `useDashboardModel.ts`** with `projectId`, `setProjectId`, `projectsQuery` (`useProjectsQuery`), and derived `focusTasks`.
- [ ] **Step 3: Upgrade `DashboardSummary.tsx`** to 4 KPI cards with progress track, completion rate badge, and attention counter.
- [ ] **Step 4: Build `DashboardFocusStrip.tsx`**, `DashboardChatNow.tsx`, and `DashboardProjectsRail.tsx`.
- [ ] **Step 5: Assemble the 4-row Command Center layout in `DashboardPage.tsx`** with Today's Focus -> Chat Now -> (Projects Rail + Task Panel).

---

### Task 4: Verification (Vitest, Playwright E2E & Visual Review, Lint, Format, Build)

**Files:**

- Modify: `frontend/e2e/frontend-v2.spec.ts`

- [ ] **Step 1: Run Vitest unit tests** (`DashboardPage.test.tsx`, `AgentsPage.test.tsx`, `useAgentNavigation.test.tsx`, `AgentSessionProvider.test.tsx`).
- [ ] **Step 2: Add/run Playwright E2E test** verifying Dashboard Command Center + "Chat Now" message send -> smooth navigation to `/v2/agents`, plus existing V2 layout & glass consistency specs, and inspect screenshots across Light/Dark & palettes.
- [ ] **Step 3: Run `pnpm run lint`, `pnpm run format:check`, and `pnpm run build` in `frontend/`.**

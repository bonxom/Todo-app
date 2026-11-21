# V2 Dashboard Command Center & Smooth Agent Chat Handoff — Design Spec

## 1. Goal & Scope

Upgrade `/v2/dashboard` from a basic 3-counter + flat task table view into a cohesive **Daily Command Center** (Option 1) while adding an inline **Chat Now** launchpad between **Today's Focus** and the **Projects + Tasks** workspace, and smoothing out the zoom-out transition into `/v2/agents` (both from Dashboard and when starting a new conversation directly on `/v2/agents`).

### In Scope

1. **Row 1 — Upgraded 4-Card KPI Summary (`DashboardSummary.tsx`)**:
   - **Total (`total`)**: Total task count (`stats.totalTasks`), completion percentage badge, progress bar, and completed/pending breakdown.
   - **In Progress (`inProgress`)**: Active in-progress task count (`stats.inProgressTasks`) with quick filter toggle.
   - **Completed (`completed`)**: Completed task count (`stats.completedTasks`) with 7-day completion momentum subtitle and quick filter toggle.
   - **Due Today & Overdue (`attention`)**: Count of urgent, overdue, or due-today active tasks with status badge.
   - Preserves exact numeric values for `totalTasks`, `inProgressTasks`, and `completedTasks` so existing tests and screen-reader expectations remain intact.
2. **Row 2 — Today's Focus Strip (`DashboardFocusStrip.tsx`)**:
   - Highlights up to 3 high-attention active tasks (overdue, due today, or high priority).
   - Provides quick inspection (opens `TaskDetailsDialog`) and a one-click **"Ask AI to plan today"** action that sends a scheduling prompt and transitions to `/v2/agents`.
3. **Row 3 — "Chat Now" Inline Agent Launchpad (`DashboardChatNow.tsx`)**:
   - Positioned between **Today's Focus** and the **Projects + Tasks** section.
   - Features Orbit Agent branding (`DEFAULT_CHAT_AVATAR`), starter prompt pills, and an inline message composer.
   - Submitting a message (or clicking a quick-send starter) triggers a smooth zoom-out transition, starts the conversation turn in `useAgentSession()`, and navigates immediately to `/v2/agents` with `{ state: { assistantHandoff: true, entryTransition: "zoom-out" } }`.
4. **Row 4 — 2-Column Projects Progress Rail & Task List (`DashboardProjectsRail.tsx` + `.v2-workspace-panel`)**:
   - Left rail displays **All Projects** and per-project progress bars (`summary.completionRate`, `${completedTasks}/${totalTasks}`) from `useProjectsQuery()`, plus a `+` button to create a project in `V2Dialog`.
   - Clicking a project filters the task query by `projectId` and resets pagination to page 1.
   - Right panel preserves `.v2-workspace-panel`, `TaskToolbar`, `TaskCollection`, and `TaskPagination`.
5. **Smooth Zoom-Out UX on `/v2/agents` (`AgentsPage.tsx`, `useConversationChat.ts`, `useAgentNavigation.ts`)**:
   - Optimistically appends the user's message immediately in `useConversationChat.send()` (when no file upload is pending) before awaiting `aiService.createConversation()`, eliminating the 300-600ms freeze on the empty starter state.
   - Updates `useAgentNavigation.ts` so `assistantHandoff` does not get stuck in `resolving: true` while `chat.sending` is active.
   - Adds a smooth CSS zoom-out entrance animation (`v2-agent-zoom-out`) when transitioning from the centered `newChat` composer (or Dashboard handoff) into the full active conversation layout, respecting `prefers-reduced-motion`.

## 2. Architecture & Data Flow

```
DashboardPage
 ├── DashboardSummary (statsQuery, focusCount, status, onSelectStatus)
 ├── DashboardFocusStrip (focusTasks, onOpenTask, onQuickChatSend)
 ├── DashboardChatNow (onSendPrompt -> zoom-out -> chat.send + navigate('/v2/agents'))
 └── .v2-dashboard-main-grid (2 columns on wide workspace container, 1 column on narrow/docked)
      ├── DashboardProjectsRail (projectsQuery, projectId, onSelectProject, onCreateProject)
      └── section.v2-workspace-panel
           ├── TaskToolbar
           ├── TaskCollection
           └── TaskPagination
```

### Handoff Sequence (`DashboardChatNow` -> `AgentsPage`)

1. User enters text or clicks a starter chip in `DashboardChatNow` and submits.
2. `DashboardChatNow` sets `isTransitioning = true` (applies `.v2-chat-now--zooming` scale/opacity transition for ~160ms; instant in tests or reduced-motion).
3. Calls `chat.resetConversation(projectId || undefined)`, fires `void chat.send(prompt)`, and calls `navigate("/v2/agents", { state: { assistantHandoff: true, entryTransition: "zoom-out" } })`.
4. `useConversationChat.send()` immediately appends the optimistic user message to `session.messages` before `await aiService.createConversation()`.
5. `AgentsPage` mounts with `newChat === false` and `resolving === false`, rendering the active transcript and streaming indicator immediately with a smooth zoom-out settle animation (`.v2-agent-center[data-transition="zoom-out"]`).

## 3. Accessibility, Responsiveness & Compatibility

- **Container Queries**: `.v2-dashboard-main-grid` uses `grid-cols-[256px_minmax(0,1fr)]` on wide workspace containers and collapses to `grid-cols-1` at `@container workspace (max-width: 940px)` so that opening the side chat dock at 1440px or viewing on tablet/mobile never squeezes `.v2-task-row`.
- **Selector Safety**:
  - `DashboardSummary` remains the sole place rendering bare numeric totals (`42`, `15`, etc.); project counts format as `${completed}/${total}` or `${total} tasks`.
  - `DashboardFocusStrip` uses `<article>` cards and dedicated action labels so `getByRole("listitem")` and exact task-title buttons in `TaskCollection` remain unambiguous.
- **Reduced Motion**: All zoom-out animations are disabled when `@media (prefers-reduced-motion: reduce)` is active.

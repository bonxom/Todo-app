# Specification: Todo Page Redesign (2-Column Layout, Decoupled Project Metrics & Calendar Status Model)

- **Date:** 2026-08-16
- **Status:** Approved / Final Spec
- **Author:** Claude & bonxom (via collaborative brainstorming)
- **Target Area:** `frontend/src/features/tasks/` & related shared styles

---

## 1. Executive Summary & Goals

This specification addresses the key findings from [ui-ux-review-todo-app(1).md](../../../docs/ui-ux-review-todo-app(1).md) and user feedback across 3 phases of improvements:

1. **Information Hierarchy & Proportional 2-Column Layout:**
   - Desktop layout split: Main Task Workspace (~65–70%) and Project Focus Rail (~30–35%, min-width: ~320px).
   - Sticky project rail with internal scrolling and safe bottom spacing to prevent overlapping the floating assistant.
   - On mobile/tablet, single-column stack with Task List placed first so users immediately see their daily work.
2. **Decoupled Data Scope & Accurate Metrics:**
   - Project cards, overall progress, and project completion counters must always calculate from the full raw dataset (`allTasks`).
   - Task list filters (Search, Status multi-select, Sort) must strictly filter the task list view only.
   - Separate empty states: distinguish between a project having *no tasks at all* versus *no tasks matching current filters*.
3. **Calendar-Aligned Task Status Model & Action Semantics:**
   - Adopt the 4-status visual language from `CalendarTaskDetailCard.jsx` (Pending, In Progress, Completed, Given Up).
   - Dedicated contextual actions per status:
     - **Pending:** `Accept` (moves to `in-progress`) & `Deny` (deletes task).
     - **In Progress:** `Complete` (moves to `completed`) & `Give Up` (moves to `given-up`).
     - **Completed / Given Up:** `Restore` (restores to `in-progress`).
   - Secondary actions (Edit, Delete for active tasks) placed in clean action buttons / menu with tooltips.
4. **Comprehensive Component States (Loading, Error, Mutation):**
   - Skeleton loading for both task rows and project rail.
   - Inline query error states with retry triggers.
   - Per-action pending states (spinners, disabled buttons) and optimistic update / rollback handling.

---

## 2. Information Architecture & Layout

### 2.1 Desktop Layout (`lg` and above)

- **Main Task Workspace (Left Column):** `flex-1 min-w-[36rem]` (~65–70% width), ensures task cards never shrink below usable width.
- **Project Focus Rail (Right Column):** `w-full max-w-[24rem] min-w-[20rem]` (~30–35% width).
- **Sticky Behavior:**
  - `position: sticky; top: calc(var(--topbar-height, 4rem) + 1rem);`
  - `max-height: calc(100dvh - var(--topbar-height, 4rem) - 2.5rem);`
  - `overflow-y: auto; overscroll-behavior: contain;`
  - Safe margin-bottom so sticky rail never collides with or obscures the floating Assistant.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Page Header: Today · Sunday, August 16 · [ 17 remaining · 111 completed ]                       + Add Task   │
├─────────────────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│ LEFT COLUMN (65–70%) — Main Task Workspace                  │ RIGHT COLUMN (30–35%, min 320px) — Project Rail│
│ (Primary Focus)                                             │ (Sticky, internal scroll if > viewport)        │
│                                                             │                                                │
│ ┌─────────────────────────────────────────────────────────┐ │ ┌────────────────────────────────────────────┐ │
│ │ Task Toolbar:                                           │ │ │ Header: Projects          + Add Project/Cat│ │
│ │ [ Search tasks... ] [ Status: All ▾ ] [ Sort ▾ ]       │ │ │ [x] Show Completed Projects               │ │
│ └─────────────────────────────────────────────────────────┘ │ ├────────────────────────────────────────────┤ │
│ ┌─────────────────────────────────────────────────────────┐ │ │ Overall Workspace Progress Card           │ │
│ │ Active Filter Chips / Clear All (if any active)         │ │ │ 87% · 111/128 completed                     │ │
│ └─────────────────────────────────────────────────────────┘ │ ├────────────────────────────────────────────┤ │
│ ┌─────────────────────────────────────────────────────────┐ │ │ Project Cards List (Compact, Scrollable):   │ │
│ │ Focused Project Banner (if a project is selected)       │ │ │ - All Tasks (111/128)                      │ │
│ └─────────────────────────────────────────────────────────┘ │ │ - OrbitApp (0/1)                           │ │
│ ┌─────────────────────────────────────────────────────────┐ │ │ - Viettel (19/20)                         │ │
│ │ Task List:                                              │ │ │ - No Project (Standalone) (38/46)          │ │
│ │ - [Pending Card: Accept | Deny | ...]                   │ │ └────────────────────────────────────────────┘ │
│ │ - [In Progress Card: Complete | Give Up | ...]          │ │                                                │
│ │ - [Completed Card: Restore | ...]                       │ │                                                │
│ └─────────────────────────────────────────────────────────┘ │                                                │
└─────────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

### 2.2 Mobile & Tablet Layout (`< lg`)

- **Single Column Stack:**
  1. Header with `Today` title, remaining task badge, and primary `+ Add Task` action.
  2. Integrated Task Toolbar (Search, Status Filter, Sort).
  3. Focused Project Indicator (if selected) + Active Filter summary.
  4. Task List (Immediate priority).
  5. Project Focus Section (Collapsible / Compact grid below task list).
  6. Overall Progress Section.

---

## 3. Detailed Component Specifications

### 3.1 Task Toolbar (`TodoTaskToolbar.jsx`)
- **Search:** Instant filter on task title and description, with clear (`X`) button.
- **Status Filter Multi-Select:**
  - Dropdown containing: `Pending`, `In Progress`, `Completed`, `Given Up`.
  - Checkbox per item; displays `All tasks` or `N statuses` badge.
  - Includes a `Clear` button inside dropdown when filters are active.
- **Sort Selector:**
  - Options: `Due Date (Earliest)`, `Priority (High to Low)`, `Title (A-Z)`.
- **Active Filter Bar:**
  - Displays removable pills for active search/status/project filter with a global `Clear all filters` button when active.

### 3.2 Task Card (`TodoTaskCard.jsx` / enhanced `TaskItem.jsx`)
Adopts the proven patterns from `CalendarTaskDetailCard`:
- **Left Border Accent:** 4px–5px solid border in the Project's color (or default line color if Standalone/No Project).
- **Status Representations:**
  - `pending`: Dashed border (`border-dashed`), warning-soft background or chip, subdued title.
  - `in-progress`: Solid clean border, accent badge (`In Progress`), prominent title.
  - `completed`: Muted surface, strikethrough title, success badge (`Done [time]`).
  - `given-up`: Muted surface, strikethrough title, danger badge (`Given up`).
- **Interactive Action Controls:**
  - **Pending:**
    - `Accept` button: Green accent / check icon, converts task to `in-progress` (triggers `startTaskMutation`).
    - `Deny` button: Red-warning icon / trash, prompts or directly executes task deletion (`deleteTaskMutation`), matching Calendar's deny behavior.
  - **In Progress:**
    - `Complete` button: Circular check button, toggles status to `completed`.
    - `Give Up` button: Flag / X icon with confirmation modal, sets status to `given-up`.
  - **Completed / Given Up:**
    - `Restore` button: RotateCcw / check toggle, restores status back to `in-progress`.
  - **General Actions:**
    - `Edit` button (pencil icon) -> opens `TaskDetailButton` edit modal.
    - `Delete` button (trash icon) -> opens delete confirmation dialog.
- **Metadata Badges:**
  - Deadline Badge: red (`overdue`), orange/yellow (`due today` / `<= 2 days`), neutral (standard date).
  - Priority Badge: `High` (red), `Medium` (yellow/orange), `Low` (green).
  - Category Badge & Project Badge.

### 3.3 Project Focus Rail (`ProjectFocusRail.jsx` / enhanced `ProjectOverviewGrid.jsx`)
- **Stable Metrics:**
  - `total`: Count of all tasks belonging to this project (from `rawTasks`), ignoring toolbar filters.
  - `completed`: Count of completed tasks in this project (from `rawTasks`).
  - `progress`: `(completed / total) * 100%`.
- **Card States & Actions:**
  - Active selection highlight (focuses the task list on that project).
  - "All Tasks" card at the top.
  - "Standalone" (renamed to "No Project") card.
  - Project Cards:
    - Compact height (reduced vertical padding ~25-30%).
    - Quick Action: `+ Add Task` to project, `Complete Project` (when eligible), `Restore Project` (when completed).
- **Show Completed Projects Toggle:**
  - Clean switch or checkbox in the rail header.
- **Scroll Container:**
  - The list container inside the rail has `max-h-[calc(100vh-18rem)] overflow-y-auto pr-1` so users with 20+ projects can smoothly scroll without moving the main viewport.

### 3.4 Empty States & Microcopy
- **Real Empty (No tasks exist in project / workspace):**
  - Title: *"No tasks in this project yet"* (or *"No tasks created yet"*).
  - Description: *"Create your first task to start tracking progress."*
  - CTA: `+ Add Task`.
- **Filtered Empty (Tasks exist, but filtered out by search/status):**
  - Title: *"No tasks match the active filters"*.
  - Description: *"Try selecting different statuses or clearing your search query."*
  - CTA: `Clear filters` button (resets search and status filter).

---

## 4. Comprehensive Component States (Loading, Error, Mutation)

### 4.1 Loading States
- **Task List Loading:**
  - Render 3–5 skeleton task cards with pulsing placeholders matching the height and layout of `TodoTaskCard` (`h-24 animate-pulse ui-section-card rounded-[14px]`).
- **Project Rail Loading:**
  - Render skeleton summary card (`h-20 animate-pulse`) and 3 skeleton project tiles (`h-28 animate-pulse`).
- **Background Fetching:**
  - Subtle top progress indicator or small chip `Refreshing…` without blocking UI interactions.

### 4.2 Query Error States
- **Inline Error Banner:**
  - If `tasksQuery.isError` or `projectsQuery.isError`, show a distinct banner above the list with the specific error message.
  - Provide an explicit `Retry` button that triggers `refetch()`.
  - Preserve any previously cached data if available rather than blanking the screen.

### 4.3 Mutation States & Optimistic Behavior
- **Pending Mutation:**
  - Disable the clicked button to prevent duplicate submissions.
  - Replace button icon with a spinner (`<Loader2 className="h-4 w-4 animate-spin" />`).
- **Optimistic Updates:**
  - For status toggles (`in-progress` ↔ `completed`), optimistically update the query cache so the card immediately reflects completion, celebrating with a brief pop animation (like Calendar).
- **Mutation Failure & Rollback:**
  - Revert cache to previous snapshot on error.
  - Surface error alert or toast with clear actionable text via `getApiErrorMessage(error)`.

---

## 5. Data Flow & State Management

```text
[ useTasksQuery (allTasks) ] ───────────► [ Project Focus Rail ] (Calculates 100% true metrics)
                                                  │
                                                  ▼ Selected Project Filter
[ Local Search + Status Filter + Sort ] ──► [ Filter & Sort Pipeline ]
                                                  │
                                                  ▼
                                            [ Filtered Tasks ]
                                                  │
                                                  ▼
                                            [ Task List Render ]
```

1. `tasksQuery.data` provides `rawTasks`.
2. `ProjectFocusRail` aggregates `rawTasks` by project ID -> metrics never fluctuate on search/filter.
3. `filteredTasks` memo applies:
   - Project selection filter (`ALL_PROJECT_FILTER`, `STANDALONE_PROJECT_FILTER`, or `projectId`).
   - Status multi-select filter (local or global).
   - Search term query match.
   - Sort comparator.
4. Mutation Handlers:
   - `onAccept(taskId)`: updates status to `in-progress`.
   - `onDeny(taskId)`: calls delete task dialog / mutation.
   - `onComplete(taskId)` / `onToggle(taskId)`: toggles `completed` / `in-progress`.
   - `onGiveUp(taskId)`: opens give up confirmation modal.
   - `onRestore(taskId)`: updates status to `in-progress`.

---

## 6. Implementation Phasing Plan

- **Phase 1 (Data & 2-Column Architecture):**
  - Update `TodoPage.jsx` grid structure (65-70% task area vs 30-35% sticky rail).
  - Decouple project statistics from filtered tasks.
  - Implement skeleton loading and error retry blocks.
- **Phase 2 (Calendar-Aligned Task Card & Status Model):**
  - Implement `TodoTaskCard.jsx` with Accept/Deny, Complete/Give Up, Restore, and pending spinners.
  - Update `TaskList.jsx` to render the new cards and empty states.
- **Phase 3 (Toolbar, Project Rail & Polish):**
  - Implement integrated `TodoTaskToolbar.jsx` (Search + Multi-select Status + Sort + Clear).
  - Compact `ProjectFocusRail.jsx` with internal scroll container.
  - Add CSS polish, tooltips, and responsive mobile adaptations.

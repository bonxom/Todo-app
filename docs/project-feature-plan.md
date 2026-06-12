# Project Feature Implementation Plan

## Project Goal

Add first-class Project support across the TodoApp so users can organize tasks by both category and project, track project progress in the Todo and Calendar experiences, separate Categories and Projects in the UI, and expand Statistics with a GitHub-style activity heatmap. Implementation must proceed one phase at a time, with an approval stop after each phase.

## Phase List

1. Phase 1: Backend Project model, Project APIs, and Task `projectId` support
2. Phase 2: Frontend API layer and shared data/state updates for Projects
3. Phase 3: Todo page Project tracking UI, project task assignment, progress bars
4. Phase 4: Category page split into Categories and Projects
5. Phase 5: Calendar Overall mode + new Project Focus mode with weekly zoom and day task detail
6. Phase 6: Statistics page GitHub-style activity heatmap
7. Phase 7: UI/UX polish and final code review

## Phase 1: Backend Project model, Project APIs, and Task `projectId` support

### Expected Files

- `backend/model/Project.js`
- `backend/model/Task.js`
- `backend/model/User.js`
- `backend/controller/projectController.js`
- `backend/route/projectRoute.js`
- `backend/controller/taskController.js`
- `backend/index.js`
- `backend/config/initialize.js`
- `backend/TodoApp_API.postman_collection.json`
- Possibly `backend/controller/aiController.js`

### Backend/API Changes

- Add a `Project` schema with `userId`, `name`, optional `description`, optional visual metadata, and timestamps.
- Add nullable `projectId` support to `Task`, with indexing for future filtering.
- Add project CRUD endpoints under `/api/projects`.
- Extend task create, update, and read flows to support `projectId`.
- Validate project ownership so users cannot assign tasks to another user’s project.
- Define project deletion behavior; recommended default is to clear `projectId` on affected tasks.
- Keep AI task generation compatible when `projectId` is absent.

### Frontend/UI Changes

- None in this phase beyond preserving compatibility with existing consumers.

### Risks

- Current task ownership is inferred indirectly through `categoryId`, so adding projects introduces another ownership path that must be validated carefully.
- Unclear deletion semantics could create orphaned task references.
- Existing task populate and filtering logic may regress if `projectId` is added inconsistently.
- Missing indexes could hurt later project-based views.

### Validation Steps

- Start backend and verify project CRUD manually.
- Create tasks with and without `projectId`.
- Update a task’s `projectId`, then clear it again.
- Attempt cross-user project assignment and confirm it is rejected.
- Re-run existing task, category, statistics, and calendar flows to check for regressions.

## Phase 2: Frontend API layer and shared data/state updates for Projects

### Expected Files

- `frontend/src/api/apiService.js`
- `frontend/src/api/axiosInstance.js`
- `frontend/src/context/TaskRefreshContext.jsx`
- Potential new shared hooks or context files under `frontend/src/context/` or `frontend/src/feature/`
- Possibly `frontend/src/App.jsx` or `frontend/src/main.jsx`

### Backend/API Changes

- No new endpoints beyond consuming Phase 1 APIs.
- Small response-shape cleanup may be needed if frontend integration exposes brittle API assumptions.

### Frontend/UI Changes

- Add `projectService` CRUD methods.
- Introduce shared project-loading state so forms and pages do not each re-fetch independently.
- Normalize task, category, and project response handling where practical.
- Prepare shared refresh behavior for later Todo, Category, Calendar, and Statistics phases.

### Risks

- Current API error handling collapses many failures into generic `Error` objects and may hide useful response details.
- Project state can easily become duplicated across pages if ownership boundaries are not defined early.
- Over-centralizing too much logic in one pass could create broad regressions.

### Validation Steps

- Verify project fetch, create, update, and delete flows through the frontend service layer.
- Confirm shared state refreshes after project mutations.
- Verify auth redirect behavior still works.
- Run a manual smoke test on existing pages after state wiring.

## Phase 3: Todo page Project tracking UI, project task assignment, progress bars

### Expected Files

- `frontend/src/page/TodoPage.jsx`
- `frontend/src/feature/Todo/Form/AddTaskForm.jsx`
- `frontend/src/feature/Todo/Form/TaskDetailForm.jsx`
- `frontend/src/feature/Todo/TaskItem.jsx`
- `frontend/src/feature/Todo/TaskList.jsx`
- `frontend/src/feature/Todo/ProgressBar.jsx`
- Potential new project picker or filter components under `frontend/src/feature/Todo/`

### Backend/API Changes

- Possibly add server-side task filtering by `projectId`.
- Possibly expand task populate to include project display fields.

### Frontend/UI Changes

- Add project selection to create and edit task flows.
- Show project tags on task cards.
- Add project filtering and tracking on the Todo page.
- Add project-aware progress bars or a project summary panel.
- Keep category and project distinct in the UI.

### Risks

- The Todo page is already dense and can become noisy if project controls are added without clearer hierarchy.
- Existing styling trends generic and gradient-heavy; project UI needs stronger information structure, not more decoration.
- `TaskList` currently keys tasks by `task.id`, while many records use `_id`, which can cause rendering issues during updates.

### Validation Steps

- Create and edit tasks with project assignment from the Todo page.
- Filter by project and status together.
- Confirm progress metrics update after start, finish, give-up, and delete flows.
- Verify keyboard accessibility and empty states for new controls.

## Phase 4: Category page split into Categories and Projects

### Expected Files

- `frontend/src/page/CategoryPage.jsx`
- `frontend/src/feature/Category/CategoryGrid.jsx`
- `frontend/src/feature/Category/CategoryCard.jsx`
- `frontend/src/feature/Category/CategoryStats.jsx`
- Likely new `frontend/src/feature/Project/*` components
- `frontend/src/component/Sidebar.jsx`
- Possibly `frontend/src/route/AppRouter.jsx`

### Backend/API Changes

- Optional task query helpers by project if card views need them.
- Optional project detail expansion if cards need counts or summary data.

### Frontend/UI Changes

- Split the current category page into clear Categories and Projects modes.
- Add project cards comparable to category cards, with reassignment support where appropriate.
- Differentiate project and category visual treatments so they do not read as the same entity.
- Decide whether to keep one page with tabs first or separate routes; a tabbed split is acceptable initially if it reduces churn.

### Risks

- The current page uses serial per-category task fetching; copying that approach for projects will scale poorly.
- Drag and drop semantics can become ambiguous if category and project reassignment coexist without clear targeting.
- Navigation labels and route structure may become confusing if not updated coherently.

### Validation Steps

- Verify category mode still behaves correctly.
- Verify project mode lists correct tasks and counts.
- Test drag-and-drop reassignment carefully.
- Confirm deletion flows for categories and projects remain isolated.

## Phase 5: Calendar Overall mode + new Project Focus mode with weekly zoom and day task detail

### Expected Files

- `frontend/src/page/CalendarPage.jsx`
- `frontend/src/feature/Calendar/CalendarView.jsx`
- `frontend/src/feature/Calendar/CalendarGrid.jsx`
- `frontend/src/feature/Calendar/DayCell.jsx`
- `frontend/src/feature/Calendar/TaskListPanel.jsx`
- `frontend/src/feature/Calendar/TaskListDetailModal.jsx`
- Potential new weekly or project-focus components under `frontend/src/feature/Calendar/`

### Backend/API Changes

- Possibly add filtered task endpoints by `projectId` and date range.
- Possibly ensure task responses include populated project data for focused views.

### Frontend/UI Changes

- Add `Overall` mode for all scheduled tasks.
- Add `Project Focus` mode with project picker and weekly zoom.
- Improve the day detail panel with clearer task and project context.
- Keep due-date drag-and-drop editing working in both modes.

### Risks

- Current calendar logic is based only on `dueDate`; project focus may also require clearer `startDate` handling.
- Weekly and monthly modes can drift into duplicated logic unless date grouping is shared.
- Large task lists may expose performance issues in view recomputation.

### Validation Steps

- Test switching between Overall and Project Focus.
- Test week navigation, month navigation, and Today behavior.
- Verify due-date drag and drop still works.
- Verify day detail for empty, light, and heavy task days.

## Phase 6: Statistics page GitHub-style activity heatmap

### Expected Files

- `frontend/src/page/StatisticsPage.jsx`
- `frontend/src/feature/Statics/StatsSummary.jsx`
- `frontend/src/feature/Statics/LineChart.jsx`
- `frontend/src/feature/Statics/CategoryPieChart.jsx`
- New heatmap component, likely `frontend/src/feature/Statics/ActivityHeatmap.jsx`
- `backend/model/Stat.js`
- `backend/controller/statController.js`
- `backend/config/initialize.js`

### Backend/API Changes

- Extend stats shape if needed for heatmap-friendly daily activity series and possibly project-aware aggregation.
- Decide whether project analytics are required in this phase or if overall activity is sufficient.
- Backfill or rebuild stats if schema changes require historical reconstruction.

### Frontend/UI Changes

- Add a GitHub-style contribution heatmap using daily activity intensity.
- Keep or simplify existing charts depending on whether they still add signal.
- Improve summary grouping and copy clarity.
- Ensure heatmap cells and labels remain accessible.

### Risks

- Current stats logic is fragmented and category-specific, which raises the risk of inconsistent project-aware analytics.
- Historical backfill may be required for accurate heatmap density.
- Timezone and date-boundary bugs are likely because current logic depends on ISO date splitting.

### Validation Steps

- Verify heatmap counts against known completion and give-up events.
- Test empty, sparse, and dense history.
- Confirm the page still loads when no stats document exists.
- Cross-check selected dates between database, API response, and UI.

## Phase 7: UI/UX polish and final code review

### Expected Files

- Cross-cutting frontend files touched in earlier phases
- Potential backend cleanup in models, controllers, and routes
- `README.md` if setup or behavior documentation needs updating

### Backend/API Changes

- Tighten validation, error handling, and response consistency.
- Remove duplicated or dead logic discovered during implementation.
- Add missing indexes or cleanup migration behavior if required.

### Frontend/UI Changes

- Polish navigation in `Sidebar`, `Topbar`, and page headers.
- Improve consistency in copy, loading states, empty states, and focus behavior.
- Reduce low-signal visual noise where it hurts hierarchy.
- Run a final accessibility and interaction pass against the current web interface guidelines.

### Risks

- Polish work can sprawl into new feature work if not constrained.
- Existing console logging and generic alert usage will feel rough after project support is added.
- With no meaningful automated test suite, manual regression coverage must be deliberate.

### Validation Steps

- Full manual regression across auth, todo, categories, projects, calendar, statistics, profile, and AI task generation.
- Run frontend lint.
- Start backend and smoke-test routes.
- Perform a final code review focused on auth, ownership checks, duplicated logic, and accessibility.

## Execution Rules

- Do not implement multiple phases at once.
- After each implementation phase, stop and wait for approval before continuing.
- At the end of each phase, summarize:
  - changed files
  - what was implemented
  - what still needs to be done
  - any commands the user should run
- Treat project ownership validation as mandatory because task ownership is currently inferred indirectly through categories.
- Do not modify backend or frontend code during planning-only steps.

## Current Execution Status

- Current phase: Phase 1
- Completed phases: None
- Next action: Wait for approval to start Phase 1

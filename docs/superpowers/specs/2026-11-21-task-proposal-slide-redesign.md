# Task Proposal Slide Deck & Compact List Redesign

Date: 2026-11-21
Status: Approved by user

## 1. Problem & Goal

Orbit's agent task proposal schema (`proposalViewSchema`) allows proposing **1 to 20 tasks** in a single A2UI proposal message. Currently, `TaskList.tsx` renders every proposed task simultaneously as a fully expanded `<fieldset>` with 7 always-visible form controls (title, description, priority, category, project, start date, due date).

When an agent proposes 10–20 tasks, the chat message expands to thousands of vertical pixels, overwhelms narrow chat containers (popup, docked sidebar, mobile), lacks bulk selection controls, displays empty inputs prominently, and uses legacy CSS styling misaligned with Orbit V2's visual system.

**Goal:** Redesign the task proposal experience into a **Preview-First Slide Deck + Compact List** with compact icon controls, bounded height for up to 20 tasks, bulk select/deselect, clear validation visibility across slides, and cohesive Tailwind token styling across V1/V2 and light/dark themes.

## 2. Non-Goals

- Changing backend API endpoints, A2UI v0.9 protocol schemas, or `proposalViewSchema` (1–20 item bounds remain unchanged).
- Adding drag-and-drop task reordering, adding/deleting items from a proposal, or introducing a full-screen modal workflow.
- Changing non-proposal A2UI presentation components (`Table`, `Chart`, `Stat`, `Diagram`).

## 3. Expected Behavior & UX Contract

### 3.1 Toolbar (inside `TaskList`)
- Shown whenever `items.length > 1` or when validation errors exist in draft mode.
- **Left (Bulk selection — shown when `!terminal && items.length > 1`):**
  - Tri-state checkbox (`checked` when all selected, `indeterminate` when partially selected, unchecked when none selected) with accessible label (`Select all tasks` / `Deselect all tasks`).
  - Compact tabular-nums counter showing selected/total (e.g. `18/20`).
- **Right:**
  - **Validation error jump pill** (shown when `!terminal` and at least one item has a validation error): compact danger pill with `AlertCircle` icon and error count. Clicking it switches to Slide view, jumps to the first invalid task index, and opens inline edit mode on that task.
  - **View mode segmented icon switcher** (shown when `items.length > 1`): two icon-only toggle buttons with `aria-pressed`, `aria-label`, and `title`:
    - Slide view (`GalleryHorizontalEnd` icon) — default mode.
    - Compact list view (`List` icon).

### 3.2 Slide View (Default)
- Displays **one task at a time** (`items[activeIndex]`) inside `TaskProposalSlideCard`.
- **Preview mode (default for each slide):**
  - Header row:
    - Accessible checkbox (`Select task: <title>`) toggling selection for that item.
    - Task title rendered as clean, legible heading text (when deselected: muted + subtle line-through; card dims gently).
    - Icon-only Edit button (`Pencil`, `aria-label="Edit task <n>"`, `title="Edit"`) when `!locked && !terminal`.
  - Description: rendered only when non-empty, clamped cleanly up to 3 lines with full wrapping.
  - Metadata chips row:
    - Priority pill (always shown with subtle semantic tint + colored dot: High / Medium / Low).
    - Project chip (`FolderKanban` icon + resolved project name) — shown only when `projectId` is set.
    - Category chip (`Tag` icon + resolved category name) — shown only when `categoryId` is set.
    - Schedule chip (`Calendar` icon + concise formatted start/due date) — shown only when `startDate` or `dueDate` is set.
  - Validation alert banner: shown below the card body when `!terminal && validation[activeIndex]` is non-empty.
- **Inline Edit mode (toggled by clicking the Pencil icon):**
  - Replaces the current slide body in place with a compact edit form.
  - Header row: Checkbox + concise label (`Task <n>`) + icon-only Done button (`Check`, `aria-label="Done editing task <n>"`, `title="Done"`).
  - Form controls retain existing accessible labels (`Task <n> title`, `Task <n> description`, `Task <n> priority`, `Task <n> category`, `Task <n> project`, `Task <n> startDate`, `Task <n> dueDate`) and validation rules.
  - Responsive `@container` layout: 1 column on narrow containers (popup/mobile), 2 columns when container width permits.
  - Navigating to another slide, switching to List view, or entering `locked`/`terminal` state exits edit mode while preserving all draft edits.
- **Slide Navigation Bar (shown only when `items.length > 1`):**
  - Previous icon button (`ChevronLeft`, `aria-label="Previous task"`, disabled at index 0).
  - Center counter (`3 / 20`, tabular numerals) plus visual progress indicator:
    - For `2..7` items: interactive indicator dots (active dot expanded pill; error items marked in danger color; deselected items dimmed). Clicking a dot navigates directly to that slide.
    - For `8..20` items: thin proportional progress bar showing current position cleanly without overflowing narrow widths.
  - Next icon button (`ChevronRight`, `aria-label="Next task"`, disabled at last index).
  - Keyboard support: `ArrowLeft` / `ArrowRight` navigate slides when focus is inside the navigation controls (without interfering with form inputs).

### 3.3 Compact List View
- Bounded scrollable container (`max-h-[300px] overflow-y-auto`) with hairline dividers between rows so 20 tasks never bloat the chat stream.
- Each row (`min-h-[44px]`):
  - Left: Accessible selection checkbox (`Select task: <title>`), independent of row navigation.
  - Center (clickable button): switches to Slide view at that item's index. Displays concise title + compact inline metadata (priority dot/label, project name if set, formatted due date if set, error icon if invalid).
  - Right (when `!locked && !terminal`): icon-only Edit button (`Pencil`, `aria-label="Edit task <n>"`) that switches to Slide view at that item's index and opens Edit mode immediately.
- Visually highlights the row matching `activeIndex`.

### 3.4 Actions, Terminal States & Error Recovery
- `TaskProposalActions`:
  - Preserves header status pill (`Draft saved` / `Unsaved changes` / `Created N tasks` / `Cancelled`) and alert banner.
  - Draft footer keeps clear labels for committing/destructive actions: `Cancel`, `Save draft`, and `Confirm (<count>)` with icons sized cleanly and responsive wrapping without overflow.
  - Terminal `created` state renders `createdTasks` as a compact scrollable list (`max-h-[220px] overflow-y-auto`) of sleek clickable rows (preserving accessible label `Created: <title>` / `Đã tạo: <title>`) opening `TaskDetailForm`.
- `TaskProposalMessage`:
  - Styled error alerts, `Retry request`, `Reload proposal`, and discard-unsaved-changes `alertdialog` using consistent semantic tokens instead of unstyled browser buttons.

### 3.5 Compatibility & Visual System
- Works identically across:
  - Composed A2UI surfaces (`TaskList` + `TaskProposalActions` as separate nodes inside `compositionCatalog`).
  - Legacy A2UI surfaces and fallback (`TaskProposalForm`).
  - Both Orbit V2 (`.v2-app`, all palettes, Light & Dark) and V1 (Light & Dark) using semantic CSS tokens with safe fallbacks (`var(--v2-..., var(--color-...))`).
  - Viewports from 320px mobile and ~360px popup chat up to 1440px desktop with zero horizontal overflow.
  - English (`en`) and Vietnamese (`vi`) localization.

## 4. Acceptance Criteria

1. A proposal with 20 tasks occupies a bounded, compact vertical footprint in Slide view (1 card + toolbar + nav bar) and List view (`max-h-[300px]` scroll container) with no horizontal overflow at 320px, 390px, 768px, and 1440px.
2. Default Slide view renders clean Preview cards (no expanded inputs by default) with only populated metadata chips visible.
3. Clicking the Pencil icon opens inline editing for the current task; editing updates draft state, dirty tracking, validation, Save draft, and Confirm payloads; clicking Check returns to Preview mode while keeping edits.
4. Prev/Next icon buttons (`ChevronLeft`/`ChevronRight`) and dot indicators navigate between tasks cleanly and disable at boundaries; navigation hides when there is only 1 task.
5. Bulk selection checkbox toggles all tasks selected/deselected, displays indeterminate state on partial selection, and updates `Confirm (<count>)` immediately.
6. Compact List view lists all tasks concisely; toggling a row checkbox does not leave List view; clicking a row opens its Slide in preview mode; clicking a row's Pencil icon opens its Slide directly in Edit mode.
7. Validation errors on non-visible slides surface via the toolbar error badge; clicking the badge jumps to the first invalid task in Edit mode.
8. Terminal `created` and `cancelled` states disable/hide editing and bulk controls, preserve read-only review of proposed items, and display up to 20 created tasks in a compact scrollable list whose items still open `TaskDetailForm`.
9. Both composed A2UI and legacy fallback proposals work end-to-end (edit, save draft, reload, conflict reload, retry, confirm, cancel).

## 5. Edge Cases

- Single-task proposal (`items.length === 1`): hides Slide/List switcher, bulk select-all control, and Prev/Next navigation bar to stay minimal.
- Maximum-size proposal (`items.length === 20`): uses progress bar + `n / 20` instead of 20 cramped dots; List view and Created list scroll cleanly within bounded height.
- Long Vietnamese titles and descriptions: wrap cleanly (`wrap-anywhere`) without pushing checkboxes or Pencil icons off-screen.
- Unavailable category/project on initial load: displays error on the affected card and error jump badge in toolbar; user can click Edit (or error jump badge) and select a valid choice.
- Server reload reducing item count or transitioning to `created`/`cancelled`: `activeIndex` clamps safely to valid bounds and `editingItemId` clears automatically.
- `prefers-reduced-motion`: transitions remain subtle and respect reduced motion.

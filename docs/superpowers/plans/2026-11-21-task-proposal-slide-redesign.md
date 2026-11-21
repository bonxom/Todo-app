# Implementation Plan: Task Proposal Slide Deck & Compact List Redesign

Spec: [2026-11-21-task-proposal-slide-redesign.md](../specs/2026-11-21-task-proposal-slide-redesign.md)

## Ordered Tasks

### Task 1: Add localization keys (`en` & `vi`)
- **Files:**
  - `frontend/src/shared/i18n/locales/en/agent.json`
  - `frontend/src/shared/i18n/locales/vi/agent.json`
- **Changes:** Add concise localized keys for slide/list toggle, prev/next navigation, edit/done icon labels, select all/deselect all, selected count, slide counter, validation error jump badge, and schedule formatting labels.

### Task 2: Add failing Vitest tests (TDD)
- **Files:**
  - `frontend/src/features/tasks/components/test/TaskProposalSlideDeck.test.tsx` (new comprehensive unit/integration test suite)
- **Test Cases:**
  1. Single-task proposal hides slide navigation, bulk select-all, and view switcher; renders Preview mode without inputs until Pencil icon is clicked.
  2. Multi-task proposal (20 tasks) renders 1 task per slide, Prev/Next navigation with boundary disabling, progress bar indicator, and stays compact.
  3. Clicking Pencil icon opens inline edit form with accessible labels; edits persist across slide changes; clicking Check returns to Preview mode.
  4. Bulk select-all checkbox toggles all 20 items, reflects `indeterminate` state on partial selection, and updates `Confirm (N)`.
  5. Compact List view renders all tasks in a bounded list; checkbox toggles selection without leaving List view; clicking a row jumps to that Slide in preview mode; clicking a row's Pencil icon jumps to that Slide in edit mode.
  6. Error jump pill appears when another slide (e.g. Task 15) has a validation error; clicking it navigates directly to Task 15 in Edit mode.
  7. Terminal `created` state (20 created tasks) hides Edit/Select-all controls, disables checkboxes, and opens `onOpenTask` when clicking a created task row.
- **Verification:** Run `cd frontend && pnpm exec vitest run src/features/tasks/components/test/TaskProposalSlideDeck.test.tsx` and confirm tests fail before implementation.

### Task 3: Extend `useTaskProposalEditor` with bulk selection & add formatting helper
- **Files:**
  - `frontend/src/features/tasks/hooks/A2UI/useTaskProposalEditor.ts`
  - `frontend/src/features/tasks/components/chat/A2UI/proposalFormatting.ts` (new)
- **Changes:**
  - Add `toggleAllSelection()` to `useTaskProposalEditor` (selects all when none/partial selected, clears all when all selected; respects `locked`).
  - Add pure formatting utilities in `proposalFormatting.ts` for short locale-aware date/time range chips and category/project name resolution.

### Task 4: Implement `TaskProposalSlideCard`, `TaskProposalCompactList`, and redesigned `TaskList`
- **Files:**
  - `frontend/src/features/tasks/components/chat/A2UI/TaskProposalSlideCard.tsx` (new)
  - `frontend/src/features/tasks/components/chat/A2UI/TaskProposalCompactList.tsx` (new)
  - `frontend/src/features/tasks/components/chat/A2UI/TaskList.tsx` (redesign)
- **Changes:**
  - Build Preview-first slide card with semantic priority pill, populated-only metadata chips, Pencil/Check icon buttons, and responsive `@container` edit form.
  - Build compact scrollable list (`max-h-[300px]`) with independent checkbox, click-to-slide row, and Pencil quick-edit button.
  - Build toolbar (Select all + `selected/total`, Error jump pill, Slide/List icon switcher) and Slide navigation bar (`ChevronLeft`, `n / total`, interactive dots for `<= 7` or progress bar for `8..20`, `ChevronRight`, keyboard arrows).
  - Clamp `activeIndex` safely when item count changes and exit edit mode automatically when `locked || terminal`.

### Task 5: Polish `TaskProposalActions`, `TaskProposalForm`, `TaskProposalMessage`, and clean up legacy CSS
- **Files:**
  - `frontend/src/features/tasks/components/chat/A2UI/TaskProposalActions.tsx`
  - `frontend/src/features/tasks/components/chat/A2UI/TaskProposalForm.tsx`
  - `frontend/src/features/tasks/components/chat/A2UI/TaskProposalMessage.tsx`
  - `frontend/src/styles/index.css`
- **Changes:**
  - Refine header/status pills, footer button hierarchy, and bounded scrollable `createdTasks` list.
  - Style retry/reload buttons, error banners, and unsaved-changes confirmation dialog in `TaskProposalMessage`.
  - Clean up conflicting legacy `.task-proposal*` rules in `index.css` so Tailwind utilities with `--v2-*` / `--color-*` semantic tokens own styling cleanly in V1/V2 light/dark modes.

### Task 6: Update existing unit & Playwright E2E tests for Preview-first Edit flow + add 20-task E2E & visual review
- **Files:**
  - `frontend/src/features/tasks/components/test/TaskComposition.test.tsx`
  - `frontend/src/features/tasks/components/test/TaskProposalProtocol.test.tsx`
  - `frontend/src/features/tasks/components/test/TaskProposalChat.test.tsx`
  - `frontend/e2e/task-proposals.spec.ts`
  - `frontend/e2e/ui-composition.spec.ts`
  - `frontend/e2e/task-proposal-slide-deck.spec.ts` (new E2E spec covering 20 tasks, slide/list switching, bulk select, edit/save/confirm, V2 light/dark & mobile/tablet/desktop screenshots)
- **Changes:**
  - Update existing tests where they directly typed into `Task 1 title` to click the Pencil edit button first (and navigate/switch list for Task 2), preserving full behavioral coverage.
  - Run Playwright against the live dev server, capture screenshots across V2 Desktop/Tablet/Mobile, Light/Dark, Vietnamese/English, Popup/Full-page, Slide Preview, Slide Edit, Compact List, and Created (20 items), inspect every screenshot visually, and polish any flaws found.

### Task 7: Full Verification Suite
- **Commands:**
  - `(cd frontend && pnpm test)`
  - `(cd frontend && pnpm exec playwright test e2e/task-proposals.spec.ts e2e/ui-composition.spec.ts e2e/task-proposal-slide-deck.spec.ts)`
  - `(cd frontend && pnpm run lint)`
  - `(cd frontend && pnpm run format:check)`
  - `(cd frontend && pnpm run build)`
  - `(cd backend && pnpm run build && pnpm test)` (baseline check if needed)

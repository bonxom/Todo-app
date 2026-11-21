# V2 Collapsible Sidebar & Apple Liquid Glass Consistency Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a smoothly collapsible desktop sidebar to Orbit V2 and fix all 7 Liquid Glass visual/material inconsistencies discovered across all 9 V2 pages and dialogs.

---

### Task 1: Failing Unit Tests for Collapsible Sidebar

**Files:**

- Modify: `frontend/src/features/v2/test/V2Layout.test.tsx`

- [ ] **Step 1**: Add tests verifying desktop sidebar renders expanded by default, toggles to collapsed (`data-collapsed="true"`, persists to `localStorage["orbit.v2-sidebar-collapsed"]`), keeps navigation links accessible by name when collapsed, and restores collapsed state on re-mount.
- [ ] **Step 2**: Run Vitest on `V2Layout.test.tsx` and confirm the new tests fail.

---

### Task 2: Implement Collapsible Desktop Sidebar (`V2Layout.tsx`, `V2Sidebar.tsx`, `en/v2.json`, `vi/v2.json`, `index.css`)

**Files:**

- Modify: `frontend/src/shared/i18n/locales/en/v2.json`
- Modify: `frontend/src/shared/i18n/locales/vi/v2.json`
- Modify: `frontend/src/features/v2/layouts/V2Layout.tsx`
- Modify: `frontend/src/features/v2/components/V2Sidebar.tsx`
- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1**: Add `collapseSidebar` / `expandSidebar` i18n keys.
- [ ] **Step 2**: Add persisted `sidebarCollapsed` state in `V2Layout.tsx` and pass `collapsed` + `onToggleCollapse` to desktop `V2Sidebar` (never to mobile drawer `V2Sidebar`).
- [ ] **Step 3**: Add macOS-style collapse toggle and collapsed icon-rail layout in `V2Sidebar.tsx` + smooth CSS transitions in `index.css`.

---

### Task 3: Apply All 7 Apple Liquid Glass Consistency Fixes

**Files:**

- Modify: `frontend/src/styles/v2-palettes.css` (Fix #1: sync `--cursor-dot-bg` per V2 palette)
- Modify: `frontend/src/styles/index.css` (Fixes #2, #3, #4, #5 CSS, #7)
- Modify: `frontend/src/features/v2/components/TaskRow.tsx` (Fix #6)
- Modify: `frontend/src/features/v2/components/TaskDetailsDialog.tsx` (Fix #6)
- Modify: `frontend/src/features/v2/pages/StatisticsPage.tsx` (Fix #5 hover contrast)
- Modify: `frontend/src/features/v2/components/statistics/StatisticsOverview.tsx` (Fix #5 semantic tokens)
- Modify: `frontend/src/features/v2/components/statistics/StatisticsTrend.tsx` (Fix #5 live palette chart tokens)
- Modify: `frontend/src/features/v2/components/statistics/StatisticsBreakdowns.tsx` (Fix #5 semantic status colors)

---

### Task 4: Verification (Vitest, Full Playwright Click-Through Audit + Screenshot Inspection, Lint, Format, Build)

**Files:**

- Update: `frontend/e2e/apple-liquid-glass-audit.spec.ts` (assert sidebar collapse/expand, zero hardcoded cyan cursor/navy form leaks, fixed calendar day panel inside viewport, all 9 V2 pages & dialogs pass with 0 console errors)
- Run Vitest, Playwright regression suites, inspect updated screenshots in Golden Dark & Light modes, run `pnpm run lint`, `pnpm prettier --check`, and `pnpm run build`.

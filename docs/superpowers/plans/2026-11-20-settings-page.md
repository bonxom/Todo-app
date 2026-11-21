# Settings Page & V2 Ocean Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified Settings page (upgrading Profile) at `/settings` (V1) and `/v2/settings` (V2) backed by `localStorage` preferences, add a modular V2 **Ocean** color palette (V2-only), and add a User Avatar link next to the Logout button in `V2Sidebar`.

**Architecture:** Extract V2 palette tokens into `frontend/src/styles/v2-palettes.css` paired with an extensible TypeScript registry (`frontend/src/shared/theme/v2Palettes.ts`). Centralize all client-only settings in a `localStorage`-backed Zustand store (`frontend/src/stores/useSettingsStore.ts`) and wire every setting into its real frontend consumer (NotificationBell, NotificationsPage, Dashboard, Calendar, AI Chat Bubble). Share settings hooks/logic under `frontend/src/features/settings/` while rendering dedicated V1 and V2 presentations.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query v5, Zustand, i18next, Lucide React, Vitest, Playwright.

**Spec:** [2026-11-20-settings-page-design.md](../specs/2026-11-20-settings-page-design.md)

## Global Constraints

- Frontend-only feature: persist all new preferences in `localStorage` (`orbit.v2-palette`, `orbit.settings.v1`); do not modify backend code or database schemas.
- Color palette selection (Mint / Ocean) MUST ONLY appear in V2 Settings (`/v2/settings`), NEVER in V1 Settings (`/settings`).
- Palette tokens MUST live in dedicated modular files (`shared/theme/v2Palettes.ts` and `styles/v2-palettes.css`), easy to extend with future palettes.
- Both V1 and V2 use `/settings` and `/v2/settings`; `/profile` redirects to `/settings` (`replace`).
- V2 Sidebar places the User Avatar link right next to the Sign out button with ≥44×44 CSS px touch targets.
- All user-facing copy must exist in both English and Vietnamese i18n namespaces.
- Follow TDD: write failing tests before implementation, verify failure, implement, verify pass, then run Playwright, lint, format:check, and build.

---

### Task 1: Modular V2 Color Palette System (`v2Palettes.ts` + `v2-palettes.css`)

**Files:**
- Create: `frontend/src/shared/theme/v2Palettes.ts`
- Create: `frontend/src/shared/theme/test/v2Palettes.test.ts`
- Create: `frontend/src/styles/v2-palettes.css`
- Modify: `frontend/src/styles/index.css` (import `./v2-palettes.css` and replace hardcoded mint radial gradients / progress accent colors with palette tokens)
- Modify: `frontend/src/main.tsx` (call `initializeV2Palette()` before render)

**Interfaces:**
- Produces:
  - `export type V2PaletteId = "mint" | "ocean"`
  - `export const V2_PALETTES: readonly V2PaletteDefinition[]`
  - `export const DEFAULT_V2_PALETTE: V2PaletteId = "mint"`
  - `export const V2_PALETTE_STORAGE_KEY = "orbit.v2-palette"`
  - `export function initializeV2Palette(): void`
  - `export function setV2Palette(next: V2PaletteId): void`
  - `export function useV2Palette(): { palette: V2PaletteId; setPalette: (next: V2PaletteId) => void; palettes: readonly V2PaletteDefinition[] }`

- [ ] **Step 1: Write failing unit tests in `frontend/src/shared/theme/test/v2Palettes.test.ts`** covering default `"mint"`, `"ocean"` persistence to `localStorage`, DOM `dataset.v2Palette` updates, invalid storage fallback to `"mint"`, and cross-tab `StorageEvent` synchronization.
- [ ] **Step 2: Run `cd frontend && pnpm exec vitest run src/shared/theme/test/v2Palettes.test.ts`** and verify failure.
- [ ] **Step 3: Implement `frontend/src/shared/theme/v2Palettes.ts` and `frontend/src/styles/v2-palettes.css`**, import `./v2-palettes.css` in `frontend/src/styles/index.css`, update hardcoded mint glow/progress tokens in `index.css` to reference `--v2-bg-glow-1`, `--v2-bg-glow-2`, `--v2-progress-end`, and call `initializeV2Palette()` in `frontend/src/main.tsx`.
- [ ] **Step 4: Re-run `cd frontend && pnpm exec vitest run src/shared/theme/test/v2Palettes.test.ts`** and verify pass.

---

### Task 2: Unified Settings Store (`useSettingsStore.ts`)

**Files:**
- Create: `frontend/src/stores/useSettingsStore.ts`
- Create: `frontend/src/stores/test/useSettingsStore.test.ts`

**Interfaces:**
- Produces:
  - `export const SETTINGS_STORAGE_KEY = "orbit.settings.v1"`
  - `export const DEFAULT_USER_SETTINGS: UserSettings`
  - `export const useSettingsStore` (Zustand store with `notifications`, `workspace`, `agent`, `updateNotifications`, `updateWorkspace`, `updateAgent`, `resetSettings`, `syncFromStorage`)

- [ ] **Step 1: Write failing unit tests in `frontend/src/stores/test/useSettingsStore.test.ts`** covering default values, partial updates per section, `localStorage` persistence, corrupt JSON recovery, `resetSettings`, and cross-tab sync.
- [ ] **Step 2: Run `cd frontend && pnpm exec vitest run src/stores/test/useSettingsStore.test.ts`** and verify failure.
- [ ] **Step 3: Implement `frontend/src/stores/useSettingsStore.ts`**.
- [ ] **Step 4: Re-run `cd frontend && pnpm exec vitest run src/stores/test/useSettingsStore.test.ts`** and verify pass.

---

### Task 3: Wire Real Frontend Consumers to Settings Store

**Files:**
- Modify: `frontend/src/features/calendar/api/calendarRanges.ts` (optional `weekStartsOn: WeekStartDay = "sunday"` parameter)
- Create: `frontend/src/features/calendar/api/test/calendarRanges.test.ts`
- Modify: `frontend/src/features/v2/pages/CalendarPage.tsx` (use `defaultCalendarView` & `weekStartsOn`)
- Modify: `frontend/src/features/calendar/CalendarPage.jsx` & `frontend/src/features/calendar/components/CalendarView.jsx` (use `defaultCalendarView` & `weekStartsOn`)
- Modify: `frontend/src/features/v2/hooks/useDashboardModel.ts` (initialize `status` from `workspace.defaultTaskStatus`)
- Modify: `frontend/src/features/notifications/components/NotificationBell.tsx` (respect `notifications.showUnreadBadge`)
- Modify: `frontend/src/features/notifications/api/notificationQueries.ts` (respect `notifications.autoRefresh`)
- Modify: `frontend/src/features/notifications/NotificationsPage.tsx` (initialize `filter` from `notifications.defaultFilter`)
- Modify: `frontend/src/features/v2/layouts/V2Layout.tsx` & `frontend/src/app/V1RouteLayout.tsx` (respect `agent.showFloatingBubble`)
- Modify: `frontend/src/features/v2/components/V2AgentChatBubble.tsx` (respect `agent.defaultBubbleMode`)

**Interfaces:**
- Consumes: `useSettingsStore`, `WeekStartDay` from `@/stores/useSettingsStore`

- [ ] **Step 1: Write failing tests in `frontend/src/features/calendar/api/test/calendarRanges.test.ts`** verifying Monday-first vs Sunday-first week and month day grids.
- [ ] **Step 2: Run `cd frontend && pnpm exec vitest run src/features/calendar/api/test/calendarRanges.test.ts`** and verify failure.
- [ ] **Step 3: Update `calendarRanges.ts` and all listed consumer files** so every setting in `useSettingsStore` produces real UI behavior without breaking defaults.
- [ ] **Step 4: Run `cd frontend && pnpm exec vitest run src/features/calendar/api/test/calendarRanges.test.ts src/features/v2/test/`** and verify pass.

---

### Task 4: Routing, Version Mapping & V2 Sidebar Avatar + Topbar Updates

**Files:**
- Modify: `frontend/src/shared/navigation/uiVersions.ts` (add `/settings` ↔ `/v2/settings`, keep `/profile` supported and mapping to `/v2/settings`)
- Modify: `frontend/src/shared/navigation/test/uiVersions.test.ts`
- Modify: `frontend/src/shared/components/Topbar.jsx` (title mapping for `settings`, avatar navigates to `/settings`)
- Modify: `frontend/src/features/v2/components/V2Topbar.tsx` (title mapping for `/v2/settings`)
- Modify: `frontend/src/features/v2/components/V2Sidebar.tsx` (add User Avatar link to `/v2/settings` directly beside the Sign out button)
- Modify: `frontend/src/features/v2/test/V2Layout.test.tsx` (add tests for avatar link next to Sign out, active state, fallback initial)
- Modify: `frontend/src/shared/i18n/locales/en/v2.json`, `frontend/src/shared/i18n/locales/vi/v2.json`, `frontend/src/shared/i18n/locales/en/common.json`, `frontend/src/shared/i18n/locales/vi/common.json`, `frontend/src/shared/i18n/locales/en/account.json`, `frontend/src/shared/i18n/locales/vi/account.json`

- [ ] **Step 1: Add failing assertions in `uiVersions.test.ts` and `V2Layout.test.tsx`** for `/settings` ↔ `/v2/settings` mapping and `V2Sidebar` avatar link next to Sign out.
- [ ] **Step 2: Run `cd frontend && pnpm exec vitest run src/shared/navigation/test/uiVersions.test.ts src/features/v2/test/V2Layout.test.tsx`** and verify failure.
- [ ] **Step 3: Implement `uiVersions.ts`, `Topbar.jsx`, `V2Topbar.tsx`, `V2Sidebar.tsx`, and all EN/VI i18n keys**.
- [ ] **Step 4: Re-run tests** and verify pass.

---

### Task 5: Settings Feature Module (Shared Logic + V1 & V2 Pages)

**Files:**
- Create: `frontend/src/features/settings/types.ts`
- Create: `frontend/src/features/settings/hooks/useSettingsProfile.ts`
- Create: `frontend/src/features/settings/components/SettingsNav.tsx`
- Create: `frontend/src/features/settings/components/ProfileSettingsSection.tsx`
- Create: `frontend/src/features/settings/components/AppearanceSettingsSection.tsx`
- Create: `frontend/src/features/settings/components/NotificationsSettingsSection.tsx`
- Create: `frontend/src/features/settings/components/WorkspaceSettingsSection.tsx`
- Create: `frontend/src/features/settings/components/AgentSettingsSection.tsx`
- Create: `frontend/src/features/settings/SettingsPage.tsx` (V1 presentation, `version="v1"`, hides V2 palette picker)
- Create: `frontend/src/features/settings/routes.tsx` (`/settings` + `/profile` redirect)
- Create: `frontend/src/features/settings/index.ts`
- Create: `frontend/src/features/v2/pages/SettingsPage.tsx` (V2 Liquid Glass presentation, `version="v2"`, shows Mint/Ocean palette picker)
- Modify: `frontend/src/app/router.tsx` (mount `settingsRoutes`, replacing `profileRoutes`)
- Modify: `frontend/src/features/v2/routes.tsx` (add `/v2/settings` + `/v2/profile` redirect)
- Create: `frontend/src/features/settings/test/SettingsPage.test.tsx`

- [ ] **Step 1: Write failing component tests in `frontend/src/features/settings/test/SettingsPage.test.tsx`** verifying:
  - All 5 sections render and switch via section navigation.
  - V2 renders the Mint/Ocean palette selector and updates `v2Palette` on click.
  - V1 does NOT render the V2 palette selector.
  - Notifications, Workspace, and Agent toggles persist to `useSettingsStore`.
  - Profile form edit & password mismatch validation work with inline feedback.
- [ ] **Step 2: Run `cd frontend && pnpm exec vitest run src/features/settings/test/SettingsPage.test.tsx`** and verify failure.
- [ ] **Step 3: Implement the `features/settings/` module, V2 `SettingsPage.tsx`, and router bindings**.
- [ ] **Step 4: Re-run `cd frontend && pnpm exec vitest run src/features/settings/test/SettingsPage.test.tsx`** and verify pass.

---

### Task 6: Playwright E2E Suite, Visual Verification & Full Quality Gates

**Files:**
- Create: `frontend/e2e/settings.spec.ts`
- Modify: `frontend/e2e/app.spec.ts` (update `/profile` check to expect redirect to `/settings`)

- [ ] **Step 1: Create `frontend/e2e/settings.spec.ts`** testing:
  - V2 Sidebar shows user avatar right next to Logout; clicking it navigates to `/v2/settings`.
  - V2 Color Palette switching (Mint ↔ Ocean) in Light & Dark modes, verifying computed background/accent token changes and persistence after page reload.
  - V1 `/settings` and `/profile` redirect to `/settings`, verifying V2 Color Palette section is hidden.
  - Real behavioral toggles: hiding floating AI bubble removes assistant trigger; disabling notification badge hides badge; changing Calendar week start to Monday shifts first weekday header; updating profile & creating category via mocked APIs.
  - Responsive layout checks at `390×844` (mobile), `768×1024` (tablet), `1440×900` (desktop) in both EN and VI with zero horizontal overflow, plus screenshot captures for visual inspection.
- [ ] **Step 2: Run full frontend Vitest suite**: `cd frontend && pnpm test`
- [ ] **Step 3: Run Playwright tests** (`settings.spec.ts` + affected V1/V2 regression specs) and visually inspect captured screenshots in Light/Dark × Mint/Ocean and Mobile/Desktop.
- [ ] **Step 4: Run lint, format check, and production build**:
  - `cd frontend && pnpm run lint && pnpm run format:check && pnpm run build`
- [ ] **Step 5: Verify `git status` and `git diff --stat`** to confirm clean scope with zero backend/env modifications.

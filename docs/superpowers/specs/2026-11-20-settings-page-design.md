# Settings Page & V2 Ocean Palette Design Spec

**Date:** 2026-11-20  
**Status:** Approved (User selected Option A + modular palette files + unified `/settings` & `/v2/settings` routes)  
**Scope:** Frontend (`frontend/`) — client-side preferences persisted in `localStorage`, profile/category/project/skill actions wired to existing backend APIs (no backend changes).

---

## 1. Goals & User Requirements

1. **Unified Settings = Upgraded Profile Page**:
   - Replace the legacy profile-only page with a full Settings experience at `/settings` (V1) and `/v2/settings` (V2).
   - Redirect `/profile` to `/settings` (`replace`) so existing bookmarks, deep links, and legacy references never break.
   - Update V1 Topbar avatar button to navigate to `/settings`, and map `/settings` ↔ `/v2/settings` in `uiVersions.ts`.
2. **Five Functional Settings Sections**:
   - **Profile & Security**: View/update avatar URL, edit full name / email / birthday / nationality, change password, view account summary & activity counts (reusing existing `features/profile/api` queries and mutations).
   - **Appearance & Display**: Light / Dark mode (`shared/theme/theme.ts`), language EN / VI (`shared/i18n`), preferred UI version V1 / V2 (`shared/navigation/versionPreference.ts`), and **V2-only Color Palette picker** (**Mint** default vs **Ocean**). The V2 Color Palette control MUST ONLY render in V2 Settings (`/v2/settings`) and MUST NOT appear in V1 Settings (`/settings`).
   - **Notifications**: Client-side preferences saved to `localStorage`:
     - Show unread count badge on notification bell (`showUnreadBadge`)
     - Auto-refresh notification polling every 60s (`autoRefresh`)
     - Default filter when opening Notifications page (`defaultFilter`: `"all" | "unread"`)
     - Quick link to full Notifications history (`/v2/notifications` or `/notifications`).
   - **Workspace (Tasks, Calendar, Categories & Projects)**:
     - Default Dashboard task status filter (`defaultTaskStatus`: `"" | "pending" | "in-progress" | "completed" | "given-up"`)
     - Default Calendar view (`defaultCalendarView`: `"month" | "week"`)
     - First day of week on Calendar (`weekStartsOn`: `"sunday" | "monday"`)
     - Live Categories & Projects overview with quick create/delete category support (protecting `Uncategorized`) and navigation to Categories/Calendar.
   - **AI Agent & Skills**:
     - Show/hide floating AI assistant bubble (`showFloatingBubble`)
     - Default V2 assistant display mode when opened (`defaultBubbleMode`: `"compact" | "docked"`)
     - Quick links to Agent Workspace (`/v2/agents` or `/agent`) and Personal Skills (`/v2/agents/skills` or `/agent/skills`).
3. **Modular V2 Color Palette Architecture**:
   - Keep palette tokens and metadata out of the main `index.css` body by separating them into:
     - `frontend/src/shared/theme/v2Palettes.ts` — typed palette registry (`mint`, `ocean`), `localStorage` persistence (`orbit.v2-palette`), early DOM initialization (`initializeV2Palette()`), cross-tab `storage` sync, and React hook (`useV2Palette()`).
     - `frontend/src/styles/v2-palettes.css` — imported by `index.css`; defines Light and Dark token sets per `[data-v2-palette="<id>"] .v2-app`.
   - Adding future palettes only requires appending one entry to `V2_PALETTES` in `v2Palettes.ts` and adding Light/Dark token blocks in `v2-palettes.css`.
   - Replace hardcoded mint/teal background glows and statistics progress colors in `index.css` with semantic palette variables (`--v2-bg-glow-1`, `--v2-bg-glow-2`, `--v2-progress-end`, `--v2-accent-glow`) so switching to **Ocean** updates every V2 surface cohesively.
4. **V2 Sidebar Entry Point**:
   - In `V2Sidebar`, add a footer bar at the bottom placing the **User Avatar & Settings link** right next to the **Sign out** button.
   - Displays the user's circular avatar image (or initial badge fallback with image error recovery), user name, and active state when on `/v2/settings`, beside an accessible `44×44px` Sign out button.

---

## 2. Non-Goals

- No backend schema migrations, new REST endpoints, or server-side preference synchronization.
- No fake/decorative settings toggles without real client-side behavior.
- No V1 color palette picker (color palette selection is strictly V2-only).

---

## 3. Architecture & Contracts

### 3.1 Palette Module (`frontend/src/shared/theme/v2Palettes.ts`)

```ts
export type V2PaletteId = "mint" | "ocean";

export interface V2PalettePreview {
  canvas: string;
  surface: string;
  accent: string;
  accentSoft: string;
}

export interface V2PaletteDefinition {
  id: V2PaletteId;
  labelKey: string;
  descriptionKey: string;
  preview: {
    light: V2PalettePreview;
    dark: V2PalettePreview;
  };
}
```

- Storage key: `orbit.v2-palette`
- Default palette: `"mint"`
- DOM attribute: `document.documentElement.dataset.v2Palette = next`
- Exports: `V2_PALETTES`, `DEFAULT_V2_PALETTE`, `V2_PALETTE_STORAGE_KEY`, `isV2PaletteId`, `initializeV2Palette`, `setV2Palette`, `useV2Palette`
- Bootstrapped in `frontend/src/main.tsx` immediately after `initializeTheme()` so saved `"ocean"` palette applies before first paint.

### 3.2 Settings Store (`frontend/src/stores/useSettingsStore.ts`)

Storage key: `orbit.settings.v1`

```ts
export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "workspace"
  | "agent";

export type WeekStartDay = "sunday" | "monday";
export type CalendarDefaultView = "month" | "week";
export type AgentBubbleMode = "compact" | "docked";

export interface UserSettings {
  notifications: {
    showUnreadBadge: boolean;
    autoRefresh: boolean;
    defaultFilter: "all" | "unread";
  };
  workspace: {
    defaultTaskStatus: "" | "pending" | "in-progress" | "completed" | "given-up";
    defaultCalendarView: CalendarDefaultView;
    weekStartsOn: WeekStartDay;
  };
  agent: {
    showFloatingBubble: boolean;
    defaultBubbleMode: AgentBubbleMode;
  };
}
```

- Defaults preserve all existing app behavior on clean storage:
  - `notifications`: `{ showUnreadBadge: true, autoRefresh: true, defaultFilter: "all" }`
  - `workspace`: `{ defaultTaskStatus: "", defaultCalendarView: "month", weekStartsOn: "sunday" }`
  - `agent`: `{ showFloatingBubble: true, defaultBubbleMode: "compact" }`
- Safe storage parser merges partial/corrupt JSON with defaults and tolerates storage exceptions.
- Listens to `window` `storage` events for cross-tab synchronization.
- Actions: `updateNotifications`, `updateWorkspace`, `updateAgent`, `resetSettings`.

### 3.3 Integration with Existing Features

| Setting | Consumer File(s) | Exact Behavior |
| --- | --- | --- |
| `v2Palette` (`mint` / `ocean`) | `main.tsx`, `v2-palettes.css`, `V2SettingsPage` | Sets `data-v2-palette` on `<html>`; changes `.v2-app` CSS variables in Light & Dark modes. |
| `notifications.showUnreadBadge` | `NotificationBell.tsx` | Hides unread count badge when `false`; bell still works and opens panel. |
| `notifications.autoRefresh` | `notificationQueries.ts` | Sets `refetchInterval: autoRefresh ? 60_000 : false`. |
| `notifications.defaultFilter` | `NotificationsPage.tsx` | Initializes `filter` state to `"all"` or `"unread"`. |
| `workspace.defaultTaskStatus` | `useDashboardModel.ts` | Initializes `status` state to saved default task status. |
| `workspace.defaultCalendarView` | `v2/pages/CalendarPage.tsx`, `calendar/CalendarPage.jsx` | Initializes `viewMode` state (`"month"` or `"week"`). |
| `workspace.weekStartsOn` | `calendarRanges.ts`, `v2/pages/CalendarPage.tsx`, `calendar/components/CalendarView.jsx` | Shifts `getStartOfWeek`, `buildWeekDays`, `buildMonthDays`, `getBufferedCalendarRange`, `getVisibleCalendarRange` to Sunday (0) or Monday (1). |
| `agent.showFloatingBubble` | `V2Layout.tsx`, `V1RouteLayout.tsx` | Conditionally renders `V2AgentChatBubble` / `AgentChatBubble`. When hidden in V2, resets dock width to closed. |
| `agent.defaultBubbleMode` | `V2AgentChatBubble.tsx` | Uses saved `"compact"` or `"docked"` mode when opening the bubble (except on narrow viewports where compact remains safe). |

### 3.4 Routing & Navigation Updates

- `frontend/src/features/settings/routes.tsx`:
  - `/settings` → lazy-loads V1 `SettingsPage`
  - `/profile` → `<Navigate to="/settings" replace />`
- `frontend/src/features/v2/routes.tsx`:
  - `/v2/settings` → lazy-loads V2 `SettingsPage`
  - `/v2/profile` → `<Navigate to="/v2/settings" replace />`
- `frontend/src/shared/navigation/uiVersions.ts`:
  - Register `{ id: "settings", v1: "/settings", v2: "/v2/settings" }`.
  - Accept `/settings`, `/profile`, and `/v2/settings` in `isSupportedProtectedPath`.
  - Map `/settings` ↔ `/v2/settings` (and `/profile` → `/v2/settings`) in `getVersionDestination`.
- `frontend/src/shared/components/Topbar.jsx`:
  - Map `settings` route title; clicking the V1 avatar button navigates to `/settings`.
- `frontend/src/features/v2/components/V2Topbar.tsx`:
  - Display `Settings` / `Cài đặt` section title for `/v2/settings`.
- `frontend/src/features/v2/components/V2Sidebar.tsx`:
  - Bottom footer places User Avatar link (`/v2/settings`) directly beside the Sign out button.

---

## 4. Visual & UX Details

- **V2 Settings Layout (`/v2/settings`)**:
  - Desktop (`>= 1024px`): 2-column layout — sticky Liquid Glass section navigation card on the left (`240px`) + `GlassPanel` section workspace on the right.
  - Mobile / Tablet (`< 1024px`): Horizontal scrollable pill tabs at the top + full-width `GlassPanel` content below.
  - Inline feedback banners/messages for profile saves, avatar updates, password changes, category creation/deletion, and reset confirmation (replacing jarring `window.alert()` calls on the new settings page).
  - Color Palette cards display real dual-swatch visual previews (canvas, glass surface, accent pill) matching the currently active Light/Dark theme, with clear selected indicator (`aria-pressed="true"` + check icon) so selection never depends on color alone.
- **V1 Settings Layout (`/settings`)**:
  - Same 5-section navigation structure styled with V1 semantic tokens (`ui-section-card`, `ui-btn-primary`, `ui-btn-secondary`, `ui-input`) and **omits** the V2 Color Palette section completely.
- **Accessibility & i18n**:
  - Full English (`en/account.json`, `en/v2.json`, `en/common.json`) and Vietnamese (`vi/account.json`, `vi/v2.json`, `vi/common.json`) translations.
  - All primary buttons/switches have ≥44×44px hit targets, associated labels, `role="switch"` with `aria-checked`, visible keyboard focus rings, and ≥4.5:1 text contrast across Light/Dark × Mint/Ocean.
  - Respects `prefers-reduced-motion` and `prefers-reduced-transparency`.

---

## 5. Error Handling & Edge Cases

1. **Corrupt or unavailable `localStorage`**: Both `v2Palettes.ts` and `useSettingsStore.ts` wrap `localStorage` access in `try/catch` and sanitize invalid values back to defaults without crashing.
2. **Broken avatar image URL**: Both `V2Sidebar` avatar and Settings profile header fall back cleanly to the user's initial letter if the `<img>` fails to load, and recover automatically when `avatarUrl` changes.
3. **Profile/Password API failures**: Keep user form drafts intact on error and display inline `role="alert"` error messages via `getApiErrorMessage`.
4. **Protected `Uncategorized` category**: Cannot be deleted from the Workspace quick-manage list (delete action hidden/disabled for `Uncategorized`).
5. **Switching V1 ↔ V2 while on Settings**: `VersionSwitcher` preserves the Settings destination (`/settings` ↔ `/v2/settings`) with `isFallback: false`.
6. **Legacy `/profile` links**: Navigating to `/profile` redirects cleanly to `/settings` without 404.

---

## 6. Acceptance Criteria & Verification Strategy

1. **Unit & Integration Tests (Vitest)**:
   - `v2Palettes.test.ts`: initialization, setting `mint`/`ocean`, `localStorage` persistence, invalid value fallback, `data-v2-palette` DOM sync, cross-tab `storage` event.
   - `useSettingsStore.test.ts`: default state, partial updates, persistence, corrupt JSON recovery, reset to defaults.
   - `calendarRanges.test.ts`: Monday vs Sunday `weekStartsOn` calculations for week and month views.
   - `uiVersions.test.ts`: `/settings` ↔ `/v2/settings` mapping, `/profile` still supported.
   - `V2Sidebar.test.tsx` / `V2Layout.test.tsx`: renders user avatar link to `/v2/settings` next to Sign out, active highlight, avatar fallback, and Sign out still works.
   - `SettingsPage.test.tsx`: renders all 5 sections in V1 (without V2 color picker) and V2 (with Mint/Ocean picker), toggles persist to store, profile edit & password validation work cleanly.
2. **Playwright E2E Verification (`frontend/e2e/settings.spec.ts` + regression specs)**:
   - V2 Sidebar shows user avatar right next to Logout; clicking avatar opens `/v2/settings`.
   - Switching Mint ↔ Ocean in V2 updates `data-v2-palette="ocean"`, persists across reload, and visually changes computed styles in both Light and Dark modes.
   - V1 `/settings` (and `/profile` redirect → `/settings`) renders all 5 sections and does NOT display the V2 Color Palette picker.
   - Toggling `showFloatingBubble` hides/shows the AI assistant bubble; toggling `showUnreadBadge` hides/shows the notification badge; changing `weekStartsOn` shifts Calendar column headers; updating Profile persists via API mock.
   - Responsive check at `390px` (mobile), `768px` (tablet), `1440px` (desktop) in both EN and VI with zero horizontal overflow, plus screenshots inspected directly.
3. **Quality Gates**:
   - `cd frontend && pnpm test`
   - `cd frontend && pnpm run test:e2e -- settings.spec.ts frontend-v2.spec.ts v2-workspace-layout.spec.ts v2-glass-consistency.spec.ts app.spec.ts`
   - `cd frontend && pnpm run lint && pnpm run format:check && pnpm run build`

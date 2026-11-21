# V2 Collapsible Sidebar & Apple Liquid Glass Consistency Audit — Design Spec

## 1. Goal & Scope

1. **Collapsible Desktop Sidebar**: Allow desktop users (`>= 1024px`) to collapse and expand the V2 Liquid Glass navigation rail (`232px` <-> `78px`) smoothly with persisted state in `localStorage` (`orbit.v2-sidebar-collapsed`), centered icon-only navigation, accessible labels/tooltips, and a neatly stacked avatar/sign-out footer.
2. **Apple Liquid Glass Consistency Polish**: Resolve visual and material inconsistencies found via a full click-through Playwright audit across all V2 pages, dialogs, popovers, and color palettes (especially Golden Dark & Crimson Dark).

## 2. Collapsible Sidebar Specification

- **State**: Managed in `V2Layout.tsx`, initialized from `localStorage.getItem("orbit.v2-sidebar-collapsed") === "true"` (default `false` so existing wide layout and tests remain unchanged).
- **Toggle Control**: Rendered inside `V2Sidebar.tsx` when `collapsible` is enabled (desktop rail only; omitted inside mobile `V2Dialog` drawer). Uses `PanelLeftClose` / `PanelLeftOpen`, `aria-expanded={!collapsed}`, `data-testid="v2-sidebar-toggle"`, localized labels (`collapseSidebar` / `expandSidebar`).
- **Collapsed Presentation (`data-collapsed="true"`)**:
  - `.v2-sidebar-desktop[data-collapsed="true"]` transitions smoothly to `w-[78px] basis-[78px]`.
  - Brand header stacks/centers the Orbit symbol with the expand button cleanly without clipping.
  - Navigation links stay accessible (`sr-only` text labels when collapsed, `title` tooltips on hover) and center icons cleanly inside glass active pills.
  - Sidebar footer stacks vertically (`flex-col items-center gap-2`) with a compact `44x44` Avatar Settings button above the Sign-out icon button.

## 3. Liquid Glass Audit Findings & Fixes

| #   | Surface                                                          | Issue Found in Audit                                                                                                                                     | Fix                                                                                                                                            |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `CustomCursor` in V2                                             | Hardcoded cyan `#22c5db` cursor dot & snap glow on Golden/Crimson/Ocean palettes                                                                         | Bind `--cursor-dot-bg` on `:root:has(.v2-app)` per V2 palette in `v2-palettes.css`                                                             |
| 2   | `.v2-topbar .v2-btn`, `.v2-glass-pill`, `.v2-navigation::before` | Hardcoded dark-teal / mint RGB gradients leak onto Golden, Crimson, and Ocean pills                                                                      | Derive glass lens gradients dynamically via `color-mix(in srgb, var(--v2-accent) ..., var(--v2-glass-fill) / var(--v2-shell-fill))`            |
| 3   | `.v2-dialog-panel` (`AddProjectForm` in `V2Dialog`)              | Shared V1 forms render dark navy inputs & cyan primary buttons inside V2 dialogs                                                                         | Remap `--color-*` tokens to `--v2-*` tokens inside `.v2-dialog-panel`                                                                          |
| 4   | Calendar Day Panel (`.v2-calendar-day-panel`)                    | `.v2-agent-panel:not(.v2-agent-history)` `position: relative` overrode `.v2-calendar-day-panel` `position: fixed`, clipping the panel at the bottom-left | Increase selector specificity `.v2-agent-panel.v2-calendar-day-panel` with `fixed` on desktop and `static` on `<= 899px`                       |
| 5   | Statistics (`date-input`, `preset-btn`, `link`, charts)          | Hardcoded dark teal `rgba(15,37,42,0.75)` on date inputs, mint hover/shadows, hardcoded mint chart colors                                                | Use `--v2-input-fill`, `color-mix` with `--v2-accent`, `var(--v2-accent-ink)` hover text, and live computed palette tokens                     |
| 6   | `TaskDetailsDialog` & `TaskRow`                                  | Hardcoded Tailwind `bg-green-500/10`, `text-green-600`, `bg-black/5 dark:bg-white/5` bypass V2 tokens                                                    | Use `--v2-success`, `--v2-warning`, `--v2-accent`, `--v2-input-fill`, and `--v2-border`                                                        |
| 7   | `NotificationsPage` (V2)                                         | Filter pills lacked glass segmented tray styling and pagination active text lacked `--v2-accent-ink` contrast on Golden Dark                             | Style `.v2-notifications-page .notification-filters` as a Liquid Glass segmented control and bind `--color-primary-text: var(--v2-accent-ink)` |

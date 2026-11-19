# Orbit UI/UX guide

Read this when changing a web layout, component, interaction, or user-facing copy. Open the affected route and a neighboring screen before choosing a pattern. Use the [frontend architecture guide](../architecture/frontend.md) for component ownership, routing, and state.

## Choose the visual system for the route

| Area | Visual conventions and source files |
| --- | --- |
| V1 workspace | Match the existing [`MainLayout`](../../frontend/src/shared/layouts/MainLayout.jsx) and reuse the semantic `--color-*` tokens from [`index.css`](../../frontend/src/styles/index.css) in Tailwind utilities. |
| V2 workspace (`/v2/*`) | Match the shell in [`V2Layout`](../../frontend/src/features/v2/layouts/V2Layout.tsx) and reuse the Liquid Glass tokens from [`tokens.css`](../../frontend/src/features/v2/styles/tokens.css) in Tailwind utilities. Keep overlays inside the V2 theme scope. |
| Landing and authentication | Use the current pages as composition references. [`landing.css`](../../frontend/src/styles/landing.css) and [`auth.css`](../../frontend/src/styles/auth.css) describe the existing visual treatment. |

Reuse the existing theme and language controls. For shared component changes, verify the affected V1 and V2 routes.

## Tailwind-only for new styling

- Use Tailwind utilities in JSX or TSX for all new or changed component styling, including layout, responsive behavior, themes, interaction states, and effects. Keep the utilities with the elements they style.
- Keep shared styling in reusable React components and express variants with Tailwind class combinations. Reuse existing semantic tokens through utilities such as `bg-[var(--v2-surface-solid)]` and `rounded-[var(--v2-radius-control)]`.
- Keep standalone stylesheets and CSS Modules out of new development. Use Tailwind utilities directly for new styles in existing features as well.
- Existing components and theme tokens remain available for reuse. When a legacy selector overlaps with a style being changed, inspect computed styles, migrate the affected styling to Tailwind, and verify the relevant states and breakpoints with Playwright.

## V2 visual style

- **Color and material.** Use the quiet mint-blue canvas and fine grid in light mode and the deep blue-green canvas in dark mode. Use semantic tokens for ink, muted text, accents, status, and borders. Reserve the clearest glass for the sidebar and topbar, use more opaque content panels, and keep rows and inputs legible. Use subtle edge highlights and soft depth on major surfaces. Use solid surfaces when blur is unsupported or reduced transparency is requested.
- **Typography and copy.** Use the heading and body stacks already defined in the tokens. Put the page identity in the topbar and keep a semantic page heading for assistive technology. Use visible headings for functional sections. Keep text when it helps users navigate, decide, act, or understand a result. Omit decorative heroes, eyebrow labels, and badges that repeat information.
- **Spacing and hierarchy.** Follow the neighboring surface's spacing and the shared card, control, and pill radius tokens. Group related data in a single panel with clear row dividers. Give the primary action the accent treatment and use quieter variants for secondary actions. Use Lucide icons where the existing components use them.
- **Composition.** Use the labeled sidebar and compact topbar on desktop, and the navigation drawer on smaller screens. Let long names and translated labels wrap while keeping primary controls reachable. Fit content to the available width even with the assistant dock open.

## Component and interaction patterns

| When changing | Start here |
| --- | --- |
| Panels, buttons, and fields | Reuse existing components where they fit. Use [`GlassPanel`](../../frontend/src/features/v2/components/GlassPanel.tsx) and the current controls as visual references when creating Tailwind-styled components or variants. |
| Task toolbar, rows, and status | Use the [Dashboard](../../frontend/src/features/v2/pages/DashboardPage.tsx) as a reference. Keep search, filters, and the create action together. Use text or an icon with an accessible label alongside color for status. Keep the task title, due date, and available action easy to find on narrow screens. |
| Dialogs and forms | Reuse [`V2Dialog`](../../frontend/src/features/v2/components/V2Dialog.tsx) in V2 and [`FormDialog`](../../frontend/src/shared/components/FormDialog.jsx) where used in V1. Keep focus inside the dialog and return it to the trigger on close. Preserve drafts after failed submissions. Show errors near the failing input or action, and make pending saves visible. |
| Calendar, statistics, and chat | Match the relevant [page](../../frontend/src/features/v2/pages/) and its styles. Make selected dates and chart values understandable without color alone. Keep chat's composer and send action reachable in popup, docked, and full-page views. |

Distinguish loading, empty data, filtered results with no matches, and errors. Give each state an appropriate action when available, such as creating an item, clearing filters, or retrying. Keep usable content visible during background refreshes.

Use named buttons, associated input labels, visible keyboard focus, and logical tab order. Keep primary touch targets at least 44×44 CSS pixels. Check contrast against the composited surface in both themes. Use 4.5:1 for normal text and 3:1 for large text as design targets. Respect reduced motion, reduced transparency, and forced colors. Add new user-facing copy to the relevant English and Vietnamese [i18n namespace](../../frontend/src/shared/i18n/locales/).

## Playwright review

Apply the [workflow's browser pass criteria](../workflow.md#when-testing-counts-as-passed). Personally exercise the affected flow in Playwright and verify its visible result. For layout changes, use 320–390px mobile, 768px tablet, and 1440px desktop as reference widths. Check both themes and longer Vietnamese labels where layout may shift. Inspect clipping, horizontal overflow, controls hidden by overlays, and keyboard focus. For visual changes, capture and inspect screenshots of the affected states as part of that review.

Run the relevant specs from `frontend/`. Good starting points are [responsive and theme coverage](../../frontend/e2e/frontend-v2-visual.spec.ts), [workspace layout](../../frontend/e2e/v2-workspace-layout.spec.ts), and [glass consistency](../../frontend/e2e/v2-glass-consistency.spec.ts). Report the routes, viewports, and scenarios checked. State when API fixtures were used.

For visual reference, open the [V2 polish review](../superpowers/reviews/2026-11-18-v2-ux-polish.md) and its [mobile workspace](../superpowers/reviews/assets/2026-11-18-v2-polish/dashboard-mobile.png) and [mobile chat](../superpowers/reviews/assets/2026-11-18-v2-polish/agents-mobile.png) screenshots. Review screenshots are snapshots. Use the current route and CSS for the details of the screen being changed.

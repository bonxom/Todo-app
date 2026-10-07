# Orbit brand UI demo

Branch: `feat/orbit-brand-ui-demo`. Preview: `/ui-demo` (no sign-in required).
Run `pnpm --dir frontend dev`, then visit http://localhost:5000/ui-demo.

## Logo analysis

Source: `frontend/public/logo.png`. This image is a brand board, with its own
explicit color labels; use those labels rather than estimates of anti-aliased
pixels. It combines an open steel-blue ring, an indigo orbit, a cyan check and
satellite, and a heavy midnight wordmark. The check grounds the space metaphor
in task completion. The monochrome version confirms that silhouette, not glow,
is the essential recognizable element.

| Source color            | Role in the demo                                                   |
| ----------------------- | ------------------------------------------------------------------ |
| `#456B8C`               | Steel blue: focus button, selected navigation, structural identity |
| `#6065B4`               | Indigo: orbit stroke and project progress                          |
| `#22C5DB`               | Cyan: primary creation action, daily completion, focus satellite   |
| `rgba(34,197,219,0.62)` | Logo glow reference; no ambient glow on workspace surfaces         |
| `#111827`               | Midnight: primary workspace canvas                                 |

Supporting shades are derived UI surfaces and readable text colors, not extra
brand colors. Cyan buttons use dark text. Steel blue buttons use white text.
Small project dots use lighter tints to remain visible against midnight.

## Design decisions

- Quiet midnight workspace, darker sidebar, generous typography and spacing.
- Task rows separated by rules; project metadata is secondary text rather than badges.
- One orbit motif, in the focus timer. No floating cards or animated backdrops.
- Brand explanation and original logo accessible from the preview itself.
- Responsive navigation and stacked task-first mobile layout.
- Uses the supplied `frontend/src/assets/Orbit.tsx` mark without editing it.

## Interaction and scope

Today, Projects and Calendar views; task completion and reopening; search;
project filters; completed-task visibility; task creation in a native modal;
start/pause/reset a 25-minute focus timer; calendar day selection; brand palette.

All tasks are fictional, tied to October 3, 2026, and held in memory. Refresh
resets them. Project percentages and deadlines are explicitly sample data.
No backend integration or AI calls. Existing app routes keep their behavior.

## Revised implementation: light by default, Orbit dark mode

Following feedback, `/ui-demo` remains an exploratory prototype. The actual app
keeps its existing light palette and layout as the default. Dark mode is opt-in
from the moon/sun control on the landing, auth pages, and workspace topbar.
The `orbit-theme` preference persists across navigation/reloads and synchronizes
between tabs. A dark OS preference does not override the default light theme.

Both modes share tokens. The light UI keeps steel blue buttons; dark mode uses
midnight surfaces, cyan creation buttons with dark text, and readable steel-blue
tints for navigation. Landing previews are static, without ambient gradients,
orbit decorations, or floating badges. Copy describes concrete task workflows.
Task metadata uses text instead of a row of colored pills. Persistent surfaces
have less shadow; creation buttons use consistent corners. Mobile task lists
appear before the project rail. Existing task workflows and backend APIs remain.

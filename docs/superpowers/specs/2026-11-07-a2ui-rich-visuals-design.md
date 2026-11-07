# A2UI Rich Visual Components & Orbit Design System Alignment

**Date:** 2026-11-07  
**Catalog ID:** `urn:orbit:a2ui:composition:v1` (`v0.9` envelope protocol)

## 1. Problem & Goals

The initial A2UI composition catalog (`Column`, `Row`, `Card`, `Text`, `Table`, `TaskProposalForm`, `TaskList`, `TaskProposalActions`) validated and rendered safe structured surfaces, but suffered from two limitations:

1. **Visual disconnect from Orbit's design language:**
   - `.a2ui-card` used `background: var(--color-surface)` inside chat bubbles that already use `var(--color-surface)`, resulting in flat, washed-out boxes with no surface hierarchy, header treatment, or semantic accents.
   - `TaskList`, `TaskProposalActions`, and `TaskProposalForm` used raw browser `<fieldset>`/`<legend>` borders and unstyled buttons without priority indicators or clear primary/secondary action hierarchy.
2. **Missing data-visualization and diagram components:**
   - The catalog lacked KPI metrics (`Stat`), charts (`Chart`), and diagrams (`Diagram`), forcing the agent to fall back to plain text or tables even when visual summaries, schedules, or workflows were requested.

### Goals

1. Expand `urn:orbit:a2ui:composition:v1` with three read-only visual components — **`Stat`**, **`Chart`**, and **`Diagram`** — and optional header/tone metadata on **`Card`** (`title`, `subtitle`, `tone`).
2. Enforce strict server-side and client-side validation for all new components and their `/display/<key>` bindings.
3. Redesign A2UI presentation (`composition.css`) and task proposal (`taskProposal.css`, `TaskList.tsx`, `TaskProposalActions.tsx`) styling to match Orbit's Statistics and Workspace design system in both light and dark themes.
4. Keep `backend/skills/content/ui-composition/SKILL.md` concise (`<= 10,000` characters) while teaching the model when and how to choose `Stat`, `Chart`, and `Diagram`.

### Non-Goals

- Arbitrary model-authored HTML, CSS, SVG, or JavaScript inside A2UI surfaces.
- Interactive write actions on `Stat`, `Chart`, or `Diagram` (all three are strictly read-only presentation nodes).
- Changing task proposal action endpoints, revision semantics, or idempotency rules.

---

## 2. Catalog & Schema Contract Changes

### 2.1 Shared Tone & Scalar Types

- `UiTone`: `"default" | "accent" | "success" | "warning" | "danger"`
- `CardTone`: `"default" | "accent" | "muted"`
- `ChartType`: `"bar" | "line" | "doughnut"`
- `ChartSeriesSpec`: `{ key: KeyName; label: string (1..200 chars, trimmed) }`

### 2.2 Updated & New Component Nodes (`UiNode`)

1. **`Card` (backward-compatible enhancement):**
   - Authoring & compiled properties:
     - `id: KeyName`
     - `component: "Card"`
     - `children: KeyName[]` (`0..100`)
     - `title?: string` (`1..200` chars when provided, trimmed)
     - `subtitle?: string` (`1..300` chars when provided, trimmed)
     - `tone?: "default" | "accent" | "muted"` (optional, defaults to `"default"` at render time)

2. **`Stat` (new leaf presentation component):**
   - Authoring properties:
     - `id: KeyName`
     - `component: "Stat"`
     - `label: string` (`1..120` chars, trimmed)
     - `value: { literal: DisplayScalar } | { path: "/display/<key>" }`
     - `caption?: string` (`1..200` chars, trimmed)
     - `progress?: number` (finite number `0..100`)
     - `tone?: UiTone`
   - Compiled properties (`updateComponents`):
     - `value` compiles `{ literal: scalar }` to `scalar` and `{ path: "/display/<key>" }` to `{ path: "/display/<key>" }` (matching `Text` compilation).
   - Binding validation:
     - If `value` is `{ path }`, the key must exist in `displayData` and its value must be a scalar (`not Array.isArray`).

3. **`Chart` (new leaf presentation component):**
   - Authoring properties:
     - `id: KeyName`
     - `component: "Chart"`
     - `chartType: "bar" | "line" | "doughnut"`
     - `title?: string` (`1..200` chars, trimmed)
     - `rowsPath: "/display/<key>"`
     - `labelKey: KeyName`
     - `series: ChartSeriesSpec[]` (`1..4` items; unique `key`s; when `chartType === "doughnut"`, `series` must have length `1`)
   - Compiled properties (`updateComponents`):
     - `rowsPath` compiles to `rows: { path: "/display/<key>" }` (matching `Table` compilation).
     - `chartType`, `title` (if present), `labelKey`, `series` are preserved.
   - Binding validation:
     - `rowsPath` must resolve to an array in `displayData` (`0..50` rows).
     - `labelKey` must not collide with any `series[i].key`, and all `series[i].key` values must be unique.
     - Every row in `displayData[key]` must contain `labelKey` with a non-null scalar (`string | number | boolean`) and every declared `series[i].key` with a finite `number` (`typeof row[seriesKey] === "number" && Number.isFinite(row[seriesKey])`).
     - When `chartType === "doughnut"`, every series number must be `>= 0`.

4. **`Diagram` (new leaf presentation component):**
   - Authoring properties:
     - `id: KeyName`
     - `component: "Diagram"`
     - `title?: string` (`1..200` chars, trimmed)
     - `value: { literal: string } | { path: "/display/<key>" }`
   - Compiled properties (`updateComponents`):
     - `value` compiles `{ literal: str }` to `str` and `{ path }` to `{ path }`.
   - Binding validation:
     - Resolved Mermaid source (from `literal` or `displayData[key]`) must be a non-empty `string` of `1..4000` characters (`value.trim().length > 0`).

---

## 3. UI & Visual Design Specification

### 3.1 Orbit Surface & Card Hierarchy (`composition.css`)

- **`.a2ui-card`:**
  - Elevated surface inside chat bubbles: `background: var(--color-surface)` with subtle contrast header/border (`1px solid var(--color-line)`), `border-radius: var(--radius-xl, 12px)`, `box-shadow: var(--shadow-xs)`, `padding: 1rem`.
  - Tone variants:
    - `.a2ui-card--accent`: top/left accent border (`border-left: 3px solid var(--color-accent)`), subtle tinted background (`color-mix(in srgb, var(--color-accent-soft) 38%, var(--color-surface))`).
    - `.a2ui-card--muted`: `background: var(--color-surface-muted)`.
  - Optional `.a2ui-card-header` with `.a2ui-card-title` (`0.925rem`, `font-weight: 650`) and `.a2ui-card-subtitle` (`0.78rem`, `color: var(--color-text-muted)`).

- **`.a2ui-text`:**
  - `.a2ui-text-heading`: `1.05rem`, `font-weight: 650`, `letter-spacing: -0.015em`, `color: var(--color-text)`.
  - `.a2ui-text-normal`: `0.885rem`, `line-height: 1.55`.
  - `.a2ui-text-muted`: `0.785rem`, `line-height: 1.45`, `color: var(--color-text-muted)`.

- **`.a2ui-table`:**
  - Rounded container (`var(--radius-lg, 10px)`), `background: var(--color-surface)`, `box-shadow: var(--shadow-xs)`.
  - `th`: uppercase eyebrow style (`0.7rem`, `letter-spacing: 0.05em`, `font-weight: 650`, `background: var(--color-surface-muted)`).
  - `tbody tr:hover td`: subtle row highlight (`color-mix(in srgb, var(--color-accent-soft) 45%, transparent)`).
  - Numeric values use `font-variant-numeric: tabular-nums`.

### 3.2 `Stat` Component

- Renders `.a2ui-stat` with tone class `.a2ui-stat--<tone>`:
  - Top eyebrow label (`.a2ui-stat-label`, `0.75rem`, `color: var(--color-text-muted)`, `font-weight: 600`) with a colored status dot matching `tone`.
  - Large metric value (`.a2ui-stat-value`, `1.65rem`, `font-weight: 650`, `letter-spacing: -0.03em`, `font-variant-numeric: tabular-nums`).
  - Optional progress bar (`.a2ui-stat-progress`, `height: 6px`, `border-radius: 999px`, track `var(--color-surface-muted)`, fill colored by `tone`, clamped `0..100` with `role="progressbar"` and `aria-valuenow`).
  - Optional caption (`.a2ui-stat-caption`, `0.75rem`, `color: var(--color-text-muted)`).

### 3.3 `Chart` Component

- Renders `.a2ui-chart` card with optional header title and series legend:
  - Series palette uses Orbit semantic CSS tokens:
    1. `var(--color-accent)`
    2. `var(--color-success)`
    3. `var(--color-warning)`
    4. `var(--color-danger)`
  - **Empty state (`rows.length === 0`):** Renders `.a2ui-chart-empty` message (`"No chart data available"`).
  - **`bar` chart:** Accessible `<svg role="img" aria-label={...}>` + grouped vertical bars with horizontal grid lines, category labels along the X axis, and tabular value labels/legend.
  - **`line` chart:** Accessible `<svg role="img" aria-label={...}>` with polyline/area path, data vertex circles, horizontal grid lines, X-axis labels, and legend.
  - **`doughnut` chart:** Orbit `conic-gradient` ring (matching `DonutChartCard.jsx`) with centered total (`tabular-nums`) and percentage breakdown legend.

### 3.4 `Diagram` Component

- Renders `.a2ui-diagram` wrapping the existing `MermaidDiagram` component (`@/features/tasks/components/chat/MermaidDiagram`) with optional `.a2ui-diagram-title` header.
- Inherits `MermaidDiagram`'s `Diagram` / `Code` tabs, zoom controls (`-` / `+`), `Copy` button, and graceful fallback to `Code` tab on invalid Mermaid syntax.

### 3.5 Task Proposal Redesign (`TaskList.tsx`, `TaskProposalActions.tsx`, `taskProposal.css`)

- Each task card (`.task-proposal-item`) replaces raw browser fieldset styling with an Orbit card featuring:
  - Left accent stripe colored by priority (`data-priority="High" | "Medium" | "Low"` → `--color-danger`, `--color-warning`, `--color-accent`).
  - Top bar with task number badge, semantic priority pill, and custom-styled selection checkbox toggle.
  - Clean form grid with `var(--radius-sm)` inputs, focus rings (`--ring-focus-shadow`), and subtle muted labels.
  - Distinct footer action buttons: `.task-proposal-btn-cancel` (subtle ghost/danger hover), `.task-proposal-btn-save` (secondary surface button), and `.task-proposal-btn-confirm` (primary accent button with shadow).
  - Preserves all existing `aria-label`s, `<fieldset disabled={locked}>` semantics, and `<legend>` text (`Công việc ${index + 1}`) so accessibility and all existing unit/E2E tests continue to pass without regressions.

---

## 4. Error Handling & Edge Cases

1. **Invalid bindings or non-numeric chart values:** Rejected by `parseSurfaceSpec` on the server (triggering safe fallback to plain text or standard `TaskProposalForm` for proposals) and by `validateCompositionPayload` on the client (rendering `fallbackText` in `UiSurfaceMessage`).
2. **Empty chart rows (`[]`):** Permitted by schema (`0..50` rows) and rendered as a clean empty state without divide-by-zero or NaN coordinates.
3. **All-zero chart values:** Handled safely with a minimum scale ceiling of `1` so SVG coordinates and doughnut percentages never produce `NaN` or `Infinity`.
4. **Invalid Mermaid syntax at runtime:** `MermaidDiagram` catches syntax errors and switches to the `Code` tab while displaying the error banner.
5. **Skill size limit:** `backend/skills/content/ui-composition/SKILL.md` must remain `<= 10,000` characters (`MAX_DOCUMENT_CHARS`) and all JSON code blocks in `SKILL.md` must pass schema validation.

---

## 5. Acceptance Criteria

1. `parseSurfaceSpec`, `compileSurface`, `parseUiSurfaceEnvelope`, and frontend `validateCompositionPayload` accept valid `Card` (with `title`/`subtitle`/`tone`), `Stat`, `Chart` (`bar`, `line`, `doughnut`), and `Diagram` nodes, and reject invalid bindings, non-numeric chart series values, multi-series doughnut charts, and blank/oversized diagram strings.
2. `presentationComponents.tsx` renders `Stat`, `Chart` (`bar`, `line`, `doughnut`), `Diagram`, and enhanced `Card` with accessible markup and Orbit theme tokens.
3. `TaskList` and `TaskProposalActions` apply priority-aware styling (`data-priority`) and button hierarchy while preserving all existing accessibility labels and interactive behavior.
4. `backend/skills/content/ui-composition/SKILL.md` documents `Stat`, `Chart`, and `Diagram` selection criteria and stays `<= 10,000` characters.
5. All backend and frontend unit tests, lint checks, format checks, and builds pass.

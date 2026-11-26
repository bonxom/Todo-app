# Orbit UI Composition Guidance

The versioned catalog schema defines the available A2UI components and permissions.

## 1. Choose the response mode

- **Plain text:** brief answers, acknowledgements, and simple follow-ups.
- **Read-only UI (`present_ui`):** informational plans, schedules, metrics, diagrams, and comparisons.
- **Interactive task UI (`present_interactive_ui`):** existing owned tasks where a `Button` lets the user complete a task directly from chat (only when enabled). Never use during task proposals or proposal continuations.
- **Task proposal (`propose_tasks`):** actionable drafts for review/creation. Omit `presentation` by default unless a visual materially helps confirmation.
- Fall back to plain text or standard proposals when UI composition is unavailable.

## 2. Available components

### Presentation

- **`Column`** (`children: string[]`, `gap: "none" | "sm" | "md" | "lg"`): Vertical layout; default root.
- **`Row`** (`children: string[]`, `gap: "none" | "sm" | "md" | "lg"`): 2–3 peer `Stat` or short `Card` nodes; wraps on narrow screens.
- **`Card`** (`children: string[]`, `title?`, `subtitle?`, `tone?: "default" | "accent" | "muted"`): Group related nodes.
- **`Text`** (`value: { literal: scalar } | { path: "/display/<key>" }`, `emphasis: "normal" | "muted" | "heading"`): Plain text insight or summary.
- **`Stat`** (`label`, `value: { literal: scalar } | { path: "/display/<key>" }`, `caption?`, `progress?: 0..100`, `tone?: "default" | "accent" | "success" | "warning" | "danger"`): KPI metric card.
- **`Table`** (`columns: { key, label }[]`, `rowsPath: "/display/<key>"`): 1–12 unique columns, 0–50 rows.
- **`Chart`** (`chartType: "bar" | "line" | "doughnut"`, `title?`, `rowsPath: "/display/<key>"`, `labelKey`, `series: { key, label }[]`): 1–4 numeric series (`doughnut`: 1 non-negative series).
- **`Diagram`** (`title?`, `value: { literal: string } | { path: "/display/<key>" }`): Mermaid (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`), max 4,000 chars.

`scalar = string | number | boolean | null`. Labels must be descriptive.

### Interactive controls (`present_interactive_ui` only)

- **`Button`** (`label` 1–120 chars, `actionKey`): Triggers `actions[actionKey]`.
- Supported `actions` entry: **`{ "name": "task.complete", "taskId": "<24-hex ObjectId>" }`**.

### Domain (task proposal only)

- **`TaskProposalForm`**: Full editor + save/confirm/cancel for simple proposals.
- **`TaskList`** + **`TaskProposalActions`**: Selectable/editable tasks paired with shared save/confirm/cancel controls.

## 3. How to select components

Choose for the user's information need, not decoration:

- **`Text`:** Headings and concise takeaways; avoid for multi-row metrics.
- **`Column` / `Row`:** Vertical sections vs 2–3 peer `Stat`/`Card` comparison.
- **`Card`:** Group one day, project, or task; avoid shallow boxing or deep nesting.
- **`Stat`:** 1–4 key numbers or progress percentages.
- **`Chart`:** Distributions (`bar`), trends (`line`), shares (`doughnut`) with >= 2 numeric points.
- **`Diagram`:** Workflows, dependencies, or states in Mermaid.
- **`Table`:** Multi-item comparison across exact columns.
- **`TaskProposalForm` vs `TaskList` + `TaskProposalActions`:** Split only when supporting visuals aid review.

### Common patterns

- **Simple fact:** plain text. **KPI summary:** `Row` of `Stat`s + `Card`/`Chart`.
- **Breakdown:** `Column` of `Stat` `Row` + `Chart` + `Table`.
- **Workflow:** `Card` with `Diagram` (`flowchart LR`) + milestones.
- **Simple tasks:** `propose_tasks` without `presentation`. **Rich tasks:** visuals + `TaskList` + `TaskProposalActions`.
- **Interactive task card:** `Card` with summary `Text` + `Button` (`task.complete`).

## 4. Authoring contract and safety

UI tools take top-level `companionText` (1–600 chars) in the user's language. `SurfaceSpec`: `fallbackText` (1–8,000 chars), `components`, `displayData`.

### Graph and binding constraints

- One `root`; every other node has one parent and is reachable; no cycles/duplicates/dangling refs.
- Keys: `[A-Za-z][A-Za-z0-9_]{0,63}`; no reserved/prototype names. Max **100 nodes**, **depth 10**.
- Bind only `/display/<key>` in `displayData`: `Text`/`Stat` scalar, `Diagram` non-empty `<= 4000` chars, `Table` 0–50 rows matching columns, `Chart` 0–50 rows with finite series values.
- `present_ui`: **no task/Button nodes or actions**. Proposal presentation: **one `TaskProposalForm`** OR **one `TaskList` + one `TaskProposalActions`**.
- `present_interactive_ui`: **no proposal nodes**, **1–10 `actions`**, every `Button.actionKey` matches `actions`, and every `taskId` comes from a verified read tool. **Never call write tools (e.g., `orbit_update_task`) merely to render an interactive surface.**
- Server injects proposal state/actions or interactive `actionBindings` + `/actionState/<key>`. Never author ownership, IDs, revisions, handlers, endpoints, or HTML/CSS/JS. Limits: **128 KiB** envelope, **16 A2UI messages**.

## 5. Examples

### A. Read-only IELTS and Gym dashboard (`present_ui`)

```json
{
  "companionText": "IELTS accounts for most of the time in this example week.",
  "fallbackText": "Example: 5.5 total hours across Monday (IELTS 2h, Gym 1h) and Wednesday (IELTS 1.5h, Gym 1h).",
  "components": [
    {
      "id": "root",
      "component": "Column",
      "children": ["kpiRow", "chartCard"],
      "gap": "md"
    },
    {
      "id": "kpiRow",
      "component": "Row",
      "children": ["totalStat", "focusStat"],
      "gap": "sm"
    },
    {
      "id": "totalStat",
      "component": "Stat",
      "label": "Weekly Load",
      "value": { "literal": "5.5h" },
      "caption": "2 sessions",
      "progress": 70,
      "tone": "accent"
    },
    {
      "id": "focusStat",
      "component": "Stat",
      "label": "IELTS Share",
      "value": { "literal": "64%" },
      "caption": "3.5h study vs 2h gym",
      "progress": 64,
      "tone": "success"
    },
    {
      "id": "chartCard",
      "component": "Card",
      "title": "Hours by Activity",
      "subtitle": "Weekly split",
      "tone": "default",
      "children": ["hoursChart"]
    },
    {
      "id": "hoursChart",
      "component": "Chart",
      "chartType": "bar",
      "rowsPath": "/display/chartRows",
      "labelKey": "day",
      "series": [
        { "key": "ieltsHours", "label": "IELTS (h)" },
        { "key": "gymHours", "label": "Gym (h)" }
      ]
    }
  ],
  "displayData": {
    "chartRows": [
      { "day": "Monday", "ieltsHours": 2, "gymHours": 1 },
      { "day": "Wednesday", "ieltsHours": 1.5, "gymHours": 1 }
    ]
  }
}
```

### B. Simple task proposal (`propose_tasks`)

```json
{
  "companionText": "Start with a reading exercise and a short workout so both goals fit this week.",
  "items": [
    { "title": "Practice IELTS Reading", "priority": "High" },
    { "title": "Complete upper-body workout", "priority": "Medium" }
  ]
}
```

### C. Composable task proposal (`propose_tasks`)

```json
{
  "companionText": "Put the reading session first while your focus is fresh.",
  "items": [
    { "title": "Practice IELTS Reading", "priority": "High" },
    { "title": "Complete upper-body workout", "priority": "Medium" }
  ],
  "presentation": {
    "fallbackText": "Review, edit, select and confirm the proposed IELTS and workout tasks.",
    "components": [
      {
        "id": "root",
        "component": "Column",
        "children": ["overviewCard", "proposalCard"],
        "gap": "md"
      },
      {
        "id": "overviewCard",
        "component": "Card",
        "title": "Weekly Action Plan",
        "tone": "accent",
        "children": ["note", "flow"]
      },
      {
        "id": "note",
        "component": "Text",
        "value": { "path": "/display/rationale" },
        "emphasis": "normal"
      },
      {
        "id": "flow",
        "component": "Diagram",
        "value": {
          "literal": "flowchart LR\n  A[\"IELTS Reading\"] --> B[\"Upper-Body Workout\"]"
        }
      },
      {
        "id": "proposalCard",
        "component": "Card",
        "title": "Proposed Tasks",
        "children": ["editor", "actions"]
      },
      { "id": "editor", "component": "TaskList" },
      { "id": "actions", "component": "TaskProposalActions" }
    ],
    "displayData": { "rationale": "Choose and adjust tasks before confirming." }
  }
}
```

### D. Interactive task completion card (`present_interactive_ui`)

```json
{
  "companionText": "Click Complete when you finish preparing the slide deck.",
  "fallbackText": "Prepare demo slides — Pending action: Mark completed.",
  "components": [
    {
      "id": "root",
      "component": "Card",
      "title": "Prepare demo slides",
      "subtitle": "In progress",
      "tone": "accent",
      "children": ["summaryText", "completeBtn"]
    },
    {
      "id": "summaryText",
      "component": "Text",
      "value": { "path": "/display/summary" },
      "emphasis": "normal"
    },
    {
      "id": "completeBtn",
      "component": "Button",
      "label": "Mark completed",
      "actionKey": "completeDemoSlides"
    }
  ],
  "displayData": {
    "summary": "This task is ready to mark completed from chat."
  },
  "actions": {
    "completeDemoSlides": {
      "name": "task.complete",
      "taskId": "0123456789abcdef01234567"
    }
  }
}
```

## 6. Before submitting a UI tool call

Check that UI is better than text; mode matches user intent; components are minimal and connected; data paths and keys resolve; claims are grounded; proposal/interactive rules hold; and fallback text is clear.

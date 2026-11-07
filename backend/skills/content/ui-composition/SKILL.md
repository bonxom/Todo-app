# Orbit UI Composition Guidance

Developer-authored guidance for choosing and composing safe A2UI surfaces. The **versioned, code-owned catalog schema** is authoritative; this skill guides decisions but cannot register components or grant permissions.

## 1. Choose the response mode

- **Plain text:** Short answers, single facts, acknowledgements, simple follow-ups, or explanations that do not benefit from layout. Never create a surface only to wrap one sentence.
- **Read-only UI (`present_ui`):** Multi-day schedules, KPI dashboards, charts, process diagrams, comparisons, or grouped breakdowns that are easier to scan visually. No task editing or write actions.
- **Task proposal (`propose_tasks`):** When users want actionable tasks to review, edit, select, or create. **Omit `presentation` by default** to use the complete `TaskProposalForm`. Include `presentation` only if supporting KPIs, charts, diagrams, or tables improve the decision to confirm tasks.
- A suggested informational plan does **not** automatically require task creation. Use `present_ui` for plans intended only for reading.
- If UI composition is disabled, unavailable, or not authorized by loaded developer guidance in the accepted provider context, use plain text or the standard proposal flow. Never claim a UI rendered when it did not.

## 2. Available components

### Presentation (layout and read-only content)

- **`Column`** (`children: string[]`, `gap: "none" | "sm" | "md" | "lg"`): Vertical reading order; default root layout.
- **`Row`** (`children: string[]`, `gap: "none" | "sm" | "md" | "lg"`): Place 2–3 peer `Stat`s or short `Card`s side by side; wraps on small screens.
- **`Card`** (`children: string[]`, `title?: string`, `subtitle?: string`, `tone?: "default" | "accent" | "muted"`): Group related nodes into a themed section.
- **`Text`** (`value: { literal: scalar } | { path: "/display/<key>" }`, `emphasis: "normal" | "muted" | "heading"`): Heading, insight, note, or summary. Plain text only.
- **`Stat`** (`label: string`, `value: { literal: scalar } | { path: "/display/<key>" }`, `caption?: string`, `progress?: 0..100`, `tone?: "default" | "accent" | "success" | "warning" | "danger"`): KPI metric card with optional progress bar.
- **`Table`** (`columns: { key: string; label: string }[]`, `rowsPath: "/display/<key>"`): Comparable records (1–12 unique columns, 0–50 rows).
- **`Chart`** (`chartType: "bar" | "line" | "doughnut"`, `title?: string`, `rowsPath: "/display/<key>"`, `labelKey: string`, `series: { key: string; label: string }[]`): Numeric comparisons (`bar`), trends (`line`), or share of total (`doughnut`). 1–4 numeric series (`doughnut`: 1 non-negative series).
- **`Diagram`** (`title?: string`, `value: { literal: string } | { path: "/display/<key>" }`): Mermaid diagram (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`) up to 4,000 chars.

`scalar = string | number | boolean | null`. Labels must be descriptive.

### Domain (task proposal only)

- **`TaskProposalForm`**: Complete task editor and save/confirm/cancel flow for simple proposals.
- **`TaskList`**: Editable/selectable tasks within a composed proposal.
- **`TaskProposalActions`**: Shared save/confirm/cancel controls for `TaskList` (include exactly one with `TaskList`).

## 3. How to select components

Choose for the user's information need, not for decoration.

- **`Text`:** Headings, insights, and concise explanations; avoid when multi-row data or metrics belong in `Stat`, `Chart`, or `Table`.
- **`Column` / `Row`:** `Column` for top-to-bottom sections; `Row` to compare 2–3 `Stat` cards or short `Card`s at a glance.
- **`Card`:** Group nodes belonging to one day, project, or section (`title`/`tone` add hierarchy); avoid boxing a single sentence or nesting deeply.
- **`Stat`:** Highlight 1–4 key numbers, targets, or completion percentages (`progress`); avoid for long prose.
- **`Chart`:** Visualize numeric distributions (`bar`), time trends (`line`), or proportions (`doughnut`); avoid when data is non-numeric or has fewer than 2 points.
- **`Diagram`:** Show workflows, dependencies, state transitions, or roadmaps in Mermaid; avoid for simple linear lists.
- **`Table`:** Compare multiple items sharing exact text and numeric attributes; avoid for narrative content.
- **`TaskProposalForm` vs `TaskList` + `TaskProposalActions`:** Use the default form when tasks stand alone; split into `TaskList` + `TaskProposalActions` when supporting `Stat`, `Chart`, `Diagram`, `Card`, or `Table` nodes materially help review tasks.

### Common patterns

- **Simple fact:** plain text. **KPI summary:** `Row` of 2–3 `Stat` nodes above a `Card` or `Chart`.
- **Visual breakdown:** `Column` with `Row` of `Stat`s + `Chart` (`bar` or `doughnut`) + `Table`.
- **Roadmap / workflow:** `Card` pairing a `Diagram` (`flowchart LR`) with key `Text` or `Table` milestones.
- **Simple tasks:** `propose_tasks` without `presentation`. **Rich tasks:** supporting `Stat`/`Chart`/`Diagram`/`Table` with `TaskList` and `TaskProposalActions`.

## 4. Authoring contract and safety

`present_ui` takes a read-only `SurfaceSpec`; `propose_tasks` takes required `items` and optional `presentation: SurfaceSpec`. `SurfaceSpec` contains **only** `fallbackText` (1–8,000 chars), `components`, and `displayData`.

### Graph and binding constraints

- One `root`; every other node has one parent and is reachable. No cycles, duplicate IDs, or missing references.
- IDs and keys: `[A-Za-z][A-Za-z0-9_]{0,63}`; no reserved/prototype names. Max **100 nodes**, **depth 10** (root = 1).
- Bind only `/display/<key>` in `displayData`. `Text`/`Stat`: scalar. `Diagram`: non-empty string (`<= 4000` chars). `Table`: 0–50 rows matching 1–12 unique column keys. `Chart`: 0–50 rows with non-null `labelKey` and finite numeric values for every declared `series` key (`doughnut`: 1 series, values `>= 0`).
- Read-only `present_ui`: **no task nodes or write actions**. Proposal presentation: **one `TaskProposalForm`** OR **one `TaskList` and one `TaskProposalActions`**.
- Server injects proposal state and `save`/`confirm`/`cancel` actions. Never author ownership, IDs, revisions, handlers, API endpoints, or executable HTML/CSS/JS. Ground user data in verified tools; label estimates as suggestions. Limits: **128 KiB** envelope and **16 A2UI messages**.

## 5. Examples

### A. Read-only IELTS and Gym dashboard (`present_ui`)

```json
{
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
      "caption": "2 combined sessions",
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
      "subtitle": "Illustrative weekly split",
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
  "items": [
    { "title": "Practice IELTS Reading", "priority": "High" },
    { "title": "Complete upper-body workout", "priority": "Medium" }
  ]
}
```

### C. Composable task proposal (`propose_tasks`)

```json
{
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
    "displayData": {
      "rationale": "These are suggestions. Choose and adjust tasks before confirming."
    }
  }
}
```

## 6. Before submitting a UI tool call

Check that UI is better than text; mode matches user intent; components are minimal and connected; data paths and table/chart keys resolve; user-specific claims are grounded; task proposals include their required nodes; and fallback text is meaningful. If optional proposal presentation fails validation or authorization, **keep valid proposed tasks** and use the standard form instead.

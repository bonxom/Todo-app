# Orbit UI Composition Guidance

Use this developer-authored guidance to decide when a structured A2UI surface adds value over plain text and how to compose presentation and task domain components safely.

## When to use plain text vs. a structured UI surface

- **Plain text** is appropriate for short answers, single facts, conversational acknowledgements, and simple follow-ups. Do not wrap a one-sentence reply in a UI surface.
- **Read-only UI (`present_ui`)** is best when the user benefits from scannable structure: multi-day schedules (IELTS study plans, workout splits), structured comparisons (tradeoff matrices, project breakdowns), or grouped status summaries.
- **Task proposal UI (`propose_tasks`)** is required whenever proposing actionable tasks for the user to review, edit, select, and confirm. You may omit `presentation` to use the standard `TaskProposalForm`, or supply `presentation` after loading `ui-composition` to combine explanatory context/tables with `TaskList` and `TaskProposalActions`.

## Two-level component model

1. **Presentation components (layout and read-only content):**
   - `Column`: Vertical stack (`children: string[]`, `gap: "none" | "sm" | "md" | "lg"`).
   - `Row`: Horizontal wrapping group (`children: string[]`, `gap: "none" | "sm" | "md" | "lg"`). Wraps automatically on narrow screens.
   - `Card`: Visual container grouping related content (`children: string[]`).
   - `Text`: Plain text block (`value: { literal: scalar } | { path: "/display/<key>" }`, `emphasis: "normal" | "muted" | "heading"`). HTML/Markdown tags are rendered as literal text, never executed.
   - `Table`: Accessible data table (`columns: [{ key, label }]` with 1–12 unique columns, `rowsPath: "/display/<key>"` pointing to an array of 0–50 scalar row records).
2. **Domain components (task proposal state and actions):**
   - `TaskProposalForm`: Complete standalone task proposal workflow (list + actions in one card).
   - `TaskList`: Composable task editor and selection list.
   - `TaskProposalActions`: Composable save/confirm/cancel action bar sharing state with `TaskList`.

## Graph, data provenance, and security rules

- **Tree invariant:** Exactly one root node with `id: "root"`. Every node ID and display key must match `[A-Za-z][A-Za-z0-9_]{0,63}` (no prototype names). Every node must be reachable from `root` with a single parent, no cycles, max 100 components, and max depth 10 (`root` is depth 1).
- **Data binding & provenance:** Display paths must be `/display/<key>`. `Text` binds to scalar values (`string | number | boolean | null`); `Table` binds to arrays of row objects whose keys match `columns`. Populate `displayData` only from verified tool outputs or the user's explicit request—never fabricate user profile data or task IDs.
- **Fixed action boundaries:** Never include `/proposal`, `/requestId`, action handlers, URLs, HTML, CSS, or JavaScript in component nodes. The server injects proposal bindings and `save` / `confirm` / `cancel` actions automatically.
- **Mode separation:**
  - `present_ui` (read-only) forbids `TaskProposalForm`, `TaskList`, and `TaskProposalActions`.
  - `propose_tasks` `presentation` (proposal mode) must include **either** one `TaskProposalForm` **or** one `TaskList` plus one `TaskProposalActions` (never mix both).
- **Accessibility:** Always provide a clear `fallbackText` (1–8,000 chars) summarizing the content for fallback and screen-reader context, and give every `Table` column a descriptive `label`.

## Example 1: Read-only IELTS & Gym comparison / schedule (`present_ui`)

```json
{
  "fallbackText": "IELTS & Gym Weekly Balance\nMonday: IELTS Reading (2h) + Upper Body (1h)\nWednesday: IELTS Listening (1.5h) + Lower Body (1h)",
  "components": [
    {
      "id": "root",
      "component": "Column",
      "children": ["titleText", "summaryCard"],
      "gap": "md"
    },
    {
      "id": "titleText",
      "component": "Text",
      "value": { "literal": "IELTS & Gym Weekly Balance" },
      "emphasis": "heading"
    },
    {
      "id": "summaryCard",
      "component": "Card",
      "children": ["goalText", "comparisonTable"]
    },
    {
      "id": "goalText",
      "component": "Text",
      "value": { "path": "/display/goalSummary" },
      "emphasis": "muted"
    },
    {
      "id": "comparisonTable",
      "component": "Table",
      "columns": [
        { "key": "day", "label": "Day" },
        { "key": "studyBlock", "label": "IELTS Focus" },
        { "key": "workoutBlock", "label": "Gym Session" },
        { "key": "totalHours", "label": "Total Hours" }
      ],
      "rowsPath": "/display/weeklyRows"
    }
  ],
  "displayData": {
    "goalSummary": "Balanced 6-day routine combining Band 7.5 preparation with strength training.",
    "weeklyRows": [
      {
        "day": "Monday",
        "studyBlock": "Academic Reading passages 1-3",
        "workoutBlock": "Upper Body Push/Pull",
        "totalHours": 3
      },
      {
        "day": "Wednesday",
        "studyBlock": "Listening sections 3-4 + transcript review",
        "workoutBlock": "Lower Body Squat/Hinge",
        "totalHours": 2.5
      }
    ]
  }
}
```

## Example 2: Composable task proposal (`propose_tasks` `presentation`)

```json
{
  "fallbackText": "Proposed IELTS & Gym tasks for this week.",
  "components": [
    {
      "id": "root",
      "component": "Column",
      "children": ["headerText", "overviewCard", "proposalCard"],
      "gap": "md"
    },
    {
      "id": "headerText",
      "component": "Text",
      "value": { "literal": "Weekly Action Plan" },
      "emphasis": "heading"
    },
    {
      "id": "overviewCard",
      "component": "Card",
      "children": ["noteText"]
    },
    {
      "id": "noteText",
      "component": "Text",
      "value": { "path": "/display/rationale" },
      "emphasis": "normal"
    },
    {
      "id": "proposalCard",
      "component": "Card",
      "children": ["tasksEditor", "tasksActions"]
    },
    {
      "id": "tasksEditor",
      "component": "TaskList"
    },
    {
      "id": "tasksActions",
      "component": "TaskProposalActions"
    }
  ],
  "displayData": {
    "rationale": "Select and adjust the tasks below before confirming."
  }
}
```

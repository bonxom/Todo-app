# Task creation, proposal confirmation, and clarification in Orbit Agent

November 24, 2026

## Goal

Orbit should save tasks immediately when an Auto request is clear. After a user confirms a proposal, the agent should know which tasks were actually created on the next chat turn. When the agent needs more information, users should be able to read, choose, or type an answer directly above the chat composer.

## Task creation in Auto and Ask

| Mode and request                                           | Expected behavior                                                                                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto, “Create a task to send the report by Friday”         | Call `orbit_create_task`. Resolve the date in the turn's time zone, use existing defaults for optional fields, and report the verified tool outcome. |
| Auto, a creation request with an essential detail missing  | Ask one focused question. When the user answers, continue the original request in Auto.                                                              |
| Auto, a request to plan, suggest tasks, or preview changes | Use `propose_tasks` when the request calls for an editable task draft. Answer advice and capability questions with ordinary chat.                    |
| Ask, a creation request with proposals enabled             | Use `propose_tasks`. Persist the selected items when the user clicks Confirm.                                                                        |
| A turn with `intent: "task_proposal"`                      | Limit the turn to proposal tools. Block direct writes, including on a subsequent clarification answer that inherits this intent.                     |
| `A2UI_TASK_PROPOSALS_ENABLED=false`                        | Use the existing chat creation path. Auto can ask in ordinary text when the clarification tool is unavailable.                                       |

Backend tool exposure and dispatch apply the same creation policy. Ordinary Auto turns with proposals enabled have access to both tools. The model uses the current request and relevant conversation context to choose how to proceed. The server enforces the write restrictions for Ask with proposals enabled and for explicit proposal turns. Clarification answers provide context for the original request. Confirm is the action that persists the selected rows of an existing draft.

The frontend sends the current mode with a clarification answer. The backend accepts these answers in either mode and applies the existing checks for the pending question, its options, and custom answer eligibility. Legacy `confirmation` interactions retain their Ask-mode answer rules. Creation reuses the existing authorization, ownership, idempotency, execution lease, and activity handling. Failed or uncertain writes use the existing error path.

## Confirmed proposals in model context

- The Confirm transaction remains the source of truth. Before each subsequent model turn, read up to three recently confirmed proposals owned by the current user in the current conversation. Order by confirmation time descending with a stable tie-break. Include a recently confirmed draft even when its original turn has aged out of the model's message history.
- Send structured JSON with `proposalId`, `confirmedAt`, and the persisted `createdTasks` reduced to `taskId` and `title`. A user who edits a title and selects two out of five rows gets exactly those two task IDs and the titles saved at confirmation time. Query committed records with `status: "created"`. Drafts, cancellations, and failed confirmations are excluded. Replaying a Confirm with the same request ID gives the model one result for the proposal.
- Add the JSON to the model request as clearly labeled factual context. The historical `propose_tasks` exchange still records what was proposed. Titles are user data. The context establishes which tasks were created. A new request to modify those tasks still requires explicit authorization and a lookup of current task state by ID.
- Streaming and legacy chat use the same context. Confirm returns the existing API response and updates the card immediately. It does not start a model turn. A failed context read uses the existing turn failure path before the model is called.

Example for two selected rows from a five-item draft.

```json
[
  {
    "proposalId": "proposal-1",
    "confirmedAt": "2026-11-24T02:15:00.000Z",
    "createdTasks": [
      { "taskId": "task-1", "title": "Send the revised report" },
      { "taskId": "task-2", "title": "Schedule the review" }
    ]
  }
]
```

## Clarification card

Show the question as the heading immediately above the composer. Present options as a single radio group with full-width clickable rows and a short description when it helps users decide. “Write my own answer” is the last row when allowed. Selecting it reveals and focuses an inline field. Preserve typed text when users switch options, and enable “Send answer” once the active answer is valid. Selecting a row alone never submits.

“Change request” opens the composer with a way back to the question and its draft answer. “Skip question” is available in that composer state for users who want to close the question without sending a new message. Selecting an answer, replacing the request, and skipping use their existing distinct payloads. During submission, show progress and prevent duplicate sends. After the server accepts the answer, the question and selected or typed answer remain as a compact transcript entry. On error, keep the draft and surface the existing recovery action. A retry after an uncertain send reuses the request ID and payload.

The question and options can scroll as needed in a short viewport. The footer stays reachable with long labels and open mobile keyboards. Use native radios, associated descriptions and field labels, visible focus, and main touch targets of at least 44 CSS px. Support V1 and V2, light and dark themes, and English and Vietnamese. Retain read and answer behavior for legacy confirmation records.

The tool description and model instructions ask for one short question in the user's language, two to four relevant options, and at most one sentence of description per option when needed. Keep internal tool vocabulary such as “grill” out of user-facing questions. The card also supports longer questions and labels from existing records.

## Design choices and scope

- Expose both creation paths in Auto. Disabling proposals globally would also remove the editable preview when users ask for one.
- Read committed proposal results as the next model turn starts. Calling the model on Confirm would add latency and a chat turn. Rewriting the historical tool result would lose the distinction between the draft and the user's final selection.
- Keep clarification next to the composer. A modal would cover the conversation on narrow screens and add a separate focus transition.
- Reuse the existing endpoints, proposal response and A2UI formats, task editor, and authorization. Existing proposal records already contain the fields needed for context.

## Acceptance criteria

1. A clear Auto request creates a task immediately, including after a needed clarification. A replay with the same request ID creates one task in total. A failed tool call produces no success claim.
2. Auto can draft a preview. Ask with proposals enabled and explicit proposal turns reject forbidden direct writes. Turning proposals off still allows normal creation. Existing read flows continue to work.
3. After a partial confirmation with a title edit, the next provider request contains the exact committed tasks. Verification covers a late confirmation, retry, failed and cancelled actions, and isolation by user and conversation. Confirm makes no provider request.
4. The clarification card is usable in the Agent page and floating chat on V1 and V2, including long Vietnamese labels, both themes, keyboard navigation, and touch. Verification covers choosing, typing, changing the request, returning to the draft, skipping, and retry.
5. Playwright exercises Auto creation, Ask confirmation, and follow-up chat against the changed API. Backend integration tests inspect model payloads and persisted results with a disposable MongoDB replica set.

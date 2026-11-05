# A2UI task proposals

Date: 2026-11-04
Status: Implemented; automatic selection revision approved on 2026-11-05.

## Goal and agreed direction

Introduce A2UI inside the existing conversation UI for proposing, editing,
selecting, and explicitly confirming task creation. The user selected this
workflow as the first integration. The backend generates the UI from validated
structured task proposals; the model does not generate arbitrary UI code.

## Scope and user experience

- AI chooses the structured propose_tasks tool when an ordinary chat request
  calls for an actionable plan or new tasks. There is no Plan tasks composer mode.
- Auto and Ask can clarify missing details before producing a proposal.
- Generate 1–20 draft items with stable server-assigned item IDs. Show all selected
  initially. Each item supports editing title, description, priority, category,
  optional project, start date, and due date using existing task semantics.
- Users can deselect items, save draft edits, confirm selected items, or cancel.
  Confirm is disabled with no selection, invalid fields, or an in-flight action.
- Generation and draft editing create no tasks and change no task statistics.
- Confirmation displays the number of selected items. Success shows links to
  created tasks and disables further edits and submission for that proposal.
- An explicit Save draft action persists edits. Unsaved changes are identified
  and trigger an in-app warning before switching conversations. Reload restores
  the last saved state, not unsaved local edits.
- Cancellation is permanent for that proposal, creates no tasks, and remains
  visible in history. A user can request a fresh proposal afterward.

## Non-goals

Streaming, arbitrary LLM-generated layouts, dashboard replacement, A2A/AG-UI
adoption, recurring tasks, automatic execution without confirmation, and changing
the existing legacy generate-tasks endpoint are outside this feature.

## Architecture and boundaries

1. Expose propose_tasks when the backend capability is enabled; the model selects
   it from the current request and history. Optional task_proposal intent is
   retained only for compatibility with older clients and persisted turns.
2. Hide and reject direct task creation in the agent while A2UI is enabled.
   Explicit legacy proposal turns also prohibit updates. Existing task updates
   retain normal authorization. Proposal confirmation does not call the model.
3. A proposal service validates model output against the task field contracts,
   assigns IDs, resolves owned category/project references, and persists the draft.
   Invalid generation produces a retryable textual error without task writes.
4. An A2UI adapter turns the persisted domain state into protocol messages using
   a small versioned catalog. The domain record, rather than client UI state, is
   authoritative. Persist protocol/catalog identifiers; regenerate surfaces on
   history retrieval with a renderer-lifetime-unique surface ID.
5. A React renderer in the existing chat message list displays the surface and
   routes allowlisted actions through shared HTTP services. Reuse application
   styling and accessible native controls.
6. A proposal action service validates ownership, revision and state, then uses
   existing task services inside one database transaction for confirmation.
   Tasks, statistics, proposal status and the action receipt commit atomically.
   Reuse the repository's transaction infrastructure without nesting transactions.

Dependency decision verified against npm metadata and published package README/type
declarations on 2026-11-04: pin `@a2ui/react@0.15.0` and
`@a2ui/web_core@0.15.0`; use protocol `v0.9` through versioned imports and catalog
`urn:orbit:a2ui:task-proposals:v1`. React's peer range includes React 19. The
renderer uses Zod 3; add `zod@3.25.76` in the frontend only, leaving backend Zod 4
unchanged. Use `A2uiSurface`, `createComponentImplementation`, `Catalog`, and
`MessageProcessor`. Package metadata compatibility is verified; runtime rendering
and action/data binding remain required implementation tests.

## Data and API contracts

Add a TaskProposal record containing owner ID, conversation ID, originating turn
ID, proposal ID, revision, status (`draft`, `created`, `cancelled`), protocol and
catalog identifiers, item IDs and editable task fields, selected item IDs, created
task IDs, timestamps and confirmation receipt. Drafts live as long as their
conversation; history surfaces must reflect current proposal state.

Chat responses and history messages gain an optional proposal reference and A2UI
payload alongside their existing text. Existing messages remain readable.

Proposed authenticated endpoint:

`POST /api/ai/conversations/:conversationId/proposals/:proposalId/actions`

The strict Zod body accepts `requestId`, `revision`, and action `save`, `confirm`,
or `cancel`. Save and confirm include edited items and selected item IDs. Item IDs
must belong to the stored proposal; duplicate IDs and unknown fields are rejected.
User IDs, task IDs and execution permissions are never accepted from the payload.
Responses return the current proposal, textual summary, and refreshed surface.

Use the existing task constraints (title at most 200 characters, description at
most 1000, existing priority enum). Reject whitespace-only titles and invalid dates.
Use existing timezone/date normalization; start must not follow due date when
both are supplied. Missing category resolves to the user's Uncategorized category.
Revalidate referenced categories/projects during save and confirmation; completed
projects cannot receive new assignments.

## Concurrency and failures

- Validate owner, conversation and proposal together; inaccessible IDs return 404.
- A stale revision or conflicting terminal-state action returns 409 plus a way to
  reload current state. Concurrent confirmations create at most one task batch.
- Identical request ID and payload replay the committed receipt. Reusing an ID
  with different payload returns 409. Store a canonical payload fingerprint.
- Commit all selected items or none. Database or statistics failure rolls back
  the full confirmation. Lost HTTP responses can be retried with the same ID.
- If a referenced entity was removed or a project completed, keep the draft and
  return actionable field errors; never silently assign a different project.
- Confirmation requires MongoDB transaction support, as existing MCP writes do.
  Unsupported database configurations fail clearly before any task is written.
- Reject unknown component/action names and oversized payloads. The adapter emits
  only registered catalog components; no executable markup or script is accepted.
- Renderer or protocol failure displays textual proposal details and a reload
  action, with no hidden or automatic mutation. Existing text chat stays usable.

## Rollout and verification

Gate the feature behind backend `A2UI_TASK_PROPOSALS_ENABLED`, enabled when unset; explicit false disables it.
Expose availability through the existing conversation API so the frontend has one
authoritative capability source. Disabled mode rejects proposal mutations and
preserves textual history. No separate frontend flag is needed.

Acceptance tests must be written and observed failing before implementation:

1. Proposal intent and clarification continuations cannot execute write tools.
2. Generating, saving and cancelling a draft create zero tasks or stats changes.
3. Confirming a subset creates exactly the edited selected tasks and correct stats.
4. Replayed, concurrent and lost-response confirmations create no duplicates.
5. A failed item or stats update rolls back the whole batch in a real MongoDB
   replica-set integration test, not solely mocked repository calls.
6. Foreign IDs, invalid fields, stale revisions and completed projects are rejected.
7. Saved drafts and terminal states survive history reload; old chat remains valid.
8. Renderer messages pass the selected protocol schema and actual renderer tests.
9. Keyboard navigation, field labels, mobile layout, validation, selection, save,
   cancel, confirmation, errors and fallback work in browser verification.
10. Feature disabled, ordinary chat, ask menus and existing task creation regressions
    remain covered.

Run backend and frontend test suites, lint, formatting checks on changed files,
backend build, frontend build/type-check, and focused Playwright verification.
Report exact commands and separate unavailable integration/browser checks from
passed checks. Both packages already have Vitest, ESLint and Prettier; the frontend
also has Playwright. New test tooling is not presumed necessary.

## References

- https://a2ui.org/guides/client-setup/
- https://a2ui.org/specification/v0.9-a2ui/
- Existing integration points: `backend/services/agentService.ts`,
  `backend/services/conversationService.ts`, `backend/utils/conversationView.ts`,
  `backend/mcp/repositories/writeRepository.ts`,
  `frontend/src/features/tasks/hooks/useConversationChat.ts`,
  `frontend/src/features/tasks/components/chat/ChatField.jsx`, and
  `frontend/src/shared/services/aiService.ts`.

## Implementation clarification — 2026-11-05 review

The reusable frontend runtime is in `src/shared/A2UI/`: a static catalog
registry and a surface host using the official v0.9 MessageProcessor/A2uiSurface.
Task-specific registration, data validation and action translation live under
the task feature's `A2UI/` folders. The protocol fixture uses operation objects
(`createSurface`, `updateComponents`, `updateDataModel`), not a custom type-tagged
message format. New features supply domain catalogs and action adapters without
rewriting the host.

Uncertain action failures freeze the draft and preserve the entire submitted
payload and request ID for explicit retry. Authoritative reload can discard
edits only after a prompt. Explicit and clarification-inherited proposal intent
both obey the feature flag; submitted intent is persisted separately to validate
idempotent clarification retries. Validate model dates before normalization and
reject inaccessible or completed references instead of silently replacing them.

## Automatic activation — 2026-11-05

The [automatic A2UI spec](2026-11-05-automatic-a2ui.md) supersedes the manual
intent entrypoint described above. No Plan tasks mode is shown. The model chooses
propose_tasks from ordinary conversation in Auto or Ask; the backend blocks direct
task creation while enabled. Legacy explicit intent remains backward-compatible.

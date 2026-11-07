# General A2UI with developer-authored UI guidance

Status: Approved for implementation planning on 2026-11-07. Implementation plan: `docs/superpowers/plans/2026-11-07-general-a2ui.md`. Application implementation has not begun.

## Problem and goal

The current backend creates a fixed TaskProposalForm surface. Its schema accepts one root component and three task-specific actions. The frontend has a reusable A2uiHost and CatalogRegistry, but conversation results and replay are coupled to task proposals. Developer skill loading is currently derived from specialist tool prerequisites.

Allow the Agent to compose useful interfaces using reusable presentation components and reliable domain components, guided by developer-authored skills. Developers do not need a skill or React screen for every business scenario.

## Agreed direction

1. Presentation components handle layout and content.
2. Domain components encapsulate editing, validation, selection and domain actions.

Keep TaskProposalForm available as the complete existing task workflow. Introduce a composable TaskList that owns task editing and selection, and TaskProposalActions that owns save/confirm/cancel. Both share the existing proposal state and action lifecycle. Do not expose individual task inputs as arbitrary model-bound primitives in this release.

## Initial scope and non-goals

The first catalog supports Column, Row, Card, Text, Table, TaskProposalForm, TaskList and TaskProposalActions. Layout uses finite spacing and emphasis tokens; Row wraps on narrow screens. Text is plain text, Table has labelled columns and scalar cells. No model-provided HTML, CSS, JavaScript, URLs to component implementations, or arbitrary API handlers.

Support a read-only general surface or a surface with one task proposal per turn. Do not add arbitrary writable forms, new business integrations, a skill marketplace, component uploads, streaming surface patches, or multiple independently editable proposals per surface. Existing clarification menus remain supported.

## Developer skills and catalog contract

Add a built-in developer skill `ui-composition` through the existing manifest/Markdown registry. Explicitly attach this skill to the UI capability independently of specialist MCP tool discovery. Its summary is available when the capability is enabled. Use the existing load_skill and provider-context evidence mechanisms before exposing UI composition tools.

The skill teaches when an interface adds value, how to choose the two component levels, accessibility requirements, data binding, and examples spanning several domains. Component schemas and supported action names are supplied from a versioned code-owned catalog contract, not inferred from prose. More developer guidance documents can be attached through server configuration using the same registry; initial configuration attaches ui-composition only. Missing configured skills disable the new capability with a diagnostic, without breaking ordinary chat.

Personal skills remain advisory and cannot register components, enable tools or grant action permissions. Loading UI guidance does not authorize business writes. Plain text remains appropriate for simple answers.

## Agent and server flow

Use a bounded declarative surface specification as tool input, compiled by the server into actual A2UI v0.9 messages. This is an authoring contract; browser transport and rendering continue to use A2UI.

- `present_ui`: accepts fallback text, components and read-only display data; terminates the turn with a validated general surface.
- Extend `propose_tasks` with optional presentation input using the same component contract. This preserves the existing terminal proposal call and avoids requiring a second provider round after proposal persistence.
- Without presentation input, propose_tasks keeps its existing TaskProposalForm output.
- Server owns surface IDs, catalog IDs, proposal IDs, revisions and action wiring. The model supplies only display content and layout references.
- Proposal data is prepared and persisted through existing services. Task components bind exclusively to that authoritative proposal, never to model-supplied replacement ownership or revision data.
- General read-only surfaces cannot include task components or write actions. A composable proposal must contain exactly one TaskList and one TaskProposalActions; alternatively it contains exactly one TaskProposalForm. Mixing both modes is invalid.

Use a new catalog identifier for mixed surfaces. Keep the old task-proposal catalog and historical payload support. Domain proposal identity/versioning remains separate from presentation catalog identity.

## Validation and failure handling

Validate on the backend before persistence and on the frontend before rendering: supported catalog version, allowlisted types and properties, one root, unique component IDs, existing child references, no cycles, no unreachable nodes, and compatible data bindings.

Initial authoring limits: 100 components, nesting depth 10, 50 rows and 12 columns per table, and 128 KiB total serialized envelope. Keep the existing maximum of 16 A2UI messages. Validate these bounds before recursive traversal or processor construction. Component contracts reject unknown properties.

Invalid present_ui input returns structured validation feedback for a correction within the existing turn budget. On exhaustion, return a useful text fallback without claiming the UI rendered. If task items are valid but optional presentation is invalid, retain the existing valid proposal form rather than losing the proposal. Invalid task items follow existing domain validation.

Unknown or unsupported persisted surfaces render their saved fallback text. A failed proposal surface also offers the existing task form when its authoritative proposal can be loaded. Rendering or replay never performs writes.

## State, actions and persistence

Extend conversation turn storage and response types with an optional generic surface representation and fallback text. Persist validated authoring layout and read-only data, catalog version and server identity so replay does not call the model. For proposal surfaces, resolve the current authorized proposal state when projecting the saved layout; do not replay stale draft status after confirmation or cancellation.

Keep existing proposal response fields for compatibility. The frontend renders one surface per message, preferring the new surface when present and otherwise using the existing proposal renderer. Update turn responses, conversation history, shared API types and session reducers together.

TaskList and TaskProposalActions share one state controller based on the existing useTaskProposal lifecycle. Save, confirm and cancel continue through existing authenticated endpoints, ownership checks, revision conflict handling, request IDs and idempotent receipts. A successful mutation updates the authoritative data while retaining the chosen layout. Two open views must surface revision conflicts rather than overwrite newer edits.

No generic action may execute a model-specified endpoint or tool. New domain components require explicit code registration of schemas and handlers.

## Acceptance criteria and tests

1. The Agent can load developer UI guidance without a specialist business tool; tests prove tool exposure depends on guidance present in the accepted provider context.
2. The same guidance produces valid read-only plan and comparison layouts without domain-specific skills.
3. A proposal can render explanatory Text plus TaskList and TaskProposalActions; edit, selection, save, confirm and cancel match existing behavior.
4. Legacy propose_tasks calls and saved TaskProposalForm messages still work.
5. Opening conversation history preserves layout and reflects current proposal status without provider calls or writes.
6. Invalid graphs, unknown components/actions, invalid bindings, excessive sizes and incompatible domain layouts are rejected or take the specified fallback path.
7. Cross-user proposal access, stale revisions and repeated confirmation retain existing protections; confirmation cannot create duplicate tasks.
8. Malformed presentation cannot discard otherwise valid proposed tasks. Partial persistence must not leave a completed turn with a missing required proposal; reuse the existing atomic proposal-finalization boundary.
9. At narrow viewport widths, layout remains readable and controls remain keyboard accessible, labelled, and visibly report pending/error states.
10. Disabling the new capability preserves existing chat and task proposal behavior. Retain the existing proposal flag; the new composition flag defaults off and cannot enable proposal creation when the proposal flag is off.

Write failing contract/runtime tests before implementation, then frontend component and conversation replay tests. Use actual installed A2UI processor contracts and browser verification for layout and interaction. Mocked provider tests establish orchestration, not real-model UI quality; report any unrun live-provider evaluation explicitly.

## Implementation boundaries and verification

Expected areas: backend skills registry/policy and content; agentService; A2UI schemas/compiler; conversation turn model/repository/projection; frontend shared A2UI host/catalog/types; chat/session consumers; task proposal components and shared state. Inspect current repository instructions and package scripts when writing the implementation plan.

Run at minimum:

- `cd backend && pnpm run build && pnpm test`
- `cd frontend && pnpm run lint && pnpm run build`

The plan must also specify targeted tests, frontend regression tests, affected-package lint, formatting checks for changed files, and browser checks using installed tooling. Add missing required tooling through pnpm as part of the plan. Do not modify generated lockfiles manually.

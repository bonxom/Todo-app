# A2UI evolution roadmap

Status: proposed for review. This document sets direction; only milestone 1 has an implementation-ready spec and plan.

## Architectural decision

A2UI is another interaction channel for existing Orbit capabilities. It owns presentation, form state, event translation and conversation association. Task lifecycle, ownership, transactions, statistics and command idempotency belong to shared application services. REST, MCP and A2UI adapters preserve their own authentication and access policies while reusing those services.

Do not create an A2UI task engine, generic arbitrary-HTTP executor, model-authored handlers or a second mutation receipt collection. A generic dispatcher has a finite registry of typed commands. Registering a component does not grant permission to execute a command.

## Milestones

| Milestone                     | User-visible result                                                             | Dependency                                                                | Deliverables                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1. Action dispatch and Button | Complete an existing in-progress task from a chat surface                       | Existing task lifecycle and command receipts                              | [Spec](2026-11-27-a2ui-task-actions.md), [plan](../plans/2026-11-27-a2ui-task-actions.md) |
| 2. Block-based messages       | Interleave Markdown and multiple independent UI surfaces in one assistant reply | Existing message/history pipeline; does not require progressive rendering | Separate spec and plan before implementation                                              |
| 3. Form controls              | Edit local form data with Input/Select; submit through registered commands      | Milestone 1; can be built independently of milestone 2                    | Separate spec and plan before implementation                                              |
| 4. Progressive rendering      | Show completed blocks early, then incrementally update a surface                | Milestone 2 plus resumable UI events and persistent processor lifecycle   | Separate spec and plan before implementation                                              |

Slider joins milestone 3 only with a concrete numeric input use case and an existing command accepting that value. It is not a prerequisite for Button or task completion.

## Milestone 2 design direction: block-based messages

- Introduce a versioned ordered `blocks` representation at the application-message layer. Text and UI blocks have stable IDs; each UI block owns a stable surface ID. This is an Orbit message contract, not a change to the A2UI wire protocol.
- One logical assistant reply can contain text, a chart, more text, a task-action surface, and closing text. Reasoning/tool progress remain separate process metadata.
- Map legacy `text`/`companionText`/`surface`/`proposal` records to blocks on read. When blocks exist, they are canonical; do not render legacy fields again.
- Replace the terminal-only behavior of `present_ui` with an explicit emit-and-continue tool path. Keep proposal confirmation and `grill_user` pause semantics explicit; do not accidentally create multiple outstanding proposals.
- Persist blocks through final results, turn checkpoints, history pagination and snapshots. Model context receives bounded semantic summaries and authoritative outcomes, not rendered component JSON as instructions.
- First release permits multiple informational/action surfaces but at most one editable Task Proposal per reply. Each block has its own fallback and error boundary.
- Acceptance examples: two surfaces separated by text retain order after reload; one unsupported catalog falls back without removing siblings; existing proposal dirty-navigation and retries still work.

## Milestone 3 design direction: form controls

- Add Button first through milestone 1, then Input and Select. Decide protocol-facing names (`TextField`/`ChoicePicker` versus Orbit aliases) against the installed v0.9 packages when writing the spec.
- Keep server display data and user draft form data separate. Bind controls to a bounded form namespace; prevent server updates from overwriting dirty fields.
- Input changes are local. An explicit submit action sends a validated subset to a registered command; dragging a Slider never writes on every movement.
- Define labels, required/min/max/options validation, keyboard support, disabled/pending/error states, dirty navigation, retry identity and account reset for all controls.
- Select options are verified application data. A model-provided project/category ID is not authority to use it.
- Acceptance examples: invalid input does not submit; unknown option is rejected server-side; failed submission retains edits; account switching clears drafts.

## Milestone 4 design direction: progressive rendering

Start with whole, validated blocks emitted before the turn finishes. Only then add incremental updates within a surface. Sending a complete final surface in several network packets is not evidence of progressive generation.

- Add versioned UI/block events to the existing SSE transport with stable IDs and monotonic sequencing; resume and snapshots reconstruct exactly the same state without duplicate blocks or actions.
- Keep a MessageProcessor alive for the life of a surface. Current `A2uiHost` rebuilds it when payload identity changes, which is unsuitable for preserving interactive state across patches.
- Validate complete framed operations and stage coherent subtrees/data before publishing. Do not render partial tool-argument JSON. Existing whole-graph validation must be supplemented with staged-update validation rather than bypassed.
- Define loading, ready, failed, cancelled and interrupted surface states. Write actions are unavailable until their bound content is validated and committed.
- Preserve dirty form fields across server patches and define conflict handling explicitly.
- Budget accumulated surface bytes, component count and event count, not only individual messages. Actual SSE payload limits must be read from `backend/repositories/chatStreamRepository.ts`; a valid 128 KiB surface cannot be assumed to fit a single SSE event.
- Acceptance examples: first UI block appears before turn completion; disconnect/replay preserves IDs; cancellation retains valid content with clear incomplete state; patches do not erase typed values.

## Sequencing and review

Milestone 1 is independently useful and does not require blocks, streaming changes or a framework upgrade. Each later milestone gets its own agreed design, acceptance criteria, spec, plan and failing tests under [the development workflow](../../workflow.md). No later implementation is authorized by this roadmap alone.

Use the existing pinned pnpm versions and A2UI v0.9 runtime. Package upgrades, adoption of another agent transport and dynamic catalogs are outside this roadmap.

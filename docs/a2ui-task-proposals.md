# A2UI Task Proposals - Operational Guide

This document covers rollout, configuration, transaction prerequisites, retry behavior, and protocol conformance for the A2UI Task Proposal feature in Orbit Todo.

## Feature Overview

The A2UI Task Proposal feature enables AI assistants to propose structured task batches to users via an interactive, standardized UI surface (`urn:orbit:a2ui:task-proposals:v1`, A2UI Protocol v0.9). Users can review, edit, select subsets of tasks, and confirm creation atomically, without granting write tools directly to the model during the proposal phase.

---

## Configuration & Rollout

### Backend Environment Variables

The feature is gated behind the environment variable:

```env
A2UI_TASK_PROPOSALS_ENABLED=true
```

- **Default value**: `false` (or unset).
- **When disabled (`false`)**:
  - The chat entry for "Plan tasks" is hidden on the frontend.
  - Action mutations at `/api/ai/conversations/:conversationId/proposals/:proposalId/actions` are rejected with `409 Conflict` (`TASK_PROPOSAL_ERROR.DISABLED`).
  - Historical proposal messages are rendered in graceful textual fallback mode.
- **When enabled (`true`)**:
  - `GET /api/ai/conversations/capabilities` reports `{ "taskProposals": true }`.
  - Chat composer displays the "Plan tasks" tool toggle.
  - Task proposal turns generate valid v0.9 protocol envelopes.

---

## Database & Transaction Prerequisites

### MongoDB Replica Set Requirement

Task proposal confirmation is executed in a single atomic database transaction using Mongoose / MongoDB multi-document transactions:

- **Replica Set**: The target MongoDB instance must run as a replica set or mongos sharded cluster. Standalone instances do not support multi-document transactions.
- **Atomic Rollback**: If task creation fails for any selected item, or if category / project validation fails, the entire transaction is aborted. No partial tasks or inconsistent stats are committed.
- **Standalone Development / CI**: When running against standalone MongoDB without replica set support, transactions throw `TRANSACTION_UNAVAILABLE` (HTTP 503) unless run in a mocked environment or replica set test container.

---

## Concurrency, Replay & Retry Semantics

### Idempotency Receipts & Request Fingerprinting

Every action payload (`save`, `confirm`, `cancel`) requires a client-generated UUID `requestId` and current `revision`:

1. **Deterministic Fingerprint**:
   Backend computes a SHA-256 hash over canonical JSON of `(proposalId, conversationId, revision, action, items, sorted(selectedItemIds))`.
2. **Identical Replay (200 OK)**:
   If a request fails due to network drop or client timeout, retrying with the same `requestId` and identical payload returns the cached `responseView` from `TaskProposalReceipt`. No duplicate tasks are created.
3. **Mismatched Replay Conflict (409 Conflict)**:
   Reusing an existing `requestId` with a differing payload produces `TASK_PROPOSAL_ERROR.REQUEST_CONFLICT` (HTTP 409).
4. **Stale Revision Conflict (409 Conflict)**:
   Submitting an action with an outdated `revision` or on a non-draft proposal produces `TASK_PROPOSAL_ERROR.REVISION_CONFLICT` (HTTP 409). The frontend prompts the user to reload the conversation.

---

## A2UI Protocol Specification (v0.9)

### Catalog Identifier

- **Catalog URN**: `urn:orbit:a2ui:task-proposals:v1`
- **Supported Root Component**: `TaskProposalForm`
- **Allowlisted Actions**: `save`, `confirm`, `cancel`

### Envelope and runtime

The executable envelope is documented in [the shared v0.9 fixture](superpowers/fixtures/a2ui-task-proposal-v09.json), consumed by backend, renderer and browser tests. Each message contains `version: "v0.9"` and an operation object such as `createSurface`, `updateComponents` or `updateDataModel`. The root component binds to `/proposal`; actions resolve proposal and request ID from the data model.

The frontend uses `@a2ui/web_core/v0_9` MessageProcessor and `@a2ui/react/v0_9` A2uiSurface (packages pinned to 0.15.0).

### Extensibility rules

- `frontend/src/shared/A2UI/catalogRegistry.ts` registers catalogs, component implementations, action allowlists and domain data validators.
- `frontend/src/shared/A2UI/A2uiHost.tsx` owns processor/surface lifecycle and render-error fallback. It has no task-domain imports.
- `features/tasks/components/chat/A2UI/taskProposalCatalog.tsx` registers the task form with explicit data bindings. Task API execution and retry state belong to `hooks/A2UI/useTaskProposal.ts`.
- Future domains can reuse the host and registry with their own registered catalog and action adapter. Their domain validation, persistence and UI components still require implementation.
- Unsupported versions/catalogs/components or malformed data use the text fallback. Unknown actions cannot reach the domain handler.
- Catalogs are bundled application code. Model-generated scripts and dynamic catalog loading are forbidden.

### Draft and recovery behavior

Edits update the A2UI data model. Leaving a dirty or uncertain proposal prompts before changing conversations or closing chat; page unload also warns. After an uncertain network failure, the form freezes and retry preserves the exact request ID and payload. A 409 prompts authoritative reload; reloading a dirty draft asks before discarding edits. Created/cancelled proposals are read-only.

Disabling the flag rejects both explicit and inherited proposal generation intent, as well as mutations. Original submitted intent is stored separately from inherited effective intent so clarification retries remain idempotent.

### Verification

Browser tests use the shared protocol fixture and mocked HTTP responses; they cover save/reload, subset confirmation, lost-response retry, cancellation and dirty navigation on mobile. MongoDB integration tests independently exercise concurrent confirms, receipt replay, payload conflicts, task/stat updates and rollback after partial execution. Browser tests do not call a live model.

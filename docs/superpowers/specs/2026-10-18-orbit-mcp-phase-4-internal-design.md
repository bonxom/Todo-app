# Phase 4 — Internal MCP task writes

User authorized Phase 4 on 2026-10-18. Scope: trusted Orbit bubble chat, not remote OAuth. Phase 3 remains deferred. HTTP MCP keeps its existing read-only context. Internal controller grants `tasks:write` only after `protect` and `createMcpContext` validate the USER account and token expiry.

## Contract

- Two write tools: create and update (content and/or status). Tools delegate to existing task services and enforce ownership, including category/project assignment. No arbitrary status, userId, delete, or batch writes.
- Creation follows REST semantics: initially in-progress. Start applies to pending tasks. Complete/give-up apply to in-progress tasks; already-at-target returns success without another transition. Update rejects an empty patch and unsupported status values. `changes.status` accepts in-progress, completed, given-up and dispatches internally to start/finish/giveUp services. Mixed metadata and status changes commit or roll back together. Returning to pending or reopening terminal tasks is not supported.
- Write schemas are strict, bounded and accept ISO timestamps with explicit timezone or null. IDs come from read tools. Dates must remain ordered after merging an update with the existing task.
- Every mutation requires an idempotencyKey (16–128 URL-safe characters), scoped to the authenticated user. Reuse the same key and normalized arguments for retries; different payload/tool with the same key returns IDEMPOTENCY_CONFLICT. New intent requires a new key. This covers tool-call retries, not repeated independently generated chat requests.
- Successful output DTO, user, operation, task ID, request ID, payload hash and timestamp are persisted as the audit/receipt. No raw token or prompt is logged. Receipts have no automatic expiry; deletion/retention needs an explicit later policy. Replay verifies current task ownership before returning the original result.
- A MongoDB transaction covers task, stats and receipt. Per-user DB lock document serializes MCP writes including first-time stats initialization. Transaction retry is handled by Mongoose. AsyncLocalStorage propagates sessions into existing services/repositories; queries/populate on this path run sequentially. Requires replica set/Atlas; no unsafe standalone fallback.
- Existing service increments execute inside the transaction. Stats are rebuilt in that same transaction to preserve category counts after metadata updates. Existing REST operations are not redesigned or guaranteed serializable with MCP operations in this phase.
- Frontend invalidates workspace queries when chat settles, including a provider error after a tool committed. Agent instructions permit writes only for explicit user intent and treat tool-returned text as untrusted data.

## Validation

SDK tests: discovery by granted scope; strict validation; missing scope/admin; sanitized errors. Disposable replica-set integration: create/replay/conflict; concurrent retries; cross-user task/category/project denial; updates; transition rules and repeat calls; stats and audit counts; rollback on stats failure. Regressions: existing MCP read tests, service tests, frontend tests and typechecks.

## Deferred

OAuth scopes issued to remote clients and remote write smoke tests depend on Phase 3. Production hosting/rate limits/operational audit retention belong to Phase 5. This implementation does not claim remote Phase 4 acceptance.

## Implementation evidence (2026-10-18)

All 163 backend tests passed with ORBIT_MCP_TEST_MONGO_URI pointing to a disposable local MongoDB 7 replica set. This includes 11 Phase 4 database scenarios and 8 focused unit cases. Four frontend chat/cache tests, both TypeScript checks and targeted frontend ESLint passed. Tests verified real SDK write dispatch, no cross-user mutation, concurrent same-key create/complete, distinct concurrent first writes, history preservation, receipt replay after ownership loss, and transaction rollback after stats/audit failure. No live LLM/deployment smoke test was run.

`givenUpAt` is persisted on give-up; legacy terminal tasks freeze their fallback event timestamp on metadata edits. Reconciliation therefore does not move historical counts to the edit date.

Transaction implementation reference: https://mongoosejs.com/docs/transactions.html (AsyncLocalStorage propagation and sequential database operations).

## Code organization

Write adapters are `tools/tasks/createTask.ts` and `tools/tasks/updateTask.ts`. `tools.ts` registers them explicitly, exposing six total tools to internal chat. `taskWriteService.update` handles content and maps status to existing lifecycle services. A private `executeWrite` wrapper shares authorization, validation, transaction, idempotency and audit. `tools/shared/write.ts` formats results/errors and supplies annotations. The three dedicated lifecycle tools and corresponding MCP service methods have been removed.

Tools are grouped by domain under `tools/tasks/`, `tools/projects/`, and `tools/categories/`. Shared response/error utilities live in `tools/shared/common.ts` and write helpers in `tools/shared/write.ts`. Each domain exports its registrations through `index.ts`; the root tools barrel preserves imports for `tools.ts`.

Validation after unifying status updates: 164 backend tests passed with the disposable MongoDB replica set; TypeScript passed. SDK discovery/calls cover six tools, status transitions through update, repeated completion and atomic rollback of mixed changes.

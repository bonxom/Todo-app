# Agent delete task implementation plan

Spec: ../specs/2026-11-07-agent-delete-task.md

1. Add failing tests: backend/mcp/test/deleteTask.test.ts (service permissions, validation, execution guard, snapshot output, stats, receipt retry/conflict), services/test/agentActivity.test.ts and interruptedReply.test.ts, frontend AgentActivityList test.
2. Extend mcp/models/TaskWrite.ts, tool exports/registration, and taskWriteService.executeWrite with delete operation and replay semantics. Receipt retains snapshot and deleted marker. Add delete tool/schema.
3. Add core policy, prompt, WRITE_TOOLS recognition; verified deleted activities + interrupted reply. Extend frontend activity type/label/icon and suppress deleted detail link.
4. Add real Mongo integration cases to writes.integration.test.ts for SDK, ownership, idempotency, rollback; run if disposable replica set available. Run backend/frontend tests, lint, scoped formatter and builds; document skips. No real user task mutations, no automatic commit.

Completed all four steps. Verification: 461 backend tests on disposable MongoDB replica set, 260 frontend tests; lint/build and scoped formatter passed. See ../../ai/2026-11-07-delete-task-review.vi.md. No real user task deleted; no commit.

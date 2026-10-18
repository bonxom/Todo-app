# Internal Phase 4 implementation plan

1. Add strict write schemas, trusted-context scope grant and two write tool adapters (create and update including status).
2. Add transactional mutation service with durable per-user idempotency receipts/audit and serialization.
3. Preserve task service rules; verify ordered transaction queries and stats reconciliation.
4. Integrate write intent instructions and frontend workspace invalidation.
5. Verify unit/SDK tests, disposable MongoDB replica-set scenarios and regressions; record limitations in roadmap.

Design: ../specs/2026-10-18-orbit-mcp-phase-4-internal-design.md

Status 2026-10-18: steps 1–5 completed for internal MCP. Remote acceptance remains deferred to Phase 3. Validation: 163 backend tests including live disposable replica-set integration; 4 frontend tests; TypeScript and targeted frontend lint passed.

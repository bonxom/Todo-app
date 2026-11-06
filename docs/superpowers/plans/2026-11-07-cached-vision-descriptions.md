# Cached vision descriptions implementation plan

Goal: restore the requested image -> vision -> cached description -> text chat path.
Spec: ../specs/2026-11-07-cached-vision-descriptions.md
Architecture: Attachment owns durable analysis, repository atomic claim/finish, vision service owns provider call, attachment context service owns authorization/storage/cache, turn runner injects text.

1. Write failing tests in backend/services/test/attachmentVisionService.test.ts for cache/retry/failure/ownership/non-image and backend/services/test/personalSkillsRuntime.test.ts for text-only attachment context replay.
2. Add optional analysis schema fields in models/Attachment.ts and ownership-scoped claim/finish in repositories/attachmentRepository.ts. No migration: absence means not attempted.
3. Add libs/visionClient.ts with independent optional VISION_* config and bounded request, services/attachmentVisionService.ts for byte limits, atomic claim, persistence and context text. Main chat gets no binary.
4. Wire runConversationTurn and AgentMemory/agentService to consume only text context, label it untrusted, preserve through checkpoint/history. Document env defaults and update previous attachment spec scope.
5. Run targeted tests, full backend tests/build/lint, scoped Prettier, frontend baseline lint/build (no UI mutation), and live vision -> text-chat probe with provided screenshot. Record skipped integration tests/limitations. No automatic commit.

## Completion

All implementation steps completed; verification and remaining integration limits are recorded in ../../ai/2026-11-07-cached-vision-review.vi.md. 375 backend and 256 frontend tests passed; live vision-to-text-chat probe passed. No commit created.

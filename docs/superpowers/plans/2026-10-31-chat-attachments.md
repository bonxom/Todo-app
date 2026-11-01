# Private Chat Attachments Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Execute inline in the existing clean `feat/s3-storage` branch.

**Goal:** Save and reopen private image/file attachments in chat using MinIO through the backend.

**Architecture:** Attachment routes authenticate then delegate to service ownership/validation and repositories. A MinIO storage adapter manages bytes; Mongo transactions atomically associate uploaded files with chat turns. Frontend uses authenticated blob fetches.

**Tech Stack:** Express 5, TypeScript, Mongoose, Multer, MinIO JS SDK, React, Axios, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-chat-attachments.md`

## Global constraints

- Maximum four attachments per turn, 10 MiB per file; text required.
- Private bucket; no object keys/credentials in public JSON; no AI document processing.
- Preserve `.js` relative imports and pnpm lockfiles; do not edit real environment files.
- Existing text chat works with storage disabled.

## Task 1: Storage and attachment APIs

Files: create `backend/config/storage.ts`, `backend/libs/objectStorage.ts`, `backend/models/Attachment.ts`, `backend/types/IAttachment.ts`, `backend/repositories/attachmentRepository.ts`, `backend/services/attachmentService.ts`, `backend/utils/attachmentFile.ts`, `backend/controllers/attachmentController.ts`, `backend/routes/attachmentRoutes.ts`, `backend/error/definitions/attachmentErrors.ts`, `backend/scripts/cleanup-attachments.ts`; modify `backend/routes/aiRoutes.ts`, `backend/config/env.ts`, `backend/.env.example`, `backend/package.json` and lockfile.

Interfaces: safe attachment `{id,name,mimeType,size}`; storage `put(key,buffer,mimeType)`, `get(key)` readable stream, `remove(key)`; service `upload(userId,conversationId,file)`, `download(userId,conversationId,id)`, `removeUnused(userId,conversationId,id)`, `bind(userId,conversationId,ids,session)` and `cleanup()`.

- [x] Add tests for storage config, signature/type validation, ownership, storage outage and compensating deletion. Example: `expect(() => validateAttachment({ originalname: 'fake.png', buffer: Buffer.from('text') })).toThrow()`; use actual PNG signature fixture for accepted image.
- [x] Run `cd backend && pnpm test -- services/test/attachmentService.test.ts` and verify missing module/behavior failure.
- [x] Implement bounded multipart upload and typed errors. Persist staging before `put`, promote to uploaded; cleanup claims only stale unused records. All ownership checks precede storage access.
- [x] Run targeted suite and `pnpm run build`.

## Task 2: Conversation persistence

Files: `backend/types/IChatTurn.ts`, `backend/models/ChatTurn.ts`, `backend/repositories/chatTurnRepository.ts`, `backend/services/conversationService.ts`, `backend/controllers/aiController.ts`, `backend/utils/conversationView.ts`, `backend/validations/aiValidation.ts`, new integration test `backend/services/test/attachments.integration.test.ts`.

Interface: optional `attachmentIds` in request/pending; safe `attachments` in user messages. Extend claim with IDs and an async session callback returning validated metadata; snapshot metadata in the transaction.

- [x] Add HTTP integration tests for upload→send→history→download, wrong owner, wrong conversation, reuse, idempotent retry/conflict, provider failure, and concurrent cleanup/bind lifecycle.
- [x] Run the tests with a disposable Mongo replica set; confirm rejection/absent attachment behavior before implementing.
- [x] Bind inside claim transaction; compare ordered attachment IDs on retries; include metadata in user history and IDs in pending recovery.
- [x] Run integration and existing conversation regression suite.

## Task 3: Chat UI

Files: `frontend/src/shared/types/domain.ts`, `frontend/src/shared/services/attachmentService.ts`, `frontend/src/features/tasks/hooks/useConversationChat.ts`, new `frontend/src/features/tasks/components/chat/AttachmentList.tsx`, `AttachmentComposer.tsx`, modify `ChatField.jsx`; new component/API/hook tests.

Interfaces: `send(text, selection?, attachments?)`, upload service returns safe metadata; `AttachmentList` accepts conversation ID and metadata; composer owns pending File selections, uploads sequentially, reuses already-uploaded metadata after partial failures, and clears only after the send hook accepts the message.

- [x] Write failing UI tests: select/remove, disallow empty text, preserve draft on failure, send attachment IDs, preview history via authenticated fetch, revoke blobs on unmount.
- [x] Implement file chooser and compact file rows using existing surface/line/accent tokens. Display a concise storage-only notice. Preserve slash tools and interaction flows.
- [x] Run frontend tests and a browser scenario for upload and restored conversation. Use the existing Playwright harness and mocked HTTP for deterministic browser checks, separately report real MinIO checks.

## Task 4: Operations and final verification

Files: `docker-compose.storage.yml`, `frontend/nginx.conf`, `docs/deployment/minio.md`, `backend/scripts/storage-smoke.ts`, package script entries.

- [x] Add documented LAN/native/shared-network configurations, least-privilege policy and cleanup scheduling. Raise Nginx multipart limit to 11m and use `^~ /api/` so API files never match asset caching rules.
- [x] Provision dedicated private bucket/account on authorized MinIO server, store credentials only in a protected server file, and run a unique-object write/read/delete smoke check. Rebind console to loopback, preserve other services. Do not restrict LAN API to an unconfirmed backend IP.
- [x] Run `cd backend && pnpm test && pnpm run lint && pnpm run build`; `cd frontend && pnpm test && pnpm run lint && pnpm run build`.
- [x] Use backend's installed Prettier to format/check only changed source/config/docs; no unrelated formatting.
- [x] Inspect diff for secrets and unrelated changes; report exact results and outstanding environment configuration.

## Implementation discoveries

- Upload orchestration belongs in `useConversationChat` so the existing session lock covers creation, upload and send. `AttachmentComposer` renders selected files; a WeakMap reuses successful uploads after a partial failure.
- Existing backend lint failed before parsing files because typescript-eslint cannot consume the TS 7 API. Keep TS 7 compiler via `@typescript/native` alias and add the official `@typescript/typescript6` compatibility alias for tooling.
- Once lint could start, it exposed existing baseline errors. Exclude generated `.vercel` output and apply minimal nonbehavioral lint fixes (unused bindings, empty model interfaces, intentional control-character validation, bracket formatting).
- Add project-local Prettier and `format:check` to frontend, which previously had no formatter script. Format only touched files.
- The unrelated CalendarTaskDetailCard ordering test also fails in a clean archive of HEAD. Leave that area unchanged and report it as a baseline verification limitation.

## Final outcome

Implemented and verified. See `docs/deployment/minio-verification.md` for exact commands, 273 passing backend tests, eight real-MinIO integration tests, browser checks, server provisioning and the independently reproduced pre-existing Calendar test failure. Production app environment/deployment, cleanup scheduling and a backend-IP allowlist remain operator configuration described in `docs/deployment/minio.md`.

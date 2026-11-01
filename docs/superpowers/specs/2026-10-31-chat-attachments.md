# Private chat attachments

Approved direction: user approved backend-mediated MinIO storage for conversation attachments on 2026-10-31. Support backend on LAN, native on the storage host, or in Docker on the storage host.

## Behavior and scope

Authenticated users select up to four files per message, each nonempty and at most 10 MiB. Allow JPEG, PNG, GIF, WebP, PDF, UTF-8 TXT/Markdown/CSV. Validate actual signatures for binary formats and UTF-8 text; reject HTML/SVG and mismatched extensions. Files are uploaded individually through the backend only when sending. Require a text message (the composer explains this). Preserve draft files/text after failed uploads. Successful uploads can be retried without reuploading. A failed AI response still leaves the user message and attachments in history.

MinIO stores private bytes. MongoDB stores ownership, conversation, random object key, display filename, canonical MIME type, size and lifecycle state. ChatTurn stores a safe metadata snapshot and attachment IDs; history and pending recovery return these snapshots/IDs, never object keys or credentials. The same request ID with changed attachments is a conflict. Attachments cannot be attached across users or conversations or reused in another turn. Claiming a turn and binding attachments is atomic in the existing MongoDB transaction. Old text-only conversations remain compatible.

GET file endpoints require the owner's access token. Only verified raster images are served inline, all other files as downloads; nosniff and no-store headers apply. Frontend fetches with the existing authenticated Axios client and uses revocable blob URLs, never tokens in URLs. Visible messaging explains that attachments are saved for reference and the assistant does not read them yet. No file contents or signed storage URLs are sent to the AI provider.

## Contracts

- POST /api/ai/conversations/:conversationId/attachments: multipart field `file`, returns 201 `{ data: { id, name, mimeType, size } }`.
- GET /api/ai/conversations/:conversationId/attachments/:attachmentId: authenticated streamed bytes.
- DELETE same path: removes an unused upload only; attached files cannot be deleted through this endpoint.
- POST /api/ai/chat-mcp adds optional `attachmentIds` (unique UUIDs, max four). Text still required.
- Conversation user messages add optional `attachments` metadata; pending entries include attachment IDs for exact retry.

## Errors and lifecycle

Reject unauthorized access before parsing multipart data. Wrong user/conversation and unknown file return 404. Bad/empty/oversize/unsupported files return actionable 4xx. Storage disabled/unreachable returns 503 without breaking text-only chat. Upload creates a staging record before storage I/O, changes to uploaded after success, and compensates failed writes. Unattached uploads older than 24 hours are removed by an explicit cleanup command (schedule hourly). Cleanup atomically claims stale staging/uploaded records as deleting before deleting bytes, preventing races with attaching. Failed deletions remain retryable. Attached objects have no TTL. Local temporary UI blobs are revoked on replacement/unmount. No real environment files or secrets are committed or edited by this change.

## Deployment

Configure MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET and optional MINIO_REGION. An unset endpoint disables attachments, partial configuration fails startup. HTTP is supported for trusted LAN/localhost; use HTTPS for untrusted networks. Account policy grants only object read/write/delete and bucket location on the dedicated bucket. Provision bucket outside app startup; do not grant app admin or policy-edit permissions.

LAN endpoint: http://192.168.1.17:9000. Native same-host: http://127.0.0.1:9000. Container same-host: external shared Docker network with MinIO alias `minio`, endpoint http://minio:9000; container localhost must not be used for another container. Keep console on loopback for SSH/Tailscale. LAN API firewall must match the actual backend source IP and Docker forwarding path; do not guess an IP or change unrelated service rules. Document commands and network-dependent steps. No cloud tunnel or Internet exposure.

## Acceptance and verification

1. Upload and authenticated download preserve bytes; forbidden/anonymous access cannot read or attach files.
2. Invalid type/signature/size and more than four or duplicate IDs are rejected.
3. Reload and pagination retain metadata; retry preserves idempotency; failed provider responses retain files.
4. Missing storage config leaves text chat working; storage failures are actionable and staging cleanup is retryable.
5. UI supports choose/remove, text-required send, progress, failed-upload retry, history previews and downloads without credentials in URLs.
6. Run failing tests before implementation, then backend/frontend suites, lint, relevant Prettier checks, type-check/build and browser verification. Run disposable Mongo replica-set integration and a real MinIO roundtrip if available; distinguish mocked UI from live-service checks.

Non-goals: AI vision/document parsing/OCR, public buckets, arbitrary executable/HTML attachments, changing conversation deletion/retention, production app deployment or migrating MongoDB.

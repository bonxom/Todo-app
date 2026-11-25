# Web Push Notifications & PWA Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver VAPID-based Web Push notifications for Orbit task deadlines and completed AI Agent replies (only when unfocused), with per-device Settings toggles and a PWA manifest inside `backend/` and `frontend/`.

**Architecture:** Backend stores per-user browser `PushSubscription` documents with `taskDeadlines` / `agentReplies` flags in MongoDB and dispatches notifications via `web-push` from both `notificationGenerationService` and Agent turn completion handlers. Frontend serves a PWA manifest + icons + `/sw.js` Service Worker (uncached in `nginx.conf`) that suppresses `showNotification` when any Orbit window has `focused === true`, paired with device/category toggles in `NotificationsSettingsSection`.

**Tech Stack:** Express 5, Mongoose 9, Zod 4, `web-push`, Vite 7, React 19, Zustand, TanStack Query v5, Vitest, Playwright.

**Spec:** [2026-11-25 Web Push Notifications & PWA Manifest Design](../specs/2026-11-25-web-push-notifications-design.md)

## Global Constraints

- Keep all code strictly inside `backend/` and `frontend/` packages; never create a separate top-level root package.
- Install dependencies with pinned `pnpm` (`cd backend && pnpm add web-push && pnpm add -D @types/web-push`) so lockfiles stay consistent.
- All push API routes enforce `protect` authentication, `req.user._id` ownership scoping, and Zod validation (`req.validatedQuery` / `req.validatedBody`).
- Backend startup, worker scans, and Agent streams must never fail if VAPID keys are unset or push transport rejects.
- Service Worker must never display an OS popup if any Orbit window client has `focused === true`.
- Follow TDD per task: write failing tests first, confirm failure, implement, verify tests, then finish with lint, Prettier `format:check`, `build`/type-check, and Playwright E2E + visual screenshot verification.

---

### Task 1: Backend Web Push Config, Model, Repository & API Routes

**Files:**
- Modify `backend/package.json` & `backend/pnpm-lock.yaml` (add `web-push` and `@types/web-push`)
- Create `backend/config/webPush.ts`
- Create `backend/types/IPushSubscription.ts`
- Create `backend/models/PushSubscription.ts`
- Create `backend/repositories/pushSubscriptionRepository.ts`
- Create `backend/services/pushDispatchService.ts`
- Modify `backend/error/definitions/notificationErrors.ts`
- Modify `backend/validations/notificationValidation.ts`
- Modify `backend/controllers/notificationController.ts`
- Modify `backend/routes/notificationRoute.ts`
- Create `backend/services/test/pushNotification.test.ts`

**Steps:**
- [ ] Install `web-push` and `@types/web-push` in `backend/` with `pnpm`.
- [ ] Write failing unit/HTTP tests in `backend/services/test/pushNotification.test.ts` covering:
  - `GET /api/notifications/push/config` returning `{ supported: false, publicKey: null }` when VAPID env vars are absent and `{ supported: true, publicKey }` when set.
  - Zod validation of subscription `endpoint`, `keys`, `prefs` (`taskDeadlines`, `agentReplies`).
  - `POST`, `GET /current`, `PATCH`, `DELETE /api/notifications/push/subscriptions` enforcing `userId` scoping and `503`/`404` error mapping.
  - `pushDispatchService.sendToUser(...)` filtering by category preference (`taskDeadlines` vs `agentReplies`) and removing stale `404`/`410` subscriptions without throwing.
- [ ] Run `cd backend && pnpm exec vitest run services/test/pushNotification.test.ts` to confirm failure.
- [ ] Implement `webPush.ts` config reader, `PushSubscription` model & repository, `pushDispatchService`, notification error codes, Zod schemas, controller handlers, and Express routes.
- [ ] Re-run `services/test/pushNotification.test.ts` and `cd backend && pnpm run build` to confirm pass.

---

### Task 2: Wire Backend Deadline Worker & AI Agent Completion Hooks

**Files:**
- Modify `backend/services/notificationGenerationService.ts`
- Modify `backend/repositories/chatStreamRepository.ts`
- Modify `backend/services/conversationTurnService.ts`
- Modify `backend/services/test/notificationGenerationService.test.ts`
- Create `backend/services/test/agentPushCompletion.test.ts`

**Steps:**
- [ ] Write failing tests covering:
  - `generateNotifications()` calling `pushDispatchService.notifyDeadline(...)` when `insertOnce` creates a new `due_soon`/`overdue` row, skipped when `insertOnce` deduplicates, and continuing scan if push dispatch rejects.
  - Completing an AI Agent turn (`status === "completed"` via both text turn finalization and proposal finalization) calling `pushDispatchService.notifyAgentReply(...)` once per turn, while `cancelled` / `failed` / `timed_out` turns do not trigger push.
- [ ] Run focused Vitest tests in `backend/` to confirm failure.
- [ ] Integrate `notifyDeadline` in `notificationGenerationService.ts` and `notifyAgentReply` in `chatStreamRepository.ts` / `conversationTurnService.ts` (fire-and-forget guarded best-effort).
- [ ] Run `cd backend && pnpm exec vitest run && pnpm run lint && pnpm run format:check && pnpm run build`.

---

### Task 3: Frontend PWA Manifest, Icons, Nginx Caching & Service Worker

**Files:**
- Create `frontend/public/manifest.webmanifest`
- Create `frontend/public/icons/orbit-192.png` & `frontend/public/icons/orbit-512.png`
- Create `frontend/public/sw.js`
- Modify `frontend/index.html`
- Modify `frontend/nginx.conf`
- Create `frontend/src/features/notifications/test/serviceWorkerPush.test.ts`

**Steps:**
- [ ] Write failing tests in `frontend/src/features/notifications/test/serviceWorkerPush.test.ts` exercising `public/sw.js` event handlers in a lightweight Service Worker mock environment:
  - Suppresses `registration.showNotification` when at least one Orbit client window has `focused === true`, while still calling `client.postMessage({ type: "ORBIT_PUSH_RECEIVED", kind })`.
  - Calls `registration.showNotification` with title/body/url/tag when no window client is focused (or no windows exist).
  - Handles `notificationclick` by focusing an existing window and navigating or calling `clients.openWindow(url)`.
- [ ] Run `cd frontend && pnpm exec vitest run src/features/notifications/test/serviceWorkerPush.test.ts` to confirm failure.
- [ ] Add PNG icons generated from Orbit brand mark, create `public/manifest.webmanifest`, update `index.html` with manifest + `apple-touch-icon`, add `location = /sw.js` with `no-cache` in `frontend/nginx.conf`, and implement `public/sw.js`.
- [ ] Re-run `serviceWorkerPush.test.ts` to confirm pass.

---

### Task 4: Frontend Push Client, Notification Query Sync & Settings UI

**Files:**
- Modify `frontend/src/shared/types/notification.ts`
- Modify `frontend/src/shared/services/notificationService.ts`
- Create `frontend/src/features/notifications/lib/pushSubscription.ts`
- Modify `frontend/src/features/notifications/api/notificationQueries.ts`
- Modify `frontend/src/features/settings/components/NotificationsSettingsSection.tsx`
- Modify `frontend/src/shared/i18n/locales/en/settings.json` & `frontend/src/shared/i18n/locales/vi/settings.json`
- Modify `frontend/src/features/settings/test/SettingsPage.test.tsx`
- Create `frontend/src/features/notifications/test/pushSubscription.test.ts`

**Steps:**
- [ ] Write failing unit/component tests covering:
  - `pushSubscription.ts`: VAPID key encoding, `unsupported` / `denied` / `unconfigured` detection, subscribe + backend sync, preference update, unsubscribe + delete.
  - `NotificationsSettingsSection`: master browser push toggle + `taskDeadlines` & `agentReplies` sub-toggles, error banner recovery when permission denied or backend fails, EN & VI localization.
- [ ] Run focused Vitest tests in `frontend/` to confirm failure.
- [ ] Implement typed API methods in `notificationService.ts`, push helper in `pushSubscription.ts`, SW message invalidation listener in `notificationQueries.ts`, and `NotificationsSettingsSection.tsx` + translations.
- [ ] Run `frontend` focused Vitest tests to confirm pass.

---

### Task 5: Playwright E2E Verification, Visual Inspection & Final Checks

**Files:**
- Create `frontend/e2e/v2-push-notifications.spec.ts`

**Steps:**
- [ ] Write Playwright E2E tests verifying:
  - `/manifest.webmanifest` and `/sw.js` are served with valid content/status.
  - `/v2/settings?section=notifications` and `/settings?section=notifications` display push status & toggles in light/dark and EN/VI with 44px touch targets and zero horizontal overflow.
  - Subscribing mocks `PushManager` / `Notification` permission and sends `POST /api/notifications/push/subscriptions`; toggling `taskDeadlines` / `agentReplies` sends `PATCH`; disabling sends `DELETE`.
  - Capture screenshots for `/tmp/v2-push-notifications/` across desktop/mobile and inspect visually via `read_file`.
- [ ] Format modified files with Prettier, then run complete verification:
  - `cd backend && pnpm run lint && pnpm run format:check && pnpm run build && pnpm test`
  - `cd frontend && pnpm exec vitest run --pool=forks --maxWorkers=4 && pnpm run lint && pnpm run format:check && pnpm run build && pnpm run test:e2e v2-push-notifications.spec.ts settings.spec.ts notifications.spec.ts frontend-v2.spec.ts`

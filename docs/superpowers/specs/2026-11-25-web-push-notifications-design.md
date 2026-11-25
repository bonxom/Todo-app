# Web Push Notifications & PWA Manifest Design

## Goal

Add standards-based Web Push notifications and a PWA Web App Manifest to Orbit inside `backend/` and `frontend/`, so users receive OS-level notifications for **task deadline reminders** (`due_soon` and `overdue`) and **completed AI Agent replies** — suppressed whenever any Orbit browser window is currently focused — and can enable/disable push and individual notification categories per device from Settings.

## Non-goals

- Creating a separate root-level microservice package outside `backend/` and `frontend/`.
- Implementing offline caching, background sync, or IndexedDB state in the Service Worker (the Service Worker handles push reception, notification clicks, and window invalidation pings only).
- Integrating third-party proprietary push SDKs (Firebase Cloud Messaging SDK or OneSignal); delivery uses standard Web Push with VAPID keys.
- Persisting "Agent reply finished" events as entries in the task-deadline `Notification` collection.

## Architecture Overview

1. **VAPID-based Web Push (`backend/` + `frontend/`):**
   - Backend signs push requests using optional `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` environment variables via `web-push`.
   - When VAPID keys are absent, `GET /api/notifications/push/config` returns `{ supported: false, publicKey: null }` and push dispatch/worker runs become safe no-ops without crashing API startup, worker loops, or tests.
2. **Backend Trigger Sources:**
   - **Task Deadlines:** [notificationGenerationService.ts](../../../backend/services/notificationGenerationService.ts) dispatches `"taskDeadlines"` push payloads after `notificationRepository.insertOnce(...)` inserts a new notification record (preserving existing idempotency guarantees).
   - **AI Agent Replies:** Completion handlers in [chatStreamRepository.ts](../../../backend/repositories/chatStreamRepository.ts) and proposal-turn finalization in [conversationTurnService.ts](../../../backend/services/conversationTurnService.ts) dispatch `"agentReplies"` push payloads best-effort when `status === "completed"` (skipping cancelled, failed, interrupted, or timed-out turns).
3. **Focus Suppression (`frontend/public/sw.js`):**
   - On `push`, the Service Worker calls `clients.matchAll({ type: "window", includeUncontrolled: true })`.
   - It posts `{ type: "ORBIT_PUSH_RECEIVED", kind }` to open Orbit windows so UI queries refresh immediately.
   - If any window reports `client.focused === true`, `showNotification(...)` is skipped; otherwise it shows the OS notification linking to the relevant Orbit route.
4. **PWA Manifest (`frontend/public/manifest.webmanifest`):**
   - Declares Orbit app metadata (`name`, `short_name`, `display: "standalone"`, `start_url: "/"`, PNG icons `192x192` and `512x512`) and links into [index.html](../../../frontend/index.html) (`manifest` + `apple-touch-icon`), enabling browser app install and iOS 16.4+ Home Screen Web Push.
   - [nginx.conf](../../../frontend/nginx.conf) serves `/sw.js` with `no-cache, no-store, must-revalidate` before the 1-year static JS cache rule.

## Backend API & Data Contracts

### Model: `PushSubscription` (`backend/models/PushSubscription.ts`)

| Field | Type | Constraints |
| --- | --- | --- |
| `userId` | `ObjectId` | required, ref `User`, indexed |
| `endpoint` | `string` | required, trimmed; unique compound index `(userId, endpoint)` |
| `keys` | `{ p256dh: string, auth: string }` | required |
| `prefs` | `{ taskDeadlines: boolean, agentReplies: boolean }` | default `{ taskDeadlines: true, agentReplies: true }` |
| `userAgent` | `string` | optional, trimmed, max 500 chars |
| `lastUsedAt` | `Date \| null` | default `null` |
| timestamps | `createdAt`, `updatedAt` | managed by Mongoose |

### Endpoints (`backend/routes/notificationRoute.ts` under `/api/notifications/push`)

All routes require `protect` (`req.user._id`) and Zod validation (`req.validatedQuery` / `req.validatedBody`):

1. `GET /api/notifications/push/config`
   - Returns `{ supported: boolean, publicKey: string | null }`.
2. `GET /api/notifications/push/subscriptions/current?endpoint=<url>`
   - Validates `endpoint` URL (`https://...` or loopback `http://` for test harnesses).
   - Returns `{ subscribed: boolean, prefs: { taskDeadlines: boolean, agentReplies: boolean } | null }` scoped strictly to `req.user._id`.
3. `POST /api/notifications/push/subscriptions`
   - Body: `{ endpoint, keys: { p256dh, auth }, prefs?: { taskDeadlines?: boolean, agentReplies?: boolean }, userAgent?: string }`.
   - If VAPID config is missing on server, throws `NOTIFICATION_ERROR.PUSH_NOT_CONFIGURED` (`503`).
   - Upserts subscription for `(req.user._id, endpoint)` and returns `{ subscribed: true, prefs }`.
4. `PATCH /api/notifications/push/subscriptions`
   - Body: `{ endpoint, prefs: { taskDeadlines?: boolean, agentReplies?: boolean } }` (at least one key).
   - Updates `prefs` only for `{ userId: req.user._id, endpoint }`; throws `NOTIFICATION_ERROR.PUSH_SUBSCRIPTION_NOT_FOUND` (`404`) when missing.
   - Returns `{ subscribed: true, prefs }`.
5. `DELETE /api/notifications/push/subscriptions`
   - Body: `{ endpoint }`.
   - Deletes strictly `{ userId: req.user._id, endpoint }`; returns `{ removed: boolean }`.

### Push Delivery & Error Isolation (`backend/services/pushDispatchService.ts`)

- Queries subscriptions with `userId` and `prefs.<category>: true`.
- Sends JSON string `{ kind, title, body, url, tag }` (`kind` in `"due_soon" | "overdue" | "agent_reply"`).
- Does **not** include private task/message secrets beyond concise display notification strings (`taskTitle` for deadline, conversation/default label for Agent reply).
- When push transport fails with HTTP `404` or `410`, deletes that stale `endpoint` for `userId` and continues sending to other devices.
- Network/transport failures log generic warning counts only and never throw out of worker scans or chat completion.

## Frontend Contracts & Settings UI

### Service Layer & Client Helper
- [notificationService.ts](../../../frontend/src/shared/services/notificationService.ts): adds `getPushConfig()`, `getCurrentPushSubscription(endpoint)`, `savePushSubscription(payload)`, `updatePushPreferences(payload)`, and `deletePushSubscription(endpoint)`.
- `frontend/src/features/notifications/lib/pushSubscription.ts`:
  - Feature detection (`"serviceWorker" in navigator`, `"PushManager" in window`, `"Notification" in window`).
  - Registers `/sw.js`, reads existing `pushManager.getSubscription()`, subscribes using `applicationServerKey`, and unsubscribes + deletes server record cleanly.
- [useUnreadCountQuery / NotificationBell / layout subscription](../../../frontend/src/features/notifications/api/notificationQueries.ts): listens to Service Worker `ORBIT_PUSH_RECEIVED` messages to invalidate `notificationKeys` when deadline notifications arrive.

### Settings UI ([NotificationsSettingsSection.tsx](../../../frontend/src/features/settings/components/NotificationsSettingsSection.tsx))
- Adds a cohesive **Web Push** control group matching V1/V2 `SettingsToggleRow` styling and full EN/VI copy ([en/settings.json](../../../frontend/src/shared/i18n/locales/en/settings.json), [vi/settings.json](../../../frontend/src/shared/i18n/locales/vi/settings.json)):
  - **Device toggle:** *"Push notifications on this browser"* (`enabled` / `disabled`), handling `Notification.requestPermission()`, subscribe/unsubscribe lifecycle, loading busy state, and clear inline status/error messages for unsupported browsers, unconfigured server VAPID, or denied browser permission.
  - **Category toggles (active when device is subscribed):**
    - *"Task deadline reminders"* (`taskDeadlines`)
    - *"AI Agent reply completed"* (`agentReplies`)

## Acceptance Criteria

1. `GET /api/notifications/push/config`, `GET /api/notifications/push/subscriptions/current`, `POST`, `PATCH`, and `DELETE /api/notifications/push/subscriptions` validate inputs with Zod, scope reads/mutations strictly to `req.user._id`, and degrade cleanly (`supported: false` / `503`) when VAPID env vars are unset.
2. Generating a new `due_soon` / `overdue` notification via `generateNotifications()` dispatches Web Push once per newly inserted notification to devices with `prefs.taskDeadlines: true`; failed or `404`/`410` endpoints are isolated/pruned without failing worker scans.
3. Completing an AI Agent turn (`status === "completed"`, both text and proposal finalization paths) triggers best-effort Web Push to devices with `prefs.agentReplies: true`; cancelled/failed turns do not trigger push.
4. `frontend/public/sw.js` checks `clients.matchAll({ type: "window", includeUncontrolled: true })`: suppresses OS `showNotification` if any client window has `focused === true`, shows notification when unfocused, and navigates/focuses to `url` on `notificationclick`.
5. `frontend/public/manifest.webmanifest` + `index.html` + `nginx.conf` expose valid PWA manifest, icons, and non-cached `/sw.js`.
6. Settings UI in both V1 (`/settings?section=notifications`) and V2 (`/v2/settings?section=notifications`) toggles browser push subscription and individual `taskDeadlines` / `agentReplies` preferences, tested in EN/VI and light/dark via Vitest and Playwright E2E.

# Deadline notifications

The API serves stored notifications; a separate worker must run to generate them.
Only pending/in-progress tasks with a deadline qualify. Upcoming reminders start
10 hours before the stored instant; overdue reminders start at the deadline.
Each recipient/task/type/deadline is inserted once, including across restarts.
Existing overdue tasks are included on first run. There are no email or push deliveries.

## Local / persistent server

From `backend`, configure the existing MongoDB environment, then run:

```sh
pnpm run notifications:worker
```

The worker initializes unique indexes, scans immediately and waits 60 seconds after
each completed scan. Failed scans retry on the next interval. SIGTERM/SIGINT stop
new scans, finish the active scan, and disconnect MongoDB. Keep this process under
a process supervisor. The API process alone does not generate notifications.

For an external scheduler, invoke this one-shot command every minute:

```sh
pnpm run notifications:generate
```

Run it from the backend directory; supply MONGO_URI and optional MONGO_NAME via the
deployment environment. It initializes indexes, scans and disconnects. Nonzero
exit status means the run failed. Never run a persistent timer inside a serverless
HTTP request; schedule the one-shot command on a worker-capable host instead.

## Docker

```sh
docker compose up -d --build backend frontend notification-worker
docker compose logs --tail 30 notification-worker
```

The worker shares the backend build and backend environment, with no public port.
For production CD, `docker-compose.prod.yml` also defines `notification-worker`
using the same backend image and commit tag as the API. Deploy this updated
Compose file together with the notification-capable backend image. The CD
workflow's existing `pull` and `up` commands include all three services.
Check it on the production host with
`docker compose -f docker-compose.prod.yml logs --tail 30 notification-worker`.
Unique index creation must succeed before any scan. Logs contain counts and generic
failure messages, not task contents or credentials. Multiple workers are safe for
insert deduplication, but normally run one to avoid unnecessary database load.

The UI polls while visible every 60 seconds and refreshes on opening the bell or
returning to the tab. Nominal delivery delay is roughly two minutes plus scan time;
failures may delay it further. On recovery only the current deadline/status is
considered; missed upcoming reminders are not replayed after a task is overdue.

Date-only inputs keep the existing server-midnight interpretation. Changing the
server timezone changes interpretation of new date-only input, not stored instants.
History has no TTL, because deleting deduplication records could resend reminders.

## Verification

Tests using ORBIT_MCP_TEST_MONGO_URI require a disposable loopback MongoDB URI
(e.g. mongodb://127.0.0.1:27029/). They create and drop their own uniquely named
database; never point them at a user's database.

## Reading and clearing history

The bell popup and notification history provide per-item Mark as read, Mark all
as read, and Delete all notifications. Delete all asks for confirmation and clears
the current user's history across all pages and read states. Notifications created
after the request began are preserved.

Removal sets an internal deletedAt marker. Deleted entries are excluded from
history, unread counts and read mutations, while their unique reminder key remains
stored. This prevents the worker from recreating the same reminder on its next
scan. A later overdue reminder or a different deadline can still generate a new
notification. This action clears application history; it is not permanent database
erasure. Existing entries without deletedAt remain visible without migration.

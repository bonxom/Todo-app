# Private chat storage with MinIO

All file traffic goes through the authenticated TodoApp API. Browsers never receive storage credentials or internal MinIO URLs. Files remain available in conversation history; the assistant does not read their contents yet.

## Backend configuration

Supply these variables through your deployment's secret manager or environment (do not commit secrets):

```dotenv
MINIO_ENDPOINT=http://192.168.1.17:9000
MINIO_ACCESS_KEY=<dedicated-app-account>
MINIO_SECRET_KEY=<dedicated-app-secret>
MINIO_BUCKET=todoapp-chat
MINIO_REGION=us-east-1
```

Leave endpoint, key, secret and bucket all empty to disable attachments without disabling text chat. Partial configuration fails startup. Restart the backend after setting configuration. Uploads accept one multipart `file` per request, at most 10 MiB; a chat message can contain four files. Text is required. JPEG/PNG/GIF/WebP/PDF and UTF-8 TXT/Markdown/CSV are supported.

| Deployment                        | Endpoint                   | Network requirement                                       |
| --------------------------------- | -------------------------- | --------------------------------------------------------- |
| Backend on another LAN machine    | `http://192.168.1.17:9000` | LAN API port reachable from that machine                  |
| Native Node backend on MinIO host | `http://127.0.0.1:9000`    | MinIO loopback API binding                                |
| Docker backend on MinIO host      | `http://minio:9000`        | Both containers on `todoapp-storage`, MinIO alias `minio` |

For same-host Docker, the MinIO Compose file needs:

```yaml
services:
  minio:
    networks: [shared, storage] # retain existing networks
networks:
  storage:
    name: todoapp-storage
    driver: bridge
```

Bring up MinIO first, then use the application overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.storage.yml up -d --build
# Or published app images:
docker compose -f docker-compose.prod.yml -f docker-compose.storage.yml up -d
```

The overlay connects only the backend to storage and overrides its endpoint. Keep the frontend on the app network. `127.0.0.1` inside a backend container is the backend container itself, not MinIO. `host.docker.internal` cannot reach a host service bound exclusively to loopback; use the shared network instead.

The storage server's `todoapp-storage` network was configured on 2026-10-31. App deployment remains a separate step; no production backend or MongoDB migration is performed by this feature.

## Bucket and account provisioning

Create a dedicated private bucket using an administrator, then a dedicated user with this policy (replace bucket name if necessary):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation"],
      "Resource": ["arn:aws:s3:::todoapp-chat"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::todoapp-chat/*"]
    }
  ]
}
```

The provisioned account credentials are stored on `192.168.1.17` at `/srv/shared-infra/todoapp-storage.credentials.json`, readable only by owner `dung` (mode `600`). Transfer them through a secure channel into backend configuration; they are not in this repository.

Do not give the app root credentials or bucket administration. The SDK uses a configured region and requests below the multipart threshold. Bucket creation is an operator action, not application startup. MinIO SDK reference: <https://github.com/minio/minio-js/blob/master/docs/API.md>.

## Restricting network access

Keep `127.0.0.1:9001:9001` for the console. Open it through SSH:

```bash
ssh -L 9001:127.0.0.1:9001 dung@192.168.1.17
```

Then open `http://127.0.0.1:9001`. For LAN backend support retain API bindings on loopback and `192.168.1.17:9000`. When all app traffic uses the Docker network, the LAN API binding can also be removed. Do not expose these HTTP ports through router port forwarding.

To restrict the LAN API further, first determine the actual backend source IP (including any NAT), then configure the server firewall. For Docker with iptables, use DOCKER-USER/conntrack original-destination matching rather than assuming UFW INPUT rules filter published ports. Match original destination `192.168.1.17:9000`, allow the backend source, and drop other sources on the LAN ingress interface. Preserve localhost, SSH, Tailscale and Docker internal traffic. Persist rules using the server's existing firewall management. No backend source-IP allowlist is installed by this change because the final backend IP was not specified. Authentication and private bucket policy remain enforced.

## Retention and cleanup

Attachments bound to saved turns are retained indefinitely with the conversation. Unused staging/uploads older than 24 hours are eligible for cleanup. Run hourly with the same MongoDB and MinIO environment as the backend:

```bash
cd backend
pnpm run storage:cleanup
# Docker deployment:
docker compose exec -T backend pnpm run storage:cleanup
```

One run processes up to 100 records and prints removed/failed counts. Deletion failures remain retryable. Schedule more often or repeat runs if there is a backlog; do not install a MinIO blanket expiry policy on this bucket because it would delete saved conversation files. Back up both MongoDB metadata and MinIO data.

The runtime requires MongoDB transactions, as existing chat already does; use a replica set. No cleanup scheduler is installed automatically before the backend is deployed.

## Verification

```bash
cd backend
pnpm run storage:smoke
```

This writes a unique smoke object, verifies byte-for-byte retrieval and removes only that object. It uses the configured app account. Separately test unauthorized access returns 401/404, a conversation reload restores previews/downloads, and the file survives a failed AI response. Nginx API upload limit is 11m to allow multipart overhead for a 10 MiB file; API downloads use no-store and cannot be caught by static asset caching routes.

HTTP is intended for trusted LAN/loopback. Use HTTPS if the network is untrusted. Vercel cannot access this LAN endpoint directly; no Internet tunnel is configured.

# Chat attachments verification — 2026-10-31

Implementation is in the `feat/s3-storage` working tree. This is application integration plus MinIO provisioning, not deployment of the production application.

## Checks and results

Commands below ran from the repository root unless a package directory is specified.

| Command                                                                                                                                                             | Result                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27027/ pnpm --dir backend test`                                                                                       | 273 tests passed in 32 files; no skipped suites                                                         |
| `pnpm --dir backend run lint`                                                                                                                                       | Passed                                                                                                  |
| `pnpm --dir backend run build`                                                                                                                                      | Passed (TypeScript 7 compiler)                                                                          |
| `pnpm --dir frontend test`                                                                                                                                          | 167 passed, one pre-existing Calendar test failed                                                       |
| `pnpm --dir frontend run lint`                                                                                                                                      | Passed, no warnings                                                                                     |
| `pnpm --dir frontend run build`                                                                                                                                     | Passed; existing mixed static/dynamic ErrorPage import warning                                          |
| `pnpm --dir frontend exec playwright test e2e/chat-attachments.spec.ts`                                                                                             | Chromium passed: multipart upload, text required, decoded image preview, reload, authenticated download |
| `pnpm --dir backend run storage:smoke`                                                                                                                              | Real LAN MinIO write/read/delete passed with dedicated app account                                      |
| `ORBIT_TEST_LIVE_STORAGE=true ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27027/ pnpm --dir backend exec vitest run services/test/attachments.integration.test.ts` | 8 tests passed using real MinIO and disposable MongoDB; AI provider mocked                              |
| `pnpm --dir backend install --frozen-lockfile`                                                                                                                      | Passed                                                                                                  |
| `pnpm --dir frontend install --frozen-lockfile`                                                                                                                     | Passed                                                                                                  |
| `docker compose -f docker-compose.yml -f docker-compose.storage.yml config --quiet`                                                                                 | Passed                                                                                                  |
| `DOCKERHUB_USERNAME=todoapp-verification docker compose -f docker-compose.prod.yml -f docker-compose.storage.yml config --quiet`                                    | Passed                                                                                                  |
| `docker run --rm --add-host backend:127.0.0.1 -v /home/bonxom/Code/TodoApp/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine nginx -t`             | Passed                                                                                                  |
| `git diff --check`                                                                                                                                                  | Passed                                                                                                  |

Prettier checks were scoped to changed source/configuration files (not generated lockfiles). The exact file selection and command orchestration were:

```python
from pathlib import Path
import subprocess
files = subprocess.check_output([
    'git', 'ls-files', '-m', '-o', '--exclude-standard', '-z'
]).decode().split('\0')
files = [f for f in files if f and not f.endswith('pnpm-lock.yaml')
         and Path(f).suffix in {'.ts', '.tsx', '.jsx', '.js', '.json', '.md', '.yml'}]
for directory in ['backend', 'frontend']:
    selected = [str(Path(f).resolve()) for f in files if f.startswith(directory + '/')]
    subprocess.run(['pnpm', '--dir', directory, 'exec', 'prettier', '--check', *selected], check=True)
```

The real-storage tests received MINIO variables through a subprocess environment loaded from a temporary mode-600 credentials JSON file. No real `.env` file was changed. That temporary local copy was deleted after verification; the provisioned credentials remain on the storage host.

Disposable MongoDB setup:

```bash
docker run -d --name todoapp-attachments-mongo -p 127.0.0.1:27027:27027 mongo:7 --replSet rs0 --bind_ip_all --port 27027
docker exec todoapp-attachments-mongo mongosh --port 27027 --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27027"}]})'
```

Each integration suite created a unique test database and dropped only that database afterwards. Real MinIO tests deleted only objects created by these tests. The disposable MongoDB container was removed after verification.

## Red tests and regression coverage

Before implementation, the storage service tests failed because the attachment module did not exist. After correcting test setup (multipart part limit and JWT expiry), conversation integration tests failed for the expected missing behavior: absent history metadata, acceptance of cross-conversation attachment IDs and deletion of uploads that should have been bound to messages. Frontend tests failed because the file inputs and private previews were missing. A later malformed multipart test reproduced a 500 and now verifies the corrected 400 response.

Passing coverage includes ownership/anonymous access, signature and size checks, duplicate/count limits, rollback when one attachment is invalid, retry conflict detection, pending recovery, pagination, provider failure retention, cleanup/claim races, inline image headers, invalid multipart bodies, partial-upload retry without reuploading successful files, draft preservation and blob URL revocation.

## Known baseline failure

`frontend/src/features/calendar/components/test/CalendarTaskDetailCard.test.jsx:60` fails its DOM-order assertion. Reproduced independently against a clean `git archive HEAD frontend` under `/tmp/todoapp-attachments-baseline`, using existing installed dependencies:

```bash
cd /tmp/todoapp-attachments-baseline/frontend
pnpm --config.verify-deps-before-run=false exec vitest run src/features/calendar/components/test/CalendarTaskDetailCard.test.jsx
```

The same one test fails there. Calendar source and tests were not modified. Full frontend regression verification is therefore not entirely green.

## Provisioned server state

- Private bucket: `todoapp-chat`; no anonymous read policy.
- App account has only bucket-location and object read/write/delete permissions for this bucket. Access to another project's bucket was denied in smoke checks.
- Credentials: `/srv/shared-infra/todoapp-storage.credentials.json` on `192.168.1.17`, owner `dung`, mode `600`.
- MinIO API: `127.0.0.1:9000` and `192.168.1.17:9000`.
- Console: `127.0.0.1:9001` only; existing Tailscale forwarding retained.
- Dedicated Docker network: `todoapp-storage`, alias `minio`; existing shared network retained.
- Same-host loopback and separate-container Docker-network write/read/delete checks passed.
- MinIO healthy after recreate. No test objects remained in the app bucket.
- Compose backup: `/srv/shared-infra/compose.yml.bak-todoapp-storage-20261031-043706`.

## Operator steps remaining

Set the backend's MINIO variables from the protected credential file and choose the endpoint for the deployment mode; restart/deploy the app. Schedule `storage:cleanup` hourly once the backend is deployed. An IP allowlist for LAN API access is not installed because the final backend source IP has not been specified; bucket/account authentication is enforced. No cloud tunnel or router forwarding was added. AI vision/document interpretation remains outside this feature.

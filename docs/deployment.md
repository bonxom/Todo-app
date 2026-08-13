# GitHub Actions CI and deployment

The workflows are split by responsibility:

- `.github/workflows/ci.yml` runs automatically for pull requests targeting `main` and pushes to `main`. It validates the application; pull requests also build both Docker images without publishing them.
- `.github/workflows/cd.yml` never runs automatically. Start it from **Actions → CD → Run workflow** and select the branch or tag to deploy. It builds and publishes immutable commit-SHA tags plus `latest`, then deploys the SHA-tagged images over SSH.

The CD workflow begins with image publishing and does not repeat CI validation. Deploy only a ref whose CI checks have passed. Production deployments are serialized, so a second manual run will not execute concurrently with one already in progress.

## GitHub secrets

Configure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` as repository secrets because the image-publishing jobs use them. Configure the `DEPLOY_*` values as secrets in a GitHub environment named `production` (repository secrets also work, but environment secrets provide tighter deployment scoping):

| Secret | Purpose |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub account or organization that owns `todoapp-backend` and `todoapp-frontend` |
| `DOCKERHUB_TOKEN` | Docker Hub access token with push access; the server also uses it to pull private images |
| `DEPLOY_HOST` | Production server hostname or IP address |
| `DEPLOY_USER` | SSH user with Docker access |
| `DEPLOY_PORT` | SSH port; optional, defaults to `22` |
| `DEPLOY_PATH` | Absolute deployment directory on the server, for example `/home/deployer/todoapp` |
| `DEPLOY_SSH_KEY` | Private key matching a public key in the server user's `authorized_keys` |
| `DEPLOY_KNOWN_HOSTS` | Trusted known-hosts entry for the server |

Generate the known-hosts value from a trusted network and verify its fingerprint before saving it:

```bash
ssh-keyscan -p 22 your-server.example.com
```

The optional repository variable `DOCKER_PLATFORM` selects the target architecture. It defaults to `linux/amd64`; use `linux/arm64` for an ARM server.

## Server prerequisites

Install Docker Engine and the Docker Compose plugin. Add `DEPLOY_USER` to the Docker group or otherwise grant it permission to run Docker commands.

The workflow uploads `docker-compose.prod.yml`, but deliberately does not upload application secrets. Create the backend environment file once on the server:

```text
<DEPLOY_PATH>/backend/.env
```

Populate it with the variables documented in `backend/.env.example`, including MongoDB, JWT, and optional AI settings. The deployment stops before replacing containers if this file is missing.

Create the two Docker Hub repositories before the first deployment if the account does not create repositories automatically:

- `todoapp-backend`
- `todoapp-frontend`

For safer production releases, configure a protected GitHub environment named `production` and require approval before deployment.

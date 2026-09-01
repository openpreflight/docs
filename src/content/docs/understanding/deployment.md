---
title: "Deployment"
description: "Compose mounts, DOCKER_GID, reverse-proxy notes, Coolify install-worker, and rotating CI_SECRET_KEY."
sidebar:
  order: 3
---
The image is a static Go binary plus `git`, Node, and `docker-cli`. It runs as
uid 10001. `tini` is the entrypoint so pipeline shells get reaped.

Two compose files ship. `compose.prod.yaml` pulls the published image and needs
no checkout; `compose.yaml` is `build: .` and is the contributor path.

```bash
curl -O https://raw.githubusercontent.com/openpreflight/openpreflight/main/compose.prod.yaml
export CI_SECRET_KEY="$(openssl rand -base64 48)"   # required, keep it forever
export CI_PUBLIC_BASE_URL="https://ci.example.com"  # optional seed
docker compose -f compose.prod.yaml up -d
```

Set `OPENPREFLIGHT_VERSION` to pin a release; the default is `latest`.

Both files map `8080:8080` and take three mounts:

| Volume | Mount | Must persist |
|---|---|---|
| `ci-data` | `/data` | yes: `ci.db`, encrypted secrets, job history, logs |
| `ci-workspace` | `/workspace` | no, but a volume keeps checkouts off the container's writable layer |
| host socket | `/var/run/docker.sock` | no; needed for `runtime:` and fork PRs |

`group_add: ${DOCKER_GID:-998}` puts uid 10001 in the socket's group. The value
you need is the gid the container sees, which is not always what the host
reports. Read it from inside:

```bash
docker compose exec openpreflight stat -c %g /var/run/docker.sock
```

On Linux with a native engine that matches the host's
`stat -c %g /var/run/docker.sock`, and the default of `998` is often already
right. On Docker Desktop it is `0`: the socket is `root:root` inside the
VM, and the host path is a symlink into `~/.docker`, so the host's `stat`
reports an unrelated group. Set `DOCKER_GID=0` there and recreate the
container.

When this process is itself a container and `docker.sock` is the host engine,
`docker run -v` must use the host path for `WORKSPACE_DIR` (the directory
behind `/workspace` in `/proc/self/mountinfo`). The worker rewrites that
itself. If a `runtime:` job logs `runtime … via docker` then fails because
`package-lock.json` is missing, the rewrite missed: set `CI_WORKSPACE_HOST`
to the host directory mounted at `WORKSPACE_DIR` and recreate.

Nothing else needs this. The service boots and reports checks with an
unreachable socket; only `runtime:` jobs and fork PRs fail. Job containers
never receive that socket; see [ADR 004](/adr/004-docker-executor/).

To run jobs on another Docker engine (including a Coolify server's), set
`CI_DOCKER_HOST` (else `DOCKER_HOST`) to that daemon. That is Docker's remote
API, not Coolify's. Coolify tokens cannot start `docker run`.

## Coolify (or any reverse proxy)

- Give the service a public HTTPS URL. GitHub must reach `POST /webhook/{slug}`.
- Point the domain at this container's port 8080.
- Set `CI_SECRET_KEY` as a secret / env var on the application, not in git.
- Optionally set `CI_PUBLIC_BASE_URL` to the public origin for first boot, and
  `CI_BOOTSTRAP_ADMIN_PASSWORD` if you will configure over the API instead of
  the wizard.
- Honour `X-Forwarded-Proto`: session and CSRF cookies set `Secure` when that
  header is `https` (Coolify's Traefik does this).
- Health check: `GET /health` (the image already defines one). A 503 means the
  process cannot read SQLite.

Inspect → Install this worker calls
`POST /api/v1/applications/dockercompose` with `instant_deploy: false`. Set
`CI_SECRET_KEY` on the new application before the first start, attach this
repository if the compose file `build: .`s, and make sure the service user can
talk to that host's docker socket (same `DOCKER_GID` problem as Compose). The
API token for that call needs permission to create applications; inventory
still works with read-only.

Never point Coolify's own GitHub connector webhook at this service. An App has
one webhook URL, and repointing it steals Coolify's deploys. See
[ADR 003](/adr/003-github-app/).

## After first boot

1. Complete setup (admin password + public base URL) if you did not bootstrap.
   See [Quickstart](/start/quickstart/).
2. [Register a GitHub App](/setup/github-app/) and paste it under **GitHub Apps**.
3. [Enable bindings](/setup/bindings/). Only enable private repos you trust: a
   pipeline runs the repo's own commands in this process, or in a sibling
   container when `runtime:` is set.
4. Optionally [add a Coolify instance](/setup/coolify/) (team token) as a
   repo-picker source, or to install this worker.

## Rotating `CI_SECRET_KEY`

1. Generate a new key (`openssl rand -base64 48`).
2. Set `CI_SECRET_KEY` to the new value and `CI_SECRET_KEY_OLD` to the previous
   one.
3. Start once. The process re-seals `pem_enc`, `webhook_secret_enc`, and
   `api_token_enc`, then logs that you should unset the old key.
4. Unset `CI_SECRET_KEY_OLD` and restart so the previous key is not left in
   the environment.

A row that opens with neither key fails startup. Keep a backup of `/data`
from before the rotate until you have logged in and tested an App.

## Backups

Copy `/data` (or the `ci-data` volume) and keep `CI_SECRET_KEY` with it. The
database without the key is not enough to recover PEMs and tokens. The key
without the database is not enough to recover configuration.

Procedure, restore, upgrades, and what a redeploy does to a running job are in
[Operations](/understanding/operations/).

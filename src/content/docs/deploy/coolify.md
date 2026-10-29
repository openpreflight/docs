---
title: "Optional: Coolify"
description: "Add a Coolify instance as a repository picker, and deploy the server on Coolify. Checks work without Coolify."
sidebar:
  order: 3
---
These procedures add a Coolify instance to openpreflight and deploy the server
on Coolify. Coolify is optional.

## Why Coolify is optional

Coolify is a supported deployment target and an optional source of
repositories. It is not the product, and checks work without it. With a team
API token, you get a server inventory, a repository picker and the
**Install this worker** function.

If you do not use Coolify, all other functions work the same. The checks come
from a [GitHub App that you register](/configure/github-app/). Jobs run on the
server host, or on a Docker engine that you set in `CI_DOCKER_HOST`. The
Coolify API cannot run jobs. Refer to
[Docker engine access](/deploy/deployment/#docker-engine-access).

:::caution
Do not point the webhook of the Coolify GitHub connector at openpreflight. A
GitHub App has one webhook URL. If you change it, Coolify stops its deploys.
Refer to [ADR 003](/reference/decisions/003-github-app/).
:::

## Add an instance

One row is one pair of base URL and API token. A Coolify API token has the
scope of one team. Thus a row covers that team, not all of the host. For a
second team on the same host, add a second row.

1. In Coolify, open **Security → API Tokens** (in older versions,
   **Keys & Tokens**).
2. Make a token. For the inventory, a read-only token is sufficient.
3. If you will create the server as a Coolify application, give the token
   permission to write applications.
4. In openpreflight, open **Coolify** and select **Add an instance**.
5. Enter the base URL and the API token.
6. Select **Test**.

**Test** calls `/api/v1/teams/current` and `/api/v1/servers`. Then it labels
the row with the team that the token can see.

## Install the server on Coolify

**Install this worker** creates a Docker Compose application on a Coolify
server. It does not start the application. Thus you can set `CI_SECRET_KEY`
before the first start.

1. Open **Coolify** and select **Inspect** on the instance.
2. In **Install this worker on a Coolify server**, enter the **Server UUID**
   and the **Project UUID**. The instance defaults fill these fields.
3. Optional: change the **Application name** and the **Environment**.
4. Select **Create application**.
5. In Coolify, set `CI_SECRET_KEY` on the new application as a secret.
6. In Coolify, attach the `openpreflight/openpreflight` repository to the
   application. The compose file has `build: .`.
7. Give uid 10001 access to the Docker socket on that host. Refer to
   [`DOCKER_GID`](/deploy/deployment/#docker_gid).
8. Configure the public URL. Refer to
   [Configure the reverse proxy](#configure-the-reverse-proxy).
9. Deploy the application.

The server calls `POST /api/v1/applications/dockercompose` with
`instant_deploy: false`. If Coolify returns 404 for that path, the server calls
`POST /api/v1/services`. Self-hosted Coolify 4.3.x uses the second path.

The compose file that the server sends has no `group_add` entry. Thus
`DOCKER_GID` has no effect on this application until you add one.

## Configure the reverse proxy

These steps apply to Coolify and to all other reverse proxies.

1. Give the server a public HTTPS URL. GitHub must reach
   `POST /webhook/{slug}`. Refer to [Networking](/deploy/networking/).
2. Point the domain at port 8080 of the container.
3. Set `CI_SECRET_KEY` as a secret on the application. Do not put it in git.
4. Optional: set `CI_PUBLIC_BASE_URL` to the public origin, for the first boot.
5. If you configure the server through the API, set `CI_BOOTSTRAP_ADMIN_PASSWORD`.
6. Make sure that the proxy sends `X-Forwarded-Proto: https`. Refer to
   [`X-Forwarded-Proto`](/deploy/networking/#x-forwarded-proto).
7. Use `GET /health` as the health check. The image has this health check.

## Result

`GET /health` returns `200`. A `503` tells you that the server cannot read
SQLite. Refer to [Health](/operate/health/).

## Related

- [Deployment](/deploy/deployment/): the volumes and the Docker engine access
- [Register a GitHub App](/configure/github-app/)
- [Quickstart](/getting-started/quickstart/#complete-the-setup): complete the setup after the first start

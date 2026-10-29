---
title: "Deployment"
description: "Start the server with Docker Compose, keep its volumes, and give it access to a Docker engine with DOCKER_GID and CI_DOCKER_HOST."
sidebar:
  order: 1
---
This procedure starts the server with Docker Compose and gives it access to a
Docker engine. For the shortest path to a first Check Run, refer to
[Quickstart](/getting-started/quickstart/).

## The image

The image contains a static Go binary, `git`, `nodejs`, `npm` and `docker-cli`.
The server runs as uid 10001. The entrypoint is `tini`, which stops the shells
of each pipeline step after the step ends.

The repository has two compose files:

| File | Use |
|---|---|
| `compose.prod.yaml` | Pulls the published image. You do not clone the repository. |
| `compose.yaml` | Has `build: .`. You must clone the repository. This is the contributor path. |

## Before you start

- A host with Docker and Docker Compose.
- A public HTTPS URL for the server. Refer to [Networking](/deploy/networking/).

## Procedure

1. Download `compose.prod.yaml`, set `CI_SECRET_KEY`, and start the server:

   ```bash
   curl -O https://raw.githubusercontent.com/openpreflight/openpreflight/main/compose.prod.yaml
   export CI_SECRET_KEY="$(openssl rand -base64 48)"   # required, keep it forever
   export CI_PUBLIC_BASE_URL="https://ci.example.com"  # optional seed
   docker compose -f compose.prod.yaml up -d
   ```

2. Optional: to pin a release, set `OPENPREFLIGHT_VERSION`. The default is `latest`.
3. If you use `runtime:` or fork pull requests, configure the
   [Docker engine access](#docker-engine-access).
4. Complete the setup. Refer to [Quickstart](/getting-started/quickstart/#complete-the-setup).

:::caution
Keep a copy of `CI_SECRET_KEY` in a safe location. If you lose the key, the
server cannot decrypt the stored private keys and tokens.
:::

## Volumes

The two compose files map `8080:8080` and use three mounts:

| Volume | Mount | Must persist |
|---|---|---|
| `ci-data` | `/data` | yes: `ci.db`, encrypted secrets, job history, logs |
| `ci-workspace` | `/workspace` | no, but a volume keeps checkouts out of the writable layer of the container |
| host socket | `/var/run/docker.sock` | no; necessary for `runtime:` and fork pull requests |

To make a backup of `/data`, refer to [Backup and restore](/operate/backup-restore/).

## Docker engine access

The server uses a Docker engine for jobs that set `runtime:`, and for fork pull
requests. Without an engine, the server starts and reports checks. Only the
`runtime:` jobs and the fork pull requests fail. If `runtime:` is set and the
engine is not available, the job fails. It does not change to the process
executor.

Job containers do not get the Docker socket. Refer to
[ADR 004](/reference/decisions/004-docker-executor/).

### `DOCKER_GID`

`DOCKER_GID` is a Compose variable. The server does not read it. Compose
`group_add: ${DOCKER_GID:-998}` puts uid 10001 in the group of the socket.
The default `998` is correct for a typical Linux docker group.

If the server gets "permission denied" on the Docker socket, set `DOCKER_GID`:

1. Read the group ID of the socket from the container:

   ```bash
   docker compose exec openpreflight stat -c %g /var/run/docker.sock
   ```

2. Set `DOCKER_GID` to that value.
3. Create the container again with `docker compose -f compose.prod.yaml up -d`.

The value that the container sees is not always the value that the host shows.
On Linux with a native engine, the two values are the same. On Docker Desktop,
the value is `0`, because the socket is `root:root` in the VM.

:::caution
On macOS, do not use `stat` on the host. The host path
`/var/run/docker.sock` is a symlink into `~/.docker`, and its group is not
correct in the container.
:::

### `CI_WORKSPACE_HOST`

If the server is a container and uses the host Docker socket, the engine reads
the `docker run -v` source as a path on the host. The server changes the
`WORKSPACE_DIR` path to the host directory behind it, from
`/proc/self/mountinfo`. Some mount layouts hide that directory, for example
unusual volume drivers or a remote engine.

The symptom: a `runtime:` job logs `runtime … via docker`, and then fails
because `package-lock.json` is not there. The `/work` directory in the job
container is empty.

1. Find the host directory that is mounted at `WORKSPACE_DIR`.
2. Set `CI_WORKSPACE_HOST` to that directory.
3. Create the container again.

If `CI_WORKSPACE_HOST` is set, the server uses it and does not read the mount
table.

### `CI_DOCKER_HOST`

To run jobs on a different Docker engine, set `CI_DOCKER_HOST` to that engine.
The engine can be the engine of a Coolify server. If `CI_DOCKER_HOST` is
empty, the server uses `DOCKER_HOST`, and then the engine default.
`compose.prod.yaml` sets `CI_DOCKER_HOST` to `unix:///var/run/docker.sock`.

`CI_DOCKER_HOST` uses the remote API of Docker, not the API of Coolify. A
Coolify token cannot start `docker run`.

## Result

`GET /health` returns `200`, and the image health check is healthy. Refer to
[Health](/operate/health/).

## Related

- [Networking](/deploy/networking/): the public URL, the reverse proxy and `X-Forwarded-Proto`
- [Optional: Coolify](/deploy/coolify/): deploy the server on Coolify
- [Rotate the secret key](/operate/rotate-secret-key/)
- [Backup and restore](/operate/backup-restore/)
- [Configuration](/reference/configuration/#environment): all environment variables

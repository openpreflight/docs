---
title: "ADR 004: Docker executor, remote engine, opt-in forks"
description: "Decision: an optional docker run executor, a remote engine through CI_DOCKER_HOST, and opt-in fork pull requests."
sidebar:
  order: 4
---
- Status: accepted
- Date: 2026-08-24

## Context

v1 ran each pipeline step as a child process of the server. The server parsed
the `.ci.yml` `runtime:` key and ignored it. The server always skipped fork pull
requests, because their jobs execute untrusted code with the privileges of the server.

Coolify's API can list servers and create applications. It cannot start an
arbitrary `docker run` on a host: there is no "run this container on server
UUID" job API. The remote-host path is what Docker supports
(`DOCKER_HOST` / a mounted socket).

## Decision

- A non-empty pipeline `runtime` is a Docker image. The executor calls
  `docker run --rm` with the checkout at `/work`, the uid of the server,
  `--security-opt no-new-privileges` and `--cap-drop ALL`. The job container
  never receives `docker.sock`. Because image names must match a
  strict pattern, `runtime` cannot become extra CLI flags.
- Empty `runtime` keeps the process executor (Node/git in this image).
- If `runtime` is set (or the job is a fork) and the engine is unreachable,
  the job fails outright. There is no silent fallback to the process executor.
- With `CI_DOCKER_HOST` (else `DOCKER_HOST`), jobs run on a different Docker
  engine. This includes the engine of a Coolify server. The installation of
  *this* server onto Coolify is a different call:
  `POST /api/v1/applications/dockercompose` with `instant_deploy: false`.
- `skip_fork_prs` stays true by default. You can save `false` only with a
  reachable engine and `settings.default_runtime`. At webhook time, the server
  has no pipeline file. Fork jobs always use Docker.

## Consequences

- The server image ships `docker-cli`. Compose mounts `/var/run/docker.sock`
  and adds the group of the socket (`DOCKER_GID`). Then uid 10001 can talk to
  the engine. Job containers do not see that socket. The volume sources for
  `docker run` are host paths. If the server runs in a container,
  `/proc/self/mountinfo` (or `CI_WORKSPACE_HOST`) translates `WORKSPACE_DIR`.
- If operators never set `runtime:` and never activate fork pull requests,
  their jobs run as before, as processes.
- A Coolify API token cannot replace `CI_DOCKER_HOST`. Remote jobs use the
  Docker remote API, not the Coolify remote API.
- Fork isolation is "a sibling container with dropped caps", not a sandbox
  VM. That is the trade-off to stay one server plus `docker run`.

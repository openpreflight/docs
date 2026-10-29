---
title: "Fork pull requests"
description: "Let pull requests from forks get a job. Fork jobs always run in a Docker container."
sidebar:
  order: 6
---
This procedure lets fork pull requests get a job. By default, the server does
not run them, because a fork pull request runs code from an external person.
Refer to [Security model](/reference/security-model/#fork-pull-requests).

## Default behaviour

`skip_fork_prs` is `true` by default. The server does not run the fork pull
request, but it completes a Check Run as `skipped`. Thus a mandatory check
gets a result. The Check Run summary gives the setting that refused the job,
and the change that lets it run.

## Before you start

- Make sure that the server can connect to a Docker engine. Refer to
  [Docker engine access](/deploy/deployment/#docker-engine-access).
- Find a Docker image that has the toolchain of the repository. Example: `node:24`.

:::caution
Clear **Skip fork pull requests** only if you accept code from forks on your
Docker engine. Each fork pull request then runs code that you did not write.
:::

## Procedure

1. Open **Settings → Runner**.
2. In **Default Docker runtime**, type the image.
3. Clear **Skip fork pull requests**.
4. Click **Save settings**.

With the API, send `PATCH /api/v1/settings` with `skip_fork_prs` set to `false`
and `default_runtime` set to the image.

The server refuses the change in these conditions:

| Condition | Message |
|---|---|
| `default_runtime` is empty | `default_runtime is required to run fork pull requests` |
| The server cannot connect to a Docker engine | `fork pull requests require a working Docker executor` |

## Result

Fork jobs always run in Docker. They do not run as a process on the server
host, and you cannot change this. Refer to
[ADR 004](/reference/decisions/004-docker-executor/).

The image comes from the `runtime:` key in the pipeline file of the fork
commit. If the file has no `runtime:`, the image comes from `default_runtime`.
On the [run page](/use/runs/), the origin of `runtime` is then
`settings (default_runtime, for a fork commit)`.

`default_runtime` applies to fork commits only. A job for a commit on the
repository itself does not use it.

The [dry run](/configure/dry-run/) resolves a commit of the repository, not a
fork pull request. Thus it does not show the `default_runtime` value for forks.

## If a fork pull request is skipped

A fork pull request that the server does not run gets a Check Run that
completes as `skipped`. The `skip_reason` of the job gives the cause.

| `skip_reason` | Cause | Correction |
|---|---|---|
| `fork_disabled` | `skip_fork_prs` is on. | Do the procedure above. |
| `fork_no_docker` | The server cannot connect to a Docker engine. | Set `CI_DOCKER_HOST`, or mount the engine socket. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access). |
| `fork_no_runtime` | `default_runtime` is empty. | Set **Default Docker runtime** in **Settings → Runner**. |

The other skip reasons are in [Skip reasons](/use/runs/#skip-reasons).

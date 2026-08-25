---
title: "Troubleshooting"
description: "Common failure modes — process won't start, no Check Run, skipped checks, fork PRs, Docker socket errors — with the page that owns each fix."
sidebar:
  order: 4
---

Symptom → cause → fix, with a link to the page that owns the detail. Nothing
here invents a failure mode; every entry is already documented elsewhere.

## Process exits immediately on start

**Cause:** `CI_SECRET_KEY` is unset or shorter than 32 bytes. The process
refuses to boot by design.

**Fix:** Generate a key (`openssl rand -base64 48`), set it as an env var /
secret, and restart. Keep it forever — losing it makes stored PEMs and tokens
unreadable.

See [Configuration](/start/configuration/).

## `/health` returns 503

**Cause:** The process cannot read SQLite (`$DATA_DIR/ci.db`).

**Fix:** Confirm `DATA_DIR` is mounted and writable by the service user
(uid 10001 in the image). A missing or corrupted volume surfaces here before
anything else.

See [Deployment](/understanding/deployment/).

## Push produces no check at all

**Cause:** There is no **enabled binding** for that repository. The webhook is
acknowledged (valid HMAC) and dropped.

**Fix:** Open **Repos**, pick the CI App, check the repository. The bindings
table is the allow-list.

See [Enable repos](/setup/bindings/) and
[Architecture](/understanding/architecture/).

## Check reports skipped, not failed

**Cause:** Nothing resolved to run — no pipeline file, no binding command
overrides, and no `package.json` scripts that the Node defaults would pick up.

**Fix:** Commit a [pipeline](/using/pipelines/) (or set binding overrides).
Skipped means "nothing to do", not an error.

## Fork PR produces no check

**Cause:** `skip_fork_prs` defaults to `true`. Fork jobs would execute
untrusted code.

**Fix:** Only turn that off when you mean to. It requires a reachable Docker
engine and `default_runtime`; fork jobs always run in Docker, never as a
process on this host.

See [Security model](/understanding/security-model/) and
[ADR 004](/adr/004-docker-executor/).

## Job fails instantly when `runtime:` is set

**Cause:** The Docker engine is unreachable. A non-empty `runtime` uses
`docker run`; if the engine is down, the job fails instead of falling back to
the process executor.

**Fix:** Mount `docker.sock`, or set `CI_DOCKER_HOST` / `DOCKER_HOST` to a
reachable daemon. Confirm with a binding that omits `runtime:` if you only
need process execution.

See [Pipelines](/using/pipelines/).

## Permission denied on the docker socket

**Cause:** `DOCKER_GID` does not match the host socket's group. The image runs
as uid 10001 and joins that group via Compose `group_add`.

**Fix:** On the host, set `DOCKER_GID` to
`stat -c %g /var/run/docker.sock` (Linux) or
`stat -f %g /var/run/docker.sock` (macOS), then recreate the container.

See [Deployment](/understanding/deployment/).

## Boot fails after a key rotation

**Cause:** A secret row opens with neither the new `CI_SECRET_KEY` nor
`CI_SECRET_KEY_OLD`.

**Fix:** Rotate with both keys set for one successful start (look for the
re-seal log line), then unset `CI_SECRET_KEY_OLD` and restart. Keep a backup
of `/data` from before the rotate until you have logged in and tested an App.

See [Configuration](/start/configuration/) and
[Deployment](/understanding/deployment/).

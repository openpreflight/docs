---
title: "Troubleshooting"
description: "Common failure modes (process won't start, no Check Run, skipped checks, fork PRs, Docker socket errors) and the page that owns each fix."
sidebar:
  order: 2
---

Symptom → cause → fix, with a link to the page that owns the detail. Nothing
here invents a failure mode; every entry is already documented elsewhere.

Before working through it, open **`/status`** in the operator UI. It reports the
database, the webhook URL, the GitHub Apps, the enabled repositories, the worker
and Docker, and says what to do about anything that is not ok, which is faster than
guessing which symptom below matches. See
[Operations](/operate/operations/#checking-on-a-running-instance).

## Process exits immediately on start

**Cause:** `CI_SECRET_KEY` is unset or shorter than 32 bytes. The process
refuses to boot by design.

**Fix:** Generate a key (`openssl rand -base64 48`), set it as an env var /
secret, and restart. Keep it forever. Losing it makes stored PEMs and tokens
unreadable.

See [Configuration](/configure/configuration/).

## `/health` returns 503

**Cause:** The process cannot read SQLite (`$DATA_DIR/ci.db`).

**Fix:** Confirm `DATA_DIR` is mounted and writable by the service user
(uid 10001 in the image). A missing or corrupted volume surfaces here before
anything else.

See [Deployment](/deploy/deployment/).

## Live logs only appear when the job finishes

**Cause:** A reverse proxy is buffering the Server-Sent Events stream and
releasing it in one piece at the end. The stream itself is fine.

**Fix:** Turn buffering off for that path. OpenPreflight already sends
`X-Accel-Buffering: no` and flushes every write, so nginx often needs nothing;
Caddy needs `flush_interval -1`. To confirm which side is at fault, curl the
stream against the app's port directly. If it streams there and not through the
proxy, the proxy is buffering.

See [Logs](/use/logs/#live-logs-through-a-reverse-proxy).

## Jobs sit in progress and the queue stops moving

**Cause:** A job was killed mid-run by a redeploy, an OOM or `docker kill`,
leaving a row marked `in_progress` with no worker behind it. It still counts against
`max_concurrent_jobs`, so with the default of 1 nothing else starts.

**Fix:** Restart the server. Stale rows are requeued at startup, and
deliberately not on a timer: the requeue is unconditional, so running it against
live jobs would clobber them. `/status` shows the gap directly: "running" counts
workers, "in flight" counts rows, and a difference is exactly this.

See [Operations](/operate/operations/#checking-on-a-running-instance).

## Push produces no check at all

**Cause:** There is no **enabled binding** for that repository. The webhook is
acknowledged (valid HMAC) and dropped.

**Fix:** Open **Repos**, pick the CI App, check the repository. The bindings
table is the allow-list.

See [Enable repos](/configure/bindings/) and
[Architecture](/reference/architecture/).

## Check reports skipped, not failed

**Cause:** Nothing resolved to run: no pipeline file, no binding command
overrides, and no `package.json` scripts that the Node defaults would pick up.

**Fix:** Commit a [pipeline](/use/pipelines/) (or set binding overrides).
Skipped means "nothing to do", not an error.

## Fork PR produces no check

**Cause:** `skip_fork_prs` defaults to `true`. Fork jobs would execute
untrusted code.

**Fix:** Only turn that off when you mean to. It requires a reachable Docker
engine and `default_runtime`; fork jobs always run in Docker, never as a
process on this host.

See [Security model](/reference/security-model/) and
[ADR 004](/reference/decisions/004-docker-executor/).

## Job fails instantly when `runtime:` is set

**Cause:** The Docker engine is unreachable. A non-empty `runtime` uses
`docker run`; if the engine is down, the job fails instead of falling back to
the process executor.

**Fix:** Mount `docker.sock`, or set `CI_DOCKER_HOST` / `DOCKER_HOST` to a
reachable daemon. Confirm with a binding that omits `runtime:` if you only
need process execution.

See [Pipelines](/use/pipelines/).

## `runtime:` job has an empty `/work`

**Cause:** The worker is a container using the host `docker.sock`. `docker run
-v /workspace/…:/work` is interpreted on the **host**, where that path does
not hold the checkout. `npm ci` then fails with a missing `package-lock.json`
(or the job looks like it cloned nothing).

**Fix:** Upgrade to a build that rewrites the volume source from
`/proc/self/mountinfo`. If that still misses, set `CI_WORKSPACE_HOST` to the
host directory mounted at `WORKSPACE_DIR` and recreate the container.

See [Deployment](/deploy/deployment/) and
[Configuration](/configure/configuration/).

## Permission denied on the docker socket

**Cause:** `DOCKER_GID` does not match the host socket's group. The image runs
as uid 10001 and joins that group via Compose `group_add`.

**Fix:** Read the gid the container sees, then set `DOCKER_GID` to it and
recreate the container:

```bash
docker compose exec openpreflight stat -c %g /var/run/docker.sock
```

On Docker Desktop the answer is `0`. Do not use the host's `stat` on macOS:
`/var/run/docker.sock` is a symlink into `~/.docker`, so it reports a group
that means nothing inside the container.

See [Deployment](/deploy/deployment/).

## Boot fails after a key rotation

**Cause:** A secret row opens with neither the new `CI_SECRET_KEY` nor
`CI_SECRET_KEY_OLD`.

**Fix:** Rotate with both keys set for one successful start (look for the
re-seal log line), then unset `CI_SECRET_KEY_OLD` and restart. Keep a backup
of `/data` from before the rotate until you have logged in and tested an App.

See [Configuration](/configure/configuration/) and
[Deployment](/deploy/deployment/).

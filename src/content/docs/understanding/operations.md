---
title: "Operations"
description: "Backup and restore of ci.db and logs, what a restart does to a running job, health and status checks, the upgrade procedure, and the versioning policy."
sidebar:
  order: 5
---
Everything worth keeping is `DATA_DIR` plus `CI_SECRET_KEY`. Neither is much
use without the other. Nothing else on the box holds state.

| Path | Holds | Keep |
|---|---|---|
| `DATA_DIR/ci.db` | Settings, users, Coolify instances, GitHub Apps, bindings, job rows | yes |
| `DATA_DIR/logs/{job-id}.log` | One file per job, the full build log | yes, if you want history |
| `WORKSPACE_DIR` | Per-job checkouts, deleted when the job ends | no |
| `CI_SECRET_KEY` | The AES-256-GCM key for the encrypted columns | yes, separately |

The GitHub App PEM, webhook secrets, and Coolify tokens are encrypted columns
in `ci.db`. A backup without the key restores your bindings and job history but
no credentials, and the App has to be pasted in again. Store the key in
whatever holds your other secrets, not next to the backup.

## Backup

SQLite runs in WAL mode, so a live `ci.db` is not a complete copy on its own.
Recent writes sit in `ci.db-wal`. Stopping the container checkpoints the WAL
and leaves a single consistent file, which is why the cold copy below is the
one to use. There is no `sqlite3` binary in the image.

```bash
docker compose -f compose.prod.yaml stop
docker compose -f compose.prod.yaml cp openpreflight:/data ./openpreflight-backup
docker compose -f compose.prod.yaml start
```

That yields `ci.db` and `logs/`. The stop is brief; queued jobs wait and are
picked up when it comes back.

If you must copy while it runs, take `ci.db`, `ci.db-wal` and `ci.db-shm`
together, or you will restore a database missing its most recent writes.

## Restore

Restore goes into the volume directly, not through `docker compose cp`. The
process runs as uid 10001 and `cp` writes as root; a database owned by root is
readable but not writable, so the service starts, answers `/health`, and then
fails every write with `attempt to write a readonly database`.

```bash
docker compose -f compose.prod.yaml down
docker run --rm -v openpreflight_ci-data:/data -v "$PWD/openpreflight-backup:/backup:ro" alpine \
  sh -c 'rm -rf /data/* && cp -a /backup/. /data/ && chown -R 10001:10001 /data'
docker compose -f compose.prod.yaml up -d
```

The volume is `openpreflight_ci-data` because both compose files pin the
project name. Set `CI_SECRET_KEY` to the key that was in use when the backup
was taken. A different key leaves the secret columns unreadable, and the App
will fail its next `test` with a decryption error rather than at boot.

## What a restart does to a running job

Nothing in progress survives. There is no checkpointing: a job that was half
way through `npm test` does not resume, and there is no partial result. What
differs is how it is recorded, and that depends on how the process died.

On a signal (`docker compose stop`, `restart`, a redeploy, an upgrade, Ctrl-C)
the process stops accepting requests, then waits up to 30 seconds for every
running job to notice the cancelled context, write itself `cancelled`, and mark
its Check Run cancelled. A cancelled job is never retried.

On a kill (SIGKILL, an OOM, a crash, or a job still unwinding when the 30
seconds run out) the row is left `in_progress`. The next boot requeues it and
runs it again from the beginning: a fresh clone and every step.

Compose sets `stop_grace_period: 30s` to match the wait. Shortening it means the
runtime kills the process mid-cancel and you get the second case instead.

Practical consequences:

- A restart normally leaves a cancelled check that nothing will retry on its
  own. Re-run it from the job page (`POST /api/v1/jobs/{id}/rerun`) or use
  GitHub's Re-run button.
- A requeued job, which is the kill case, opens a fresh Check Run rather than
  reusing the one the interrupted attempt created, so the commit collects a
  second check with the same name. Branch protection reads the newer one.
- Deploy when the queue is empty if you care. `GET /api/v1/jobs` shows what is
  queued or running.

## Upgrading

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

Back up first. Migrations run on boot and there is no way back down; see below.

Pin `OPENPREFLIGHT_VERSION` if you would rather choose when that happens.
Without it the image is `:latest` and a `pull` takes whatever is newest.

In-flight jobs are interrupted the same way any restart interrupts them.
`ci-data` and `ci-workspace` are named volumes and survive; nothing in the
upgrade path touches them.

## Checking on a running instance

Two surfaces, and they answer different questions.

**`GET /health`** is liveness, for your container platform. It touches the
database and answers `{"status":"ok"}` with `200`, or `503` if SQLite is
unreadable. It takes no session, and its body and status codes are a contract —
they will not change under you.

**`GET /health?verbose=1`** adds a component breakdown, and needs a session or a
bearer token. That is deliberate: the breakdown names your public base URL, your
configured Apps, and which parts are misconfigured, which is not something an
unguarded endpoint should hand to anyone who asks. An unauthenticated caller
that adds `?verbose=1` still gets the plain liveness body rather than an error.

**`/status`** in the operator UI renders the same report as a page, and is
usually where you want to start when checks have stopped appearing:

| Component | Says |
|---|---|
| Database | The schema version this database is at, and whether it matches the binary |
| Webhook | Whether a public HTTPS base URL is set. Whether GitHub's POST actually *arrives* is only knowable from GitHub |
| GitHub | How many Apps are configured and when one was last verified — the **stored** result of the last test, not a live call |
| Repositories | How many bindings are enabled. Zero here is the usual reason a correct install reports nothing |
| Worker | Jobs running in this process, and job rows marked in flight. See below |
| Docker | Whether an engine is reachable, and whether this configuration needs one |

Two of those need a word of explanation.

**Docker unreachable is not automatically a problem.** An install with no
`default_runtime`, fork PRs skipped, and no pipeline file asking for a `runtime:`
never needs an engine. The page says so rather than reporting an error you would
learn to ignore — while still noting that a pipeline file *could* ask for one,
since that file lives in a commit the server has not seen yet.

**Worker shows two numbers on purpose.** "Running" counts jobs actually
executing in this process; "in flight" counts rows in the database. They differ
when a job was killed mid-run — a `docker kill`, an OOM, a redeploy — leaving a
row with no worker behind it. That gap is the single most useful signal that a
queue has stopped moving. Stale rows are requeued **at startup**, not on a
timer, so restarting the server is what clears them.

The health check never calls GitHub. It is polled on a timer, and an outbound
API call per poll would spend rate limit and turn a GitHub outage into a
container your platform restarts.

## Schema migrations

Migrations are an ordered, append-only list compiled into the binary. Each one
runs in its own transaction and is recorded in `schema_migrations`, so every
boot applies exactly what is missing and nothing twice. There is no separate
migrate command and no flag to skip it: opening the database runs them.

Three things follow from that. Applied migrations are never edited; a schema
change is always a new entry. There are no down migrations, because once a
version has booted against your database an older binary may not understand the
schema it left behind, so rolling back a release is unsupported and the way out
of a bad upgrade is the backup you took before it. And a failed migration
aborts the boot: the transaction rolls back and the process exits rather than
serving against a half-applied schema.

To confirm an upgrade actually moved your database, `/status` reports the
schema version — the last migration applied and how many have run — next to the
version of the binary reporting it.

## What a release will ask of you

Every release section in the
[changelog](https://github.com/openpreflight/openpreflight/blob/main/CHANGELOG.md)
carries an **Upgrade** line saying either *No action required* or exactly what
to run and what to set. Read it for each version you are skipping, not just the
one you are landing on.

Versions follow semver, drawn where it matters for a server that owns your
branch protection:

| Bump | Means |
|---|---|
| **Major** | Something can break a working install: a removed endpoint or field, a setting whose default changes behaviour, a migration needing a decision from you |
| **Minor** | Additive only: new endpoints and pages, new settings defaulting to today's behaviour, migrations that only add columns |
| **Patch** | Fixes, UI, docs — no schema change, no contract change |

A minor upgrade may still run a migration. "Additive" means it does not change
what your existing configuration does, not that the schema stands still —
which is why the backup step above is not optional on a minor either.

## What gets deleted on its own

An hourly pass prunes expired sessions, then deletes job rows and their log
files older than `log_retention_days` (default 14). Queued and running jobs are
never pruned. Nothing else is cleaned up automatically. See
[Configuration](/start/configuration/) for the settings that govern it.

There is no cap on checkout size. A per-job workspace is removed when the job
ends, but a repository large enough to fill the disk will fill it while it
runs. Size `WORKSPACE_DIR` for your largest checkout times
`max_concurrent_jobs`.

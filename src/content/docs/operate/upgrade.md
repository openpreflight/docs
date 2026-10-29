---
title: "Upgrade"
description: "Upgrade the server to a new release. This page also gives the restart behaviour, the schema migrations and the release policy."
sidebar:
  order: 3
---
This procedure upgrades the server to a new release. The sections after the procedure give what the upgrade does.

## Before you start

- Read the **Upgrade** line in the [changelog](https://github.com/openpreflight/openpreflight/blob/main/CHANGELOG.md) for each version after your current version. Refer to [Release policy](#release-policy).
- Make a backup. Refer to [Backup and restore](/operate/backup-restore/). The server runs the migrations at start, and you cannot go back to an older version.
- If you want an empty queue, examine `GET /api/v1/jobs`. It shows the jobs that are queued or in progress.
- If you want to control when an upgrade occurs, set `OPENPREFLIGHT_VERSION` to a release. If it is not set, the image is `:latest`, and `pull` gets the newest release.

## Procedure

1. Get the new image:

   ```bash
   docker compose -f compose.prod.yaml pull
   ```

2. Start the server with the new image:

   ```bash
   docker compose -f compose.prod.yaml up -d
   ```

## Result

- **/status** shows the schema version (the last migration and the count of migrations) and the server version.
- The foot of the sidebar and the sign-in page also show the server version.
- The `ci-data` and `ci-workspace` named volumes stay. The upgrade does not change them.

The upgrade stops the jobs in progress, as each restart does.

## What a restart does to a job

A job in progress does not continue after a restart. The server has no checkpoints, and it gives no result for the steps that ran.
The record of the job is different for a signal and for a kill.

| Stop | Examples | Result |
|---|---|---|
| Signal | `docker compose stop`, `restart`, a redeploy, an upgrade, Ctrl-C | The server stops new requests. It waits up to 30 seconds for each job to write `cancelled` and to mark its Check Run cancelled. |
| Kill | SIGKILL, an OOM, a crash, or a job that is not complete after the 30 seconds | The job row stays `in_progress`. At the next start, the server puts the job back in the queue. The job runs again from the start, with a new clone. |

Compose sets `stop_grace_period: 30s` to match the wait. If you make it shorter, the container runtime kills the server before the jobs are cancelled. You then get the kill result.

- After a signal, the Check Run is cancelled. The server does not retry a cancelled job. To run it again, refer to [Cancel and re-run](/use/runs/#cancel-and-re-run).
- After a kill, the job uses the Check Run that it made before the kill, and sets it back to `in_progress`.
- If GitHub does not accept that change, the server makes a new Check Run. Example: the Check Run was deleted, or the App was installed again.

## Schema migrations

The server contains an ordered list of migrations. Each migration runs in its own transaction, and the server records it in `schema_migrations`.
At each start, the server applies only the migrations that are not in that table. It does not apply a migration two times.
There is no migrate command, and no flag to skip the migrations. When the server opens the database, it runs them.

- A released migration does not change. A schema change is always a new migration.
- There are no down migrations. After a new version starts with your database, an older version can fail to read the schema.
- A rollback to an older release is not supported. After a bad upgrade, restore the backup that you made before the upgrade.
- If a migration fails, the start stops. The transaction rolls back, and the server exits. It does not serve requests with a schema that is not complete.

## Release policy

Each release section in the [changelog](https://github.com/openpreflight/openpreflight/blob/main/CHANGELOG.md) has an **Upgrade** line.
The line says `No action required`, or it gives the commands to run and the values to set.
Read this line for each version that you skip, not only for the new version.

The versions use semantic versioning:

| Change | Meaning |
|---|---|
| Major | A change can break a working install. Examples: a removed endpoint or field, a changed setting default, a migration where you must make a decision. |
| Minor | New items only. Examples: new endpoints and pages, new settings with a default that keeps the current behaviour, migrations that only add columns. |
| Patch | Corrections, UI and docs. No schema change and no contract change. |

A minor release can contain a migration. "New items only" means that your current configuration does the same thing after the upgrade. It does not mean that the schema does not change.
Thus, make a backup before a minor upgrade also.

## Related

- [Backup and restore](/operate/backup-restore/)
- [Health](/operate/health/)
- [Releases](https://github.com/openpreflight/openpreflight/releases)

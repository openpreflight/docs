---
title: "Backup and restore"
description: "Make a backup of ci.db, the job logs and CI_SECRET_KEY, and restore the backup into the data volume."
sidebar:
  order: 2
---
This page gives the procedures to make a backup of the server data and to restore it.

## What to keep

The server keeps its state in `DATA_DIR` and in `CI_SECRET_KEY`. Nothing else on the host contains state.

| Item | Contains | Keep |
|---|---|---|
| `DATA_DIR/ci.db` | Settings, users, Coolify instances, GitHub Apps, bindings, job rows | Yes |
| `DATA_DIR/logs/{job-id}.log` | The full log of one job | Yes, if you want the job history |
| `WORKSPACE_DIR` | The checkout of each job. The server deletes it when the job ends. | No |
| `CI_SECRET_KEY` | The AES-256-GCM key for the encrypted columns | Yes, in a different location |

The GitHub App private key (PEM), the webhook secrets and the Coolify tokens are encrypted columns in `ci.db`.
A backup without the key restores the bindings and the job history, but no credentials. You must then paste the App again.
The key without the database does not restore the configuration.

:::caution
Keep `CI_SECRET_KEY` with your other secrets, not with the backup. If you lose the key, the server cannot decrypt the stored secrets. Refer to [Rotate the secret key](/operate/rotate-secret-key/).
:::

## Make a backup while the server runs

From 2.4.0, `openpreflight backup` writes a complete copy of `ci.db` while the server runs. It uses SQLite `VACUUM INTO`. Jobs continue.

1. Write the copy in the container:

   ```bash
   docker compose -f compose.prod.yaml exec openpreflight openpreflight backup /data/backup.db
   ```

   The command does not write over a file. If `/data/backup.db` exists, it stops with `output file already exists`.

2. Copy the database and the logs out of the container:

   ```bash
   mkdir -p openpreflight-backup
   docker compose -f compose.prod.yaml cp openpreflight:/data/backup.db ./openpreflight-backup/ci.db
   docker compose -f compose.prod.yaml cp openpreflight:/data/logs ./openpreflight-backup/logs
   ```

3. Remove the copy from the volume:

   ```bash
   docker compose -f compose.prod.yaml exec openpreflight rm /data/backup.db
   ```

4. Keep a copy of the current `CI_SECRET_KEY` in a different location from the backup.

The result is the same as the procedure below: `./openpreflight-backup` contains `ci.db` and `logs/`.

## Make a backup with a stop

Use this procedure before 2.4.0.

SQLite uses WAL mode. A copy of a live `ci.db` is not complete, because the most recent writes are in `ci.db-wal`.
When the container stops, SQLite writes the WAL into `ci.db`. A copy of the stopped container is then one complete file.
The image does not contain a `sqlite3` binary.

1. Stop the server:

   ```bash
   docker compose -f compose.prod.yaml stop
   ```

2. Copy the data directory out of the container:

   ```bash
   docker compose -f compose.prod.yaml cp openpreflight:/data ./openpreflight-backup
   ```

3. Start the server:

   ```bash
   docker compose -f compose.prod.yaml start
   ```

4. Keep a copy of the current `CI_SECRET_KEY` in a different location from the backup.

The stop is short. Queued jobs wait, and the server starts them when it starts again. A stop cancels the jobs in progress. Refer to [What a restart does to a job](/operate/upgrade/#what-a-restart-does-to-a-job).

If you copy the files while the server runs, copy `ci.db`, `ci.db-wal` and `ci.db-shm` together. If you copy only `ci.db`, the restored database does not contain the most recent writes.

### Result

`./openpreflight-backup` contains `ci.db` and `logs/`.

## Restore a backup

Restore into the volume directly, not with `docker compose cp`. The server runs as uid 10001, and `docker compose cp` writes as root.
The server can read a database that root owns, but it cannot write to it. The server starts and `/health` answers, but each write fails with `attempt to write a readonly database`.

The volume name is `openpreflight_ci-data`, because the two compose files set the project name.

1. Stop and remove the container:

   ```bash
   docker compose -f compose.prod.yaml down
   ```

2. Replace the volume contents with the backup, and give the files to uid 10001:

   ```bash
   docker run --rm -v openpreflight_ci-data:/data -v "$PWD/openpreflight-backup:/backup:ro" alpine \
     sh -c 'rm -rf /data/* && cp -a /backup/. /data/ && chown -R 10001:10001 /data'
   ```

3. Set `CI_SECRET_KEY` to the key that was in use when you made the backup.
4. Start the server:

   ```bash
   docker compose -f compose.prod.yaml up -d
   ```

If `CI_SECRET_KEY` is a different key, the server cannot read the secret columns. The server starts, but the next test of the App fails with a decryption error.

### Result

The server starts with the settings, bindings, Apps and job history from the backup.

## Related

- [Upgrade](/operate/upgrade/): make a backup before each upgrade.
- [Rotate the secret key](/operate/rotate-secret-key/)
- [Health](/operate/health/)

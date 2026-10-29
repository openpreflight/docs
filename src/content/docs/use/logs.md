---
title: "Logs"
description: "Where the server keeps the full log of each job, how the run page shows a live log, and how a binding makes logs shareable."
sidebar:
  order: 2
---
This page tells you where the server keeps job logs, how the run page shows
them, and who can read them.

## Log files

The server writes the full log of each job to `/data/logs/<job-id>.log`.

| Setting | Default | Effect |
|---|---|---|
| `max_log_bytes` | 10 MiB | At this size, the log stops. The job continues. |
| `log_retention_days` | `14` | After this number of days, the server deletes the logs and the job rows. |

The Check Run on GitHub shows the last part of the log. The full log is on the
[run page](/use/runs/#the-run-page). The settings are in
[Settings](/reference/configuration/#settings).

The server removes ANSI escape sequences when it writes the log. Thus the file
on disk is plain text. Build tools write color codes also when no terminal is
connected. The four readers do not interpret these codes: the run page, the live
log, the Check Run on GitHub and the JSON API. Without this step, a line with color
shows as `[42m[30m generating static routes [39m[49m`.

## Shareable logs

`GET /runs/{id}` is the `details_url` that GitHub links to. GitHub does not
open it. The browser of the reader opens it, thus it must have a session by
default.

If **Shareable logs** is set on a binding, each person with the link to a
job can read its full log without a sign-in. This applies to these routes:

- `GET /runs/{id}`
- `GET /api/v1/jobs/{id}/logs`
- `GET /api/v1/jobs/{id}/logs/stream`

**Shareable logs** is off by default. The server copies the value to each job
when it queues the job. Thus a change on the binding applies to new jobs only.

:::caution
Keep the link to a shareable log secret. Job ids are random UUIDs, but each
person who has the link can read the full build output.
:::

To make the logs of a binding shareable:

1. Open **Repos**.
2. Open the repository.
3. Click **Edit**.
4. Select **Shareable logs**.
5. Click **Save binding**.

## Live log

When a job runs, the run page opens an `EventSource` to
`GET /api/v1/jobs/{id}/logs/stream`. The first event gives the bytes that are
on disk. Each subsequent event adds new bytes. The stream ends with
`event: finished` when the job is complete. The stream has the same access
rule as the snapshot `GET`: a session, or a shareable log.

The page also has a meta-refresh. Thus the log updates without JavaScript.

The snapshot `GET /api/v1/jobs/{id}/logs` does not change, and a proxy does not
have to do a special configuration for it.

If the log shows only when the job ends, a reverse proxy holds the stream in a
buffer. Refer to
[Live logs through a proxy](/deploy/networking/#live-logs-through-a-proxy).

---
title: "Health"
description: "The /health endpoint for container health checks, and the /status page that shows the state of each part of the server."
sidebar:
  order: 1
---
The server gives two health checks. `GET /health` is for your container platform. The **/status** page is for the operator.

## The `/health` endpoint

`GET /health` reads the database and sends a short JSON answer.

| Request | Authentication | Response |
|---|---|---|
| `GET /health` | None | `200` with `{"status":"ok"}`. If the server cannot read SQLite, `503` with `{"status":"error", ...}`. |
| `GET /health?verbose=1` | Session or bearer token | The same report as **/status**: each component, its state, and what to do about it. |

The body and the status codes of `GET /health` are a contract. They do not change in a new release.

If a caller without authentication adds `?verbose=1`, the server sends the plain body, not an error. A health check that sends the parameter by mistake thus continues to work.
The server shows the verbose report only to an authenticated caller. The report contains your public base URL, your Apps and the parts with an incorrect configuration.

The image has a `HEALTHCHECK` that calls `GET /health`, and `compose.prod.yaml` has one too. On a different platform, such as Coolify, set the health check to `GET /health`.

The health check does not call GitHub. The platform calls the health check on a timer, and a GitHub API call at each poll uses the rate limit.
Also, a GitHub outage then causes the platform to restart the container.

If `GET /health` gives `503`, the server cannot read `$DATA_DIR/ci.db`. Make sure that `DATA_DIR` is mounted, and that uid 10001 can write to it.
A missing or damaged volume shows here first.

## The `/status` page

The **/status** page in the operator UI shows the same report as `GET /health?verbose=1`. If no Check Runs show on GitHub, start at this page.

| Component | Shows |
|---|---|
| **Database** | The schema version of the database, and if it matches the server version. |
| **Webhook** | If a public HTTPS base URL is set. Only GitHub can show if the webhook POST gets to the server. |
| **GitHub** | The number of Apps, and the time of the last App test. This is the stored result, not a live call. |
| **Repositories** | The number of active bindings. If this is zero, a correct install reports nothing. This is the usual cause. |
| **Worker** | The jobs that run in this server, and the job rows that are in flight. |
| **Docker** | If the server can connect to a Docker engine, and if the configuration must have one. |

## The Docker component

An unreachable Docker engine is not always a problem. An install does not use an engine if it has no `default_runtime`, skips fork pull requests, and has no pipeline file with `runtime:`.
For this install, the page shows that the engine is not necessary. It does not show an error.
The page also tells you that a pipeline file can set `runtime:`. The server cannot see that file before it receives the commit.

## The Worker component

The **Worker** component shows two numbers. `running` counts the jobs that execute in this server. `in flight` counts the job rows in the database that are in progress.
The two numbers are different when a `docker kill`, an OOM or a redeploy stopped a job before its end. The job row stays, but no job runs for it.
A stale row counts against `max_concurrent_jobs`. With the default of 1, no other job starts.
A difference between the two numbers is the best sign that the queue does not move.

The server puts stale rows back in the queue at start only, not on a timer. To clear them, restart the server.
The requeue changes all rows that are in progress. On a timer, it can also change the rows of live jobs.

## Related

- [What a restart does to a job](/operate/upgrade/#what-a-restart-does-to-a-job)
- [Troubleshooting](/operate/troubleshooting/)
- [API](/reference/api/)

---
title: "Troubleshooting"
description: "Known problems in a table, with the cause, a short correction and a link to the page that has the full procedure."
sidebar:
  order: 5
---
Each row gives a symptom, its cause and a short correction, with a link to the page that has the full procedure.

| Symptom | Cause | Fix |
|---|---|---|
| The server stops immediately after start. | `CI_SECRET_KEY` is not set, or it is shorter than 32 bytes. | Set `CI_SECRET_KEY` to a key of 32 bytes or more, then restart. Refer to [Environment](/reference/configuration/#environment). |
| The server does not start after a key rotation. | A secret row does not open with `CI_SECRET_KEY` or with `CI_SECRET_KEY_OLD`. | Set the two keys to the correct values, and start again. Refer to [Rotate the secret key](/operate/rotate-secret-key/). |
| `/health` gives `503`. | The server cannot read SQLite (`$DATA_DIR/ci.db`). | Make sure that `DATA_DIR` is mounted and that uid 10001 can write to it. Refer to [Health](/operate/health/). |
| Jobs stay in progress, and the queue does not move. | A redeploy, an OOM or `docker kill` stopped a job. Its row stays `in_progress` and counts against `max_concurrent_jobs`. | Restart the server. Refer to [The Worker component](/operate/health/#the-worker-component). |
| A push gives no Check Run. | The repository has no active binding. The server accepts the webhook and then ignores it. | Add the repository in **Repos**. Refer to [Bindings](/configure/bindings/). |
| The Check Run is `skipped`, not failed. | No pipeline file, no binding overrides, and no project file (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `requirements.txt` or `setup.py`). | Add a pipeline file or binding overrides. Refer to [Skip reasons](/use/runs/#skip-reasons). |
| A fork pull request gives no Check Run. | `skip_fork_prs` is `true` by default. | Refer to [Fork pull requests](/configure/fork-pull-requests/). |
| A step fails with `go: not found` (or `cargo`, `pytest`). | The job has no `runtime:`. It runs with the process executor. The server image contains only `git`, `nodejs` and `npm`. | Set `runtime:` to an image that has the toolchain. Refer to [Pipelines](/configure/pipelines/). |
| A job with `runtime:` fails immediately. | The server cannot connect to the Docker engine. A job with `runtime:` does not use the process executor as a fallback. | Mount `docker.sock`, or set `CI_DOCKER_HOST`. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access). |
| A `runtime:` job has an empty `/work`, and `npm ci` cannot find `package-lock.json`. | The host engine reads the `docker run -v` source as a host path. The server did not find the host directory of `WORKSPACE_DIR`. | Set `CI_WORKSPACE_HOST` to the host directory mounted at `WORKSPACE_DIR`, then recreate the container. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access). |
| Permission denied on the Docker socket. | `DOCKER_GID` is not the group of the socket in the container. | Set `DOCKER_GID`, then recreate the container. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access). |
| Live logs show only when the job ends. | A reverse proxy keeps the Server-Sent Events stream in a buffer. | Stop the buffer for that path. Refer to [Live logs through a proxy](/deploy/networking/#live-logs-through-a-proxy). |

If no row matches, open **/status** in the operator UI. It shows the state of each part of the server. Refer to [Health](/operate/health/).

---
title: "API"
description: "The JSON API routes for setup, settings, Coolify, GitHub Apps, bindings and jobs, and the public webhook and health routes."
sidebar:
  order: 3
---
This page gives the routes of the JSON API, with the method and the purpose of each.

## Authentication

All routes must have a session, but `/health`, `/webhook/{slug}` and a
shareable `/runs/{id}` do not. The UI sends a session cookie. The CLI sends
`Authorization: Bearer <token>`. To get a token, send JSON to `/api/v1/login`.
For the expiry of sessions and the CSRF rules, refer to
[Sessions](/reference/security-model/#sessions).

The routes match the registrations in `internal/api/server.go`. The HTML UI
also has form-POST aliases for `PATCH` and `DELETE`. This page does not include
them.

## Auth and setup

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/setup` | First-run wizard. Send the `setup_token` from the startup log. |
| `POST` | `/api/v1/login` | Returns `{ token }`. After 5 tries in a minute, returns `429` and `Retry-After`. |
| `POST` | `/api/v1/logout` | Ends the session |

## Settings

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/settings` | Read the settings row |
| `PATCH` | `/api/v1/settings` | Change the settings |
| `POST` | `/api/v1/password` | Change the admin password |

For the fields, refer to [Settings](/reference/configuration/#settings).

## Coolify

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/coolify` | List the Coolify instances |
| `POST` | `/api/v1/coolify` | Add an instance (`{ name, base_url, api_token }`) |
| `PATCH` | `/api/v1/coolify/{id}` | Change an instance |
| `POST` | `/api/v1/coolify/{id}/test` | Test `teams/current` and the servers |
| `GET` | `/api/v1/coolify/{id}/servers` | List the servers of the instance |
| `GET` | `/api/v1/coolify/{id}/github-apps` | List the deploy connectors of Coolify |
| `GET` | `/api/v1/coolify/{id}/repos` | List the repositories of the connectors (the source for the picker) |
| `POST` | `/api/v1/coolify/{id}/install-worker` | Make a Compose app (`instant_deploy: false`) |
| `DELETE` | `/api/v1/coolify/{id}` | Remove an instance |

## GitHub Apps

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/github-apps` | List the Apps |
| `POST` | `/api/v1/github-apps` | Add an App (`{ name, slug, app_id, pem, webhook_secret }`) |
| `POST` | `/api/v1/github-apps/manifest/start` | Start the GitHub App manifest (session and CSRF) |
| `GET` | `/api/v1/github-apps/manifest/callback` | The manifest redirect (`code` and `state`) |
| `PATCH` | `/api/v1/github-apps/{id}` | Change an App |
| `POST` | `/api/v1/github-apps/{id}/test` | Test the App JWT and the installations |
| `GET` | `/api/v1/github-apps/{id}/repos` | List the installations and their repositories |
| `DELETE` | `/api/v1/github-apps/{id}` | Remove an App |

## Bindings

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/bindings` | List the bindings |
| `PUT` | `/api/v1/bindings` | Add or change one binding (`paths` and `on_empty_pipeline` are optional) |
| `POST` | `/api/v1/bindings/bulk` | Set the bindings from the picker checkboxes |
| `POST` | `/api/v1/bindings/{id}/toggle` | Turn a binding on or off |
| `POST` | `/api/v1/bindings/{id}/resolve` | Dry run: the plan for a ref (`?ref=`) |
| `DELETE` | `/api/v1/bindings/{id}` | Remove a binding |

For the fields, refer to [Binding fields](/reference/configuration/#binding-fields).

### Dry run

`POST /api/v1/bindings/{id}/resolve` returns the plan for a commit, without a
job. `?ref=` is a branch, a tag or a SHA. If you do not give a ref, the server
uses the default branch.

```json
{
  "repo": "acme/api", "ref": "main", "sha": "b8bad2c0e1f4...",
  "decision": "run", "skip_reason": "", "explanation": "",
  "pipeline_file": ".ci.yml", "check_name": "openpreflight",
  "executor": "docker: node:22", "timeout": "3m0s",
  "steps": [{"name": "test", "command": "npm test", "source": ".ci.yml"}],
  "origins": [{"field": "timeout", "value": "3m0s", "source": ".ci.yml"}],
  "path_filter": "Changed files: 1\nMatched files: 1\nFilter: **\nResult: RUN",
  "warnings": [], "errors": []
}
```

A `200` means that the dry run is complete. It does not mean that the
configuration is correct: read `decision` and `errors`. A `400` means a problem
with the infrastructure, not with the configuration. For the meaning of each field, refer to
[Dry run](/configure/dry-run/).

## Jobs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/jobs` | List the jobs (`repo`, `status`, `limit`, `offset`) |
| `GET` | `/api/v1/jobs/{id}` | Read one job |
| `GET` | `/api/v1/jobs/{id}/logs` | The full log (session, or shareable logs) |
| `GET` | `/api/v1/jobs/{id}/logs/stream` | The live log (SSE; session, or shareable logs) |
| `POST` | `/api/v1/jobs/{id}/rerun` | Start a new job with a new Check Run |
| `POST` | `/api/v1/jobs/{id}/cancel` | Cancel a job. The Docker engine stops the container of a Docker job. |

`GET /api/v1/jobs` returns `{ "jobs": [...] }`, with the newest job first. If
you do not give `repo` and `status`, the list contains all jobs. `repo` is an
`owner/name` value. `status` must be one of `queued`, `in_progress`,
`success`, `failure`, `skipped`, `cancelled` or `error`. A different value
returns `400`.

`limit` defaults to 100. A value above 500 also gives 100. `offset` skips that
number of rows.

If the status of a job is `skipped`, the job has a `skip_reason`. For other
statuses, `skip_reason` is empty. For the values, refer to
[Skip reasons](/use/runs/#skip-reasons).

`GET /api/v1/jobs/{id}` returns `{ "job": {...}, "plan_origins": [...] }`.
`plan_origins` gives the layer that set each value of the plan for that job.
It has the same format as `origins` in the dry run. For older jobs, the list is
empty.

## Public

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhook/{slug}` | GitHub webhooks. The server examines the HMAC signature. |
| `GET` | `/runs/{id}` | The run page (session, or shareable logs) |
| `GET` | `/health` | Liveness. Returns `503` if SQLite is not readable. |
| `GET` | `/health?verbose=1` | The status of each component, **session or bearer only** |

For the `/health` responses, refer to [Health](/operate/health/). For
shareable logs, refer to [Shareable logs](/use/logs/#shareable-logs).

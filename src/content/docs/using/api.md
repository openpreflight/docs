---
title: "API"
description: "JSON API routes for setup, settings, Coolify, GitHub Apps, bindings, and jobs, plus the public webhook and health endpoints."
sidebar:
  order: 4
---

Everything except `/health`, `/webhook/{slug}` and a shareable `/runs/{id}`
needs a session cookie (UI) or `Authorization: Bearer <token>` (CLI). Get a
token by posting JSON to `/api/v1/login`.

Routes below match the registrations in `internal/api/server.go`. Form-POST
aliases that mirror `PATCH` / `DELETE` for the HTML UI are omitted.

## Auth and setup

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/setup` | First-run wizard |
| `POST` | `/api/v1/login` | Returns `{ token }` |
| `POST` | `/api/v1/logout` | End session |

## Settings

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/settings` | Read settings row |
| `PATCH` | `/api/v1/settings` | Update settings |
| `POST` | `/api/v1/password` | Change admin password |

## Coolify

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/coolify` | List Coolify instances |
| `POST` | `/api/v1/coolify` | Create (`{ name, base_url, api_token }`) |
| `PATCH` | `/api/v1/coolify/{id}` | Update instance |
| `POST` | `/api/v1/coolify/{id}/test` | Probe `teams/current` + servers |
| `GET` | `/api/v1/coolify/{id}/servers` | Server inventory |
| `GET` | `/api/v1/coolify/{id}/github-apps` | Coolify's deploy connectors |
| `GET` | `/api/v1/coolify/{id}/repos` | Connector repositories (picker source) |
| `POST` | `/api/v1/coolify/{id}/install-worker` | Compose app (`instant_deploy: false`) |
| `DELETE` | `/api/v1/coolify/{id}` | Remove instance |

## GitHub Apps

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/github-apps` | List Apps |
| `POST` | `/api/v1/github-apps` | Create (`{ name, slug, app_id, pem, webhook_secret }`) |
| `POST` | `/api/v1/github-apps/manifest/start` | Start GitHub App manifest (session + CSRF) |
| `GET` | `/api/v1/github-apps/manifest/callback` | Manifest redirect (`code` + `state`) |
| `PATCH` | `/api/v1/github-apps/{id}` | Update App |
| `POST` | `/api/v1/github-apps/{id}/test` | App JWT + installations |
| `GET` | `/api/v1/github-apps/{id}/repos` | Installations + repositories |
| `DELETE` | `/api/v1/github-apps/{id}` | Remove App |

## Bindings

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/bindings` | List bindings |
| `PUT` | `/api/v1/bindings` | Upsert one repo binding (`paths`, `on_empty_pipeline` optional) |
| `POST` | `/api/v1/bindings/bulk` | Picker checkboxes |
| `POST` | `/api/v1/bindings/{id}/toggle` | Enable / disable |
| `POST` | `/api/v1/bindings/{id}/resolve` | Dry run: what this repo would do on a ref (`?ref=`) |
| `DELETE` | `/api/v1/bindings/{id}` | Remove binding |

### Dry run

`POST /api/v1/bindings/{id}/resolve` answers "what would this repository run?"
without pushing a commit. `?ref=` is a branch, tag or SHA; omit it for the
repository's default branch. It resolves the ref to an immutable SHA, checks
that commit out, resolves the plan exactly as the worker would, evaluates the
path filter against the same changed-file list a webhook would deliver, and
deletes the checkout.

**It writes nothing** — no Check Run on the commit, no job row, nothing queued —
so it is safe against a production instance. A `200` means the dry run
completed, not that the configuration is valid: read `decision` and `errors`.

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

`decision` is `run`, `skip` (with a `skip_reason`) or `fail`. `origins` names
the layer that supplied each resolved value. `errors` are things that would fail
or skip a real run, and **all of them are reported at once** — a real run stops
at the first. `warnings` are legal but probably unintended.

A `400` means the dry run could not be attempted at all: no such binding, App
credentials GitHub rejected, no installation that can see the repository, no
commit at that ref, or a clone that failed. Those are infrastructure problems,
not configuration ones, which is why they are a status code and not an `errors`
entry.

Full reference: [How configuration resolves](/setup/resolution/).

## Jobs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/jobs` | List jobs (`repo`, `status`, `limit`, `offset`) |
| `GET` | `/api/v1/jobs/{id}` | Job detail |
| `GET` | `/api/v1/jobs/{id}/logs` | Full log (session, or shareable opt-in) |
| `GET` | `/api/v1/jobs/{id}/logs/stream` | Live log (SSE; session, or shareable opt-in) |
| `POST` | `/api/v1/jobs/{id}/rerun` | New job, new Check Run |
| `POST` | `/api/v1/jobs/{id}/cancel` | Cancel a running job. Docker jobs are stopped engine-side, not just detached from |

`GET /api/v1/jobs` returns `{ "jobs": [...] }`, newest first. Omit `repo` and
`status` to list every job. `repo` is an exact `owner/name`. `status` must be
one of `queued`, `in_progress`, `success`, `failure`, `skipped`, `cancelled`,
`error`; any other value is `400`.

A job carries `skip_reason` when its status is `skipped`, so the kinds of skip
are distinguishable: `path_filter` (a filter matched nothing, intentional),
`no_pipeline` (nothing resolved to run, usually a mistake), and
`fork_disabled` / `fork_no_docker` / `fork_no_runtime` (a fork pull request the
current policy will not run). It is empty otherwise. `limit` defaults to 100 (max 500). `offset`
skips that many rows.

`GET /api/v1/jobs/{id}` returns `{ "job": {...}, "plan_origins": [...] }`.
`plan_origins` is the per-value provenance recorded when that commit's plan was
resolved — the same list the dry run returns, but for the run that actually
happened. Jobs from before this was recorded have an empty list.

## Public

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhook/{slug}` | GitHub (HMAC verified) |
| `GET` | `/runs/{id}` | Log page (session, or shareable opt-in) |
| `GET` | `/health` | Liveness; `503` if SQLite is unreadable |
| `GET` | `/health?verbose=1` | Component breakdown — **session or bearer only** |

`GET /health` is a fixed contract for container healthchecks: `{"status":"ok"}`
with `200`, or `{"status":"error", ...}` with `503`. Adding `?verbose=1` returns
the same report `/status` renders — components, states, and what to do about
each — but only to an authenticated caller, because it names your public base
URL and your configured Apps. An anonymous caller that asks for it gets the
plain liveness body rather than an error, so a healthcheck that sends the
parameter by accident still works. See
[Operations](/understanding/operations/#checking-on-a-running-instance).

Session cookies are HttpOnly, `Secure` behind HTTPS, and browser writes require
a CSRF token. Bearer callers carry no ambient cookie and so skip CSRF. See
[Security model](/understanding/security-model/).

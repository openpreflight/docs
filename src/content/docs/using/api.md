---
title: "API"
description: "JSON API routes for setup, settings, Coolify, GitHub Apps, bindings, and jobs, plus the public webhook and health endpoints."
sidebar:
  order: 3
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
| `PUT` | `/api/v1/bindings` | Upsert one repo binding |
| `POST` | `/api/v1/bindings/bulk` | Picker checkboxes |
| `POST` | `/api/v1/bindings/{id}/toggle` | Enable / disable |
| `DELETE` | `/api/v1/bindings/{id}` | Remove binding |

## Jobs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/jobs` | List jobs |
| `GET` | `/api/v1/jobs/{id}` | Job detail |
| `GET` | `/api/v1/jobs/{id}/logs` | Full log (session, or shareable opt-in) |
| `POST` | `/api/v1/jobs/{id}/rerun` | New job, new Check Run |
| `POST` | `/api/v1/jobs/{id}/cancel` | Cancel a running job |

## Public

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhook/{slug}` | GitHub (HMAC verified) |
| `GET` | `/runs/{id}` | Log page (session, or shareable opt-in) |
| `GET` | `/health` | Liveness; `503` if SQLite is unreadable |

Session cookies are HttpOnly, `Secure` behind HTTPS, and browser writes require
a CSRF token. Bearer callers carry no ambient cookie and so skip CSRF. See
[Security model](/understanding/security-model/).

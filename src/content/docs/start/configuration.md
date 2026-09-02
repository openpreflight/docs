---
title: "Configuration"
description: "Environment variables the process needs to start, and the Settings row that lives in SQLite afterwards."
sidebar:
  order: 2
---
Two layers. The process reads a handful of env vars so it can start. Everything
else is a row in SQLite, edited in the UI or over the JSON API. For a
procedural first run, see [Quickstart](/start/quickstart/). Pipeline file
semantics are also covered under [Pipelines](/using/pipelines/).

## One job at a time, by default

`max_concurrent_jobs` defaults to 1. A fresh install runs one job at a
time; a second commit waits for the first to finish. There is no env var for
it. It is a settings row, so it can only be changed after the process is up,
under **Settings → Runner** or `PATCH /api/v1/settings`.

Size for that before you install. One binary on one box with a serial runner
suits a handful of repos that push a few times an hour. It does not suit a
busy monorepo, and it is not a scheduler: raising the number raises how many
jobs this one process runs at once, on this one machine. Jobs never spread
across hosts. Every concurrent job also holds its own checkout under
`WORKSPACE_DIR` and its own log under `DATA_DIR`, so disk scales with the
number too.

The UI caps the field at 32. The API does not.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `CI_SECRET_KEY` | yes | AES-256-GCM key material (32+ bytes). Losing it makes stored PEMs and tokens unreadable. |
| `CI_SECRET_KEY_OLD` | no | Previous key. On boot, secret columns are re-sealed under `CI_SECRET_KEY`. Unset it and restart after a successful rotate. |
| `CI_PUBLIC_BASE_URL` | no | Seeds the public base URL on first boot only; the UI owns it afterwards. |
| `CI_BOOTSTRAP_ADMIN_PASSWORD` | no | Creates the `admin` user on first boot so a headless deploy can be driven over the API. Ignored once a user exists. |
| `CI_DOCKER_HOST` | no | Docker engine for `runtime:` and fork PRs. Falls back to `DOCKER_HOST`, then the engine default (typically the mounted socket). |
| `CI_WORKSPACE_HOST` | no | Host path that corresponds to `WORKSPACE_DIR`, used as the `docker run -v` source. Needed only when mount-table translation is wrong (unusual volume drivers, or a remote engine). |
| `LISTEN_ADDR` | no | Default `:8080`. |
| `DATA_DIR` | no | Default `/data`: `ci.db` and `logs/`. Must be a persistent volume. |
| `WORKSPACE_DIR` | no | Default `/workspace`: per-job checkouts, disposable. |

There is no `GITHUB_APP_ID` and no `CI_ALLOWED_REPOS`. Those live in
`github_apps` and `repo_bindings`.

`DOCKER_GID` is not in the table because the process never reads it. It is a
Compose variable: it puts uid 10001 in the docker socket's group so `runtime:`
jobs and fork PRs can reach the engine. The default of `998` suits a typical
Linux docker group and does not work on Docker Desktop, where the socket is
gid 0 inside the container. See [Deployment](/understanding/deployment/).

Generate a key with:

```bash
openssl rand -base64 48
```

To rotate: set `CI_SECRET_KEY` to the new key and `CI_SECRET_KEY_OLD` to the
previous one, start once, confirm the log line `re-sealed secret columns`,
then unset `CI_SECRET_KEY_OLD` and restart. A row that opens with neither key
fails startup.

## Settings (database)

Single row, `id = 1`. Changed from **Settings** in the UI (Configuration,
Runner, Logs, Admin as their own pages) or `PATCH /api/v1/settings`.

| Field | Default | Purpose |
|---|---|---|
| `public_base_url` | empty (or seeded from env) | Webhook URLs and Check Run `details_url` |
| `default_check_name` | `openpreflight` | Check Run name unless the App or binding overrides. New installs only. An existing database keeps the name it already has, because GitHub matches a required status check by name and renaming one strands its branch protection rule |
| `default_pipeline_file` | `.ci.yml` | Path in the repo |
| `default_timeout_seconds` | `900` | Per-job timeout |
| `max_concurrent_jobs` | `1` | Jobs this process runs at once. See above |
| `max_log_bytes` | 10 MiB | The log stops growing at this size; the run continues |
| `log_retention_days` | `14` | Prune old logs and job rows |
| `default_runtime` | empty | Docker image used when a fork job's pipeline has no `runtime:` |
| `skip_fork_prs` | `true` | Fork PRs are ignored. Saving `false` requires Docker plus `default_runtime`. |

## Binding overrides

Per repo, highest first at run time: **binding → App → settings**.

A binding can override branches, paths, check name, pipeline file, timeout,
install/test/build commands, and whether logs are shareable. Empty paths means
every path. A complete file list with no match skips (Check Run `skipped`)
before clone. The bindings table is itself the allow-list: a signed webhook for
a repo with no enabled binding is dropped.

## Pipeline file

Committed to the repo (default `.ci.yml`):

```yaml
runtime: node:24
install: npm ci
test: npm test
build: npm run build
timeout: 15m
```

`runtime` is a Docker image. Empty means the worker process. A non-empty value
(or a fork job) uses `docker run`; a missing engine fails the job. Image names
are allow-listed (no shell metacharacters, no leading `-`). A file that only
sets `runtime:` / `timeout:` still applies those while commands come from the
binding or `package.json`.

Resolution order, highest first:

1. the repo's pipeline file
2. the binding's command overrides
3. Node defaults inferred from `package.json`: `npm ci` / `pnpm` / `yarn` by
   lockfile, then `test` and `build`, but only if those scripts exist
4. nothing to run → the check is reported as skipped rather than failed

Backups, upgrades, and what a restart does to a running job are in
[Operations](/understanding/operations/).

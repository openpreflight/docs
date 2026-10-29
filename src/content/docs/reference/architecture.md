---
title: "Architecture"
description: "The packages of the one Go server, the path from a webhook to a Check Run, and the parts that the design does not include."
sidebar:
  order: 4
---
One Go server is the **configurator** (the HTML UI and the JSON API). The same
server also runs the jobs (webhook → queue → Check Run). There is no other
frontend, no message broker and no `pkg/` library.

```text
GitHub ──POST /webhook/{slug}──► api ──enqueue──► queue.Runner
                                      │                │
Browser / CLI ──session/Bearer──► api │                ├── githubapp (JWT, installation token, checks)
                                      │                ├── workspace (fetch SHA, detach, strip remote)
                                      └── store        ├── pipeline (.ci.yml + binding + package.json)
                                            │          └── executor (process, or docker run)
                                            └── secret (AES-256-GCM for PEM / webhook / Coolify token)
```

## Packages

| Package | Role |
|---|---|
| `cmd/server` | Loads the environment, opens SQLite, rotates the secrets if necessary, makes the first admin, serves HTTP and starts the runner |
| `internal/api` | Routes, sessions and CSRF. The same handlers give HTML and JSON. |
| `internal/web` | Server-rendered templ and copied shadcn-templ components. Tailwind compiles into `assets/css/output.css`. |
| `internal/store` | SQLite (`modernc.org/sqlite`), migrations, bindings and jobs |
| `internal/secret` | Encrypts and decrypts the secret columns |
| `internal/config` | The environment of the server only: listen address, directories, `CI_SECRET_KEY`, `CI_DOCKER_HOST` |
| `internal/queue` | Claims queued jobs, applies the concurrency limit and deletes the logs after `log_retention_days` |
| `internal/githubapp` | App JWT, installation tokens and Check Runs |
| `internal/coolify` | The Coolify API for one team (inventory, repository picker, install-worker) |
| `internal/webhook` | HMAC and the payload shape |
| `internal/pipeline` | Resolves `install`, `test`, `build` and `runtime` |
| `internal/workspace` | The checkout of each job |
| `internal/executor` | Runs a step as a process or with `docker run` |
| `internal/logs` | One log file for each job, in `DATA_DIR/logs` |

The database contains all data about the GitHub Apps and the Coolify hosts.
You change this data in the UI. The environment variables contain only the
values that the server must have before it opens the database. Refer to
[Configuration](/reference/configuration/).

## How a job runs

1. `POST /webhook/{slug}` must return 2xx in GitHub's window of approximately 10 seconds.
2. The server examines the HMAC with the webhook secret of that App.
3. The server ignores a repository with no binding or a binding that is off. It also ignores a branch that is not in the list.
4. A fork pull request that the settings do not let run gets a job that reports `skipped`.
5. The server ignores a delivery id that has a job that is not complete.
6. The server keeps one live job for each commit. Refer to the list below.
7. The server queues the job for the new SHA, and the handler returns 202.
8. The runner gets an installation token and makes the Check Run.
9. The runner fetches the commit, detaches it and removes the remote.
10. A fork pull request falls back to `refs/pull/N/head` for the fetch.
11. The runner runs the pipeline with a timeout, with `docker run` or as a process.
12. The runner completes the Check Run and keeps the full log on the host.

These rules keep one live job for each commit:

- A `requested` delivery for an `(app, repo, sha)` with a job that is not complete gets the answer `already queued`.
- A `rerequested` delivery cancels that job first.
- The server cancels an older job that is not complete for the same repository and ref on a different SHA.

A job uses `docker run` if `runtime` is set or if the job is a fork job.
Other jobs run as a process on the host.

`GET /runs/{id}` is the `details_url` of the Check Run. GitHub does not fetch
it. The browser of the reader fetches it. Thus, the reader must have a session,
or the binding must have shareable logs. Refer to
[Shareable logs](/use/logs/#shareable-logs).

GitHub's **Redeliver** button sends the same delivery id. Thus, the server
ignores a delivery only while its job is not complete. A delivery of a finished
job starts a new job, and you can use this to debug. The server accepts
`check_run.rerequested` only for the Check Runs of its own App.

## Why this shape

- [ADR 001](/reference/decisions/001-database/): SQLite in the server, with the secrets encrypted at rest.
- [ADR 002](/reference/decisions/002-authentication/): a local admin and opaque sessions, not GitHub OAuth.
- [ADR 003](/reference/decisions/003-github-app/): our GitHub App, not the GitHub connector of Coolify.
- [ADR 004](/reference/decisions/004-docker-executor/): `runtime:` is `docker run`. Fork pull requests stay off until Docker works.
- [ADR 005](/reference/decisions/005-check-suite-gating/): `check_suite` and `check_run` only, one Check Run for each job, one live job for each commit.

### Prior art

The trigger model comes from Zuul, at the scale of one server. The server gates
on the commit and queues against an immutable SHA. It attaches the logs to the
job and writes the result back to the forge. openpreflight does not use the
architecture of Zuul (ZooKeeper, Nodepool, Ansible, a scheduler apart from its
executors). [ADR 005](/reference/decisions/005-check-suite-gating/) records what
the design uses from Zuul, what it does not use, and the limits.

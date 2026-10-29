---
title: "Configuration"
description: "The environment variables, settings, binding fields and pipeline keys of openpreflight, with the default and the meaning of each."
sidebar:
  order: 1
---
This page gives each value that configures openpreflight, with its default.
The server reads the environment variables when it starts. All other values are
rows in the SQLite database. You change them in the UI or with the
[API](/reference/api/). For the first start, refer to
[Quickstart](/getting-started/quickstart/).

## Environment

| Name | Default | Meaning |
|---|---|---|
| `CI_SECRET_KEY` | none (you must set it) | The key material for the AES-256-GCM encryption of the secret columns. It must have 32 bytes or more. The server does not start without it. |
| `CI_SECRET_KEY_OLD` | empty | The previous key, for a rotation only. When the server starts, it encrypts the secret columns again with `CI_SECRET_KEY`. Refer to [Rotate CI_SECRET_KEY](/operate/rotate-secret-key/). |
| `CI_PUBLIC_BASE_URL` | empty | The public base URL for the first start only. After the first start, the `public_base_url` setting controls the URL. |
| `CI_BOOTSTRAP_ADMIN_PASSWORD` | empty | Makes the `admin` user on the first start. Use it to configure a headless deployment through the API. The server ignores it if the database contains a user. |
| `CI_CLIENT_IP_HEADER` | empty | The header that your reverse proxy sets to the client IP, for example `CF-Connecting-IP` or `X-Forwarded-For`. The sign-in limit then counts each client. If it is empty, the limit uses the TCP peer. Refer to [Networking](/deploy/networking/#client-ip-behind-a-proxy). From 2.4.0. |
| `CI_DOCKER_HOST` | `DOCKER_HOST`, then the engine default | The Docker engine for `runtime:` jobs and fork pull requests. The engine default is usually the mounted socket. |
| `CI_WORKSPACE_HOST` | empty | The host path of `WORKSPACE_DIR`, for the source of `docker run -v`. Set it only if the server translates the mount table incorrectly. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access). |
| `LISTEN_ADDR` | `:8080` | The address of the HTTP server. |
| `DATA_DIR` | `/data` | The directory for `ci.db` and `logs/`. It must be a persistent volume. |
| `WORKSPACE_DIR` | `/workspace` | The directory for the checkout of each job. A backup of this directory is not necessary. |
| `DOCKER_GID` | `998` | A Compose variable. The server does not read it. It adds uid 10001 to the group of the Docker socket. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access). |

There is no `GITHUB_APP_ID` and no `CI_ALLOWED_REPOS`. The GitHub Apps and the
bindings are rows in the `github_apps` and `repo_bindings` tables.

Make a key with this command:

```bash
openssl rand -base64 48
```

:::caution
Keep a copy of `CI_SECRET_KEY` in a safe location. If you lose the key, the
server cannot decrypt the stored private keys and tokens.
:::

## Settings

The settings are one row (`id = 1`) in the database. Change them in **Settings**
in the UI (**Configuration**, **Runner**, **Logs**, **Admin**), or with
`PATCH /api/v1/settings`.

| Name | Default | Meaning |
|---|---|---|
| `public_base_url` | empty, or the value of `CI_PUBLIC_BASE_URL` | The base of the webhook URLs and of the Check Run `details_url`. |
| `default_check_name` | `openpreflight` | The Check Run name, if the binding and the GitHub App do not set one. This default applies to new installations only. |
| `default_pipeline_file` | `.ci.yml` | The path of the pipeline file in the repository. |
| `default_timeout_seconds` | `900` | The timeout of each job, in seconds. |
| `max_concurrent_jobs` | `1` | The number of jobs that the server runs at the same time. No environment variable sets it. The UI limit is 32. The API has no limit. |
| `max_log_bytes` | 10 MiB | The maximum size of a job log. At this size, the log stops, but the job continues. |
| `max_workspace_bytes` | 1 GiB | The maximum size of a job workspace: the checkout and the files that the build writes. If the value is `0`, the server does not do the check. |
| `log_retention_days` | `14` | The number of days that the server keeps job rows and their log files. |
| `default_runtime` | empty | The Docker image for a fork job if its pipeline file has no `runtime:`. It applies to fork commits only. |
| `skip_fork_prs` | `true` | If `true`, the server does not run fork pull requests. Their Check Runs complete as `skipped`. To save `false`, Docker and `default_runtime` are necessary. Refer to [Fork pull requests](/configure/fork-pull-requests/). |

A database from an earlier release keeps its check name. A branch protection
rule finds its status check by the name. If the name changes, the rule waits
for a check that does not come.

With `max_concurrent_jobs` at `1`, a second job waits until the first job is
complete. A higher value runs more jobs on this host only, and the server does
not send jobs to other hosts. Each job uses its own checkout in `WORKSPACE_DIR`
and its own log in `DATA_DIR`, thus the disk use increases with the value.

The server measures the workspace after the clone and between the steps. If
the workspace is larger than `max_workspace_bytes`, the job fails. The server
deletes the workspace of a job when the job ends. Make `WORKSPACE_DIR` equal
to or larger than `max_workspace_bytes` multiplied by `max_concurrent_jobs`.

Each hour, the server deletes the expired sessions. Then it deletes the job
rows and log files that are older than `log_retention_days`. It does not delete
jobs with the status `queued` or `in_progress`. The server deletes nothing else automatically.

## Binding fields

A binding connects one repository to a GitHub App. Only a repository with a
binding that has `enabled` set to `true` gets jobs. The server drops a signed
webhook for a different repository. To configure a binding, refer to
[Bindings](/configure/bindings/).

| Name | Default | Meaning |
|---|---|---|
| `repo` | none (you must set it) | The repository, as `owner/name`. |
| `github_app_id` | none (you must set it) | The GitHub App that verifies the webhook and writes the Check Run. |
| `coolify_instance_id` | empty | The Coolify instance that supplied the list of repositories. |
| `enabled` | `false` in `PUT /api/v1/bindings` | If `false`, the server ignores the webhooks for the repository. |
| `branches` | empty (all branches) | Branch names, or a prefix with a `*` at the end, as in `release/*`. If the list is not empty, a fork pull request or a tag does not run. |
| `paths` | empty (all paths) | Path patterns, as in `frontend/**`. Refer to [Path filters](/configure/path-filters/). |
| `check_name` | empty | The Check Run name. Empty uses the name from the GitHub App, then `default_check_name`. |
| `pipeline_file` | empty | The path of the pipeline file in the repository. Empty uses `default_pipeline_file`. |
| `timeout_seconds` | `0` | The timeout of each job, in seconds. `0` uses `default_timeout_seconds`. |
| `install_cmd` | empty | The install command, if the pipeline file has no commands. |
| `test_cmd` | empty | The test command, if the pipeline file has no commands. |
| `build_cmd` | empty | The build command, if the pipeline file has no commands. |
| `shareable_logs` | `false` | If `true`, a person without a session can read the logs. Refer to [Shareable logs](/use/logs/#shareable-logs). |
| `on_empty_pipeline` | `skip` | The result when no step resolves: `skip` or `fail`. Refer to [Skip reasons](/use/runs/#skip-reasons). |

`branches` and `paths` accept a list with commas, spaces or new lines between
the entries. For the order in which the layers apply, refer to
[How configuration resolves](/reference/resolution/).

## Pipeline keys

The pipeline file is in the repository, at `default_pipeline_file` or at the
`pipeline_file` of the binding. For an example and the procedure, refer to
[Pipelines](/configure/pipelines/).

| Name | Default | Meaning |
|---|---|---|
| `runtime` | empty (the process executor) | The Docker image for the steps. Empty runs the steps on the server host. The server image contains only `git`, `nodejs` and `npm`. |
| `install` | the binding command, then the inferred command | The install command. |
| `test` | the binding command, then the inferred command | The test command. |
| `build` | the binding command, then the inferred command | The build command. |
| `timeout` | `timeout_seconds` of the binding, then `default_timeout_seconds` | The job timeout, as a Go duration: `15m`, `90s` or `1h30m`. The value must be more than zero. |

A non-empty `runtime`, or a fork job, runs the steps with `docker run`. If the
Docker engine is not available, the job fails. An image name must not contain
shell metacharacters or start with `-`.

If the file sets one of `install`, `test` or `build`, the file supplies all
three commands. `runtime` and `timeout` resolve independently. Refer to
[How configuration resolves](/reference/resolution/).

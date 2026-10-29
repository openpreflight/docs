---
title: "Runs"
description: "The run page, the repository page, the cause of a skipped job, and how to cancel or re-run a job."
sidebar:
  order: 1
---
This page tells you about the pages that show jobs, the causes of a skip, and
how to cancel or re-run a job.

| Page | What it shows |
|---|---|
| `/jobs` | All the jobs of this server |
| `/repos/{id}` | The jobs of one repository |
| `/runs/{id}` | The job for one commit |

## The run page

`GET /runs/{id}` is the target of the **Details** link on the Check Run.
GitHub does not open this page. The browser of the reader opens it, thus it
must have a session, but not for [shareable logs](/use/logs/#shareable-logs).

The run page shows the commit, the branch, the trigger and the run time. Two
more fields show how the server made the plan.

**Executor** is `worker process` or `docker: <image>`. A job runs with the
process executor, unless its pipeline file sets `runtime:` or it is a
[fork pull request](/configure/fork-pull-requests/).

**Plan from** gives the source of the commands: the pipeline file,
`binding commands`, or an inferred default such as
`Node defaults from package.json`. The order of these sources is in
[How configuration resolves](/reference/resolution/). If a job did an unwanted
operation, read this field first.

## Where each value came from

**Plan from** gives the source of the commands only. Other values can come from
other layers. Example: a file that sets only `runtime:` supplies the executor,
and the commands come from a different layer. Thus the run page also shows a
table with one row for each value:

| Value | Resolved to | From |
|---|---|---|
| `pipeline_file` | `.ci.yml` | settings |
| `timeout` | `3m0s` | `.ci.yml` |
| `runtime` | `node:22` | `.ci.yml` |
| `test` | `go test ./...` | Go defaults from go.mod |

The server records this table when it resolves the plan. Thus it shows the
values that applied to **this** commit, also if the configuration changed
after the job. `GET /api/v1/jobs/{id}` returns the same list as `plan_origins`.
For a commit that did not run, use the [dry run](/configure/dry-run/).

## The repository page

`GET /repos/{id}` shows one repository: its configuration, its last job with
the run time and the cause of a failure, and its recent jobs. Open it from the
repository cards on the overview, or from **Repos**.

**Edit** opens the binding fields (`/repos/{id}/edit`). **Dry run**
(`/repos/{id}/resolve`) shows the plan for a branch, a tag or a commit. Refer
to [Dry run](/configure/dry-run/).

## Skip reasons

A `skipped` Check Run means that the server found nothing to do. It is not a
failure and not an error. The job records the type of skip in `skip_reason`,
and the Check Run summary gives one sentence about it.

| `skip_reason` | Cause |
|---|---|
| `path_filter` | No changed file matched the paths of the binding. This is intentional. Refer to [Path filters](/configure/path-filters/). |
| `no_pipeline` | Nothing resolved to run: no pipeline file, no binding commands and no project that the server recognizes. This is usually a configuration error. |
| `fork_disabled` | A fork pull request, and `skip_fork_prs` is on. |
| `fork_no_docker` | Fork pull requests are on, but the server cannot connect to a Docker engine. |
| `fork_no_runtime` | Fork pull requests are on, but `default_runtime` is empty. |

For each cause, the server completes the Check Run. If a mandatory check does
not come, branch protection waits for it with no time limit. Thus the server always
reports a result. The correction for each fork cause is in
[Fork pull requests](/configure/fork-pull-requests/#if-a-fork-pull-request-is-skipped).

### Empty pipelines

A path filter skip is intentional. A pipeline with no steps is usually a
configuration error. To make it fail, set `on_empty_pipeline: fail` on the
binding. On the **Edit** page of the binding, this is **Nothing to run** → **Fail the job**.

| `on_empty_pipeline` | Result for a pipeline with no steps |
|---|---|
| `skip` (default) | The Check Run is `skipped`, with `skip_reason` `no_pipeline`. |
| `fail` | The Check Run is a failure. |

## Cancel and re-run

**Cancel** stops a job that is queued or that runs. The server reports the
Check Run as cancelled. For a Docker job, the server removes the container on
the engine, and does not only stop the `docker run` client. The route is
`POST /api/v1/jobs/{id}/cancel`. If the job is not queued and does not run,
the server returns `409`.

**Re-run** queues a new job for the same commit, with a new Check Run. It does
not change the previous job. The previous Check Run stays on the commit as a record. The
new job reads the binding again, thus changed binding values apply. If the
repository has no active binding, the server refuses the re-run with `409`.
The route is `POST /api/v1/jobs/{id}/rerun`.

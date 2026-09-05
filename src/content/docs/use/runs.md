---
title: "Runs"
description: "The run page, the per-repository page, what the executor and plan source tell you, and how to read a skipped run."
sidebar:
  order: 2
---
Three pages answer three different questions. Knowing which is which saves a
lot of clicking around.

| Page | Question it answers |
|---|---|
| `/jobs` | What has this instance been doing? |
| `/repos/{id}` | What has *this repository* been doing? |
| `/runs/{id}` | What happened to *this commit*? |

## The run page

`GET /runs/{id}` is what the Check Run's **Details** link points at. GitHub
never fetches it (the reader's browser does), so it needs a session unless the
binding opted into [shareable logs](/use/logs/).

Alongside the commit, branch, trigger and duration, two fields say how the run
was decided:

**Executor** is `worker process` or `docker: <image>`. A job runs in the worker
process unless its pipeline file sets `runtime:`, or it is a fork pull request,
which always runs in a container.

**Plan from** is where the commands came from, and it resolves in this order:

| Value | Meaning |
|---|---|
| `.ci.yml` (or your `pipeline_file`) | The repository's own pipeline file |
| `binding commands` | The install/test/build fields on the binding |
| `Node defaults from package.json`, `Go defaults from go.mod`, … | Inferred, because neither of the above was set |

If a run did something you did not expect, this is the field to read first. A
pipeline file that is present but unparsed, or a binding override you forgot,
both show up here.

## Where every value came from

**Plan from** says where the *commands* came from. It cannot say that the
timeout came from settings while the image came from `.ci.yml`, and mixed
provenance is normal: a file that sets only `runtime:` supplies the executor
while the commands come from somewhere else entirely.

So the run page carries a per-value table too:

| Value | Resolved to | From |
|---|---|---|
| `pipeline_file` | `.ci.yml` | settings |
| `timeout` | `3m0s` | `.ci.yml` |
| `runtime` | `node:22` | `.ci.yml` |
| `test` | `go test ./...` | Go defaults from go.mod |

It is recorded when the plan is resolved, so it says what applied to **this**
commit rather than what would apply today, which is the distinction you want
when the configuration has changed since. `GET /api/v1/jobs/{id}` returns the
same list as `plan_origins`.

To ask the same question about a commit that has not run, use the dry run:
[How configuration resolves](/configure/resolution/).

## The repository page

`GET /repos/{id}` is one repository's own page: its configuration, its last run
with duration and the reason it did not pass, and its recent runs. Reach it from
the repo cards on the overview, or from **Repos**.

`/repos/{id}/edit` is the form for changing any of it, and **Dry run**
(`/repos/{id}/resolve`) answers what a given branch, tag or commit would do
before anything is pushed. It writes no Check Run and queues nothing. See
[How configuration resolves](/configure/resolution/).

## Reading a skipped run

A `skipped` conclusion means the worker decided there was nothing to do. It is
neither a failure nor an error. Which kind of skip it was is recorded, because
they used to be indistinguishable:

| Reason | What happened |
|---|---|
| `path_filter` | No changed file matched the binding's paths. Intentional. See [Path filters](/configure/path-filters/) |
| `no_pipeline` | Nothing resolved to run: no pipeline file, no binding commands, no recognisable project. Usually a misconfiguration; set `on_empty_pipeline: fail` to make it loud |
| `fork_disabled` | A fork pull request, and `skip_fork_prs` is on |
| `fork_no_docker` | Fork PRs are enabled but no Docker engine is reachable |
| `fork_no_runtime` | Fork PRs are enabled but `default_runtime` is empty |

Every one of these still **completes** the Check Run. A required check that
never arrives leaves branch protection waiting forever, so the worker always
reports something.

## Cancel and re-run

**Cancel** stops a running job. For a container job the container is removed
engine-side, not just detached from.

**Re-run** queues a fresh job for the same commit. It is a new job with a new
Check Run, never a mutation of the old one. The old run stays on the commit as
a record of what happened.

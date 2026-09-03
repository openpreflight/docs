---
title: "Runs"
description: "The run page, the per-repository page, what the executor and plan source tell you, and how to read a skipped run."
sidebar:
  order: 2
---
Three pages answer three different questions, and it is worth knowing which is
which before you go looking.

| Page | Question it answers |
|---|---|
| `/jobs` | What has this instance been doing? |
| `/repos/{id}` | What has *this repository* been doing? |
| `/runs/{id}` | What happened to *this commit*? |

## The run page

`GET /runs/{id}` is what the Check Run's **Details** link points at. GitHub
never fetches it — the reader's browser does — so it needs a session unless the
binding opted into [shareable logs](/using/logs/).

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
| `Node defaults from package.json` | Inferred, because neither of the above was set |

If a run did something you did not expect, this is the field to read first. A
pipeline file that is present but unparsed, or a binding override you forgot,
both show up here.

## The repository page

`GET /repos/{id}` is one repository's own page: its configuration, its last run
with duration and the reason it did not pass, and its recent runs. Reach it from
the repo cards on the overview, or from **Repos**.

`/repos/{id}/edit` is the form for changing any of it.

## Reading a skipped run

A `skipped` conclusion is not a failure and not an error — it means the worker
decided there was nothing to do. Which kind of skip it was is recorded, because
they used to be indistinguishable:

| Reason | What happened |
|---|---|
| `path_filter` | No changed file matched the binding's paths. Intentional. See [Path filters](/setup/path-filters/) |
| `no_pipeline` | Nothing resolved to run: no pipeline file, no binding commands, no recognisable project. Usually a misconfiguration — set `on_empty_pipeline: fail` to make it loud |
| `fork_disabled` | A fork pull request, and `skip_fork_prs` is on |
| `fork_no_docker` | Fork PRs are enabled but no Docker engine is reachable |
| `fork_no_runtime` | Fork PRs are enabled but `default_runtime` is empty |

Every one of these still **completes** the Check Run. That is deliberate: a
required check needs an answer, and an absent check is not one.

## Cancel and re-run

**Cancel** stops a running job. For a container job the container is removed
engine-side, not just detached from.

**Re-run** queues a fresh job for the same commit. It is a new job with a new
Check Run, never a mutation of the old one — the old run stays on the commit as
a record of what happened.

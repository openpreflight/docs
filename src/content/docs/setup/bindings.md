---
title: "Enable repos"
description: "Enable the private repos that should receive Check Runs; the bindings table is the allow-list."
sidebar:
  order: 3
---
**Repos** → pick the CI App, optionally pick a Coolify instance as the source of
the repo list, then check the repositories to run checks for. Unchecking a repo
removes its binding.

The bindings table **is** the allow-list. A webhook for a repo with no enabled
binding is acknowledged and dropped, however valid its signature. Only enable
private repos you trust: a pipeline runs the repo's own commands, either in
this process or in a `docker run` container when `runtime:` is set.

## Per-binding overrides

Per binding you can override:

- the branch list
- the check name
- the pipeline file path
- the timeout
- the install / test / build commands
- whether logs are shareable

At run time, precedence is **binding → App → settings**. See
[Configuration](/start/configuration/) for the settings row and pipeline
resolution order.

## After bindings are enabled

Commit a [pipeline](/using/pipelines/) (or rely on Node defaults from
`package.json`). Push to an allowed branch; the worker reports one Check Run
with full [logs](/using/logs/).

---
title: "Enable repos"
description: "Enable the private repos that should receive Check Runs; the bindings table is the allow-list."
sidebar:
  order: 2
---
**Repos** is the allow-list. **Pick repositories** (`/repos/pick`) chooses the
CI App, optionally a Coolify instance as the source of the repo list, then
checks the repositories to run. Unchecking a repo removes its binding.
**Add a binding** (`/repos/new`) is the same form filled in by owner/name.
**Edit** is the same form on its own page (`/repos/{id}/edit`).

The bindings table is itself the allow-list. A webhook for a repo with no enabled
binding is acknowledged and dropped, however valid its signature. Only enable
private repos you trust: a pipeline runs the repo's own commands, either in
this process or in a `docker run` container when `runtime:` is set.

## Per-binding overrides

Per binding you can override:

- the branch list
- path patterns (`frontend/**`; empty means every path)
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

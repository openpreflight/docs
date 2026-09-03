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
[How configuration resolves](/setup/resolution/) for the full order, what the
inferred defaults are, and the dry run that tells you which layer won for a
real commit before you push one.

## After bindings are enabled

Commit a [pipeline](/using/pipelines/), or rely on the defaults inferred from
`package.json`, `go.mod`, `Cargo.toml` or `pyproject.toml`. Before pushing,
**Test configuration** on the binding form runs a
[dry run](/setup/resolution/) and shows exactly what that commit would do. Then
push to an allowed branch; the worker reports one Check Run with full
[logs](/using/logs/).

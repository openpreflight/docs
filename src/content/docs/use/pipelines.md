---
title: "Pipelines"
description: "The .ci.yml contract, runtime vs process executor, and how commands resolve from file, binding, or package.json."
sidebar:
  order: 1
---
Commit a pipeline file (default `.ci.yml`) to the repo. A sample lives in
[`examples/.ci.yml`](https://github.com/openpreflight/openpreflight/blob/main/examples/.ci.yml)
in the code repository:

```yaml
runtime: node:24
install: npm ci
test: npm test
build: npm run build
timeout: 15m
```

## Runtime

`runtime` is a Docker image. Omit it (or leave it empty) to run steps in this
worker process. A non-empty value uses `docker run --rm` against
`CI_DOCKER_HOST` (else `DOCKER_HOST`, else the default socket). Fork jobs
always use Docker: they take `runtime` from the pipeline file, or
`default_runtime` from settings. If the image is set but the engine is
unreachable, the job fails instead of falling back to the process executor.

Image names are allow-listed (no shell metacharacters, no leading `-`). A file
that only sets `runtime:` / `timeout:` still applies those while commands come
from the binding or `package.json`. See [ADR 004](/reference/decisions/004-docker-executor/).

## Resolution order

Highest first:

1. the repo's pipeline file
2. the binding's command overrides
3. defaults inferred from the project's own files — `package.json` (Node),
   `go.mod` (Go), `Cargo.toml` (Rust), `pyproject.toml` / `requirements.txt`
   (Python), first match wins
4. nothing to run → the check is reported as skipped rather than failed

The commands resolve as a block: a pipeline file that sets any of `install`,
`test` or `build` supplies all three, so you cannot set `test` in the file and
inherit `install` from the binding. `runtime` and `timeout` resolve
independently.

A step that fails stops the run; later steps are reported as skipped.

To see which layer won for a real commit — including the inferred commands and
the exact image — use the dry run:
[How configuration resolves](/configure/resolution/).

Defaults for the pipeline file path, timeout, and check name live in
[Configuration](/configure/configuration/).

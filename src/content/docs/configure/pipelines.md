---
title: "Pipelines"
description: "Commit a .ci.yml pipeline file, and select the process executor or a Docker image with runtime."
sidebar:
  order: 3
---
This procedure adds a pipeline file to a repository. The pipeline file gives
the commands that the server runs for each commit.

## Before you start

- [Add the repository](/configure/bindings/).

## Procedure

1. In the root of the repository, make a file with the name `.ci.yml`.
2. Set the commands in `install`, `test` and `build`.
3. Optional: set `runtime:` to a Docker image.
4. Optional: set `timeout:`.
5. Commit and push the file.

```yaml
runtime: node:24
install: npm ci
test: npm test
build: npm run build
timeout: 15m
```

The code repository has the same sample in
[`examples/.ci.yml`](https://github.com/openpreflight/openpreflight/blob/main/examples/.ci.yml).
The binding or the settings can change the path of the file. The list of keys
is in [Pipeline keys](/reference/configuration/#pipeline-keys).

## Result

For the next commit on a branch that the binding accepts, the server runs
`install`, `test` and `build`, in that sequence. If a step fails, the job
stops, and the server reports the subsequent steps as skipped.

## Runtime

`runtime` is a Docker image. If `runtime` is empty or not set, the steps run as
processes on the server host, with the process executor.

The server image contains only `git`, `nodejs` and `npm`. If the repository is
not a Node.js project, set `runtime:` to an image that has the toolchain.
Without it, a Go, Rust or Python job fails with `go: not found` (or `cargo`,
`pytest`). The server does not show a warning before the job runs. `default_runtime` applies to
[fork pull requests](/configure/fork-pull-requests/) only.

If `runtime` is set, the server uses `docker run --rm` with the Docker engine at
`CI_DOCKER_HOST`. If that is not set, it uses `DOCKER_HOST`, and then the
default socket. If the engine is not available, the job fails. The server does
not use the process executor for that job. Refer to
[Docker engine access](/deploy/deployment/#docker-engine-access) and
[ADR 004](/reference/decisions/004-docker-executor/).

The server examines each image name before it uses it. A name with a shell
metacharacter, or a name that starts with `-`, is refused.

A file can set only `runtime:` or `timeout:`. Then the server uses those values,
and the commands come from the binding or the inferred defaults.

The checkout and the files that the build writes must stay below
`max_workspace_bytes` (1 GiB by default). If the workspace is larger, the job
fails. Refer to [Settings](/reference/configuration/#settings).

## Where the commands come from

A value in the pipeline file replaces the value from the binding or the
inferred defaults. If the file sets one command, it supplies all three. The full order is in
[How configuration resolves](/reference/resolution/).

To see the plan for a commit before you push, use the
[dry run](/configure/dry-run/).

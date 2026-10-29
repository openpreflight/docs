---
title: "How configuration resolves"
description: "The five layers that set the plan of a commit, the order of the layers, and the commands that the server infers from the repository."
sidebar:
  order: 2
---
Five layers can set the plan of a commit. This page gives the order of the
layers, the commands that the server infers, and examples.

## The five layers

The table starts with the highest layer. The first layer that supplies a value
sets that value. Each value resolves independently, but the commands resolve
as one block.

| # | Layer | Location | Values that it can supply |
|---|---|---|---|
| 1 | **Pipeline file** | `.ci.yml` in the commit that the job checks | `install`, `test`, `build`, `runtime`, `timeout` |
| 2 | **Binding** | Repos → Edit (`/repos/{id}/edit`) | command overrides, `pipeline_file`, `timeout_seconds`, `check_name`, `paths`, `branches`, `on_empty_pipeline` |
| 3 | **GitHub App** | GitHub Apps → Edit (`/github-apps/{id}/edit`) | `check_name` only |
| 4 | **Settings** | Settings → Configuration and Runner | `default_pipeline_file`, `default_timeout_seconds`, `default_check_name`, `default_runtime` |
| 5 | **Built-in default** | the server | `.ci.yml`, 15m, `openpreflight`, the process executor |

The commands resolve as one block. If the pipeline file sets one of `install`,
`test` or `build`, the file supplies all three commands. The server then ignores
the command overrides of the binding. You cannot set `test` in the file and get
`install` from the binding.

`runtime` and `timeout` resolve independently. Example: a file that sets only
`runtime: node:22` applies that image to the commands from the binding or from
inference.

The server reads layer 1 from the commit, not from your working copy. The
pipeline file of a job is the file in the commit that GitHub sent, at that SHA.
A change to `.ci.yml` on your computer has no effect until you push it. A job
on an older commit uses the file in that commit.

For the names and defaults of each value, refer to
[Configuration](/reference/configuration/).

## Inferred defaults

If no layer supplies commands, the server infers them from the files in the
repository. The server examines the markers in this order. The first match sets
the commands.

| Marker | Language | `install` | `test` | `build` |
|---|---|---|---|---|
| `package.json` | Node | from the lockfile: `pnpm install --frozen-lockfile`, `yarn install --immutable`, `npm ci`, else `npm install --no-audit --no-fund` | `<runner> test`, only if `package.json` has a `test` script | `<runner> run build`, only if `package.json` has a `build` script |
| `go.mod` | Go | `go mod download` | `go test ./...` | `go build ./...` |
| `Cargo.toml` | Rust | `cargo fetch --locked` (`cargo fetch` if there is no `Cargo.lock`) | `cargo test` | `cargo build --release` |
| `pyproject.toml`, `requirements.txt`, `setup.py` | Python | from the lockfile: `uv sync --frozen`, `poetry install --no-interaction`, `pip install -r requirements.txt`, else `pip install .` | `pytest`, only if the repository has tests (refer to the list below) | none |

The server examines Node first. Thus, a repository that worked before the
other markers has the same plan. If a repository matches two markers, the
server uses the first match and gives a warning. Example: a Go service with a
JavaScript front end.

Python is different from the other languages:

- Python has no build step. There is no one correct build command. Also,
  `python -m build` fails on a repository that is not a package.
- The server adds the `pytest` step only if the repository has tests, because
  `pytest` exits `5` when it finds no tests. The server finds tests from a
  `tests/` or `test/` directory, a top-level `test_*.py` or `*_test.py`, or a `[tool.pytest` or
  `[pytest]` table in the configuration. Go and Rust exit `0` with no tests.

If no marker matches, there is no step to run, and the Check Run concludes
`skipped`. To make this a failure, set `on_empty_pipeline` to `fail` on the
binding. Refer to [Skip reasons](/use/runs/#skip-reasons).

:::caution
Set `runtime:` to an image that has the toolchain if the repository is not a
Node.js project. If `runtime` is empty, the inferred commands run on the server
host. The server image contains only `git`, `nodejs` and `npm`. A Go, Rust or
Python job then fails with `go: not found` (or `cargo`, `pytest`). The server
gives no warning. `default_runtime` applies to fork commits only.
:::

## Find the layer that set a value

A dry run shows the plan for a commit and the layer that set each value,
without a job. Refer to [Dry run](/configure/dry-run/).

After a job, the run page shows the layer that set each value for that commit.
Refer to [Runs](/use/runs/).

## Worked examples

**A repository with only a binding override.** There is no `.ci.yml`. The
binding sets `test_cmd: make check`. The result is one step, `make check`, with
the source `binding commands`. `timeout` comes from the settings. `runtime` is
the process executor (the built-in default).

**A repository with a pipeline file that sets only the runtime.** `.ci.yml`
contains only `runtime: node:22`. The repository has a `package.json` with a
`test` script, and a `pnpm-lock.yaml`. The result is
`pnpm install --frozen-lockfile` and `pnpm test`, with the source
`Node defaults from package.json`. The steps run in `node:22`, with the source
`.ci.yml`. The file supplies the executor, but no command.

**A fork pull request.** A fork job always runs in a container. If the pipeline
file sets no `runtime`, the image comes from `default_runtime`, and the origin
shows this. Refer to [Fork pull requests](/configure/fork-pull-requests/).

**A monorepo commit that changes only docs.** The `paths` of the binding is
`backend/**`. `decision` is `skip`, and `skip_reason` is `path_filter`.
`path_filter` shows the number of changed files, the number of matched files
and `Result: SKIP`. Refer to [Path filters](/configure/path-filters/).

## Related

- [Pipelines](/configure/pipelines/): the pipeline file
- [Bindings](/configure/bindings/): the binding, layer 2
- [Configuration](/reference/configuration/): the settings, layer 4
- [Dry run](/configure/dry-run/): the plan for a commit, before you push
- [API](/reference/api/): the routes

---
title: "How configuration resolves"
description: "The four layers that decide what a commit runs, in the order they are checked, and the dry run that tells you which one won."
sidebar:
  order: 4
---
Four layers can decide what a commit runs. This page is the order they are
checked in, and the endpoint that tells you which one actually won for a given
commit, so the answer to *"why did it run **that**?"* does not require pushing
a commit and reading the result afterwards.

## The four layers

Highest first. The first layer that supplies a value wins, and each value is
resolved on its own:

| # | Layer | Where it lives | Can supply |
|---|---|---|---|
| 1 | **Pipeline file** | `.ci.yml` in the commit being checked | `install`, `test`, `build`, `runtime`, `timeout` |
| 2 | **Binding** | Repos → Edit (`/repos/{id}/edit`) | command overrides, `pipeline_file`, `timeout_seconds`, `check_name`, `paths`, `branches`, `on_empty_pipeline` |
| 3 | **Settings** | Settings → Configuration and Runner | `default_pipeline_file`, `default_timeout_seconds`, `default_check_name`, `default_runtime` |
| 4 | **Built-in default** | the binary | `.ci.yml`, 15m, `openpreflight`, the worker process |

Two things about this table are the parts people get wrong.

**The commands resolve as a block; everything else resolves per value.** If the
pipeline file sets *any* of `install`, `test` or `build`, the file supplies all
three and the binding's command overrides are ignored entirely. There is no
merging, so you cannot set `test` in the file and inherit `install` from the
binding. But `runtime` and `timeout` are independent: a file that sets only
`runtime: node:22` applies that image to commands that came from the binding or
from inference.

**Layer 1 is read from the commit, not from your working copy.** The pipeline
file that decides a run is the one in the commit GitHub sent, at that immutable
SHA. Editing `.ci.yml` locally changes nothing until it is pushed, and a run on
an older commit uses that commit's file.

### When nothing supplies commands

If no layer supplies commands, OpenPreflight infers them from what the
repository looks like. The detectors are checked in this order, and the first
match wins:

| Marker | Language | `install` | `test` | `build` |
|---|---|---|---|---|
| `package.json` | Node | by lockfile: `pnpm install --frozen-lockfile`, `yarn install --immutable`, `npm ci`, else `npm install --no-audit --no-fund` | `<runner> test`, only if a `test` script exists | `<runner> run build`, only if a `build` script exists |
| `go.mod` | Go | `go mod download` | `go test ./...` | `go build ./...` |
| `Cargo.toml` | Rust | `cargo fetch --locked` (plain `cargo fetch` with no `Cargo.lock`) | `cargo test` | `cargo build --release` |
| `pyproject.toml`, `requirements.txt`, `setup.py` | Python | by lockfile: `uv sync --frozen`, `poetry install --no-interaction`, `pip install -r requirements.txt`, else `pip install .` | `pytest`, only on evidence (see below) | none |

Node is checked first, so no repository that worked before these detectors
existed changes its plan. A repository that matches two of them (a Go service
with a JavaScript front end, say) gets the first match **and a warning**,
because silently picking one of two plausible plans is worse than either.

Two asymmetries in that table are deliberate:

- **Python has no build step.** There is no single correct one, and running
  `python -m build` against a repository that is not a package would fail a
  check for no reason.
- **Python's test step needs evidence.** `pytest` exits `5` when it collects no
  tests, so an unconditional test step would fail the check for a repository
  that simply has none. It is added when there is a `tests/` or `test/`
  directory, a top-level `test_*.py` or `*_test.py`, or a `[tool.pytest` /
  `[pytest]` table in the configuration. Go and Rust exit `0` with no tests, so
  they need no such guard.

If nothing matches, there is nothing to run and the check concludes `skipped`
rather than failing. Set `on_empty_pipeline: fail` on the binding if you would
rather that be loud. See [Enable repos](/configure/bindings/).

## The dry run

Reading the table above tells you what *should* happen. The dry run tells you
what *would* happen, for a real commit:

- **In the UI:** Repos → a repository → **Dry run**, or **Test configuration**
  in the binding editor. Enter a branch, tag or commit, or leave it blank for
  the repository's default branch.
- **Over the API:** `POST /api/v1/bindings/{id}/resolve?ref=main`

It resolves the ref to an immutable SHA, checks that commit out, resolves the
plan exactly as the worker would, and evaluates the path filter against the same
changed-file list a webhook would deliver. Then it throws the checkout away.

**A dry run writes nothing.** No Check Run on the commit, no job row, nothing on
the queue. It is safe to run against a production instance and against a
repository whose binding is disabled: a disabled binding resolves normally and
says that webhooks for it are being ignored.

### Reading the result

```json
{
  "repo": "acme/api",
  "ref": "main",
  "sha": "b8bad2c0e1f4...",
  "decision": "run",
  "pipeline_file": ".ci.yml",
  "check_name": "ci/preflight",
  "executor": "docker: node:22",
  "timeout": "3m0s",
  "steps": [
    {"name": "install", "command": "go mod download", "source": "Go defaults from go.mod"},
    {"name": "test", "command": "go test ./...", "source": "Go defaults from go.mod"}
  ],
  "origins": [
    {"field": "pipeline_file", "value": ".ci.yml", "source": "settings"},
    {"field": "timeout", "value": "3m0s", "source": ".ci.yml"},
    {"field": "runtime", "value": "node:22", "source": ".ci.yml"}
  ],
  "path_filter": "Changed files: 1\nMatched files: 1\nFilter: **\nResult: RUN",
  "warnings": [],
  "errors": []
}
```

`decision` is one of:

| Value | Meaning |
|---|---|
| `run` | The pipeline would execute |
| `skip` | The check would conclude `skipped`; `skip_reason` says which kind |
| `fail` | The configuration is broken, so the check would fail before running anything |

`origins` is the useful part, and it is why this is not just an echo of your
settings: that example says the timeout and the image came from the commit's
`.ci.yml` while the pipeline filename came from settings and the commands were
inferred from `go.mod`. Three layers, one commit. A single "plan from" string
cannot say that.

`errors` are things that would fail or skip a real run. `warnings` are legal but
probably not what you meant: an ambiguous project layout, a `runtime:` with no
reachable engine, a filter that matched nothing on this commit.

**Every problem is reported at once.** A real run stops at the first one,
because a job cannot execute on a broken file. The dry run keeps going, so a bad
`timeout:` and a rejected image come back together rather than one fix at a
time.

## After a run, on the run page

Provenance is recorded on the job when the plan is resolved, so a finished run
explains itself without a second dry run. `GET /runs/{id}` shows the same
per-value table under **Where every value came from**, and
`GET /api/v1/jobs/{id}` returns it as `plan_origins`.

The distinction matters when configuration has changed since: the run page shows
what applied to *that* commit, and the dry run shows what would apply *now*.

## Worked examples

**A repository with only a binding override.** No `.ci.yml`. The binding sets
`test_cmd: make check`. Result: one step, `make check`, source
`binding commands`. `timeout` comes from settings, `runtime` is the worker
process (built-in default).

**A repository with a runtime-only pipeline file.** `.ci.yml` contains
`runtime: node:22` and nothing else, and there is a `package.json` with a `test`
script and a `pnpm-lock.yaml`. Result: `pnpm install --frozen-lockfile` and
`pnpm test`, source `Node defaults from package.json`, running in `node:22`
whose source is `.ci.yml`. The file supplied the executor without supplying a
single command.

**A fork pull request.** Fork code always runs in a container, never as a
process on the host. If the pipeline file sets no `runtime`, the image comes
from `settings.default_runtime` and the origin says so explicitly, because that
value is the trust boundary, so it should never be ambiguous. See
[Security model](/reference/security-model/).

**A monorepo whose commit touched only docs.** The binding's `paths` is
`backend/**`. `decision` is `skip`, `skip_reason` is `path_filter`, and
`path_filter` shows the changed count, the matched count and `Result: SKIP`.
Nothing was wrong; the filter did its job. See
[Path filters](/configure/path-filters/).

## Related

- [Pipelines](/use/pipelines/): the `.ci.yml` contract itself
- [Enable repos](/configure/bindings/): the binding fields, layer 2
- [Configuration](/configure/configuration/): the settings, layer 3
- [Runs](/use/runs/): reading a run after the fact
- [API](/reference/api/): the resolve endpoint's request and response

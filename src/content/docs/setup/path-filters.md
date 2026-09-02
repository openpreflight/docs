---
title: "Path filters"
description: "Pattern syntax, what `**` does, why exclusions are not supported, the fail-open rule, the diagnostics in the log, and a monorepo example."
sidebar:
  order: 4
---
A binding's **paths** field limits which commits get checked. Empty means every
path, which is the default and the behaviour every install had before filters
existed.

This is one job with an optional filter, not a matrix of jobs per directory. If
you need different pipelines per directory, that is fan-out, and
[Comparison](/start/comparison/) points at tools that do it.

## Pattern syntax

Patterns are separated by commas, newlines, **spaces**, or tabs. A pattern
therefore cannot contain a space.

| Pattern | Matches | Does not match |
|---|---|---|
| `src/**` | `src`, `src/main.go`, `src/a/b/c.go` | `lib/main.go` |
| `src/*.go` | `src/main.go` | `src/a/main.go` — `*` does not cross `/` |
| `*.md` | `README.md` | `docs/README.md` |
| `go.mod` | `go.mod` exactly | `sub/go.mod` |

Two rules cover everything:

- A pattern ending in `/**` matches that directory and anything beneath it, at
  any depth.
- Anything else is matched with Go's [`path.Match`](https://pkg.go.dev/path#Match),
  where `*` matches within a single path segment and stops at `/`.

A leading `/` is stripped, so `/src/**` and `src/**` are the same.

### Exclusions are not supported

There is no `!docs/**`. A binding is an allow-list: a commit runs if **any**
changed file matches **any** pattern. If you want "everything except docs", list
what you do care about rather than what you do not — it is longer, and it does
not silently start ignoring a new top-level directory somebody adds later.

## What counts as a changed file

The file list comes from GitHub's commit API for the **head commit** of the
check suite, so it is the files that commit touched — **not** the full diff of a
pull request.

This is worth knowing, because it surprises people: if a pull request changes
`src/` in its first commit and then adds a commit touching only `README.md`, the
filter sees only `README.md` for that second commit and the check is skipped.
The check for the earlier commit still stands on that commit.

Renames count twice: both the old and new path are considered, so moving a file
into a filtered directory matches.

## No match means skipped, not silent

When the file list is complete and nothing matches, the job **skips before
cloning** and the Check Run completes with a `skipped` conclusion.

Completing it matters. A required check needs an answer, and an absent check is
not one — branch protection would wait forever. This is why a filter miss is not
simply dropped.

## The diagnostic

Every run records the filter decision in the log, whether it ran or skipped:

```
Changed files: 18
Matched files: 4
Filter: src/**
Result: RUN
```

On a skip the same block appears in the Check Run summary, since somebody
reading the pull request cannot see the worker's log file. "Why did this run?"
is as common a question as "why did it not?", which is why the diagnostic is not
only written on a skip.

## Fail-open

If the changed-file list cannot be trusted, the job **runs**:

- GitHub truncates the `files` array on very large commits (over 300 files).
- The commit API call failed.

Skipping a commit because a file could not be seen is worse than an extra run,
so the pipeline executes and the Check Run summary says so:

> Path filter could not be evaluated (the file list was truncated by GitHub); the
> pipeline was executed.

## Monorepo example

A repository with a Go API and a React frontend, checked by two bindings on the
same repo is **not** how this works — one repo plus one App is one binding. Use
one binding whose filter covers the code you want gated:

```
paths: api/**, go.mod, go.sum
```

Commits touching only `web/` are skipped; commits touching `api/` or the module
files run. Put the pipeline for that subtree in `.ci.yml`:

```yaml
runtime: golang:1.26
install: go mod download
test: cd api && go test ./...
timeout: 10m
```

If you want the frontend checked too, widen the filter and make the pipeline
cover both, or run a second instance with its own App. There is deliberately no
per-directory job matrix.

## Empty pipelines are a different thing

A path filter skip is intentional. A pipeline that resolves to no steps at all —
no pipeline file, no binding commands, no recognisable project — is usually a
configuration mistake, and it used to look identical.

The two are now distinguishable, and a binding can make the mistake loud:

```yaml
on_empty_pipeline: fail
```

`skip` is the default and keeps the old behaviour. The job's `skip_reason` says
which case occurred: `path_filter` or `no_pipeline`.

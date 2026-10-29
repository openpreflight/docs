---
title: "Path filters"
description: "Set the path patterns of a binding. The pattern syntax, the changed files, the fail-open rule, the diagnostic and monorepos."
sidebar:
  order: 4
---
A path filter limits the commits that get a job. This page gives the procedure,
the pattern syntax and the rules that control if a commit runs.

The **Paths** field of a binding holds the path filters. If it is empty, each
commit runs. This is the default.

A path filter gives one job with a filter. It does not give a matrix of jobs
for each directory. For different pipelines in different directories, refer to
[Comparison](/getting-started/comparison/).

## Procedure

1. Open **Repos**.
2. Open the repository.
3. Click **Edit**.
4. In **Paths**, type the patterns. Example: `api/**, go.mod, go.sum`.
5. Click **Save binding**.
6. Optional: click **Test configuration** to see the filter result for a commit.

## Pattern syntax

Put a comma, a newline, a space or a tab between two patterns. Thus a pattern
cannot contain a space.

| Pattern | Matches | Does not match |
|---|---|---|
| `src/**` | `src`, `src/main.go`, `src/a/b/c.go` | `lib/main.go` |
| `src/*.go` | `src/main.go` | `src/a/main.go`; `*` stops at `/` |
| `*.md` | `README.md` | `docs/README.md` |
| `go.mod` | `go.mod` only | `sub/go.mod` |

Two rules apply:

- A pattern that ends in `/**` matches that directory and all files below it,
  at all depths.
- For all other patterns, the server uses Go's
  [`path.Match`](https://pkg.go.dev/path#Match). There, `*` matches in one path
  segment and stops at `/`.

The server removes a `/` at the start. Thus `/src/**` and `src/**` are the same.

### Exclusions are not supported

There is no `!docs/**`. A binding is an allow-list: a commit runs if one
changed file matches one pattern. To check all files but not the docs, list the
directories that you want to check. This list is longer. But if somebody adds a
new top-level directory, the filter does not ignore it without a sign.

## The changed files

From 2.4.0, the filter examines all the files that the pull request or the
push changes. The file list comes from the GitHub compare API, from a start
commit to the head commit:

- For a pull request, the start is the base of the pull request.
- For a push to a branch, the start is the branch tip before the push.
- For a new branch, there is no start. The filter examines the head commit only.

Example: commit 1 changes `src/main.go`, and commit 2 changes only `README.md`.
The filter is `src/**`. For commit 2, the filter examines `src/main.go` and
`README.md`, and the job runs.

Before 2.4.0, the filter examined the head commit only. In the example, the
Check Run for commit 2 was `skipped`, and a mandatory check let the pull request
merge. A re-run of a job from before 2.4.0 examines the head commit only.

The log shows the range: `path filter: files changed in 1a2b3c4...5d6e7f8`.

The [dry run](/configure/dry-run/) examines the one commit that you give it.

The filter examines a renamed file two times: with the previous path and with
the new path. Thus, if you move a file into a filtered directory, the file matches.

## No match gives a skipped Check Run

If the file list is complete and no file matches, the job stops before the
clone. The Check Run completes as `skipped`.

The server completes the Check Run because a mandatory check must have a
result. If the Check Run does not come, branch protection waits for it with no time
limit. Refer to [Skip reasons](/use/runs/#skip-reasons).

## The diagnostic

Each job writes the filter decision in the log, for a run and for a skip:

```
Changed files: 18
Matched files: 4
Filter: src/**
Result: RUN
```

On a skip, the Check Run summary also shows this block. A reader of the pull
request cannot see the log file on the server. The diagnostic is on each job,
because "Why did this run?" is a frequent question too.

## Fail-open

If the changed-file list is not reliable, the job **runs**:

- GitHub truncates the `files` array on a very large commit or range (300 files
  or more).
- The call to the GitHub API failed. For example, a force push removed the start
  commit.

An unwanted run is better than a skip because of a file that the server cannot
see. The pipeline runs, and the Check Run summary says this:

> Path filter could not be evaluated (the file list was truncated by GitHub); the
> pipeline was executed.

## Monorepos

One repository and one App give one binding. You cannot add two bindings for
the same repository and the same App. Use one binding, with a filter that contains the code that
you want to check.

Example: a repository has a Go API and a React frontend. Set the filter to:

```
paths: api/**, go.mod, go.sum
```

The server skips commits that change only `web/`. Commits that change `api/` or
the module files run. Put the pipeline for that subtree in `.ci.yml`:

```yaml
runtime: golang:1.26
install: go mod download
test: cd api && go test ./...
timeout: 10m
```

To check the frontend too, make the filter wider, and make the pipeline check the two parts.
Or run a second server with its own App. There is no job matrix for each
directory.

## Empty pipelines

A pipeline with no steps is different from a path filter skip. Refer to
[Skip reasons](/use/runs/#skip-reasons).

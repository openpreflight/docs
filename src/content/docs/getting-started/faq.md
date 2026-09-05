---
title: "FAQ"
description: "Short answers on the current release, GitHub Apps, Coolify, check-suite gating, GitHub Enterprise, monorepos, whether the project checks itself, and what is out of scope."
sidebar:
  order: 2
---

Positioning questions the homepage raises, and the ones people ask before
installing. Each answer links the page or ADR that argues it in full. For how
this sits against other CI, see [Comparison](/getting-started/comparison/).

## What is the current release?

**v2.0.2** is out (2 September 2026). Linux binaries are on the
[GitHub Release](https://github.com/openpreflight/openpreflight/releases/tag/v2.0.2).
The [changelog](https://github.com/openpreflight/openpreflight/blob/v2.0.2/CHANGELOG.md)
is the feature list. [v1.0.0](https://github.com/openpreflight/openpreflight/releases/tag/v1.0.0)
was the first tagged release (29 August 2026). [What is out of scope](#what-is-out-of-scope)
is still the product boundary. Those things are out of scope rather than
unfinished.

## Why a GitHub App and not OAuth?

Only a GitHub App can create Check Runs. User and OAuth tokens are refused.
An App also has exactly one webhook URL, which is why Coolify's own GitHub
connector cannot do this job: its webhook belongs to Coolify's deploy
pipeline and its manifest has no `checks` permission.

See [Register a GitHub App](/configure/github-app/) and
[ADR 003](/reference/decisions/003-github-app/).

## Why is Coolify optional?

Coolify is a supported deployment target and an optional repository source,
not the product, and not required for checks. Skip it and everything else
works the same: checks still come from a GitHub App you register, and jobs
still run here or on any Docker engine you point `CI_DOCKER_HOST` at.

See [Coolify](/deploy/coolify/).

## Why gate on the check suite instead of push?

Runs trigger on the check suite, build the immutable SHA, and hold to one
live run per commit. That is deliberate: gate on the commit, not on the push,
without importing a second scheduler. Adding a `push` case would reverse that
decision, not extend it.

See [ADR 005](/reference/decisions/005-check-suite-gating/).

## What is out of scope?

No GitHub Actions YAML, no `actions/runner`, no matrices, caches, or
artifacts. Jobs on another machine use a Docker engine via `CI_DOCKER_HOST`,
not Coolify's API as a job runner. A GitHub App can be created with GitHub's
review screen, or pasted.

See [Architecture](/reference/architecture/) and the homepage's "What it
isn't" list.

## Does it work with GitHub Enterprise Server?

The plumbing is there and it has not been tested against a real instance.

Each App row carries an **API URL**, which defaults to
`https://api.github.com` and is the field to change for Enterprise. The git
origin is derived from it, so `https://ghe.example.com/api/v3` clones from
`https://ghe.example.com`. Nothing else in the request path assumes
github.com.

Create with GitHub is github.com only. GitHub Enterprise: paste credentials.

What is untested is everything specific to a GHE deployment: its certificate
chain, its API version skew, and Check Runs behaviour on older releases. If you
try it, an issue saying which version and what broke is useful.

## Does it work for monorepos?

A binding can list path patterns (`frontend/**`, comma or newline). Empty
paths is every path, as before. When the file list for the SHA is complete
and nothing matches, the job is **skipped** (Check Run conclusion `skipped`)
before clone, so required checks do not hang. If GitHub truncates the list
(300 files) or the commits API errors, the job still runs and says so.

The log and the Check Run carry the decision, so a filter that is too narrow is
visible rather than a mystery:

```
Changed files: 18
Matched files: 4
Filter: src/**
Result: RUN
```

One caveat worth knowing: the file list is the **head commit's**, not a pull
request's full diff. See [Path filters](/configure/path-filters/) for the pattern
syntax, why exclusions are not supported, and a monorepo example.

It is still one job and three steps, not a matrix of jobs per directory.
Woodpecker still wins for fan-out; see [Comparison](/getting-started/comparison/).

## Does the project use itself for CI?

Yes. All three product repositories — the binary, the website, and these docs —
commit a `.ci.yml` and get their repository checks from a self-hosted instance
at [ci.openpreflight.xyz](https://ci.openpreflight.xyz). A push to
`openpreflight/openpreflight` runs `go vet ./...` and `go test ./...` there, and
the Check Run on the commit comes from a GitHub App we registered like any other
operator would.

GitHub Actions is kept for exactly one workflow: `release.yml`, on a `v*` tag.
That builds multi-architecture images and attaches binaries to the release.
Publishing artifacts is not something this tool does, and it is not on the
roadmap — it reports a check. Splitting the two that way is the honest division
of labour, not a gap.

Nothing stops it from checking a public repo, incidentally. The repository's
visibility is read from the webhook payload but never gates anything; "private
repos" is what it is aimed at, not a restriction it enforces.

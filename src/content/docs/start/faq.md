---
title: "FAQ"
description: "Short answers on the v1.0.0 release, GitHub Apps, Coolify, check-suite gating, GitHub Enterprise, monorepos, dogfooding, and what v1 leaves out."
sidebar:
  order: 4
---

Positioning questions the homepage raises, and the ones people ask before
installing. Each answer links the page or ADR that argues it in full. For how
this sits against other CI, see [Comparison](/start/comparison/).

## Is v1 released?

Yes. [v1.0.0](https://github.com/openpreflight/openpreflight/releases/tag/v1.0.0)
was tagged 29 August 2026. The
[changelog](https://github.com/openpreflight/openpreflight/blob/v1.0.0/CHANGELOG.md)
is the feature list. [What is deliberately not in v1](#what-is-deliberately-not-in-v1)
is still the product boundary. Those things are out of scope rather than
unfinished.

## Why a GitHub App and not OAuth?

Only a GitHub App can create Check Runs. User and OAuth tokens are refused.
An App also has exactly one webhook URL, which is why Coolify's own GitHub
connector cannot do this job: its webhook belongs to Coolify's deploy
pipeline and its manifest has no `checks` permission.

See [Register a GitHub App](/setup/github-app/) and
[ADR 003](/adr/003-github-app/).

## Why is Coolify optional?

Coolify is a supported deployment target and an optional repository source,
not the product, and not required for checks. Skip it and everything else
works the same: checks still come from a GitHub App you register, and jobs
still run here or on any Docker engine you point `CI_DOCKER_HOST` at.

See [Coolify](/setup/coolify/).

## Why gate on the check suite instead of push?

Runs trigger on the check suite, build the immutable SHA, and hold to one
live run per commit. That is deliberate: gate on the commit, not on the push,
without importing a second scheduler. Adding a `push` case would reverse that
decision, not extend it.

See [ADR 005](/adr/005-check-suite-gating/).

## What is deliberately not in v1?

No GitHub Actions YAML, no `actions/runner`, no creating GitHub Apps for you,
no matrices, caches, or artifacts. Jobs on another machine use a Docker
engine via `CI_DOCKER_HOST`, not Coolify's API as a job runner.

See [Architecture](/understanding/architecture/) and the homepage's "What it
isn't" list.

## Does it work with GitHub Enterprise Server?

The plumbing is there and it has not been tested against a real instance.

Each App row carries an **API URL**, which defaults to
`https://api.github.com` and is the field to change for Enterprise. The git
origin is derived from it, so `https://ghe.example.com/api/v3` clones from
`https://ghe.example.com`. Nothing else in the request path assumes
github.com.

What is untested is everything specific to a GHE deployment: its certificate
chain, its API version skew, and Check Runs behaviour on older releases. If you
try it, an issue saying which version and what broke is useful.

## Does it work for monorepos?

A binding can list path patterns (`frontend/**`, comma or newline). Empty
paths is every path, as before. When the file list for the SHA is complete
and nothing matches, the job is **skipped** (Check Run conclusion `skipped`)
before clone, so required checks do not hang. If GitHub truncates the list
(300 files) or the commits API errors, the job still runs.

It is still one job and three steps, not a matrix of jobs per directory.
Woodpecker still wins for fan-out; see [Comparison](/start/comparison/).

## Does the project use itself for CI?

No. `openpreflight/openpreflight` runs GitHub Actions: `ci.yml` for vet, test,
and a Docker build, and `release.yml` on a `v*` tag.

A self-hosted instance at [ci.openpreflight.xyz](https://ci.openpreflight.xyz)
can check public repos the same way it checks private ones. That is proof the
binary works, not CI for this repository. Releases have to
build multi-arch images and attach binaries, which this tool does not do. It
reports a check; publishing artifacts is somebody else's job.

Nothing stops it from checking a public repo, incidentally. The repository's
visibility is read from the webhook payload but never gates anything; "private
repos" is what it is aimed at, not a restriction it enforces.

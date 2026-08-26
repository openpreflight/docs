---
title: "FAQ"
description: "Short answers on GitHub Apps, Coolify, check-suite gating, GitHub Enterprise, monorepos, dogfooding, and what v1 commits to."
sidebar:
  order: 4
---

Positioning questions the homepage raises, and the ones people ask before
installing. Each answer links the page or ADR that argues it in full. For how
this sits against other CI, see [Comparison](/start/comparison/).

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

It runs, but it will run everything on every push.

There is no path filter. A binding matches a repo and optionally a branch list
(exact names, or a `release/*` prefix), and that is the whole filter. A commit
touching one directory runs the same `install`, `test`, and `build` as a commit
touching all of them.

A plan is also exactly three steps in a fixed order, so the usual monorepo
answer — one job per affected package, in parallel — has nothing to express
itself with. Combined with `max_concurrent_jobs` defaulting to 1, a busy
monorepo is the case this is worst at. Do the path filtering inside your own
`test` command, or use a tool built for it; see
[Comparison](/start/comparison/).

## Does the project use itself for CI?

No. `openpreflight/openpreflight` runs GitHub Actions — `ci.yml` for vet, test,
and a Docker build, and `release.yml` on a `v*` tag.

Two reasons, both honest. Dogfooding needs a permanently reachable HTTPS
instance and a GitHub App registered against the org, which is infrastructure
the project does not run yet. And releases have to build multi-arch images and
attach binaries, which is not something this tool does at all — it reports a
check, it does not publish artifacts.

Nothing stops it from checking a public repo, incidentally. The repository's
visibility is read from the webhook payload but never gates anything; "private
repos" is what it is aimed at, not a restriction it enforces.

## What does v1 commit to?

Concretely, as of 1.0.0:

- **Releases are tagged `vMAJOR.MINOR.PATCH`** and published as an image
  (`ghcr.io/openpreflight/openpreflight`, tagged full version, major.minor, and
  `latest`) plus linux/amd64 and linux/arm64 binaries.
- **The JSON API is `/api/v1/`.** A breaking change to it would be `/api/v2/`,
  not a change under the existing prefix. The surface is in
  [API](/using/api/).
- **`default_check_name` does not change on an existing database.** GitHub
  matches a required status check by name, so renaming a live install's check
  would strand its branch protection rule. New installs get the current
  default; existing ones keep what they have.
- **Migrations are append-only and there is no rollback.** Once a version has
  booted against your database, downgrading is not supported. See
  [Operations](/understanding/operations/).
- **`CI_SECRET_KEY` stays the key.** No release will make an existing key
  unreadable without a documented rotation path.

TODO(vatsal): decide and state the actual compatibility promise for 1.x —
whether minor releases may change settings defaults, remove settings fields, or
change the pipeline file schema, and what deprecation notice a breaking change
gets.

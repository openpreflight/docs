---
title: "FAQ"
description: "Short answers to why a GitHub App is required, why Coolify is optional, why gating is on the check suite, and what v1 deliberately leaves out."
sidebar:
  order: 3
---

Positioning questions the homepage raises; each answer links the page or ADR
that argues it in full.

## Why a GitHub App and not OAuth?

Only a GitHub App can create Check Runs — user and OAuth tokens are refused.
An App also has exactly one webhook URL, which is why Coolify's own GitHub
connector cannot do this job: its webhook belongs to Coolify's deploy
pipeline and its manifest has no `checks` permission.

See [Register a GitHub App](/setup/github-app/) and
[ADR 003](/adr/003-github-app/).

## Why is Coolify optional?

Coolify is a supported deployment target and an optional repository source —
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

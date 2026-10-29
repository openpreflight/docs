---
title: "Overview"
description: "Short answers before you install: releases, the check suite trigger, the project's own CI, and the limits of openpreflight."
sidebar:
  order: 1
---
This page gives short answers to frequent questions before you install
openpreflight. Each answer links to the page or the ADR that gives the
full text. To compare openpreflight with other CI tools, refer to
[Comparison](/getting-started/comparison/).

## Releases

The [releases page](https://github.com/openpreflight/openpreflight/releases)
on GitHub gives the current release, the Linux binaries and the changelog.
The [Limits](#limits) section below is the boundary of the product. The items
in it are out of scope. They are not unfinished work.

## GitHub App

openpreflight reports its results through a GitHub App that you register,
because only a GitHub App can create Check Runs. Refer to
[Register a GitHub App](/configure/github-app/).

## Coolify

Coolify is optional. Checks work without it. Refer to
[Optional: Coolify](/deploy/coolify/).

## Why jobs start from the check suite

A job starts from the `check_suite` event, not from the `push` event. The job
builds the SHA of the commit, and each commit has a maximum of one live job.
Thus openpreflight gates the commit, not the push, and it adds no second
scheduler. A `push` trigger is not an extension of this decision. It
reverses the decision. Refer to [ADR 005](/reference/decisions/005-check-suite-gating/).

## The project checks its own code

The three product repositories (the server, the website and these docs) each
contain a `.ci.yml`. They get their Check Runs from a self-hosted server at
[ci.openpreflight.xyz](https://ci.openpreflight.xyz). A push to
`openpreflight/openpreflight` runs `go vet ./...` and `go test ./...` on that
server. The Check Run on the commit comes from a GitHub App that the project
registered, as each operator does.

GitHub Actions has one workflow only: `release.yml`, on a `v*` tag. This
workflow builds images for multiple architectures and attaches binaries to the
release. openpreflight does not publish artifacts, and this is not on the
roadmap. openpreflight reports a Check Run, and GitHub Actions publishes the
release.

openpreflight can also check a public repository. The server reads the
visibility of the repository from the webhook payload, but it does not use
the value to stop a job. openpreflight is for private repositories, but a
public repository also gets jobs.

## Limits

openpreflight does not do these things:

- No GitHub Actions. The server does not read `.github/workflows/` and does
  not use `actions/runner`.
- One machine. There is no agent protocol, and the server does not scale
  horizontally. Jobs run as processes on the server host, or in sibling
  containers on one Docker engine.
- No job runner on Coolify. To run jobs on a different machine, set
  `CI_DOCKER_HOST` to a Docker engine. The Coolify API cannot run jobs.
- One job at a time by default. `max_concurrent_jobs` is 1. You can
  increase it after first boot. Refer to
  [Settings](/reference/configuration/#settings).
- Three steps. The steps are `install`, `test` and `build`, in that order.
  There are no stages, no `needs:`, no fan-out and no conditional steps.
- No matrices. You get one pipeline for each commit, not one for each
  combination of versions. A path filter can skip a Check Run, but it does not
  make one job for each directory.
- No caches and no artifacts. Each job starts from a new shallow clone.
  The server keeps nothing between jobs and gives nothing to the next step.
- A limit on the workspace size. `max_workspace_bytes` (default 1 GiB)
  is the maximum size of each job workspace.
- GitHub only. openpreflight uses Check Runs, and no other forge has them.
- One admin user. There are no teams, no roles and no SSO.
- You own the GitHub App. The setup can create the App for you through
  GitHub, but the App is on your account, and you keep it.

For the components and their boundaries, refer to
[Architecture](/reference/architecture/).

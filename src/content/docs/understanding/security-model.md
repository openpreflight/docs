---
title: "Security model"
description: "How secrets at rest, clone credentials, job environments, fork PRs, and sessions are handled."
sidebar:
  order: 2
---
What is encrypted, what a job can see, what a clone credential is allowed to
touch, and what a link to a log page grants. For reporting a vulnerability, see
[SECURITY.md](https://github.com/openpreflight/openpreflight/blob/main/SECURITY.md)
in the code repository.

## Secrets at rest

Secret columns (App PEM, webhook secret, Coolify token) are AES-256-GCM
encrypted. GET responses return a redacted marker, never the value. Key
material is `CI_SECRET_KEY`; rotation is documented in
[Configuration](/start/configuration/).

## Clone credentials

The clone credential is passed to git through `GIT_CONFIG_*` environment
variables as **Basic `x-access-token`**. GitHub's git endpoint wants Basic,
not the REST API's Bearer. It never enters the remote URL, `.git/config`, or a
command line, and the remote is removed before any pipeline step runs.

## Job environments

Job environments are built from scratch: no `CI_SECRET_KEY`, no PEMs, no
webhook secrets, no Coolify tokens, no installation token.

## Fork pull requests

Fork pull requests are skipped by default. Turning that off requires a
reachable Docker engine and `default_runtime`; fork jobs always run in Docker,
never as a process on this host. See [ADR 004](/adr/004-docker-executor/).

## Sessions

Session cookies are HttpOnly, `Secure` behind HTTPS, and browser writes require
a CSRF token. Bearer callers carry no ambient cookie and so skip CSRF. See
[ADR 002](/adr/002-authentication/).

## Shareable logs

A binding can opt into shareable logs for `GET /runs/{id}` and
`GET /api/v1/jobs/{id}/logs`. Job ids are random UUIDs, but treat such a link as
a secret. See [Logs](/using/logs/).

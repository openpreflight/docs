---
title: "Security model"
description: "Webhook verification, the executor trust model and its container flags, secrets at rest, clone credentials, job environments, fork PRs, and sessions."
sidebar:
  order: 2
---
What is encrypted, what a job can see, what a clone credential is allowed to
touch, and what a link to a log page grants. For reporting a vulnerability, see
[SECURITY.md](https://github.com/openpreflight/openpreflight/blob/main/SECURITY.md)
in the code repository.

## Webhook verification

GitHub POSTs to `/webhook/{slug}` over a public HTTPS URL you provide. Every
delivery is HMAC-verified against that App's webhook secret before anything
else happens, and an unsigned or wrongly-signed body is rejected without
touching the queue. The bindings table is a second gate: a correctly signed
delivery for a repository with no enabled binding is dropped.

GitHub has to be able to reach that URL, which is the one part of this system
that is necessarily public. See [Networking](/understanding/networking/) for
what that means in practice. Everything the run itself touches — the checkout,
the build, the secrets, the logs — stays on infrastructure you control.

## Executors and the trust boundary

Two executors exist, and which one a job gets is a trust decision, not a
performance one.

| Repository | Executor | Isolation |
|---|---|---|
| Trusted (your own, binding enabled) | Process | Runs as the worker's unprivileged user on the host |
| Untrusted (fork pull request), or any job declaring `runtime:` | Docker | `docker run --rm` in a container, capabilities dropped |

The process executor is the default because for a repository you already
control, the code in the checkout is code you were going to run anyway. It is
not a sandbox, and it is not offered as one.

The Docker executor is what runs code you do not control. Job containers get:

```
--rm                              discarded after the step
--network bridge                  no host network
--workdir /work                   the checkout, mounted at /work
--user <uid>:<gid>                never root
--security-opt no-new-privileges  no setuid escalation
--cap-drop ALL                    every Linux capability dropped
```

The job container **never receives the Docker engine socket**, so a step cannot
reach the engine that started it and cannot start siblings. Image names are
allow-listed before they reach the command line: no shell metacharacters, no
leading `-`. `PATH`, `HOME`, `TMPDIR` and `npm_config_cache` are stripped from
the environment passed through, so a pipeline cannot redirect the container's
own toolchain.

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

Fork pull requests are **skipped by default**, and the reason is worth stating
plainly: a fork PR is an invitation to run a stranger's code on your server. On
a hosted CI provider that risk is someone else's to absorb. Here it is yours,
so the default is no.

Be aware of what the skip looks like from GitHub's side: the delivery is
answered `202 ignored` at the webhook, before a job exists, so **no Check Run is
created at all**. That is different from a path-filter skip, which does create a
completed Check Run with a `skipped` conclusion. If the check name is a
*required* check on your branch protection, a fork pull request will therefore
sit unmergeable with no check to explain why. The same is true when fork PRs are
enabled but no Docker engine is reachable.

An operator who wants fork checks has two settings to change, and both are
required:

- `skip_fork_prs` — turn it off to let fork jobs queue at all.
- `default_runtime` — the image fork jobs run in. Without it there is nothing to
  run them in, and the job fails rather than silently falling back.

A reachable Docker engine is also required. Fork jobs **always** run in Docker,
never as a process on this host, and that is not configurable. See
[ADR 004](/adr/004-docker-executor/).

## Sessions

Session cookies are HttpOnly, `Secure` behind HTTPS, and browser writes require
a CSRF token. Bearer callers carry no ambient cookie and so skip CSRF. See
[ADR 002](/adr/002-authentication/).

## Shareable logs

A binding can opt into shareable logs for `GET /runs/{id}` and
`GET /api/v1/jobs/{id}/logs`. Job ids are random UUIDs, but treat such a link as
a secret. See [Logs](/using/logs/).

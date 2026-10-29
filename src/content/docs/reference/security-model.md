---
title: "Security model"
description: "Webhook checks, the executor trust model and its container flags, secrets at rest, clone credentials, job environments, fork pull requests and sessions."
sidebar:
  order: 5
---
This page tells what the server encrypts and what a job can see. It also
tells what a clone credential can get, and what a link to a run page gives. To report a
vulnerability, refer to
[SECURITY.md](https://github.com/openpreflight/openpreflight/blob/main/SECURITY.md)
in the code repository.

## Webhook verification

GitHub sends a POST to `/webhook/{slug}` at a public HTTPS URL that you supply.
The server examines the HMAC of each delivery with the webhook secret of that
App before all other work. It refuses a body with no signature or an incorrect
signature, and the queue does not change. The bindings are a second gate. The
server drops a correctly signed delivery for a repository with no binding, or
with a binding that is off.

The webhook URL is the one part of the system that must be public, because
GitHub must get to it. Refer to [Networking](/deploy/networking/). The
checkout, the build, the secrets and the logs stay on your infrastructure.

## Executors and the trust boundary

There are two executors. The executor of a job is a trust decision, not a
performance decision.

| Repository | Executor | Isolation |
|---|---|---|
| Trusted (your own repository, with a binding) | Process | Runs as the unprivileged user of the server on the host |
| Untrusted (fork pull request), or a job with `runtime:` | Docker | `docker run --rm` in a container, with all capabilities removed |

The process executor is the default. For a repository that you control, you
trust the code in the checkout. The process executor is not a sandbox.

The Docker executor runs code that you do not control. Job containers get these
flags:

```
--rm                              discarded after the step
--network bridge                  no host network
--workdir /work                   the checkout, mounted at /work
--user <uid>:<gid>                never root
--security-opt no-new-privileges  no setuid escalation
--cap-drop ALL                    every Linux capability dropped
```

The job container **does not get the Docker engine socket**. Thus, a step
cannot get to the engine that started it, and it cannot start other
containers. The server accepts only image names that contain no shell
metacharacters and do not start with `-`. The server removes `PATH`, `HOME`,
`TMPDIR` and `npm_config_cache` from the environment that it sends to the
container. Thus, a pipeline cannot change the toolchain of the container.

## Secrets at rest

The server encrypts the secret columns (App PEM, webhook secret, Coolify token)
with AES-256-GCM. A GET response gives a redacted marker, not the value. The
key material is `CI_SECRET_KEY`. To rotate it, refer to
[Rotate CI_SECRET_KEY](/operate/rotate-secret-key/).

## Clone credentials

The server gives the clone credential to git in `GIT_CONFIG_*` environment
variables, as **Basic `x-access-token`**. The git endpoint of GitHub accepts
Basic, not the Bearer of the REST API. The credential is not in the remote URL,
in `.git/config` or on a command line. The server removes the remote before the
first pipeline step.

## Job environments

The server makes each job environment from nothing. It contains no
`CI_SECRET_KEY`, no PEMs, no webhook secrets, no Coolify tokens and no
installation token.

## Fork pull requests

By default, the server does not run fork pull requests. A fork pull request
contains code from a person that you do not know, and the server runs it on
your host. A fork job always runs in Docker, not as a process on the host. You
cannot change this. To run fork pull requests, refer to
[Fork pull requests](/configure/fork-pull-requests/) and
[ADR 004](/reference/decisions/004-docker-executor/).

## Sessions

A session is a session cookie (the UI) or a bearer token (the CLI). These rules
apply to the two types:

- A session expires **24 hours after the last request** that used it.
- A session also expires **7 days after the server issued it**, at all levels of use.
- Each request moves the 24-hour limit forward. The 7-day limit does not move.
- The `expires_at` in the login response is the 24-hour limit. A client that runs for a long time must sign in again.
- The session row in SQLite controls the two limits. The expiry of the cookie is only a hint.
- If the session row is not there, the cookie does not work.

Session cookies are HttpOnly, and `Secure` behind HTTPS. A write from a browser
must have a CSRF token. A bearer caller sends no cookie, thus it does not send
a CSRF token.

A change of the password **deletes all sessions of that user**. This includes
the bearer tokens of a CLI. The browser that changed the password gets a new
cookie. All other clients must sign in again. To remove access, change the
password.

The sessions table contains a **SHA-256 of each token**, not the token. A copy
of `ci.db` cannot sign in a person, also without `CI_SECRET_KEY`.

Sign-in accepts **five tries each minute from one client address**. A
correct sign-in sets the count to zero. The server counts a try before the
bcrypt compare. Thus, a blocked try uses no CPU. The address is the TCP
peer. Behind a reverse proxy, all clients share one limit.

If there is no admin, `/setup` must have the **setup token** that the server
writes to its log at startup. Access to the URL alone does not let a person
claim the server.

Refer to [ADR 002](/reference/decisions/002-authentication/).

## Shareable logs

A binding can let a person without a session read the logs at `GET /runs/{id}`
and `GET /api/v1/jobs/{id}/logs`. Job ids are random UUIDs, but keep a link to a
shareable log secret. Refer to [Shareable logs](/use/logs/#shareable-logs).

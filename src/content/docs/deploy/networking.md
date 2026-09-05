---
title: "Networking"
description: "Why GitHub must reach the webhook over public HTTPS, what that means when you have no public IP, and where the privacy boundary actually falls."
sidebar:
  order: 3
---
There is one hard network requirement, and it is worth being explicit about it
before you deploy: **GitHub must be able to reach this worker.** Everything else
about the deployment is yours to arrange. For mounts, ports, and proxy headers,
see [Deployment](/deploy/deployment/); this page is about the requirement
itself and the trust boundary it creates.

## Why it has to be reachable

Check Runs are not polled. GitHub POSTs a `check_suite` event to
`/webhook/{slug}` and the worker answers within ten seconds, then does the slow
work in the background. There is no outbound-only mode and no relay service in
between, because a relay would be a hosted control plane, which is the thing
this project exists to not have.

That means:

- A **public HTTPS URL**, terminated by a reverse proxy in front of port 8080.
- Plain HTTP works but should not be used. Session and CSRF cookies only set
  `Secure` when `X-Forwarded-Proto` is `https`, and the webhook secret would
  cross the network in the clear.
- The URL has to keep working. If it changes, update `public_base_url` in
  settings and the App's webhook URL on GitHub, or checks stop arriving.

## If you have no public IP

Nothing here needs a datacentre, but something has to terminate a public name:

| Situation | What people use |
|---|---|
| VPS or cloud box | A reverse proxy on the host — Caddy or nginx with automatic certificates |
| Home server, no inbound ports | An outbound tunnel that terminates publicly, such as a Cloudflare Tunnel or Tailscale Funnel |
| Behind a corporate proxy | Whatever already publishes your internal services; the requirement is only that GitHub's POST arrives |

A tunnel is a legitimate answer, not a workaround. GitHub does not care how the
request reaches you.

## Where the privacy boundary falls

Say this accurately, because overclaiming here is easy:

- **Public:** the webhook endpoint, and whatever your reverse proxy exposes. The
  `details_url` on the Check Run also points at your host, so anyone who can
  read the check can see that hostname.
- **Yours:** everything the run touches. The checkout, the build, the
  dependencies it downloads, the secrets, the logs, and the database they are
  recorded in never leave infrastructure you control.

What travels to GitHub is the result — a conclusion, a step table, and a
truncated log tail on the Check Run. The full log stays on your host and is
served from `/runs/{id}`, behind a session unless the binding opted into
shareable logs.

"Self-hosted" here means the execution and the data are yours. It does not mean
nothing is exposed, and a deployment that claims otherwise is misconfigured
rather than more private.

## Streaming logs through a proxy

The run page tails in-flight logs over Server-Sent Events. A proxy that buffers
responses will hold the whole stream until the job ends, which looks like
"live logs do not work" — the log arrives complete, all at once, when the job
finishes.

The application already sends `X-Accel-Buffering: no` and flushes every write,
so a default nginx often needs nothing. Where a change is needed, the
copy-paste blocks for nginx, Caddy and Traefik are in
[Logs](/use/logs/#live-logs-through-a-reverse-proxy).

---
title: "Quickstart"
description: "Get the binary running, through the first-boot wizard, and ready for a GitHub App."
sidebar:
  order: 1
---
Get the binary running, through the first-boot wizard, and ready for a GitHub
App. Full environment and settings detail lives in
[Configuration](/start/configuration/).

## Requirements

- A GitHub App you own (permissions and events in
  [Register a GitHub App](/setup/github-app/))
- A public HTTPS URL GitHub can reach
- `git` in the worker image (clone happens here). Node is needed in this image
  only when a job has no `runtime:` and runs as a process
- A reachable Docker engine (`CI_DOCKER_HOST` or a mounted `docker.sock`) if
  you use `runtime:` or opt into fork PRs
- Optionally, a Coolify API token — inventory, the repo picker, and
  install-worker

## Run it

```bash
export CI_SECRET_KEY="$(openssl rand -base64 48)"   # required, keep it forever
export CI_PUBLIC_BASE_URL="https://ci.example.com"  # optional seed
docker compose up --build
```

`CI_SECRET_KEY` is required; the process refuses to start without it. Keep it
forever — losing it makes stored PEMs and tokens unreadable. See
[Configuration](/start/configuration/) for the full env table and key rotation.

Compose, volumes, and reverse-proxy notes are in
[Deployment](/understanding/deployment/).

## First boot

The first request with no admin user lands on the setup wizard: admin password
plus the public base URL. Both are needed before GitHub can reach you.

For a headless deploy, set `CI_BOOTSTRAP_ADMIN_PASSWORD` so the `admin` user is
created on first boot and you can drive setup over the API instead of the
wizard. It is ignored once a user exists.

## Setup order

1. [Register a GitHub App](/setup/github-app/) and paste it under **GitHub Apps**.
2. Optionally [add a Coolify instance](/setup/coolify/) as a repo-picker source
   or to install this worker.
3. [Enable repo bindings](/setup/bindings/). The bindings table is the
   allow-list.

Then commit a [pipeline](/using/pipelines/) (or rely on Node defaults) and push.

## What you should see

On the next push to an enabled binding, GitHub opens one Check Run on the
commit. The panel in the pull request looks like this:

```text
openpreflight
────────────────────
✓ install    8s
✓ test      21s
✓ build     13s

Passed in 42s

View full logs →
```

**View full logs** is the Check Run's `details_url`: it opens
`GET /runs/{job-id}` on your instance. That page requires a session by
default; a binding can opt into shareable logs. See [Logs](/using/logs/).

If nothing resolves to run, the check reports **skipped** rather than failed —
that is intentional. See [Pipelines](/using/pipelines/) and
[Troubleshooting](/using/troubleshooting/).


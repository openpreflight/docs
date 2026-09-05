---
title: "Quickstart"
description: "Get the binary running, through the first-boot wizard, and ready for a GitHub App."
sidebar:
  order: 1
---
This is the shortest path from an empty box to a process waiting for a GitHub
App. Full environment and settings detail lives in
[Configuration](/configure/configuration/).

## Requirements

- A GitHub App you own (permissions and events in
  [Register a GitHub App](/configure/github-app/))
- A public HTTPS URL GitHub can reach
- `git` in the worker image (clone happens here). Node is needed in this image
  only when a job has no `runtime:` and runs as a process
- A reachable Docker engine (`CI_DOCKER_HOST` or a mounted `docker.sock`) if
  you use `runtime:` or opt into fork PRs
- Optionally, a Coolify API token for inventory, the repo picker, and
  install-worker

## Run it

`compose.prod.yaml` is standalone: it pulls the published image, so there is
nothing to clone.

```bash
curl -O https://raw.githubusercontent.com/openpreflight/openpreflight/main/compose.prod.yaml
export CI_SECRET_KEY="$(openssl rand -base64 48)"
docker compose -f compose.prod.yaml up -d
```

`CI_SECRET_KEY` is the only variable you must set; the process refuses to start
without it. Keep it forever. Losing it makes stored PEMs and tokens unreadable.
Everything else either has a default or is asked for in the wizard. See
[Configuration](/configure/configuration/) for the full env table and key rotation.

**v2.0.2** is the current tagged release. Linux binaries are on the
[GitHub Release](https://github.com/openpreflight/openpreflight/releases/tag/v2.0.2).
Pin the image with `OPENPREFLIGHT_VERSION=2.0.2` rather than editing the file.
v1.0.0 was 29 August 2026.

To build from source instead (the contributor path, where `compose.yaml` is
`build: .` and needs the checkout):

```bash
git clone https://github.com/openpreflight/openpreflight
cd openpreflight
export CI_SECRET_KEY="$(openssl rand -base64 48)"
docker compose up --build
```

If you use `runtime:` or fork PRs, you also need `DOCKER_GID`. See
[Deployment](/deploy/deployment/), which covers compose, volumes, the
docker socket, and reverse-proxy notes.

## First boot

The first request with no admin user lands on the setup wizard: admin password
plus the public base URL. Both are needed before GitHub can reach you.

For a headless deploy, set `CI_BOOTSTRAP_ADMIN_PASSWORD` so the `admin` user is
created on first boot and you can drive setup over the API instead of the
wizard. It is ignored once a user exists.

## Setup order

1. [Register a GitHub App](/configure/github-app/) and paste it under **GitHub Apps**.
2. [Enable repo bindings](/configure/bindings/). The bindings table is the
   allow-list.
3. Optionally [add a Coolify instance](/deploy/coolify/) as a repo-picker source
   or to install this worker.

Then commit a [pipeline](/use/pipelines/) (or rely on Node defaults) and push.

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
default; a binding can opt into shareable logs. See [Logs](/use/logs/).

If nothing resolves to run, the check reports skipped rather than failed.
That is intentional. See [Pipelines](/use/pipelines/) and
[Troubleshooting](/operate/troubleshooting/).


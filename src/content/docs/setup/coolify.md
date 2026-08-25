---
title: "Coolify"
description: "Add Coolify as an optional deployment target and repository picker. Not required for checks to work."
sidebar:
  order: 2
---
Coolify is a supported deployment target and an optional repo source. **Not
the product, and not required**. Add a team-scoped API token and you get server
inventory, a repository picker, and a one-click **Install this worker**. Skip it
entirely and everything else works the same: the checks come from a
[GitHub App you register](/setup/github-app/), and jobs run here or on any
Docker engine you point `CI_DOCKER_HOST` at.

## Add an instance

One row is one **(base URL, API token)** pair. A Coolify API token is scoped to
a single team, so a row covers that team, not the whole host; a second team on
the same host is a second row.

Get a token from Coolify's **Security → API Tokens** (older versions: **Keys &
Tokens**). Read-only is enough for inventory. Creating this worker as a Coolify
application needs a token that can write applications.

- **Test** calls `/api/v1/teams/current` and `/api/v1/servers` and labels the
  row with the team it can see.
- **Inspect** can also create the compose application (`instant_deploy: false`)
  so you can set `CI_SECRET_KEY` before the first start.

Do **not** point Coolify's GitHub connector webhook at this service: an App has
one webhook URL, and repointing it would steal Coolify's deploys.

## Deploying the worker on Coolify

Compose, volumes, reverse-proxy, and install-worker details are in
[Deployment](/understanding/deployment/). Jobs on another machine use
`CI_DOCKER_HOST` / `DOCKER_HOST` (a Docker engine), not Coolify's API as a job
runner.

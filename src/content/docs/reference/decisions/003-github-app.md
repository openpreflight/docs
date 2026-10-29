---
title: "ADR 003: Our GitHub App, not Coolify's GitHub connector"
description: "Decision: checks come from a GitHub App you register, not Coolify's GitHub connector."
sidebar:
  order: 3
---
- Status: accepted
- Date: 2026-08-24

## Context

Coolify connects to GitHub for deploys. One option is to use that connector
again for commit checks. Then operators do not register a second App.

GitHub lets only a **GitHub App** create Check Runs. GitHub refuses user and
OAuth tokens. A GitHub App has one webhook URL only. Coolify's connector
webhook belongs to Coolify's deploy pipeline, and its manifest has no
`checks` permission.

## Decision

Operators register a GitHub App they own, with `Checks: Read and write`,
`Contents: Read-only`, `Metadata: Read-only`, subscribed to **Check suite**
and **Check run**. This server is the webhook of that App (`/webhook/{slug}`).

Coolify is optional inventory. A team-scoped API token lets the UI list
servers and show a repository picker. Coolify is not the Check Run author.
The GitHub webhook of Coolify must not point to this server.

## Consequences

- Setup is longer (create an App, paste PEM + webhook secret). That is the
  cost to write the same commit checks that a pull request shows.
- If you point Coolify's GitHub connector to this server, this server steals
  the deploys. The docs warn against it.
- Clone credentials are installation tokens from *our* App. The server gives
  them to git through `GIT_CONFIG_*` as Basic `x-access-token`. Then it removes
  the remote before the first pipeline step runs.

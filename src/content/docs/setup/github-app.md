---
title: "Register a GitHub App"
description: "Create a GitHub App with GitHub's review screen, or paste credentials. Permissions, events, and webhook URL."
sidebar:
  order: 1
---
Only a GitHub App can create Check Runs. User and OAuth tokens are refused. A
GitHub App also has exactly one webhook URL, which is why Coolify's own GitHub
connector cannot do this job: its webhook belongs to Coolify's deploy
pipeline and its manifest has no `checks` permission. Coolify is used here for
server inventory and as a repository picker; the checks come from an App you
register. See [ADR 003](/adr/003-github-app/).

Set the **public base URL** in Settings first so GitHub can reach the callback
and the webhook.

## Create with GitHub

On the **GitHub Apps** page, **Create with GitHub**. GitHub shows a review
screen with the permissions this worker needs (`checks: write`,
`contents: read`, `metadata: read`; Check suite and Check run events). Confirm
it; we store the App ID, slug, PEM, and webhook secret GitHub returns, and
point the webhook at `{public base URL}/webhook/{slug}`.

The PEM and the webhook secret are encrypted at rest and never shown again.

This path is github.com only. GitHub Enterprise: paste credentials (below).

## Advanced — paste credentials

GitHub → Settings → Developer settings → **GitHub Apps** → New GitHub App,
then paste name, slug, App ID, webhook secret, and PEM.

| Setting | Value |
|---|---|
| Webhook URL | `{public base URL}/webhook/{slug}` (the slug you choose when adding the App here) |
| Webhook secret | any strong random string; use a different one per App |
| Repository permissions | `Checks: Read and write`, `Contents: Read-only`, `Metadata: Read-only` |
| Subscribe to events | Check suite, Check run |

Generate a private key, install the App on the account or org that owns the
repos, then add it under **GitHub Apps** in openpreflight. Test mints an App
JWT and lists installations.

## After the App is registered

Enable the repositories you want checks for under
[Bindings](/setup/bindings/). A webhook for a repo with no enabled binding is
acknowledged and dropped, however valid its signature.

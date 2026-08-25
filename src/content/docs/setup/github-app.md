---
title: "Register a GitHub App"
description: "Register a GitHub App: the permissions, events, and webhook URL openpreflight needs, and why an App is required."
sidebar:
  order: 1
---
Only a GitHub App can create Check Runs — user and OAuth tokens are refused. A
GitHub App also has exactly one webhook URL, which is why **Coolify's own
GitHub connector cannot do this job**: its webhook belongs to Coolify's deploy
pipeline and its manifest has no `checks` permission. Coolify is used here for
server inventory and as a repository picker; the checks come from an App you
register. See [ADR 003](/adr/003-github-app/).

## Create the App on GitHub

GitHub → Settings → Developer settings → **GitHub Apps** → New GitHub App.

| Setting | Value |
|---|---|
| Webhook URL | `{public base URL}/webhook/{slug}` — the slug you choose when adding the App here |
| Webhook secret | any strong random string; use a **different one per App** |
| Repository permissions | `Checks: Read and write`, `Contents: Read-only`, `Metadata: Read-only` |
| Subscribe to events | **Check suite**, **Check run** |

Generate a private key, install the App on the account or org that owns the
repos, then add it under **GitHub Apps** in openpreflight: name, slug, App ID,
webhook secret, PEM. **Test** mints an App JWT and lists installations.

The PEM and the webhook secret are encrypted at rest and never shown again —
the API returns a redacted marker, not the value.

## After the App is registered

Enable the repositories you want checks for under
[Bindings](/setup/bindings/). A webhook for a repo with no enabled binding is
acknowledged and dropped, however valid its signature.

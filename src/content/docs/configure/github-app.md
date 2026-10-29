---
title: "Register a GitHub App"
description: "Register the GitHub App that makes the Check Runs. Use Create with GitHub, or paste the credentials. Includes GitHub Enterprise Server."
sidebar:
  order: 1
---
This procedure registers the GitHub App that makes the Check Runs for your
repositories.

Only a GitHub App can make Check Runs. GitHub refuses user tokens and OAuth
tokens. An App also has one webhook URL. Coolify's GitHub connector cannot do
this job, because its webhook goes to the Coolify deploy pipeline and its
manifest has no `checks` permission. Refer to
[ADR 003](/reference/decisions/003-github-app/).

## Before you start

- Set **Public base URL** in **Settings**. GitHub sends the callback and the
  webhook to this URL.

## Create with GitHub

This procedure is for github.com only. For GitHub Enterprise Server, refer to
[GitHub Enterprise Server](#github-enterprise-server).

1. Open **GitHub Apps**.
2. Click **Add an App**.
3. Click **Create with GitHub**.
4. On GitHub, examine the permissions and the events.
5. Accept the App on GitHub.
6. Install the App on the account or organization that owns the repositories.

GitHub shows these permissions: `checks: write`, `contents: read`
and `metadata: read`. It also shows the **Check suite** and **Check run**
events.

openpreflight keeps the App ID, the slug, the PEM and the webhook secret that
GitHub returns. It sets the webhook URL to `{public base URL}/webhook/{slug}`.
The server encrypts the PEM and the webhook secret, and does not show them
again.

## Paste credentials

Use this procedure for GitHub Enterprise Server, or to register the App on
GitHub with your own values.

1. On GitHub, open **Settings → Developer settings → GitHub Apps**.
2. Click **New GitHub App**.
3. Set the values in the table below.
4. Save the App on GitHub.
5. Generate a private key.
6. Install the App on the account or organization that owns the repositories.
7. In openpreflight, open **GitHub Apps** and click **Add an App**.
8. Type the **Name**, the **Slug**, the **App ID**, the **Webhook secret** and the **Private key (PEM)**.
9. Click **Add and test**.

| Setting | Value |
|---|---|
| Webhook URL | `{public base URL}/webhook/{slug}`. The slug is the slug that you type in openpreflight. |
| Webhook secret | A strong random string. Use a different string for each App. |
| Repository permissions | `Checks: Read and write`, `Contents: Read-only`, `Metadata: Read-only` |
| Subscribe to events | Check suite, Check run |

## Result

**Test** on the **GitHub Apps** page makes an App JWT and lists the
installations of the App. If the App has no installation, the message gives
the URL to install it: `https://github.com/apps/{slug}/installations/new`.

## GitHub Enterprise Server

openpreflight contains the code for GitHub Enterprise Server. Nobody tested
this code with a GitHub Enterprise Server.

1. Register the App with [Paste credentials](#paste-credentials).
2. On the App in openpreflight, set **API URL** to the API URL of your GitHub
   Enterprise Server.

The default **API URL** is `https://api.github.com`. The server makes the git
origin from the **API URL**. Example: with `https://ghe.example.com/api/v3`,
the server clones from `https://ghe.example.com`. No other part of the request
path uses github.com.

These items are not tested: the certificate chain, differences in the API
version, and the Check Runs behaviour of previous releases. If you try it, open an
[issue](https://github.com/openpreflight/openpreflight/issues) with the version
and the problem.

## Related

- [Add repositories](/configure/bindings/): the next step. Add the repositories that get Check Runs.

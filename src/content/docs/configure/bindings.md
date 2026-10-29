---
title: "Add repositories"
description: "Add a binding for each private repository that gets Check Runs. The list of bindings is the allow-list."
sidebar:
  order: 2
---
This procedure adds the repositories that get Check Runs. Each of these
repositories has a binding, and the list of bindings is the allow-list.

## Before you start

- [Register a GitHub App](/configure/github-app/) and install it on the account
  that owns the repositories.

:::caution
Add only private repositories that you trust. A pipeline runs the commands
of the repository, as a process on the server host or in a `docker run`
container when `runtime:` is set.
:::

## Procedure

1. Open **Repos**.
2. Click **Pick repositories** (`/repos/pick`).
3. In **CI GitHub App**, select the App.
4. Optional: in **Repo list from**, select a Coolify instance as the source of the list.
5. Click **Load repositories**.
6. Select the repositories that get checks.
7. Click **Save selection**.

To remove a binding, clear its checkbox, and click **Save selection** again.

To add one binding by owner and name, click **Add a binding** (`/repos/new`).
It shows the same fields. **Edit** shows the same fields on a different page
(`/repos/{id}/edit`).

## Result

Each selected repository has a binding, with **Enabled** set. The server
accepts a webhook for a repository with no active binding, and then ignores it.
This also applies when the signature is correct.

## Binding fields

A binding can change some values for its repository, for example the branches,
the path filters and the commands. The full list is in
[Binding fields](/reference/configuration/#binding-fields), and the order in
which the values apply is in [How configuration resolves](/reference/resolution/).

## Next

1. Commit a [pipeline](/configure/pipelines/), or use the
   [inferred defaults](/reference/resolution/#inferred-defaults).
2. On the **Edit** page of the binding, click **Test configuration** to do a [dry run](/configure/dry-run/).
3. Push to a branch that the binding accepts.

The server reports one Check Run, with a link to the full [log](/use/logs/).

---
title: "Comparison"
description: "How openpreflight compares with Woodpecker CI, Drone, a self-hosted actions/runner and Jenkins, and when to use one of those tools."
sidebar:
  order: 3
---
openpreflight is a small tool with a narrow scope. It reports one Check Run for
each commit of a private GitHub repository. It uses one server and one SQLite
file, and it runs `install`, `test` and `build`. That is all of the product.
Most tools on this page do more, and for many teams that is the purpose.

For the list of things that openpreflight does not do, refer to
[Limits](/getting-started/overview/#limits).

## Summary

| You want | Use |
|---|---|
| A check on the commit, on a host that you operate, with the minimum of components to operate | openpreflight |
| A pipeline DSL with stages, matrices, caches, artifacts, and fan-out | Woodpecker or Drone |
| The workflows that you have in `.github/workflows/` | self-hosted `actions/runner` |
| Anything that is not GitHub, or plugins for everything | Jenkins |

## Woodpecker CI

Woodpecker is the nearest comparison, and for most users it is the better
default. It is a pipeline engine for containers, with a YAML DSL, matrix
builds, plugins and secrets management. It has multiple agents, and it
supports GitHub, GitLab, Gitea, Bitbucket and Forgejo.

Use Woodpecker if you want steps other than `install`, `test` and `build`. Also
use it for matrix builds, artifacts between steps, jobs on more than one
machine, or a forge that is not GitHub. In openpreflight, a path filter on a
binding skips one Check Run when no file matches. It does not make a matrix of
jobs, one for each directory.

Use openpreflight if the server and the agents of Woodpecker are too much to
operate for a small number of private repositories. It is correct if a Check
Run with a pass or fail result and a log is all that you want. openpreflight
is one container and one file. There is no agent to register and no broker.

## Drone

Woodpecker is a fork of Drone, and the two tools have the same design. Each
has a server, one or more runners, a container for each step, many plugins
and multiple forges. The license changed after Harness bought Drone. Compare the
license with your own constraints. Much of the community moved to Woodpecker.

The comparison with openpreflight is the same as for Woodpecker. openpreflight
does not recommend one of Drone or Woodpecker.

## Self-hosted `actions/runner`

If your workflows are GitHub Actions workflows, use `actions/runner`, not
openpreflight. You keep the YAML, the marketplace, the matrix syntax, the
caches and the artifacts. Only the location of the compute changes.
openpreflight does not run these functions. It does not read `.github/workflows/`,
and it will not read it in the future.

Use `actions/runner` if you have Actions workflows to keep. Also use it if
you want the marketplace, or if you want GitHub to control the schedule.

Use openpreflight if you do not want to use Actions minutes, and you do not
want a runner registered on your organization. It is also correct if you want
a CI that you can read and understand in one afternoon.

## Jenkins

Jenkins has twenty years of plugins for almost all source control systems,
languages and types of deployment. openpreflight does not compete with that.

Use Jenkins if a plugin gives the function that you want. Also use it if your
build infrastructure does more than three commands in a checkout, or if you
operate Jenkins at this time.

Use openpreflight if you want only a green check on the pull requests of a
private repository. Then Jenkins gives you a JVM, plugin upgrades and much
configuration that you do not want to operate.

## Where openpreflight is better

- It is small to operate: one container, one SQLite file and one server.
  There is no broker to run, no agent to register and no database server. A
  backup is one file and one key. Refer to
  [Backup and restore](/operate/backup-restore/).
- Check Runs are native, not a layer on the status API. Jobs start from the
  check suite, and each commit has a maximum of one live job. Thus a branch
  protection rule on the Check Run stays correct after a force-push or many fast pushes. Refer to
  [ADR 005](/reference/decisions/005-check-suite-gating/).
- GitHub Apps and bindings are rows that you edit in the UI. An installation
  is not a block of environment variables.
- The server encrypts its secrets at rest. Private keys, webhook secrets and
  Coolify tokens are AES-256-GCM columns. Refer to
  [Security model](/reference/security-model/).
- All of the implementation is in `internal/`, with no plugin interface. The
  code is sufficiently small to audit.

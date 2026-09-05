---
title: "Comparison"
description: "Where openpreflight sits against Woodpecker CI, Drone, self-hosted actions/runner, and Jenkins, and when to pick one of those instead."
sidebar:
  order: 3
---
openpreflight is a narrow tool. It reports one Check Run per commit for private
GitHub repos, from one binary and one SQLite file, and it runs `install`,
`test`, and `build`. That is the whole product. Most projects on this page do
more, and for a lot of teams doing more is the point.

Read this page before you install.

## The short version

| You want | Pick |
|---|---|
| A check on the commit, on a box you already run, with as little to operate as possible | openpreflight |
| A real pipeline DSL with stages, matrices, caches, artifacts, and fan-out | Woodpecker or Drone |
| The same workflows you already have in `.github/workflows/` | self-hosted `actions/runner` |
| Anything that is not GitHub, or plugins for everything | Jenkins |

## Woodpecker CI

The closest comparison, and for most people the better default. Woodpecker is a
container-native pipeline engine with a YAML DSL, matrix builds, plugins,
secrets management, multiple agents, and support for GitHub, GitLab, Gitea,
Bitbucket, and Forgejo.

Pick Woodpecker if you want steps that are not install/test/build, matrix
builds, artifacts between steps, more than one machine running jobs, or a forge
that is not GitHub. A binding path filter here skips one Check Run when no
file matches; it is not a matrix of jobs per directory.

Pick openpreflight if the server-plus-agent split is more than you want to
run for a handful of private repos, and a Check Run that says pass or fail with
a log behind it is the whole requirement. openpreflight is one container and
one file; there is no agent to register and no broker.

## Drone

The project Woodpecker forked from. Same shape: a server, one or more runners,
a container-per-step pipeline, a mature plugin ecosystem, several forges.
Licensing changed after Harness acquired it, which is worth checking against
your own constraints; Woodpecker is where much of the community went.

The trade-off against openpreflight is the same as Woodpecker's, and if you are
choosing between the two of them rather than against this, that is a decision
openpreflight has no opinion on.

## Self-hosted `actions/runner`

If your workflows are already GitHub Actions, this is usually the right answer
and openpreflight is the wrong one. You keep the YAML, the marketplace, the
matrix syntax, the caches, and the artifacts, and you change where the compute
happens. openpreflight deliberately runs none of that: it does not read
`.github/workflows/`, and it will not.

Pick `actions/runner` if you have Actions workflows you want to keep, need
the marketplace, or want GitHub to own the scheduling.

Pick openpreflight if you do not want Actions minutes involved at all, do
not want a runner registered against your org, and would rather the whole CI
surface be a thing you can read in an afternoon. The scope note in
[what is out of scope](/getting-started/faq/#what-is-out-of-scope) is the honest boundary.

## Jenkins

Two decades of plugins covering more or less every SCM, language, and
deployment shape. Nothing here competes with that, and nothing here tries.

Pick Jenkins if you need something a plugin already solves, have build
infrastructure that is not just "run three commands in a checkout", or already
run it.

Pick openpreflight if you would be installing Jenkins purely to get a
green check on a private repo's pull requests, and the JVM, the plugin
upgrades, and the configuration surface are cost you would rather not carry.

## Where openpreflight is genuinely weaker

Stated plainly, because these are the things that will bite:

- It runs on one machine. There is no agent protocol, so jobs run in the
  process or in a sibling container on the same Docker engine. Every one of the
  tools above scales horizontally; this one does not.
- One job runs at a time by default. `max_concurrent_jobs` is 1 and can only be
  raised after first boot. See [Configuration](/configure/configuration/).
- Three steps, `install`, `test`, `build`, in that order. No stages, no
  `needs:`, no fan-out, no conditional steps.
- Every job is a fresh shallow clone. There are no caches and no artifacts, so
  nothing is carried between runs or handed to a later step.
- No matrices. You get one pipeline per commit, not one per version
  combination.
- GitHub only, because it is built on Check Runs and no other forge has them.
- One admin user. No teams, no roles, no SSO.
- You register the GitHub App yourself. It is not created for you.

## Where it is genuinely better

- It is operationally small: one container, one SQLite file, one process.
  There is no broker to run, no agent to register, and no database server.
  Backups are a file and a key; see [Operations](/operate/operations/).
- Check Runs are native rather than a shim over the status API. Runs gate on
  the check suite and hold to one live run per commit, which is what makes
  required checks behave under force-pushes and rapid pushes. See
  [ADR 005](/reference/decisions/005-check-suite-gating/).
- Apps and repo bindings are rows you edit in a UI, so an installation is not a
  block of environment variables.
- Secrets are encrypted at rest. PEMs, webhook secrets, and Coolify tokens are
  AES-256-GCM columns. See [Security model](/reference/security-model/).
- The whole implementation is `internal/`, with no plugin surface, so it is
  small enough to audit.

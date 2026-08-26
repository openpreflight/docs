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

Read this before you install, not after.

## The short version

| You want | Pick |
|---|---|
| A check on the commit, on a box you already run, with as little to operate as possible | openpreflight |
| A real pipeline DSL — stages, matrices, caches, artifacts, fan-out | Woodpecker or Drone |
| The same workflows you already have in `.github/workflows/` | self-hosted `actions/runner` |
| Anything that is not GitHub, or plugins for everything | Jenkins |

## Woodpecker CI

The closest comparison, and for most people the better default. Woodpecker is a
container-native pipeline engine with a YAML DSL, matrix builds, plugins,
secrets management, multiple agents, and support for GitHub, GitLab, Gitea,
Bitbucket, and Forgejo.

**Pick Woodpecker if** you want steps that are not install/test/build, matrix
builds, artifacts between steps, more than one machine running jobs, or a forge
that is not GitHub.

**Pick openpreflight if** the server-plus-agent split is more than you want to
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

**Pick `actions/runner` if** you have Actions workflows you want to keep, need
the marketplace, or want GitHub to own the scheduling.

**Pick openpreflight if** you do not want Actions minutes involved at all, do
not want a runner registered against your org, and would rather the whole CI
surface be a thing you can read in an afternoon. The scope note in
[what is not in v1](/start/faq/) is the honest boundary.

## Jenkins

Two decades of plugins, every SCM, every language, every deployment shape.
Nothing here competes with that, and nothing here tries.

**Pick Jenkins if** you need something a plugin already solves, have build
infrastructure that is not just "run three commands in a checkout", or already
run it.

**Pick openpreflight if** you would be installing Jenkins purely to get a
green check on a private repo's pull requests, and the JVM, the plugin
upgrades, and the configuration surface are cost you would rather not carry.

## Where openpreflight is genuinely weaker

Stated plainly, because these are the things that will bite:

- **One machine.** There is no agent protocol. Jobs run in the process or in a
  sibling container on the same Docker engine. Every one of the tools above
  scales horizontally; this one does not.
- **One job at a time by default.** `max_concurrent_jobs` is 1 and can only be
  raised after first boot. See
  [Configuration](/start/configuration/).
- **Three steps.** `install`, `test`, `build`, in that order. No stages, no
  `needs:`, no fan-out, no conditional steps.
- **No caches and no artifacts.** Every job is a fresh shallow clone. Nothing
  is carried between runs or handed to a later step.
- **No matrices.** One pipeline per commit, not one per version combination.
- **GitHub only.** It is built on Check Runs, which no other forge has.
- **One admin user.** No teams, no roles, no SSO.
- **You register the GitHub App.** It is not created for you.

## Where it is genuinely better

- **Operationally small.** One container, one SQLite file, one process. No
  broker, no agent registration, no database server. Backups are a file and a
  key; see [Operations](/understanding/operations/).
- **Native Check Runs.** Not a status API shim. Runs gate on the check suite
  and hold to one live run per commit, which is what makes required checks
  behave under force-pushes and rapid pushes. See
  [ADR 005](/adr/005-check-suite-gating/).
- **Configured in a UI, not env vars.** Apps and repo bindings are rows you
  edit, not a block of environment per installation.
- **Secrets encrypted at rest.** PEMs, webhook secrets, and Coolify tokens are
  AES-256-GCM columns. See [Security model](/understanding/security-model/).
- **Small enough to audit.** The whole implementation is `internal/`, with no
  plugin surface.

---
title: "ADR 005: Check-suite-driven gating at single-server scale"
description: "Decision: gate on the check suite and immutable SHA at single-server scale, not on push."
sidebar:
  order: 5
---
- Status: accepted
- Date: 2026-08-24

## Context

The server has always listened to `check_suite` and `check_run` only.
`internal/webhook.Parse` handles `check_suite` (`requested`, `rerequested`) and
`check_run` (`rerequested`). `push` and `pull_request` go to the skip branch.
No document recorded this. As a result, the most consequential decision in the
trigger path was the easiest one to undo. A new `push` case looks like a
feature, not a reversal.

The model has prior art. Zuul gates on the commit, queues work against an
immutable SHA, attaches logs to the run, and reports the result back to the
forge. Its architecture does not transfer. It uses ZooKeeper for coordination,
Nodepool for node lifecycle and Ansible as the execution layer. It also has a
multi-tenant config model and a scheduler separate from the executors. This
project is one Go binary, one SQLite file, one host.

The unstated invariant also caused two duplicate-check bugs. The handler
deduped on `delivery_id` and cancelled on `(repo, ref)`. Two cases made two
concurrent jobs: a commit that arrived on a second ref, and a rerequest that
came while a job ran. The result was two Check Runs with the same name on the
same commit. Then branch protection reads the Check Run that finished last.

## Decision

- Trigger on `check_suite` and `check_run` only, never `push` and never
  `pull_request`. GitHub creates the suite. A suite is scoped to one commit and
  one App, which makes it the natural unit of work. `push` fires for refs that
  nobody reviews. `pull_request` fires on metadata edits that do not change
  the tree.
- One Check Run for each job. The steps show as a table in the `output.summary`
  of that Check Run (`internal/queue/summary.go`), not as separate Check Runs.
  In the branch protection of a user, one Check Run is one mandatory status
  entry. Because of this, a new step never breaks it.
- One live job for each `(github_app_id, repo, sha)`. The handler enforces
  this, not a database constraint. `Runner.CancelJob` cancels the context and
  returns. The goroutine of the job writes the `cancelled` status later. As a
  result, a partial unique index over the in-flight statuses will
  intermittently reject the follow-up insert. The job records `check_suite_id`
  for traceability, but it is not the key. A payload can omit it, and a missing
  id must not weaken the invariant.
- `ev.Action` decides what a second delivery means. `requested` means that
  GitHub asks twice. The answer is `already queued`. `rerequested` means that a
  person clicked **Re-run**. It supersedes the job in flight.
- Zuul is the referenced model, not the implementation. Borrowed: suite and run
  semantics, the immutable SHA, explicit gating, queues, logs on the run, and
  the result written back to GitHub. Not borrowed: ZooKeeper, Nodepool, Ansible,
  multi-tenant config, or a second scheduler.

## Consequences

- The ceiling is real: no build matrices, no dependency cache, no fan-out
  across machines, no cross-repository dependent pipelines. This design chose a
  queue depth of one server. Treat it as the shape of the tool, not as a gap to
  avoid.
- This decision rejects a Check Run for each step while the executor runs the
  steps in sequence in one shell and one workspace. GitHub shows a **Re-run**
  button for each Check Run. A step that cannot run again alone must not show
  one. If the Docker executor ([ADR 004](/reference/decisions/004-docker-executor/))
  later makes steps independently schedulable, this is the decision to revisit.
  The recorded `check_suite_id` makes that cheap.
- This decision rejects a local `check_suites` table. The API cannot create
  suites. GitHub calculates the suite status from the Check Runs in the suite.
  A local aggregate mirrors state that we do not own, and no reader has a use
  for it.
- A trigger for a job without a suite (a cron build, a manual "build this tag")
  must have a new decision here first. Such a trigger has no commit status to
  write to.

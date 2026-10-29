---
title: "Dry run"
description: "See the commands that a commit will run, and the layer that supplied each value, before you push. The dry run writes nothing."
sidebar:
  order: 5
---
A dry run shows the plan for a commit before you push. It shows each
value, and the layer that supplied it. The order of the layers is in
[How configuration resolves](/reference/resolution/).

## Before you start

- [Add a binding](/configure/bindings/) for the repository. The dry run also
  works when **Enabled** is not set.

## Procedure in the UI

1. Open **Repos**.
2. Open the repository.
3. Click **Dry run**.
4. In **Branch, tag or commit**, type a ref. If the field is empty, the dry run uses the default branch.
5. Click **Resolve**.

On the **Edit** page of the binding, **Test configuration** opens the same page.

## Procedure with the API

1. Send `POST /api/v1/bindings/{id}/resolve?ref=main`.

`ref` is a branch, a tag or a SHA. If you do not send `ref`, the dry run uses
the default branch of the repository.

## What the dry run does

1. It finds the immutable SHA for the ref.
2. It clones that commit.
3. It resolves the plan with the same code that a job uses.
4. It examines the path filter against the changed-file list that a webhook gives.
5. It deletes the checkout.

**A dry run writes nothing.** It makes no Check Run on the commit, no job row
and no queue entry. Thus you can use it on a production server. If **Enabled** is not set on the
binding, the dry run gives the plan and a warning: the server ignores the
webhooks for that repository.

The dry run resolves a commit of the repository, not a fork pull request. Thus
the `default_runtime` value for forks does not apply. Refer to
[Fork pull requests](/configure/fork-pull-requests/).

## Result

```json
{
  "repo": "acme/api", "ref": "main", "sha": "b8bad2c0e1f4...",
  "decision": "run", "skip_reason": "", "explanation": "",
  "pipeline_file": ".ci.yml", "check_name": "openpreflight",
  "executor": "docker: node:22", "timeout": "3m0s",
  "steps": [{"name": "test", "command": "npm test", "source": ".ci.yml"}],
  "origins": [{"field": "timeout", "value": "3m0s", "source": ".ci.yml"}],
  "path_filter": "Changed files: 1\nMatched files: 1\nFilter: **\nResult: RUN",
  "warnings": [], "errors": []
}
```

| Field | Meaning |
|---|---|
| `decision` | `run`, `skip` or `fail`. Refer to the table below. |
| `skip_reason` | The type of skip, if `decision` is `skip`. Refer to [Skip reasons](/use/runs/#skip-reasons). |
| `explanation` | One sentence about the skip. |
| `executor` | `worker process`, or `docker:` and the image. |
| `steps` | Each command, and the layer that supplied it. |
| `origins` | Each resolved value, and the layer that supplied it. |
| `path_filter` | The filter diagnostic, as a job writes it in the log. |
| `errors` | Problems that make a job fail or skip. |
| `warnings` | Values that are correct, but that you possibly did not intend. |

| `decision` | Meaning |
|---|---|
| `run` | The pipeline will run. |
| `skip` | The Check Run will complete as `skipped`. `skip_reason` gives the type of skip. |
| `fail` | The configuration has an error. The check will fail before a step runs. |

`origins` can show values from different layers for one commit. Example: the
timeout and the image come from `.ci.yml`, the pipeline file name comes from
the settings, and the commands come from `go.mod`.

**The dry run reports all the problems at the same time.** A job stops at
the first problem, because it cannot run with a broken file. The dry run
continues. Thus a bad `timeout:` and a refused image show in the same result.

These are examples of warnings:

- An ambiguous project layout.
- A `runtime:`, but the server cannot connect to a Docker engine.
- A filter that matched no file in this commit.
- A truncated file list.

If the checkout is larger than `max_workspace_bytes`, `errors` shows it.

## Status codes

| Code | Meaning |
|---|---|
| `200` | The dry run completed. This does not mean that the configuration is correct. Read `decision` and `errors`. |
| `400` | The dry run could not start. Refer to the list below. |

These are the causes of a `400`:

- There is no binding with that id.
- GitHub refused the App credentials.
- No installation of the App can see the repository.
- There is no commit at that ref.
- The clone failed.

A `400` is a problem with the infrastructure, not with the configuration. Thus
it is a status code and not an entry in `errors`.

## Related

- [Runs](/use/runs/): the values that applied to a job that ran.
- [How configuration resolves](/reference/resolution/): the layers and the inferred defaults.

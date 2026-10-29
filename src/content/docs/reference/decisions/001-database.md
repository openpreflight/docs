---
title: "ADR 001: SQLite in-process, secrets encrypted at rest"
description: "Decision: SQLite in-process with AES-256-GCM encrypted secret columns, pure Go, no CGO."
sidebar:
  order: 1
---
- Status: accepted
- Date: 2026-08-24

## Context

The server is a single replica: one configurator, one executor, a few jobs at a
time. It must remember GitHub Apps (PEM + webhook secret), Coolify tokens,
bindings, and job history across Coolify redeploys. The Docker image must
stay `CGO_ENABLED=0`.

## Decision

Use SQLite through `modernc.org/sqlite` (pure Go). The file path is
`$DATA_DIR/ci.db`. WAL + `busy_timeout` + a single open connection. Schema
changes are append-only migrations in `internal/store`.

`internal/secret` seals the secret columns (`pem_enc`, `webhook_secret_enc`,
`api_token_enc`) with AES-256-GCM. The key comes from `CI_SECRET_KEY`
(SHA-256 → 32 bytes). GET responses return a redacted marker.
Set `CI_SECRET_KEY_OLD` on boot to re-seal stored columns under the new key,
then unset it. Without one of the two keys, nobody can read the ciphertext.

## Consequences

- A persistent volume on `/data` is mandatory. Without it, you must enter the
  Apps and tokens again. Without `CI_SECRET_KEY` (and `CI_SECRET_KEY_OLD`, if
  a re-seal must use it), nobody can read the existing ciphertext.
- No Postgres/Redis to operate. No horizontal scale: `max_concurrent_jobs`
  is in-process.
- A stolen database without the key is not a full secret leak. A stolen key
  plus the database is.
- CGO stays off. The runtime image does not have to include a libc sqlite shim.

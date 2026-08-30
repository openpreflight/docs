---
title: "Development"
description: "Local Go build, test, and run loop. No network or credentials required for tests."
sidebar:
  order: 1
---
Go 1.26 (see `go.mod`). No CGO. Tests need `git`; they do not need network,
GitHub, or Coolify.

## Run locally

```bash
go build ./...
go test ./...
go vet ./...

CI_SECRET_KEY="$(openssl rand -base64 48)" DATA_DIR=./data WORKSPACE_DIR=./workspace \
  LISTEN_ADDR=127.0.0.1:8080 go run ./cmd/server
```

Open http://127.0.0.1:8080 and complete the setup wizard, or set
`CI_BOOTSTRAP_ADMIN_PASSWORD` and drive `POST /api/v1/login`.

`data/` and `workspace/` are gitignored. Do not point `DATA_DIR` at a
directory you care about: jobs write checkouts there.

## Tests

`go test ./...` fakes the Coolify and GitHub HTTP APIs and runs clone/pipeline
tests against a real `git-http-backend` over a fixture repository
(`internal/testsupport`).

A change that touches store, auth, webhook HMAC, or the runner should come
with a test that would have failed before the change.

## UI / CSS

Pages are **templ** plus copied [shadcn-templ](https://shadcn-templ.com/)
components under `internal/web/components`. Styles are Tailwind v4 (nova / olive,
forest green tokens), compiled into `internal/web/assets/css/output.css` and
embedded at build time. There is no SPA. JavaScript is the official shadcn-templ
bundle (`GET /components/{bundle}`) plus a small theme script (system / light /
dark). Form posts stay native.

The authenticated layout is the shadcn Sidebar (Workspace / Setup / Settings)
with Inset breadcrumbs. Login and setup are a centered card (`max-w-[440px]`).
Do not add HTMX, Alpine, React, Vue, or DaisyUI. After editing `*.templ` or
`internal/web/assets/css/globals.css`:

```bash
templ generate ./internal/web/...
cd internal/web && npm ci && npm run css
```

The Dockerfile always rebuilds CSS in a Node stage and runs `templ generate`
in the Go stage so a forgotten local generate cannot ship stale markup.
Local `go run` uses whatever is already in `assets/css/output.css` and the
committed `*_templ.go` files.

## Layout

Do not introduce `pkg/` or flatten `internal/` into generic `auth` /
`database` / `service` packages. Name packages after the work they do. See
[architecture.md](/understanding/architecture/) and [CONTRIBUTING.md](https://github.com/openpreflight/openpreflight/blob/main/CONTRIBUTING.md).

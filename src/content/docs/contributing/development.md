---
title: "Development"
description: "Build, test and run the server on your computer. The tests do not use the network or credentials."
sidebar:
  order: 1
---
This procedure builds, tests and runs the server on your computer.

## Before you start

- Install Go 1.26. The `go.mod` file gives the version. The build does not use CGO.
- Install `git`. The tests use it. The tests do not use the network, GitHub or Coolify.
- If you change the UI, install `templ`, Node.js and npm.

## Procedure

1. Build the code:

   ```bash
   go build ./...
   ```

2. Run the tests:

   ```bash
   go test ./...
   ```

3. Run the static checks:

   ```bash
   go vet ./...
   ```

4. Start the server:

   ```bash
   CI_SECRET_KEY="$(openssl rand -base64 48)" DATA_DIR=./data WORKSPACE_DIR=./workspace \
     LISTEN_ADDR=127.0.0.1:8080 go run ./cmd/server
   ```

5. Open http://127.0.0.1:8080.
6. Complete the setup wizard. As an alternative, set `CI_BOOTSTRAP_ADMIN_PASSWORD` and log in with `POST /api/v1/login`.

`data/` and `workspace/` are in `.gitignore`.

:::caution
Do not set `DATA_DIR` or `WORKSPACE_DIR` to a directory with important files. The server writes the database and the logs to `DATA_DIR`, and the job checkouts to `WORKSPACE_DIR`.
:::

## Tests

`go test ./...` uses fake Coolify and GitHub HTTP APIs. The clone and pipeline tests use `git-http-backend` with a test repository (`internal/testsupport`).

If a change touches the store, authentication, the webhook HMAC or the runner, add a test. The test must fail without the change.

## Change the UI

The pages are **templ** with copied [shadcn-templ](https://shadcn-templ.com/) components in `internal/web/components`.
The styles are Tailwind v4 (nova / olive, forest green tokens). The build compiles them into `internal/web/assets/css/output.css` and embeds them.
There is no SPA. The JavaScript is the official shadcn-templ bundle (`GET /components/{bundle}`) and a small theme script (system / light / dark). Forms use native posts.

The layout after login is the shadcn Sidebar (Workspace / Setup / Settings), with Inset breadcrumbs and a refresh button in the header.
The login and setup pages are a centered card (`max-w-[440px]`).
Do not add HTMX, Alpine, React, Vue or DaisyUI.

If you edit a `*.templ` file or `internal/web/assets/css/globals.css`, do these steps:

1. Generate the templ code:

   ```bash
   templ generate ./internal/web/...
   ```

2. Build the CSS:

   ```bash
   cd internal/web && npm ci && npm run css
   ```

The Dockerfile always builds the CSS again in a Node stage, and runs `templ generate` in the Go stage. A missing local generate thus cannot put previous markup in the image.
Local `go run` uses the current `assets/css/output.css` and the committed `*_templ.go` files.

## Package layout

Do not add `pkg/`. Do not change `internal/` into generic `auth`, `database` or `service` packages. Give each package the name of the work that it does.

## Related

- [Architecture](/reference/architecture/)
- [CONTRIBUTING.md](https://github.com/openpreflight/openpreflight/blob/main/CONTRIBUTING.md)

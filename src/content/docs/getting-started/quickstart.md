---
title: "Quickstart"
description: "Start the server on an empty host, complete the setup wizard, connect a GitHub App and get the first Check Run."
sidebar:
  order: 2
---
This procedure goes from an empty host to the first Check Run on a commit.
For all of the environment variables and settings, refer to
[Configuration](/reference/configuration/).

## Before you start

- A host with Docker and Docker Compose.
- A public HTTPS URL that GitHub can reach. Refer to
  [Networking](/deploy/networking/).
- A GitHub account that can own a GitHub App. The permissions and events are
  in [Register a GitHub App](/configure/github-app/).
- If you use `runtime:` or fork pull requests, a Docker engine that the server
  can reach. Refer to [Docker engine access](/deploy/deployment/#docker-engine-access).
- Optional: a Coolify API token, for the server inventory, the repository
  picker and the install on Coolify.

The server image contains `git`, `nodejs` and `npm` only. If a job has no
`runtime:`, the process executor runs it with these tools. A Go, Rust or Python
job with no `runtime:` fails with `go: not found` (or `cargo`, `pytest`), and
you get no warning. If the repository is not a Node.js project, set `runtime:`
to an image that has the toolchain. Refer to [Pipelines](/configure/pipelines/).

## Procedure

### Start the server

1. Download the compose file. It pulls the published image, and you do not
   clone the repository.

   ```bash
   curl -O https://raw.githubusercontent.com/openpreflight/openpreflight/main/compose.prod.yaml
   ```

2. Make a secret key and set `CI_SECRET_KEY`. The server does not start without it.

   ```bash
   export CI_SECRET_KEY="$(openssl rand -base64 48)"
   ```

   :::caution
   Keep a copy of `CI_SECRET_KEY` in a safe location. If you lose the key, the
   server cannot decrypt the stored private keys and tokens.
   :::

3. Optional: to pin a release, set `OPENPREFLIGHT_VERSION` to a version from the
   [releases page](https://github.com/openpreflight/openpreflight/releases).
   Do not edit the compose file.
4. If you use `runtime:` or fork pull requests, set `DOCKER_GID`. Refer to
   [Docker engine access](/deploy/deployment/#docker-engine-access).
5. If you configure the server through the API, set `CI_BOOTSTRAP_ADMIN_PASSWORD`.
   The server then creates the `admin` user on first boot.
6. Start the server.

   ```bash
   docker compose -f compose.prod.yaml up -d
   ```

All other variables have a default, or the setup wizard shows a field for them.

### Complete the setup

If you set `CI_BOOTSTRAP_ADMIN_PASSWORD`, go to step 10.

7. Open the public URL of the server. With no admin user, the server shows the
   setup wizard.
8. Find the setup token in the server log. It is on the line that starts with
   `no admin yet` (`setup_token=…`).
9. Enter the setup token, the admin password and the public base URL.

Only a person who can read the server log can claim a new server. If the server
restarts before the setup is complete, it prints a new setup token.

### Connect GitHub

10. Register a GitHub App, and add it in **GitHub Apps**. Refer to
    [Register a GitHub App](/configure/github-app/).
11. Add a binding for each repository that must get checks. Refer to
    [Bindings](/configure/bindings/). The bindings are the allow-list.

    :::caution
    Add bindings only for private repositories that you trust. A pipeline runs the
    commands of the repository on the server host, or in a sibling container
    when `runtime:` is set.
    :::

12. Optional: add a Coolify instance as a source for the repository picker.
    Refer to [Optional: Coolify](/deploy/coolify/).
13. Commit a [pipeline](/configure/pipelines/) to the repository, or use the
    [inferred defaults](/reference/resolution/#inferred-defaults).
14. Push a commit to a repository that has a binding.

## Result

GitHub opens one Check Run on the commit. The server writes the summary in
markdown. Example: the
[`.ci.yml`](https://github.com/openpreflight/openpreflight/blob/main/.ci.yml)
of openpreflight has `install` and `test` only, with no `build`. A job with no
errors shows this summary:

```
✓ install  47s
✓ test     12s
```

**Passed in 59s**

[View full logs](/use/logs/)

The times change for each job. **View full logs** is the `details_url` of
the Check Run. It opens the run page, `GET /runs/{job-id}`, on your server. The
run page is available only with a session, unless the binding makes the log shareable. Refer to
[Shareable logs](/use/logs/#shareable-logs).

If the server finds no commands to run, the Check Run is `skipped`, not
`failure`. Refer to [Skip reasons](/use/runs/#skip-reasons).

## Build from source

The contributor path uses `compose.yaml`, which has `build: .`. You must clone the
repository:

```bash
git clone https://github.com/openpreflight/openpreflight
cd openpreflight
export CI_SECRET_KEY="$(openssl rand -base64 48)"
docker compose up --build
```

## Related

- [Deployment](/deploy/deployment/): the volumes and the Docker engine access
- [Networking](/deploy/networking/): the public URL and the reverse proxy
- [Configuration](/reference/configuration/#environment): all environment variables

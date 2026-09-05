---
title: "Logs"
description: "Where full job logs live, how the run page tails them, and when a binding makes a log page shareable."
sidebar:
  order: 3
---
Full logs are written to `/data/logs/<job-id>.log`, capped by `max_log_bytes`
(10 MiB by default) and pruned after `log_retention_days` (14 by default). The
Check Run carries a truncated tail; the full log is on the details page.

## Details URL

`GET /runs/{job-id}` is the `details_url` GitHub links to. GitHub never fetches
it; the reader's browser does, so it requires a session by default.
A binding can opt into shareable logs, which makes that one job's page readable
by anyone holding the link. The same rule applies to
`GET /api/v1/jobs/{id}/logs`. Job ids are random UUIDs, but treat such a link as
a secret.

## Live tail

While a job is in flight, the run page opens `EventSource` against
`GET /api/v1/jobs/{id}/logs/stream`. The first payload is the bytes already
on disk; later events append. The stream ends with `event: finished` when the
job is terminal. Auth matches the snapshot `GET` (session, or shareable
opt-in).

A meta-refresh on the page remains, so the log still updates without
JavaScript.

The snapshot `GET /api/v1/jobs/{id}/logs` is unchanged and needs nothing
special from a proxy.

## Live logs through a reverse proxy

**The symptom is unmistakable:** the log appears all at once, the moment the job
finishes, instead of streaming while it runs. That is a proxy buffering the
response, not a broken stream.

OpenPreflight already does its half. Every stream is sent with:

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

and each write is flushed explicitly. `X-Accel-Buffering: no` is the header
nginx honours, so on a default nginx the stream often works without any change
at all. What a proxy still has to be told is not to buffer on its own account
and not to close the connection while a long job is quiet.

**nginx**

```nginx
location /api/v1/jobs/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection '';

    proxy_buffering off;
    proxy_cache off;

    # A quiet build must not be cut off mid-stream. Make this longer than
    # your longest job, or the tail is lost right before the interesting part.
    proxy_read_timeout 1h;
}
```

**Caddy**

```caddy
reverse_proxy 127.0.0.1:8080 {
    # -1 flushes every write immediately, which is what SSE needs.
    flush_interval -1
}
```

**Traefik** buffers nothing by default, so the usual cause there is an explicit
`buffering` middleware on the router — remove it from this path. If the stream
still stalls, set the flush interval on the service:

```yaml
http:
  services:
    openpreflight:
      loadBalancer:
        responseForwarding:
          flushInterval: 100ms
        servers:
          - url: http://127.0.0.1:8080
```

**Cloudflare and similar CDNs** buffer proxied responses. If the run page is
behind one, either exclude `/api/v1/jobs/*/logs/stream` from proxying or accept
that live tailing will not work through it; the page still updates on its
meta-refresh, and the finished log is complete either way.

:::note
These directives are written from each proxy's documented behaviour. If live
tailing still does not work after applying them, the fastest test is to curl the
stream directly against the app's port, bypassing the proxy: if it streams
there and not through the proxy, the proxy is still buffering.
:::

Retention and size caps are settings; see
[Configuration](/configure/configuration/).

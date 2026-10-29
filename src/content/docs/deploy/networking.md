---
title: "Networking"
description: "Why GitHub must reach the webhook through public HTTPS, what to do with no public IP, the privacy boundary, and live logs through a proxy."
sidebar:
  order: 2
---
openpreflight has one hard network requirement: GitHub must reach the server.
You control all other parts of the deployment. This page gives the
requirement, the trust boundary that it makes, and the reverse proxy settings.
For the mounts and the ports, refer to [Deployment](/deploy/deployment/).

## Why GitHub must reach the server

The server does not poll for Check Runs. GitHub sends a `check_suite` event to
`/webhook/{slug}`. The server replies in less than ten seconds, and then does
the slow work in the background. There is no outbound-only mode and no relay
service. A relay is a hosted control plane, and this project does not have one.

Thus the server must have:

- A public HTTPS URL. A reverse proxy in front of port 8080 terminates the TLS.
- HTTPS, not plain HTTP. Plain HTTP works, but do not use it. With plain HTTP,
  the session cookies and the webhook payloads go through the network as plain text.
- A URL that does not change. If the URL changes, update `public_base_url` in
  the settings and the webhook URL of the App on GitHub. If you do not, the
  checks stop.

## `X-Forwarded-Proto`

The server sets `Secure` on the session and CSRF cookies only if the
connection is HTTPS. Behind a reverse proxy, the server reads this from the
`X-Forwarded-Proto` header. Configure the proxy to send
`X-Forwarded-Proto: https`. The Traefik proxy of Coolify sends it.

## If you have no public IP

A datacentre is not necessary, but a component must terminate a public name:

| Situation | Usual solution |
|---|---|
| VPS or cloud host | A reverse proxy on the host: Caddy or nginx with automatic certificates |
| Home server, no inbound ports | An outbound tunnel that terminates publicly, such as a Cloudflare Tunnel or Tailscale Funnel |
| Behind a corporate proxy | The proxy that publishes your internal services. GitHub's POST must get to the server. |

A tunnel is a correct solution. GitHub does not examine how the request gets
to the server.

## Where the privacy boundary falls

- Public: the webhook endpoint, and the paths that your reverse proxy
  exposes. The `details_url` on the Check Run points at your host. Thus all
  persons who can read the Check Run can see that hostname.
- Yours: all data that the job uses. The checkout, the build, the downloaded
  dependencies, the secrets, the logs and the database stay on infrastructure
  that you control.

GitHub gets the result only: a conclusion, a table of steps and the tail of
the log on the Check Run. The full log stays on your host, at `/runs/{id}`.
The run page is available only with a session, unless the binding makes the log shareable.
Refer to [Shareable logs](/use/logs/#shareable-logs).

"Self-hosted" means that the execution and the data are yours. It does not
mean that nothing is exposed. If a deployment claims that it exposes nothing,
it is not more private. It is not configured correctly.

## Live logs through a proxy

The run page shows the log of a job, while the job runs, through Server-Sent Events, at
`GET /api/v1/jobs/{id}/logs/stream`. If a proxy holds the response in a
buffer, the log does not show while the job runs. The full log then shows at
one time, when the job ends. The stream is correct. The proxy holds it.

The server sends each stream with these headers, and it flushes each write:

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

nginx obeys `X-Accel-Buffering: no`. Thus a default nginx can work with no
change. While the job writes no output, the server sends a comment line each
15 seconds. The snapshot, `GET /api/v1/jobs/{id}/logs`, works through the
proxy with no change.

To make the stream work through a proxy:

1. Configure the proxy to send each write immediately, with no buffer. Use
   the block for your proxy below.
2. If the run page is behind Cloudflare or a different CDN, do not send
   `/api/v1/jobs/*/logs/stream` through the CDN.
3. Test the stream with `curl` against the port of the server, not through
   the proxy.
4. If the stream works on the port of the server, but not through the proxy,
   examine the proxy again. The proxy holds the stream.

### nginx

```nginx
location /api/v1/jobs/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection '';

    proxy_buffering off;
    proxy_cache off;

    # The server sends a ping each 15 seconds. A timeout longer than that
    # keeps the stream open.
    proxy_read_timeout 1h;
}
```

### Caddy

```text title="Caddyfile"
reverse_proxy 127.0.0.1:8080 {
    # -1 flushes every write immediately, which is what SSE needs.
    flush_interval -1
}
```

### Traefik

By default, Traefik does not hold responses. If the stream stops, the usual
cause is a `buffering` middleware on the router. Remove it from this path. If
the stream stops after that, set the flush interval on the service:

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

### Cloudflare and other CDNs

These CDNs hold proxied responses. If the stream path goes through the CDN, the
live log does not work through the CDN. The run page then updates with its
meta-refresh, and the finished log is complete.

:::note
These blocks come from the documentation of each proxy. They were not tested
on each proxy.
:::

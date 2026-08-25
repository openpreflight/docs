---
title: "Logs"
description: "Where full job logs live, how details_url works, and when a binding makes a log page shareable."
sidebar:
  order: 2
---
Full logs are written to `/data/logs/<job-id>.log`, capped by `max_log_bytes`
(10 MiB by default) and pruned after `log_retention_days` (14 by default). The
Check Run carries a truncated tail; the full log is on the details page.

## Details URL

`GET /runs/{job-id}` is the `details_url` GitHub links to. **GitHub never
fetches it — the reader's browser does**, so it requires a session by default.
A binding can opt into shareable logs, which makes that one job's page readable
by anyone holding the link. The same rule applies to
`GET /api/v1/jobs/{id}/logs`. Job ids are random UUIDs, but treat such a link as
a secret.

Retention and size caps are settings; see
[Configuration](/start/configuration/).

---
title: "ADR 002: Local admin, opaque sessions"
description: "Decision: a single local admin with opaque sessions, bcrypt passwords, and CSRF on browser writes."
sidebar:
  order: 2
---
- Status: accepted
- Date: 2026-08-24

## Context

The configurator can create GitHub Apps' PEMs, Coolify tokens, and the
bindings. The bindings are the list of repositories whose code will execute on
this host. That surface must not be open to anyone who can reach the URL.
GitHub authenticates webhooks with HMAC. That is a different trust boundary.

## Decision

v1 has a single local user. The password is bcrypt (default cost, minimum 12
characters). The first boot uses the setup wizard or
`CI_BOOTSTRAP_ADMIN_PASSWORD`. The wizard asks for the setup token, which the
server prints to the server log at startup. Each client address can make a
maximum of five login attempts in a minute.

Login issues an opaque 32-byte session token. SQLite stores only its SHA-256.

A session has an idle expiry, not a fixed length. It expires 24 hours after the
last request that used it. It also expires 7 days after the server issued it,
with or without activity. The store is the authority. Because the idle
deadline moves forward on use, the cookie carries the 7-day ceiling. A cookie
that outlives its row fails the lookup.

A password change deletes all sessions for that user.

- Browser: `ci_session` HttpOnly cookie, `Secure` behind HTTPS,
  `SameSite=Lax`. A write with a cookie must include a CSRF token (`ci_csrf`
  cookie + form field / `X-CSRF-Token`).
- CLI: the same token as `Authorization: Bearer <token>` from `POST /api/v1/login`.
  Because Bearer callers have no ambient cookie, the server does not check
  CSRF for them.

There are no separate API tokens, no GitHub OAuth for the UI, and no roles.

These routes are public without a session: `GET /health`, `POST /webhook/{slug}`,
and `GET /runs/{id}` with the job logs. The last route is public only if the
binding of that job opted into shareable logs.

## Consequences

- Operators are not coupled to GitHub identity. A stolen GitHub session
  cannot open the configurator.
- A copied cookie or bearer token is useful only while someone continues to use
  it, and never after one week. An operator who signs in each day must
  authenticate again each week. An operator who stops is signed out the next day.
- A password rotation is a working revocation. It invalidates the credentials
  that the server issued before, not only the next login. The browser that
  changed the password gets a new cookie. A CLI with a bearer token signs in again.
- There is one admin. The access model is a shared password.
- Logout must delete the cookie and the Bearer token that the caller gave.
  JSON login does not set a cookie.
- Shareable log links are unguessable UUIDs, but they are secrets if the
  binding opted in.

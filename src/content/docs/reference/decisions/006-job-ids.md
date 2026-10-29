---
title: "ADR 006: Hand-rolled job ids, no UUID dependency"
description: "Decision: generate the UUIDv4 job id in twelve lines of store code, and do not add github.com/google/uuid as a direct dependency."
sidebar:
  order: 6
---
- Status: accepted
- Date: 2026-09-18

## Context

A job id is the path segment of `/runs/{id}`. If a binding opts into shareable
logs, that URL is the full credential. Because of this, the id must be
unguessable. The id comes from `crypto/rand`, never from a sequence
([ADR 002](/reference/decisions/002-authentication/)).

`store.NewJobID` builds a version 4 UUID by hand: 16 random bytes, the version
nibble set to 4, the variant bits to 10, formatted 8-4-4-4-12. That is twelve
lines. `github.com/google/uuid` can replace them with one line.

This ADR records why the project does not use it.

`github.com/google/uuid` is in `go.sum`. It is an **indirect**
requirement of `modernc.org/sqlite`, through `modernc.org/libc`.
`go mod why` shows the chain. Its presence in the module graph does not justify
a call to it. It is there because the dependencies of the SQLite driver chose
it. It goes out of the graph when that chain changes.

## Decision

Keep the hand-written generator in `internal/store/jobs.go`. Do not add
`github.com/google/uuid` to the direct `require` block.

There are three arguments:

- **We use none of the library.** There is no parse, no validation, no
  v1/v5/v7, no comparison, no `encoding.TextUnmarshaler`. The id is generated
  in one function, stored as TEXT, and compared as a string. The value of a
  UUID library is its surface. We want a twelfth of one function of it.
- **Indirect and direct are different commitments.** An indirect dependency is
  one we tolerate. A direct one is ours: to audit, to upgrade, to answer for in
  `SECURITY.md`, for as long as the project lives. The pitch of this project is
  one Go binary and one SQLite file. As a result, the direct `require` block is
  a list that we defend, not a list that we grow.
- **Correctness here is readable.** RFC 4122 §4.4 is the two bit-twiddles in the
  function. `TestNewJobIDIsAVersion4UUID` asserts the layout, the version
  nibble, the variant nibble, and that a thousand draws do not collide. There is
  no edge case that a library will get right for us.

This is not a general rule against dependencies. `golang.org/x/crypto/bcrypt`,
`modernc.org/sqlite`, `gopkg.in/yaml.v3` and `github.com/a-h/templ` are all
direct. Each does something that we cannot check if we read only twelve lines.

## Consequences

- `go.mod` stays as it is. If the SQLite driver no longer depends on
  `github.com/google/uuid`, nothing here breaks.
- The bit-twiddles must have a test, and they have one. With a library, that
  test is not necessary.
- `NewJobID` panics if `crypto/rand` fails, and does not use a fallback. The
  loud failure is the safe one, because a predictable id is a disclosed build log.

## When to revisit

If one of these conditions occurs, add the dependency. Do not make the function
larger.

- job ids must be **parsed or validated** on input, not only generated;
- **UUIDv7** becomes useful, to sort ids by creation time;
- a **third caller** is added. Today there are two: the job id, and the name
  of the temporary workspace that a `/repos/{id}/resolve` dry run clones into.

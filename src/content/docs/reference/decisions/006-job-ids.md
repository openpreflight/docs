---
title: "ADR 006: Hand-rolled job ids, no UUID dependency"
description: "Decision: generate the UUIDv4 job id in twelve lines of store code rather than taking github.com/google/uuid as a direct dependency."
sidebar:
  order: 6
---
- Status: accepted
- Date: 2026-09-18

## Context

A job id is the path segment of `/runs/{id}`. When a binding opts into
shareable logs that URL is the whole credential, so the id has to be
unguessable — it is drawn from `crypto/rand`, never from a sequence
([ADR 002](/reference/decisions/002-authentication/)).

`store.NewJobID` builds a version 4 UUID by hand: 16 random bytes, the version
nibble set to 4, the variant bits to 10, formatted 8-4-4-4-12. That is twelve
lines, and `github.com/google/uuid` would replace them with one.

The question this records is why it has not.

`github.com/google/uuid` is already in `go.sum`. It is an **indirect**
requirement, pulled in by `modernc.org/sqlite` through `modernc.org/libc`.
`go mod why` shows the chain. Its presence in the module graph is therefore not
a reason to call it: it is there because the SQLite driver's dependencies chose
it, and it leaves the graph whenever that chain changes.

## Decision

Keep the hand-written generator in `internal/store/jobs.go`. Do not add
`github.com/google/uuid` to the direct `require` block.

Three reasons:

- **We use none of the library.** There is no parsing, no validating, no
  v1/v5/v7, no comparison, no `encoding.TextUnmarshaler`. The id is generated
  in one function, stored as TEXT, and compared as a string. A UUID library's
  value is its surface; we want a twelfth of one function of it.
- **Indirect and direct are different commitments.** An indirect dependency is
  one we tolerate. A direct one is ours: to audit, to upgrade, to answer for in
  `SECURITY.md`, for as long as the project lives. This project's pitch is one
  Go binary and one SQLite file, so the direct require block is a list we defend
  rather than a list we grow.
- **Correctness here is readable.** RFC 4122 §4.4 is the two bit-twiddles in the
  function. `TestNewJobIDIsAVersion4UUID` asserts the layout, the version
  nibble, the variant nibble, and that a thousand draws do not collide. There is
  no edge case a library would be getting right on our behalf.

This is not a general rule against dependencies. `golang.org/x/crypto/bcrypt`,
`modernc.org/sqlite`, `gopkg.in/yaml.v3` and `github.com/a-h/templ` are all
direct, because each does something we could not check by reading twelve lines.

## Consequences

- `go.mod` stays as it is. If the SQLite driver ever stops pulling
  `github.com/google/uuid`, nothing here breaks.
- The bit-twiddling has to be tested, and is. A library would not have needed
  that test.
- `NewJobID` panics if `crypto/rand` fails, rather than falling back. A
  predictable id is a disclosed build log, so the loud failure is the safe one.

## When to revisit

Take the dependency, rather than growing the function, if any of these arrive:

- job ids need to be **parsed or validated** on input, not just generated;
- **UUIDv7** becomes worth having so ids sort by creation time;
- a **third caller** appears. Today there are two: the job id itself, and the
  name of the throwaway workspace a `/repos/{id}/resolve` dry run clones into.

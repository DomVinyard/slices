# Creating Slices

Create a new slice when knowledge should persist across sessions. Each slice is a `.slice` file saved to `.slices/` at the project root, named by its ID.

## 1. Generate an ID

Use a [ULID](https://github.com/ulid/spec) — 26 characters, Crockford's Base32, lexicographically sortable by creation time.

If you don't have a ULID library, construct one: encode the current timestamp in milliseconds (first 10 chars) + 16 random characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.

## 2. Choose a Lifecycle

| Lifecycle | Use when | Examples |
|-----------|----------|----------|
| `perpetual` | A living document that will be updated over time | Architecture docs, decision logs, team conventions |
| `snapshot` | A point-in-time capture that should never change | Retrospectives, post-mortems, release notes |
| `ephemeral` | Temporary context that will expire | Debug sessions, active investigations, sprint notes |

### Decision tree

```
Is this temporary context?
├── Yes → lifecycle: ephemeral (set expires_at)
└── No
    ├── Will this be updated over time?
    │   ├── Yes → lifecycle: perpetual (set stale_after)
    │   └── No → lifecycle: snapshot (write: immutable)
    └── Is this generated from other slices?
        └── Yes → set derived_from with source hash
```

## 3. Write Retrieval-Optimized Metadata

The `summary` is the most important discovery field. Write it as a search result snippet — front-load the specific terms someone would search for.

**Good:** `"PostgreSQL read replica configuration with pgBouncer connection pooling, failover setup, monitoring via pg_stat_replication"`

**Bad:** `"Database configuration notes"`

### Topics vs Tags

**Tags** are organizational bins: `[architecture, backend, security]`. Use for broad categorization.

**Topics** are the specific things this slice is about: `[PostgreSQL, pgBouncer, read-replicas, connection-pooling]`. Use for keyword matching. An agent searching for "pgBouncer" matches on topics without reading the body.

Together with the summary, agents get three complementary discovery vectors:
- Natural language → `summary`
- Keyword → `topics`
- Categorical → `tags`

## 4. Set Validity

Choose based on lifecycle:

- **Perpetual slices**: set `validity.stale_after` (e.g., `90d`, `2w`, `6m`)
- **Ephemeral slices**: set `validity.expires_at` to an ISO 8601 timestamp
- **Snapshot slices**: usually no validity configuration needed — they're immutable
- **Derived slices**: set `derived_from.id`, `derived_from.hash`, and optionally `validity.depends_on`

Duration format: number + unit — `24h`, `90d`, `2w`, `6m`, `1y`.

## 5. Write the File

Save to `.slices/{id}.slice`. The full file is YAML frontmatter between `---` markers, followed by the body content.

```yaml
---
v: "0.2"
id: 01JARCH00000000000000001
title: Authentication Architecture
summary: JWT-based stateless auth with refresh token rotation, RS256 signing, rate-limited login
tags: [architecture, backend, security]
topics: [JWT, OAuth2, refresh-tokens, RS256, rate-limiting]
lifecycle: perpetual
created_at: "2026-01-15T10:00:00Z"
updated_at: "2026-01-15T10:00:00Z"
validity:
  status: fresh
  stale_after: 90d
scope: project
audience: both
kind: context
body:
  type: markdown
write: replace
contract:
  purpose: Authentication architecture and design decisions
  exclude: [API endpoint details, credential values]
  format: Document design decisions with rationale. Update when architecture changes.
---

# Authentication Architecture

The system uses JWT tokens for stateless authentication...
```

## 6. Update the Index

If a project index slice exists (`kind: index`), add a line for the new slice:

```markdown
- **01JARCH001** — Authentication Architecture (JWT, OAuth2, refresh tokens)
```

If no index exists and the project has more than a few slices, create one with `kind: index` and `write: replace`.

## When to Create a Slice

**Do create** when:
- A decision is made that should persist across sessions
- Architecture or design context emerges that future agents will need
- The user explicitly asks to remember something
- You're investigating a bug and accumulating useful context
- A meeting or review produces knowledge worth preserving

**Do not create** when:
- The information is trivially available in the codebase itself
- It's a temporary thought better suited to the conversation
- The information will be immediately outdated
- A relevant slice already exists — update it instead

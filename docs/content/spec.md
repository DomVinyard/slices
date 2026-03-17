# Slices Specification v0.2

A slice is a file-based unit of context for AI agents. Each slice is a `.slice` file containing YAML frontmatter and a body. The frontmatter describes what the slice is, when it was created, whether it's still valid, who it's for, and how it should be maintained. The body contains the actual content.

Slices are designed to be read and written directly by LLMs. No special tooling is required. An agent that can read and write files can work with slices.

---

## File Structure

A `.slice` file has two parts:

1. **Frontmatter** — YAML between `---` markers
2. **Body** — everything after the closing `---`

```yaml
---
v: "0.2"
id: 01JARCH00000000000000001
title: Authentication Architecture
summary: JWT-based stateless auth with refresh token rotation, RS256 signing, rate-limited login
tags: [architecture, backend]
topics: [JWT, OAuth2, refresh-tokens, RS256, rate-limiting]
lifecycle: perpetual
created_at: "2026-01-15T10:00:00Z"
updated_at: "2026-03-10T14:30:00Z"
validity:
  status: fresh
  stale_after: 90d
scope: project
audience: both
kind: context
body:
  type: markdown
write: replace
---

# Authentication Architecture

The system uses JWT tokens for stateless authentication...
```

No namespace prefix. All top-level YAML keys are slice keys. The `.slice` extension identifies the format.

---

## Frontmatter Schema

### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | string | yes | Spec version. `"0.2"` |
| `id` | string | yes | Globally unique identifier. ULID recommended (sortable by creation time, URL-safe, 26 chars). |
| `title` | string | yes | Clear, descriptive name for browsing and search. |
| `summary` | string | yes | Retrieval-optimized description. See [Writing Summaries](#writing-summaries). |
| `tags` | string[] | no | Organizational labels for categorical filtering. |
| `topics` | string[] | no | Key entities, concepts, and terms this slice covers. See [Discovery](#discovery). |

#### Writing Summaries

The summary is the most important discovery field. Write it as a search result snippet — front-load the key terms someone would search for. Include specific names, technologies, patterns, and decisions.

**Good:** `"JWT-based stateless authentication with refresh token rotation, RS256 signing, rate-limited login"`

**Bad:** `"Notes about how authentication works in our system"`

The summary should let an agent decide whether to read the body without opening the file.

#### Topics vs Tags

Tags are organizational bins: `[architecture, backend, security]`. Use them for broad categorization.

Topics are the specific things this slice is about: `[JWT, OAuth2, refresh-tokens, RS256, rate-limiting]`. Use them for keyword matching. An agent searching for "refresh tokens" matches on topics without reading the body.

Together with the summary, agents get three complementary discovery vectors: natural language (summary), keyword (topics), categorical (tags).

### Temporality

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lifecycle` | enum | yes | Temporal nature of this slice. |
| `created_at` | ISO 8601 | yes | When this slice was created. |
| `updated_at` | ISO 8601 | yes | When this slice was last modified. |

#### Lifecycle Types

**`perpetual`** — Living document. Continuously maintained. Updated over time. Becomes stale if not maintained. Examples: architecture overview, decision log, team conventions.

**`snapshot`** — Point-in-time capture. Immutable after creation. Represents truth *at that moment*. Implies `write: immutable`. Examples: sprint retrospective, incident post-mortem, release notes.

**`ephemeral`** — Temporary context. Expected to expire and be cleaned up. Should have `validity.expires_at` set. Examples: current debugging session, active investigation notes, temporary workaround documentation.

### Validity

The validity block declares how and when a slice becomes invalid. This is how agents determine whether to trust the content.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `validity.status` | enum | no | `fresh`, `stale`, `expired`, or `unknown`. Current validity state. |
| `validity.expires_at` | ISO 8601 \| null | no | Hard expiry timestamp. After this, the slice is expired. `null` means never. |
| `validity.stale_after` | duration | no | Duration after `updated_at` before the slice is considered stale. Examples: `90d`, `24h`, `2w`, `6m`. |
| `validity.depends_on` | array | no | Source slices that, if changed, invalidate this slice. |
| `validity.depends_on[].id` | string | — | Source slice ID. |
| `validity.depends_on[].hash` | string | — | Content hash of the source at the time this slice was last validated. Format: `sha256:...` |
| `validity.triggers` | string[] | no | Named events that invalidate this slice. Examples: `deploy`, `schema-change`, `sprint-end`. |
| `validity.checked_at` | ISO 8601 | no | When an agent last verified this slice's validity. |

#### Duration Format

Durations use a simple format: a number followed by a unit.

| Unit | Meaning | Example |
|------|---------|---------|
| `h` | hours | `24h` |
| `d` | days | `90d` |
| `w` | weeks | `2w` |
| `m` | months | `6m` |
| `y` | years | `1y` |

#### Staleness Model

For perpetual slices, staleness is time-based. A slice with `stale_after: 90d` that was last updated 100 days ago is stale.

For derived slices (those with `derived_from`), staleness is hash-based. If the source content's hash no longer matches `derived_from.hash`, the derived slice is stale and should be regenerated.

Event-based invalidation uses `validity.triggers`. When a named event occurs (e.g., a deploy), all slices listing that trigger should be reviewed.

Agents should update `validity.status` and `validity.checked_at` when they verify a slice.

### Scope

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | enum | no | `personal`, `project`, or `team`. Defaults to `project`. |
| `owner` | string | no | Who maintains this slice. |
| `audience` | enum | no | `agent`, `human`, or `both`. Defaults to `both`. |

**`personal`** — Belongs to one agent or user. Not shared. Lives in a personal context directory, not the project's `.slices/`.

**`project`** — Shared within this project. Lives in `.slices/` at the project root.

**`team`** — Shared across projects for a team. Lives in a shared location.

**`audience: agent`** — Optimized for agent consumption. May use terse formatting, structured data, or conventions that assume an LLM reader.

**`audience: human`** — Written for human readers. Agents may still read it but should be aware the formatting choices target humans.

### Content

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | enum | no | `context`, `pointer`, or `index`. Defaults to `context`. |
| `body.type` | enum | yes | Content format of the body. |
| `body.code.lang` | string | no | Language identifier when `body.type` is `code`. |
| `body.code.extension` | string | no | File extension when `body.type` is `code`. |

#### Kind

**`context`** — Content is in the body. Read it directly.

**`pointer`** — Content is elsewhere. The body is empty or contains a brief note. See `payload` for where the content lives. Use for large files that shouldn't be loaded into an agent's context.

**`index`** — A table of contents or navigation hub. The body lists and briefly describes other slices, with links. Agents should look for index slices first when entering an unfamiliar `.slices/` directory.

#### Body Types

| Type | Description |
|------|-------------|
| `markdown` | Rich text with markdown formatting. The default. |
| `jsonl` | Newline-delimited JSON. One object per line. |
| `text` | Plain text without formatting. |
| `code` | Source code. Specify `body.code.lang`. |
| `yaml` | Structured YAML data. |
| `none` | No body content. Used with `kind: pointer`. |

### Mutation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `write` | enum | no | How this slice should be modified. Defaults to `append`. |
| `overflow` | enum | no | What to do when the slice gets too large. |

#### Write Modes

**`append`** — Add new content at the end. Never edit existing content. Good for logs, decision records, chronological entries.

**`replace`** — Overwrite the body entirely. Good for living documents where the whole thing should be current.

**`immutable`** — Do not modify. Implied by `lifecycle: snapshot`. The slice is frozen.

#### Overflow Strategies

**`split`** — Break into multiple slices (e.g., by date range or topic).

**`summarize`** — Compress older content into summaries, keep recent content intact.

**`archive`** — Move old content to a separate archival slice.

**`error`** — Refuse to write. Signal the problem to the user.

### Contract

The contract tells agents how to use this slice. All fields are natural language instructions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contract.purpose` | string | no | What content belongs in this slice. |
| `contract.exclude` | string[] | no | What does NOT belong. |
| `contract.format` | string | no | How to structure content (e.g., "One decision per section with rationale and date"). |
| `contract.cleanup` | string | no | Maintenance rules (e.g., "Archive entries older than 1 year"). |

### Provenance

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `origin.source` | enum | no | How the content was acquired. |
| `origin.agent` | string | no | Which agent or user created this. |
| `origin.confidence` | number | no | 0–1 reliability score. |
| `origin.context` | string | no | Why this slice was created. |

#### Source Types

| Source | Description |
|--------|-------------|
| `user-stated` | User explicitly said this. Highest reliability. |
| `inferred` | Agent inferred this from context. |
| `observed` | Agent observed this from code, logs, or behavior. |
| `generated` | Agent generated this (summary, compilation, etc.). |
| `imported` | Imported from an external system. |

### Derivation

For slices that are generated or computed from other slices.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `derived_from.id` | string | no | Source slice ID. |
| `derived_from.hash` | string | no | Source content hash at derivation time. Format: `sha256:...` |
| `derived_from.transform` | string | no | What was done: `summarize`, `extract`, `compile`, `aggregate`. |

When the source slice changes (hash no longer matches), the derived slice is stale and should be regenerated.

### Pointer Payload

For `kind: pointer` slices where content lives elsewhere.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.uri` | string | no | Where the content lives. Path or URL. |
| `payload.hash` | string | no | Content integrity hash. |
| `payload.size` | number | no | Size in bytes. |

### Links

Typed relationships to other slices. The `rel` field is a freeform string — use whatever relationship makes sense. The recommended types below cover common patterns.

```yaml
links:
  - rel: depends_on
    to: 01JOTHER00000000000000002
    label: Auth service design
  - rel: supersedes
    to: 01JOLD0000000000000000001
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `links[].rel` | string | yes | Relationship type. |
| `links[].to` | string | yes | Target slice ID or relative path. |
| `links[].label` | string | no | Human-readable description of the link. |

#### Recommended Relationship Types

| Relationship | Inverse | Description |
|-------------|---------|-------------|
| `depends_on` | `blocks` | A depends on B / B blocks A |
| `supersedes` | `superseded_by` | A replaces B / B was replaced by A |
| `parent` | `child` | A contains B / B is inside A |
| `part_of` | `has_part` | A is a component of B / B has component A |
| `derived_from` | `source_of` | A was derived from B / B is the source of A |
| `evidence_for` | `evidence_against` | A supports B / A contradicts B |
| `see_also` | `see_also` | Loose bidirectional association |
| `routes_to` | `routed_from` | A routes content to B (used with contract.exclude) |

These are recommendations, not constraints. Agents should use whatever `rel` string best describes the relationship.

### Extension

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `meta` | object | no | Arbitrary user-defined key-value pairs. |

Use `meta` for anything not covered by the schema: `priority`, `sprint`, `reviewer`, custom labels, tool-specific data.

---

## Discovery

Slices must be discoverable without reading every body. The frontmatter is the discovery index.

### Discovery Protocol

1. **Look for index slices** — slices with `kind: index` serve as tables of contents. Start here.
2. **Scan frontmatter** — read the YAML between `---` markers of each `.slice` file. Skip the body.
3. **Match** — compare your query against `summary` (natural language), `topics` (keywords), and `tags` (categories).
4. **Filter** — skip slices that are `expired`, wrong `scope`, wrong `audience`, or wrong `lifecycle` for your need.
5. **Follow links** — once you find a relevant slice, follow its `links` to discover related slices.

### Index Slices

Every project should have at least one index slice. It serves as the entry point:

```yaml
---
v: "0.2"
id: 01JINDEX0000000000000001
title: Project Knowledge Index
summary: Table of contents for all project slices. Start here.
tags: [index]
topics: [navigation, discovery, table-of-contents]
lifecycle: perpetual
created_at: "2026-01-01T00:00:00Z"
updated_at: "2026-03-17T00:00:00Z"
validity:
  status: fresh
  stale_after: 30d
scope: project
audience: agent
kind: index
body:
  type: markdown
write: replace
---

# Project Knowledge Index

## Architecture
- **01JARCH001** — Authentication Architecture (JWT, OAuth2, refresh tokens)
- **01JARCH002** — Database Schema (PostgreSQL, migrations, JSONB patterns)
- **01JARCH003** — API Design (REST, versioning, error handling)

## Decisions
- **01JDEC001** — Architecture Decision Log (append-only, 23 entries)

## Operations
- **01JOPS001** — Deployment Runbook (CI/CD, staging, production)
- **01JOPS002** — Incident Response Playbook

## Current
- **01JSPRINT01** — Sprint 14 Context (ephemeral, expires 2026-03-28)
```

---

## Storage

Slices are stored flat in a `.slices/` directory at the project root, named by ID:

```
.slices/
  01JARCH00000000000000001.slice
  01JDEC000000000000000001.slice
  01JINDEX0000000000000001.slice
  01JRETRO0000000000000001.slice
```

No nested directories. No semantic folder structure. The frontmatter (title, summary, tags, topics, links) provides all navigation. The flat structure keeps things simple for both agents and tools.

### Personal Slices

Personal slices (`scope: personal`) live outside the project, in a user-specific location. The convention is `~/.slices/` but agents should adapt to the environment.

---

## Identifiers

Use [ULIDs](https://github.com/ulid/spec) for IDs:

- 26 characters, Crockford's Base32: `01ARZ3NDEKTSV4RRFFQ69G5FAV`
- Lexicographically sortable (timestamp prefix)
- URL-safe (no special characters)
- Globally unique (no coordination needed)
- Monotonically increasing within the same millisecond

Agents generating ULIDs can use any method: a ULID library, a timestamp-based approach, or even a reasonable approximation. The important properties are uniqueness and rough time-ordering.

---

## JSONL Bodies

For slices with `body.type: jsonl`, each line is a self-contained JSON object.

### Row Envelope

Every row should have a `_meta` field with at least an `id` and `created_at`:

```json
{"_meta": {"id": "01JROW001", "created_at": "2026-02-02T12:00:00Z"}, "text": "Use PostgreSQL for primary storage."}
```

### Supersession

To update a row without editing in place, append a new row with `_meta.supersedes`:

```json
{"_meta": {"id": "01JROW001", "created_at": "2026-02-02T12:00:00Z"}, "text": "Use PostgreSQL for primary storage."}
{"_meta": {"id": "01JROW002", "created_at": "2026-02-10T09:00:00Z", "supersedes": ["01JROW001"]}, "text": "Use PostgreSQL with read replicas for primary storage."}
```

The active version is the newest in the supersession chain. This preserves history and makes concurrent writes safe.

---

## Complete Examples

### Perpetual: Architecture Document

```yaml
---
v: "0.2"
id: 01JARCH00000000000000001
title: Authentication Architecture
summary: JWT-based stateless auth with refresh token rotation, RS256 signing, rate-limited login, session management via Redis
tags: [architecture, backend, security]
topics: [JWT, OAuth2, refresh-tokens, RS256, rate-limiting, Redis, session-management]
lifecycle: perpetual
created_at: "2026-01-15T10:00:00Z"
updated_at: "2026-03-10T14:30:00Z"
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
  exclude: [API endpoint details, security audit findings, credential values]
  format: Document design decisions with rationale. Update when architecture changes.
origin:
  source: user-stated
  agent: cursor
  confidence: 0.95
links:
  - rel: depends_on
    to: 01JAPI000000000000000002
    label: API gateway configuration
  - rel: see_also
    to: 01JSEC000000000000000001
    label: Security audit findings
---

# Authentication Architecture

The system uses JWT tokens for stateless authentication.

## Token Flow

1. User submits credentials to `/auth/login`
2. Server validates and returns access + refresh tokens
3. Access token expires in 15 minutes
4. Refresh token rotates on each use

## Security

- Tokens signed with RS256
- Refresh tokens stored hashed in Redis
- Rate limiting after 5 failed attempts
```

### Snapshot: Sprint Retrospective

```yaml
---
v: "0.2"
id: 01JRETRO0000000000000001
title: Sprint 12 Retrospective
summary: Sprint 12 retro — auth system shipped on time, flaky CI was the biggest blocker, need to invest in test infrastructure
tags: [retro, sprint-12, process]
topics: [sprint-retrospective, CI-pipeline, test-infrastructure, auth-system-launch]
lifecycle: snapshot
created_at: "2026-03-14T16:00:00Z"
updated_at: "2026-03-14T16:00:00Z"
validity:
  expires_at: "2026-09-14T00:00:00Z"
scope: team
audience: both
kind: context
body:
  type: markdown
write: immutable
origin:
  source: observed
  agent: cursor
  context: Captured during team retrospective meeting
---

# Sprint 12 Retrospective

## What went well
- Auth system shipped on schedule
- Good cross-team collaboration on token rotation design

## What didn't
- CI pipeline flaky — 3 days lost to intermittent failures
- No staging environment for auth testing

## Action Items
- [ ] Invest in test infrastructure (owner: platform team)
- [ ] Set up auth staging environment (owner: backend team)
```

### Ephemeral: Debugging Session

```yaml
---
v: "0.2"
id: 01JDEBUG0000000000000001
title: Auth Token Refresh Bug
summary: Investigating token refresh failure on mobile — refresh tokens expiring prematurely, suspect Redis TTL misconfiguration
tags: [debugging, active]
topics: [token-refresh, Redis-TTL, mobile-auth, bug-investigation]
lifecycle: ephemeral
created_at: "2026-03-17T09:00:00Z"
updated_at: "2026-03-17T11:30:00Z"
validity:
  expires_at: "2026-03-18T09:00:00Z"
scope: personal
audience: agent
kind: context
body:
  type: markdown
write: append
origin:
  source: observed
  agent: cursor
  context: User reported mobile auth failures, investigating
---

# Auth Token Refresh Bug

## Symptoms
- Mobile users getting logged out after ~5 minutes
- Desktop users unaffected
- Started after deploy on 2026-03-16

## Investigation
- Redis TTL for refresh tokens set to 300s (should be 86400s)
- Looks like deploy config override is wrong
- Check `config/redis.yml` production values
```

### Derived: Generated Summary

```yaml
---
v: "0.2"
id: 01JSUM000000000000000001
title: Q1 2026 Architecture Decision Summary
summary: Auto-generated summary of 23 architecture decisions from Q1 2026 — covers database, auth, API design, caching, and deployment choices
tags: [summary, decisions, q1-2026]
topics: [architecture-decisions, PostgreSQL, JWT, REST-API, Redis, Docker, CI-CD]
lifecycle: perpetual
created_at: "2026-04-01T00:00:00Z"
updated_at: "2026-04-01T00:00:00Z"
validity:
  status: fresh
  depends_on:
    - id: 01JDEC000000000000000001
      hash: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  stale_after: 7d
scope: project
audience: both
kind: context
body:
  type: markdown
write: replace
derived_from:
  id: 01JDEC000000000000000001
  hash: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  transform: summarize
origin:
  source: generated
  agent: cursor
  confidence: 0.85
  context: Quarterly summary generation
---

# Q1 2026 Architecture Decisions

**23 decisions** recorded from January to March 2026.

## Key Themes
1. **Database**: PostgreSQL with read replicas, JSONB for flexible schemas
2. **Auth**: JWT with RS256, refresh token rotation, Redis session store
3. **API**: REST with versioned endpoints, consistent error format
4. **Infrastructure**: Docker compose for local, Kubernetes for production
```

### Pointer: Large Dataset

```yaml
---
v: "0.2"
id: 01JDUMP0000000000000001
title: 2025 Conversation Logs
summary: Raw conversation logs from 2025. 2.3GB compressed. 147K conversations. Use the derived summary (01JSUM002) for analysis.
tags: [data, conversations, 2025]
topics: [conversation-logs, raw-data, customer-support, 2025-archive]
lifecycle: snapshot
created_at: "2026-01-02T00:00:00Z"
updated_at: "2026-01-02T00:00:00Z"
scope: project
audience: agent
kind: pointer
body:
  type: none
write: immutable
payload:
  uri: ./data/conversations-2025.json.gz
  hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  size: 2469606195
links:
  - rel: source_of
    to: 01JSUM000000000000000002
    label: Derived conversation summary
---
```

### Index: Project Knowledge Hub

```yaml
---
v: "0.2"
id: 01JINDEX0000000000000001
title: Acme Project Knowledge Index
summary: Master index of all project knowledge slices. Architecture, decisions, operations, and current sprint context.
tags: [index]
topics: [navigation, project-overview, table-of-contents]
lifecycle: perpetual
created_at: "2026-01-01T00:00:00Z"
updated_at: "2026-03-17T00:00:00Z"
validity:
  status: fresh
  stale_after: 14d
scope: project
audience: agent
kind: index
body:
  type: markdown
write: replace
contract:
  purpose: Master index of all project slices. Update when slices are added or removed.
  format: Group by category. One line per slice with ID, title, and brief note.
---

# Acme Project — Knowledge Index

## Architecture
- **01JARCH001** — Authentication Architecture (JWT, OAuth2, refresh tokens)
- **01JARCH002** — Database Schema (PostgreSQL, migrations, JSONB)
- **01JARCH003** — API Design (REST, versioning, error handling)

## Decisions
- **01JDEC001** — Architecture Decision Log (23 entries, append-only)
- **01JSUM001** — Q1 Decision Summary (derived, auto-generated)

## Operations
- **01JOPS001** — Deployment Runbook (CI/CD, staging, production)
- **01JOPS002** — Incident Response (playbook, escalation paths)

## Data
- **01JDUMP001** — 2025 Conversation Logs (pointer, 2.3GB)

## Current Sprint
- **01JSPRINT01** — Sprint 14 Context (ephemeral, expires 2026-03-28)
- **01JDEBUG001** — Auth Token Refresh Bug (ephemeral, active investigation)
```

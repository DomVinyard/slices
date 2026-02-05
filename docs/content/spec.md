# Specification

Slices v1 format specification.

---

## File Structure

A `.slice` file has two parts:

1. **Frontmatter** — YAML between `---` markers, containing all metadata
2. **Body** — content after the frontmatter

```
---
slice:
  v: "1"
  id: 01JEXAMPLE000000000000001
  title: Example file
  summary: A brief description for browsing and retrieval.
  body:
    type: markdown
---

Body content goes here.
```

All metadata lives under the `slice:` namespace. This makes it easy to strip frontmatter before passing content to an LLM.

## File Kinds

Every file has a `kind` that determines how it should be treated:

### Context

Content is here. Read it directly.

```yaml
slice:
  kind: context
  body:
    type: markdown
```

Context slices contain the actual knowledge—in any supported body type (markdown, jsonl, text, code, conversation, yaml, or routine). They're sized to be readable by agents and humans.

**Example: Authentication Architecture**

```yaml
---
slice:
  v: "1"
  kind: context
  id: 01JARCH00000000000000001
  title: Authentication architecture
  summary: How authentication works in the system. JWT-based, stateless, with refresh token rotation.
  body:
    type: markdown
  contract:
    purpose: "Authentication architecture and design decisions."
    exclude:
      - "API endpoint details"
      - "security audit findings"
    format: "Document design decisions with rationale."
    write: replace
    overflow: summarize
  links:
    - rel: depends_on
      to: 01JAPI000000000000000002
    - rel: routes_to
      to: ./api-reference.slice
      label: "API endpoint details"
    - rel: routes_to
      to: ./security/
      label: "Security audit findings"
---

# Authentication Architecture

The system uses JWT tokens for stateless authentication.

## Token Flow

1. User submits credentials to `/auth/login`
2. Server validates and returns access + refresh tokens
3. Access token expires in 15 minutes
4. Refresh token rotates on each use

## Security Considerations

- Tokens are signed with RS256
- Refresh tokens are stored hashed in the database
- Failed login attempts trigger rate limiting after 5 attempts
```

### Pointer

Content is elsewhere. This is just the handle.

```yaml
slice:
  kind: pointer
  body:
    type: none
  payload:
    uri: ./large-file.json.gz
    hash: sha256:a1b2c3...
    size: 10485760
```

Pointer files never contain the payload. They have a title, summary, and metadata that make the payload discoverable and navigable without loading it. This solves the "10GB problem"—agents see the summary, not the raw data.

**Example: Large Payload**

```yaml
---
slice:
  v: "1"
  kind: pointer
  id: 01JDUMP00000000000000001
  title: Conversation history dump
  summary: Raw conversation logs from 2025. 2.3GB compressed. Use representations for analysis.
  body:
    type: none
  payload:
    uri: ./payloads/conversations-2025.json.gz
    hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    size: 2469606195
  contract:
    purpose: "Immutable raw data. Do not edit. Create new pointer for new dumps."
    write: error
  links:
    - rel: parent
      to: 01JDATA00000000000000001
---
```

Agents see the summary ("2.3GB compressed, use representations") and never accidentally try to load the payload.

## Required Fields

Every `.slice` file must have:

| Field          | Type   | Description                                                            |
| -------------- | ------ | ---------------------------------------------------------------------- |
| `slice.v`         | string | Format version (`"1"`)                                                 |
| `slice.id`        | string | Stable identifier (ULID recommended)                                   |
| `slice.title`     | string | Display label for browsing                                             |
| `slice.summary`   | string | 1-2 sentences for discovery                                            |
| `slice.body.type` | enum   | `markdown`, `jsonl`, `none`, `code`, `conversation`, `text`, `yaml`, or `routine` |

The ID is independent of the file path. Files can be renamed or moved without breaking links.

## Contract

The contract tells agents how to use this file. Contracts are purely instructional—they define what belongs, how to format content, and how to maintain the file. For routing content elsewhere, use links with the `routes_to` relationship.

```yaml
slice:
  contract:
    purpose: "Architecture decisions with rationale. One decision per entry."
    exclude:
      - "implementation details"
      - "meeting notes"
    format: "One decision per section. Include rationale and date."
    cleanup: "Archive entries older than 1 year. Summarize quarterly."
    write: append
    overflow: split
  links:
    - rel: routes_to
      to: ./implementation.slice
      label: "Implementation details"
    - rel: routes_to
      to: ./meetings/
      label: "Meeting notes"
```

### Purpose

A sentence describing what belongs in this file. Agents use this to decide whether new information should go here or somewhere else.

### Exclude

A list of topics that don't belong in this file. Agents should route these topics elsewhere. Use links with `rel: routes_to` to specify where excluded topics should go.

### Format

Guidelines for content structure. Examples:

- `"One decision per section. Include rationale and date."`
- `"JSONL rows must have timestamp and author fields."`
- `"Keep entries under 500 words."`

### Cleanup

Rules for maintenance and archival. Examples:

- `"Archive entries older than 1 year."`
- `"Summarize when over 100 entries."`
- `"Delete superseded entries after 30 days."`

**Example: Contract with Routing**

```yaml
---
slice:
  v: "1"
  kind: context
  id: 01JPROJ0000000000000001
  title: Project overview
  summary: High-level project context. What we're building and why.
  body:
    type: markdown
  contract:
    purpose: "Project goals, scope, and non-technical context."
    exclude:
      - "technical architecture"
      - "implementation decisions"
      - "API documentation"
      - "meeting notes"
      - "task tracking"
    format: "High-level narrative. Update when scope changes."
    cleanup: "Review quarterly. Archive outdated sections."
    write: replace
    overflow: summarize
  links:
    - rel: routes_to
      to: 01JARCH00000000000000001
      label: "Technical architecture"
    - rel: routes_to
      to: 01JDEC000000000000000001
      label: "Implementation decisions"
    - rel: routes_to
      to: ./api/
      label: "API documentation"
    - rel: routes_to
      to: ./meetings/
      label: "Meeting notes"
---
# Project Overview

Building a customer support platform that scales.
```

The contract's `exclude` list tells agents what topics don't belong here. The `routes_to` links tell them where to put that content instead.

### Write

How to modify this file:

- `append` — add new entries, never edit existing
- `replace` — overwrite content entirely
- `supersede` — append new entries that mark old ones as superseded

### Overflow

What to do when the file gets too large:

- `split` — break into multiple files (e.g., by date)
- `summarize` — compress old content into summaries
- `archive` — move old content to archival storage
- `error` — refuse to write, signal the problem

## Links

Files can link to other files with typed relationships:

```yaml
slice:
  links:
    - rel: depends_on
      to: 01JOTHER00000000000000002
    - rel: evidence_for
      to: ./claims.slice
```

### Relationship Types

Slices provides typed relationships with defined semantic properties:

| Relationship   | Inverse            | Transitive | Symmetric | Use Case              |
| -------------- | ------------------ | ---------- | --------- | --------------------- |
| `depends_on`   | `blocks`           | Yes        | No        | Dependency graphs     |
| `evidence_for` | `evidence_against` | No         | No        | Argumentation         |
| `supersedes`   | `superseded_by`    | Yes        | No        | Knowledge evolution   |
| `parent`       | `child`            | Yes        | No        | Containment hierarchy |
| `part_of`      | `has_part`         | Yes        | No        | Composition           |
| `is_a`         | `type_of`          | Yes        | No        | Taxonomy              |
| `derived_from` | `source_of`        | Yes        | No        | Provenance            |
| `see_also`     | `see_also`         | No         | Yes       | Loose association     |
| `routes_to`    | `routed_from`      | No         | No        | Content routing       |

#### Relationship Categories

**Dependency Graph**

- `depends_on` — A depends on B (A needs B to function)
- `blocks` — A blocks B (B cannot proceed until A is resolved)

**Argumentation**

- `evidence_for` — A supports the claim in B
- `evidence_against` — A contradicts or weakens B

**Evolution**

- `supersedes` — A replaces B (newer version)
- `superseded_by` — A was replaced by B (older version)

**Hierarchy (Containment)**

- `parent` — A contains B (B is inside A)
- `child` — A is contained by B (A is inside B)

**Composition**

- `part_of` — A is a component of B
- `has_part` — A contains component B

**Taxonomy**

- `is_a` — A is a type/instance of B
- `type_of` — A is a category that includes B

**Derivation**

- `derived_from` — A was generated/computed from B
- `source_of` — A is the source material for B

**Loose Association**

- `see_also` — A is related to B (bidirectional)

**Routing**

- `routes_to` — A routes content to B (used with contract.exclude to tell agents where to put excluded content)
- `routed_from` — A receives routed content from B (inverse of routes_to)

#### Relationship Properties

**Transitive** relationships allow inference through chains:

```
A depends_on B, B depends_on C → A depends_on C (inferred)
A is_a B, B is_a C → A is_a C (inferred)
```

**Symmetric** relationships work both ways:

```
A see_also B → B see_also A (inferred)
```

Use the `--infer` flag with `tt explore` to include inferred relationships:

```bash
tt explore 01JCOMPONENT001 --rel type_of --infer
# Returns direct AND inferred type_of relationships
```

### Addressing

Links can target by:

- **ID** — `01JEXAMPLE000000000000001`
- **Path** — `./other-file.slice` or `../sibling/file.slice`

IDs are preferred for stability. Paths are convenient for humans reading the raw file.

## Derived Files

A file derived from another (like a summary) declares its source:

```yaml
slice:
  kind: context
  derived_from:
    id: 01JORIGINAL0000000000001
    hash: sha256:a1b2c3...
```

The `hash` field enables mechanical freshness checking. If the source's hash changes, the derived file is stale and should be regenerated.

**Example: Derived Summary**

```yaml
---
slice:
  v: "1"
  kind: context
  id: 01JSUM000000000000000001
  title: Conversation dump - summary
  summary: Key themes and statistics from the 2025 conversation logs.
  body:
    type: markdown
  derived_from:
    id: 01JDUMP00000000000000001
    hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  contract:
    purpose: "Auto-generated summary. Regenerate if source changes."
    write: replace
---

# Conversation Summary (2025)

**Total conversations:** 147,832
**Date range:** 2025-01-01 to 2025-12-31
**Average length:** 12 turns

## Top Themes

1. Technical support (34%)
2. Account management (28%)
3. Feature requests (19%)
4. Billing questions (12%)
5. Other (7%)
```

## Staleness

Slices supports two types of staleness detection:

### Hash-Based Staleness

For derived files, staleness is detected by comparing the stored hash against the current source hash. This is mechanical and precise—if the hash doesn't match, the derived file needs regeneration.

### Time-Based Staleness

Knowledge can also become stale over time, even if no source file changed. A 6-month-old architecture decision might be obsolete.

Time-based staleness uses a decay model:

```typescript
staleness = 1 - Math.pow(0.5, daysSinceUpdate / halfLife);
```

With a 90-day half-life:

- 0 days: 0% stale (fully fresh)
- 45 days: 29% stale
- 90 days: 50% stale
- 180 days: 75% stale

Tools can filter or annotate results by staleness:

```
tt search "authentication"
  01JABC (auth-design)     [FRESH - 2 days ago]
  01JDEF (auth-decisions)  [STALE - 3 months ago] ⚠️
```

## Provenance (Optional)

Rows can track where knowledge came from:

```json
{
  "_meta": {
    "id": "01JROW001",
    "created_at": "2026-02-02T12:00:00Z",
    "provenance": {
      "agent": "cursor-session-abc123",
      "session": "ec95c277-7cbf-...",
      "source": "user-statement",
      "confidence": 0.9,
      "context": "User explicitly stated during architecture review"
    }
  },
  "text": "The API uses GraphQL"
}
```

Provenance fields:

| Field        | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `agent`      | Agent or user that created this                                     |
| `session`    | Session ID for tracing                                              |
| `source`     | How knowledge was acquired (user-statement, inference, observation) |
| `confidence` | 0-1 reliability score                                               |
| `context`    | Human-readable explanation                                          |

Provenance is opt-in. When enabled, all write operations automatically capture session context.

## Body Types

### Markdown

Rich text content with standard markdown formatting.

```yaml
slice:
  body:
    type: markdown
```

### JSONL

Structured data with one JSON object per line.

```yaml
slice:
  body:
    type: jsonl
```

**Example: Decisions Log**

```yaml
---
slice:
  v: "1"
  kind: context
  id: 01JDEC000000000000000001
  title: Architecture decisions
  summary: Log of architecture decisions with rationale and evidence.
  body:
    type: jsonl
  contract:
    purpose: "Architecture decisions with rationale and evidence."
    exclude:
      - "implementation details"
      - "meeting notes"
    format: "One decision per entry. Include rationale and evidence links."
    cleanup: "Review stale decisions quarterly."
    write: append
    overflow: split
  links:
    - rel: routes_to
      to: ./implementation/
      label: "Implementation details"
    - rel: routes_to
      to: ./meetings/
      label: "Meeting notes"
---
{"_meta":{"id":"01JROW00000000000000001","created_at":"2026-01-15T10:00:00Z","confidence":0.9,"provenance":{"author":"dom","method":"design_review"}},"text":"Use PostgreSQL for primary data storage.","rationale":"Team expertise, JSONB support, proven scale.","links":[{"rel":"evidence_for","to":"01JREQ00000000000000001"}]}
{"_meta":{"id":"01JROW00000000000000002","created_at":"2026-01-20T14:30:00Z","confidence":0.85,"provenance":{"author":"alex","method":"spike"}},"text":"Cache with Redis for session data.","rationale":"Sub-millisecond reads, built-in expiration, simple ops."}
{"_meta":{"id":"01JROW00000000000000003","created_at":"2026-02-01T09:00:00Z","supersedes":["01JROW00000000000000001"],"confidence":0.95,"provenance":{"author":"dom","method":"production_learning"}},"text":"Use PostgreSQL with read replicas for primary data storage.","rationale":"Original decision validated. Adding read replicas for query load."}
```

Row 3 supersedes row 1—the decision evolved based on production experience.

### None

For pointer files where content is elsewhere.

```yaml
slice:
  body:
    type: none
```

### Code

Source code with language metadata.

```yaml
slice:
  body:
    type: code
    code:
      lang: typescript
      extension: ts
      args: ["--strict"]
```

### Conversation

Agent conversations with tool calls, compaction, and OTEL tracing support.

```yaml
slice:
  body:
    type: conversation
    conversation:
      participants: [user, assistant, tool_call, tool_result]
      agent_id: claude-3-opus
      session_id: sess_abc123
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736" # 32 hex chars
      span_id: "00f067aa0ba902b7" # 16 hex chars
      format: messages # messages | transcript | compacted
      includes_tool_calls: true
      includes_compaction: false
```

Conversation body uses JSONL format:

```jsonl
{"role": "user", "content": "...", "ts": "2026-02-03T10:00:00Z"}
{"role": "assistant", "content": "...", "ts": "2026-02-03T10:00:05Z"}
{"role": "tool_call", "name": "read_file", "args": {"path": "..."}, "call_id": "call_001"}
{"role": "tool_result", "call_id": "call_001", "content": "..."}
{"type": "compaction_note", "summary": "...", "turns_summarized": 15}
```

### Text

Plain text without markdown formatting.

```yaml
slice:
  body:
    type: text
```

### YAML

Structured YAML data.

```yaml
slice:
  body:
    type: yaml
```

### Routine

Repeatable workflows with step-by-step instructions for agent automation.

```yaml
slice:
  body:
    type: routine
```

Routine bodies use JSONL format with step types:

- `instruction` — direct instruction to follow
- `read` — read another file's content for reference
- `run` — execute code or spawn a sub-agent (with optional `args`)

Each step can include a `note` annotation and `requirements` prerequisites. Use `tt routine <id>` to compile a routine into executable markdown.

## Meta Block

Arbitrary user-defined key-values:

```yaml
slice:
  meta:
    author: alice
    priority: high
    reviewed: true
```

## JSONL Body

### Row Envelope

Every row has metadata and content:

```json
{
  "_meta": { "id": "01JROW001", "created_at": "2026-02-02T12:00:00Z" },
  "text": "The API uses REST."
}
```

Required `_meta` fields:

- `id` — unique row identifier
- `created_at` — ISO-8601 timestamp

### Optional Metadata

Rows can include additional metadata:

```json
{
  "_meta": {
    "id": "01JROW002",
    "created_at": "2026-02-02T12:05:00Z",
    "supersedes": ["01JROW001"],
    "confidence": 0.9,
    "provenance": { "author": "dom", "method": "observation" },
    "status": "active",
    "links": [{ "rel": "evidence_for", "to": "01JCLAIM001" }]
  },
  "text": "The API is migrating from REST to GraphQL."
}
```

### Mutation Model

The recommended mutation model is **append-only with supersession**:

1. Never edit rows in place
2. To update, append a new row with `supersedes: [old_id]`
3. The active version is the newest in the supersession chain

This preserves history, reduces merge conflicts, and makes concurrent writes safe.

## Storage

Slices are stored flat, named by ID:

```
.slices/
  01JEXAMPLE000000000000001.slice
  01JEXAMPLE000000000000002.slice
  01JEXAMPLE000000000000003.slice
```

No semantic directory structure. No nested folders. The metadata (title, summary, links) provides navigation. Tools abstract the filesystem entirely—agents never need to know about paths.

## Identifiers

Use [ULIDs](https://github.com/ulid/spec) for IDs:

- Lexicographically sortable (timestamp prefix)
- URL-safe (no special characters)
- Globally unique (no coordination needed)
- 26 characters: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

UUIDs are also acceptable but less convenient for sorting.

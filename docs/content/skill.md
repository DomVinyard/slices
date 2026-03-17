---
name: slices
description: File-based context for AI agents. Read, create, update, and maintain persistent knowledge slices in .slices/ directories. Use when you need to persist decisions, architecture context, debugging notes, or any knowledge across sessions.
---

# Slices

You have access to persistent, file-based context via **slices**. Each slice is a `.slice` file with YAML frontmatter and a body, stored in `.slices/` at the project root.

No special tools required. You read and write slices as plain files.

For the full specification, read [SPEC.md](SPEC.md).

## Quick Reference

```yaml
---
v: "0.2"
id: 01JEXAMPLE00000000000001
title: Descriptive Title
summary: Retrieval-optimized summary with key terms for search
tags: [category1, category2]
topics: [specific-entity, technology-name, concept]
lifecycle: perpetual
created_at: "2026-03-17T10:00:00Z"
updated_at: "2026-03-17T10:00:00Z"
validity:
  status: fresh
  stale_after: 90d
scope: project
audience: both
kind: context
body:
  type: markdown
write: append
---

Content goes here.
```

## Discovering Slices

When you need to find existing context:

1. **Check for an index** — look for slices with `kind: index` in their frontmatter. Read these first; they list and categorize all other slices.

   ```bash
   grep -l "kind: index" .slices/*.slice
   ```

2. **Scan frontmatter** — list all slices and read just the YAML frontmatter (between `---` markers). Match on `summary`, `topics`, and `tags`. Do not read every body.

3. **Filter** — skip slices that are:
   - `validity.status: expired`
   - `scope: personal` (unless they're yours)
   - `audience: human` (unless the user asked)
   - `lifecycle: ephemeral` with past `validity.expires_at`

4. **Follow links** — once you find a relevant slice, check its `links` for related slices.

## Creating Slices

When you encounter knowledge that should persist across sessions:

### 1. Generate an ID

Use a ULID. If you don't have a ULID library, construct one from the current timestamp (milliseconds since Unix epoch, encoded in Crockford's Base32) plus 16 random characters from the same alphabet: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.

### 2. Choose the right lifecycle

| Lifecycle | When to use | Examples |
|-----------|-------------|----------|
| `perpetual` | Living document that will be updated | Architecture docs, decision logs, conventions |
| `snapshot` | Point-in-time truth that should not change | Retrospectives, post-mortems, release notes |
| `ephemeral` | Temporary context that will expire | Debug sessions, active investigations, sprint notes |

### 3. Write retrieval-optimized metadata

The `summary` is the most important field. Write it as a search result snippet — front-load specific terms:

**Good:** `"PostgreSQL read replica configuration with pgBouncer connection pooling, failover setup, monitoring via pg_stat_replication"`

**Bad:** `"Database configuration notes"`

Add `topics` for keyword matching: `[PostgreSQL, pgBouncer, read-replicas, connection-pooling, failover]`

### 4. Set validity

- Perpetual slices: set `validity.stale_after` (e.g., `90d`)
- Ephemeral slices: set `validity.expires_at`
- Derived slices: set `derived_from.hash` and `validity.depends_on`

### 5. Write the file

Save to `.slices/{id}.slice`.

### 6. Update the index

If a project index slice exists, add the new slice to it.

## Updating Slices

Before modifying a slice, check its `write` mode:

- **`append`** — add content at the end. Do not edit existing content.
- **`replace`** — overwrite the body entirely with the new version.
- **`immutable`** — do not modify. Create a new slice instead.

Always update `updated_at` when modifying a slice.

If the slice has a `contract`, follow it:
- `contract.purpose` — only add content that fits
- `contract.exclude` — route excluded content elsewhere (check `links` with `rel: routes_to`)
- `contract.format` — follow the structural guidelines

## Maintaining Validity

When you encounter a slice, check its validity:

- If `validity.status` is `stale` or `expired`, note this to the user
- If `updated_at` + `stale_after` is in the past, it's stale — update `validity.status: stale`
- If `validity.expires_at` is in the past, it's expired — update `validity.status: expired`
- If `derived_from.hash` doesn't match the source, it's stale — consider regenerating
- After verifying, update `validity.checked_at`

## When to Create a Slice

Create a new slice when:
- A decision is made that should persist across sessions
- Architecture or design context emerges that future agents will need
- The user explicitly asks to remember something
- You're investigating a bug and accumulating useful context
- A meeting or review produces knowledge worth preserving

Do not create slices for:
- Trivial information available in the codebase
- Temporary thoughts better suited to conversation
- Information that will be immediately outdated

## Lifecycle Decision Guide

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

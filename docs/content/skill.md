---
name: slices
description: File-based context for AI agents. Read, create, update, and maintain persistent knowledge slices in .slices/ directories. Use when you need to persist decisions, architecture context, debugging notes, or any knowledge across sessions.
---

# Slices

You have access to persistent, file-based context via **slices**. Each slice is a `.slice` file with YAML frontmatter and a body, stored in `.slices/` at the project root.

No special tools required. You read and write slices as plain files.

## Format at a Glance

```yaml
---
v: "0.2"
id: 01JEXAMPLE00000000000001
title: Descriptive Title
summary: Retrieval-optimized summary — front-load key terms for search
tags: [architecture, backend]
topics: [JWT, OAuth2, refresh-tokens]
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
write: replace
---

Content goes here.
```

## Resources

Detailed guidance lives in the `resources/` directory alongside this file:

- **[resources/creating.md](resources/creating.md)** — How to create slices: generating IDs, choosing lifecycle, writing metadata, setting validity, when to create vs. not.
- **[resources/discovering.md](resources/discovering.md)** — How to find slices: the discovery protocol, index slices, scanning frontmatter, filtering, following links.
- **[resources/maintaining.md](resources/maintaining.md)** — How to update and maintain slices: write modes, contracts, validity checks, staleness, overflow.
- **[resources/frontmatter.md](resources/frontmatter.md)** — Complete frontmatter field reference. Every field, type, required/optional.

## Reference

- Full specification: [slices.info/spec.md](https://slices.info/spec.md)

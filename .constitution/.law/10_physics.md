---
status: active
articles_hash: "1f61c082a5262df26f18507c3760f3a57c44f0f32b774ba5d48351ac0bde1103"
---

# Physics

The system enforces procedural physics, not rigid authoring templates. Humans write naturally; the system enforces rules about how truth changes.

## Core rules

1. **Truth only changes by appending entries** (or promoting submitted contracts into entries)
2. **Entries are applied in order**
3. **Compiled artifacts are stamped** with what they were compiled from (cursor + hashes + snapshot path)
4. **No guessing**: if the system cannot infer a safe change, it emits a contract rather than guessing
5. **Snapshots are immutable**: changes happen by publishing a new snapshot, not by mutating the current one

## The single integrity rule

If the log cannot be safely applied into a new published snapshot, then the project is blocked and the system must emit explicit requests for missing information rather than guessing.

"What's next?" is answered only from a successfully published snapshot. If publish cannot happen, the correct output is NEEDS_INPUT (via a contract).

## Article states

Constitutional articles use two active states:
- **Draft articles** use filename state `.📝.md` and are editable working material
- **Accepted articles** use filename state `.✅.md` and are immutable constitutional truth

Accepted article content is immutable. Draft article content is editable.

## Promotion rules

- A draft article MAY be edited and set to `status: review`
- A draft article SHALL NOT be manually set to accepted state
- Acceptance SHALL be performed only through the constitutional acceptance procedure
- On acceptance, the article is promoted to `.✅.md`

## Operational definitions

- **Constitutional acceptance procedure**: running `.constitution/src/scripts/promote_article.py` on a draft article in `status: review` with matching `apply_ok_at`
- **Law reconciliation**: updating `.constitution/.law/*.md` to align with current accepted-article truth and restamping `articles_hash`
- **Verification**: running `.constitution/src/scripts/verify_kernel_hash.py` and requiring `RESULT=PASS`

## Hash and derivation rules

- Constitutional article hash SHALL be computed from accepted articles only (`*.✅.md`)
- Article frontmatter SHALL be excluded from hash input
- Hash input SHALL be the trimmed markdown body

## Law freshness rules

- Accepting an article SHALL mark all law files stale
- The next iteration SHALL attempt law reconciliation until verification passes
- Draft-only edits SHALL NOT affect the accepted-article hash and SHALL NOT force law reconciliation

## Filesystem layout

- `.constitution/.articles/` SHALL store constitutional articles
- `.constitution/.law/` SHALL store derived law files
- `.constitution/src/scripts/` SHALL store constitutional procedures and enforcement scripts
- `.constitution/src/prompts/` SHALL store constitutional agent prompts
- Draft article records SHALL use filename form `timestamp.📝.md`
- Accepted article records SHALL use filename form `timestamp.✅.md`
- Only accepted article records (`*.✅.md`) SHALL participate in constitutional hash computation

## Interaction rules

- Constitutional policy messages SHALL be phrased in constitutional terms
- Runtime or tooling identity references SHALL NOT appear in constitutional policy messages

## Layers (altitudes)

### Authoritative (durable, append-only)
1. **Constitutional log**: ordered entries (decisions + accepted contract answers). This is the constitution.

### Non-authoritative (human-editable, not executable)
2. **Workbench memos/RFCs**: a dumping ground for potentially useful future context. Referencable, but never drives behavior unless explicitly promoted.

### Derived (disposable/regeneratable, non-human-editable)
3. **Kernel view**: the current compiled narrative of intent, constraints, success, risks, non-goals, and open questions
4. **Tasks**: actionables with dependencies and state, represented as compiled artifacts
5. **Views**: generated READY / NEEDS_INPUT / STALE / RECENT summaries for deterministic selection
6. **Snapshots**: published, immutable compiled directories; the primary audit surface

## Staleness

Staleness is computed, not manually maintained. When upstream meaning changes, affected compiled regions are treated as stale until the next successful publish produces an updated snapshot.

## Stamps and hashes

Every file is conceptually split into:
- A portable markdown body (meaning)
- A metadata envelope for indexing, linking, routing, and bookkeeping

Semantic hashing is computed from the body alone. Meaning must live in the body to participate in invalidation and provenance.

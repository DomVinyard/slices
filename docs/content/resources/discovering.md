# Discovering Slices

Slices must be discoverable without reading every body. The frontmatter is the discovery index.

## The Discovery Protocol

### Step 1: Check for an index

Look for slices with `kind: index` in their frontmatter. These are tables of contents — read them first.

```bash
grep -l "kind: index" .slices/*.slice
```

An index slice lists and categorizes all other slices with their IDs, titles, and brief descriptions. It's the fastest way to orient yourself.

### Step 2: Scan frontmatter

If no index exists, or you need more than what the index covers, list all `.slice` files and read just the YAML frontmatter (between the `---` markers). Do not read every body — that wastes context.

Extract and compare:
- `summary` — natural language match (most useful)
- `topics` — keyword match against your search terms
- `tags` — categorical match

```bash
# List all slices with their titles
grep "^title:" .slices/*.slice

# Find slices about a specific topic
grep -l "PostgreSQL" .slices/*.slice
```

### Step 3: Filter

Skip slices that don't apply to your situation:

| Condition | Action |
|-----------|--------|
| `validity.status: expired` | Skip — content is no longer valid |
| `validity.status: stale` | Read with caution — may be outdated |
| `scope: personal` | Skip unless they belong to you |
| `audience: human` | Skip unless the user asked for it |
| `lifecycle: ephemeral` + past `expires_at` | Skip — should have been cleaned up |

### Step 4: Follow links

Once you find a relevant slice, check its `links` array for related slices:

- `depends_on` — prerequisite context
- `see_also` — related context
- `child` / `has_part` — sub-topics
- `superseded_by` — a newer version exists, read that instead
- `routes_to` — content that was redirected from this slice's contract

### Step 5: Verify before using

Before trusting a slice's content:

1. Check `validity.status` — is it `fresh`?
2. Check `updated_at` + `stale_after` — has the staleness window passed?
3. Check `origin.confidence` — how reliable is the source?
4. Check `lifecycle` — is this a `snapshot` (frozen truth) or `perpetual` (living doc)?

## Quick Discovery Patterns

**"What do we know about X?"**
→ Search `topics` and `summary` fields for X. Check index slices.

**"What decisions have been made?"**
→ Look for slices with `tags: [decisions]` or `kind: index`.

**"Is there existing context for this task?"**
→ Scan all frontmatter. Match on `summary` and `topics`. Filter by `scope: project` and `validity.status: fresh`.

**"What's changed recently?"**
→ Sort by `updated_at`. Check `lifecycle: perpetual` slices with recent updates.

**"What's stale or needs attention?"**
→ Look for `validity.status: stale` or compute staleness from `updated_at` + `stale_after`.

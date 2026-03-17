# Maintaining Slices

Slices are only useful if they stay accurate. This covers how to update content, respect constraints, and keep validity current.

## Write Modes

Before modifying a slice, check its `write` field:

| Mode | Rule | Use case |
|------|------|----------|
| `append` | Add content at the end. Never edit existing content. | Logs, decision records, chronological entries |
| `replace` | Overwrite the body entirely with the new version. | Living documents where the whole thing should be current |
| `immutable` | Do not modify. Create a new slice instead. | Snapshots, post-mortems, frozen records |

Always update `updated_at` when modifying a slice.

## Respecting Contracts

If a slice has a `contract`, follow it strictly:

- **`contract.purpose`** — Only add content that fits this description. If the content doesn't belong, don't force it.
- **`contract.exclude`** — This content must go elsewhere. Check `links` with `rel: routes_to` to find where excluded content should be routed.
- **`contract.format`** — Follow the structural guidelines (e.g., "One decision per section with rationale and date").
- **`contract.cleanup`** — Maintenance rules to apply when updating (e.g., "Archive entries older than 1 year").

## Validity Checks

When you encounter a slice, assess its validity before trusting the content.

### Time-based staleness (perpetual slices)

```
current_time > updated_at + stale_after → stale
```

If a slice has `stale_after: 90d` and `updated_at` is 100 days ago, it's stale. Update `validity.status: stale`.

### Expiry (ephemeral slices)

```
current_time > validity.expires_at → expired
```

Update `validity.status: expired`. Consider cleaning up the file.

### Hash-based staleness (derived slices)

If a slice has `derived_from`, compare `derived_from.hash` against the current content hash of the source slice. If they don't match, the derived slice is stale and should be regenerated.

### Event-based invalidation

If a slice lists `validity.triggers` (e.g., `[deploy, schema-change]`), it should be reviewed whenever that event occurs. After review, update `validity.checked_at`.

### After checking

Always update `validity.checked_at` with the current timestamp after verifying a slice, whether it passed or not. This lets future agents know when the last check happened.

## Overflow Strategies

When a slice grows too large, check its `overflow` field:

| Strategy | Behavior |
|----------|----------|
| `split` | Break into multiple slices (e.g., by date range or topic). Create new slices and update the index. |
| `summarize` | Compress older content into summaries, keep recent content intact. |
| `archive` | Move old content to a separate archival slice. Link with `rel: archive_of`. |
| `error` | Refuse to write. Signal the problem to the user. |

If no `overflow` is set, use your judgment — `summarize` is usually the safest default.

## Maintenance Checklist

When working with an existing `.slices/` directory:

1. **Check the index** — Is it up to date? Does it list all slices?
2. **Scan for staleness** — Any slices past their `stale_after` window?
3. **Clean up ephemeral slices** — Any past their `expires_at`?
4. **Verify derived slices** — Do source hashes still match?
5. **Update what you touch** — If you read a slice and verify it's accurate, update `validity.checked_at`.

## Updating the Index

After creating, deleting, or significantly modifying a slice, update the project index (`kind: index`):

- Add new slices with their ID, title, and a brief parenthetical note
- Remove deleted slices
- Update descriptions if a slice's focus has changed
- The index uses `write: replace` — rewrite the whole body

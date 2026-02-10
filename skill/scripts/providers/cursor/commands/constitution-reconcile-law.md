# Reconcile Stale Law

`.constitution/LAW.⏳` exists (law is resolving).

Use the **constitutional-reconciler** subagent to derive law from accepted amendments. Do not do derivation yourself.

## Required action

1. Use the `constitutional-reconciler` subagent. It has the full derivation prompt and will reconcile law from the accepted amendment delta, restamp hashes, and verify.
2. If the subagent reports `NEEDS_INPUT`, surface the clarification request to the user.
3. If the subagent reports `APPLY_OK`, confirm that `LAW.✅` exists and verification passed.

## Completion condition

Complete only when:

- `LAW.✅` exists (renamed from `LAW.⏳` by `sync_article_hash.py`), and
- verification passes (`RESULT=PASS`).

## Reporting format

When reconciliation succeeds, report to the user in this exact format:

- A few bullet points describing how law changed (what sections were added/rewritten/removed and why)
- Then on its own line: `✅ LAW UPDATED`

No other status output. No amendment lifecycle summary, no hashes, no verification details.

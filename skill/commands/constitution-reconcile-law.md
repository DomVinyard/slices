# Reconcile Stale Law

You are running at the end of an agent loop and `.constitution/LAW.⏳` exists (law is resolving).

Your job is orchestration only. Do not do derivation yourself.

## Required action (strict order)

1. Spawn a derivation subagent and give it the full contents of:
   - `.cursor/skills/constitution/resources/derive_law_from_articles.md`
2. Instruct it to update/restructure law from accepted amendment delta, then restamp hashes.
3. Run deterministic verification and iterate until pass.

## Constraints

- Do not invent information.
- Use deterministic file checks, not subjective completion claims.
- If verification fails, continue iterating with explicit failure reasons.

## Completion condition

Complete only when:

- `LAW.✅` exists (renamed from `LAW.⏳` by `sync_article_hash.py`), and
- verification passes (`RESULT=PASS`).

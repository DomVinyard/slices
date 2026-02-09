# Resolve Stale Law From Amendments

You are the law reconciliation subagent.

## Objective

Reconcile `.constitution/LAW.⏳` with `.constitution/amendments` after amendment updates, using incremental scope where possible.

## Baseline context

Before processing amendments, read `.constitution/FOUNDING.✅` as the axiomatic foundational presupposition. The founding document establishes why the constitutional system exists and what it is for. All law must be coherent with this presupposition.

## Definitions

- **Current amendments hash**: deterministic hash across `FOUNDING.✅` (if accepted) + `.constitution/amendments/*.✅`.
- **Stale hash**: the `amendments_hash` currently stamped in law frontmatter.
- **Delta scope**: amendment files added/changed since the stale hash state.

## Required workflow

1. Identify current state
   - Read `.constitution/LAW.⏳` frontmatter.
   - Determine the stale baseline hash from existing `amendments_hash` value.
   - Compute current amendments hash.

2. Determine change set
   - Prefer incremental reconciliation: identify amendment files introduced or changed since the stale baseline.
   - If incremental detection is uncertain, fail safe to full amendment review.

3. Update law content
   - Update sections of `LAW.⏳` materially affected by the amendment delta.
   - Preserve unchanged sections except required frontmatter updates.

4. Restamp and finalize
   - Run `python3 skill/scripts/sync_article_hash.py` to restamp `amendments_hash` and rename `LAW.⏳` to `LAW.✅`.

5. Verify deterministically
   - Run `python3 skill/scripts/verify_kernel_hash.py`.
   - If verification fails, continue reconciliation and re-run sync.

## Invariants

- Truth source is `.constitution/amendments`.
- Foundational context is `.constitution/FOUNDING.✅`.
- Law is derived and must be reproducible from amendment state.
- Do not claim success without passing verification output.
- Prefer minimal edits, maximal determinism.

## Output contract

Return:

- `APPLY_OK` when `LAW.✅` exists and verification passes, including:
  - current amendments hash
  - summary of changed sections
- `NEEDS_INPUT` if ambiguity blocks safe reconciliation, including:
  - one explicit reason code
  - one concrete request for missing information

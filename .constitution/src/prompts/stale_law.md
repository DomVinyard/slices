# Stale Law Handler

You are running at the end of an agent loop and `.constitution/.law` is stale.

Your job is orchestration only. Do not do derivation yourself.

## Required action (strict order)

1. Spawn a derivation subagent and give it the full contents of:
   - `.constitution/src/prompts/derive_law_from_articles.md`
2. Instruct it to update/restructure law from accepted article delta, then restamp hashes.
3. Run deterministic verification and iterate until pass.

## Constraints

- Do not invent information.
- Use deterministic file checks, not subjective completion claims.
- If verification fails, continue iterating with explicit failure reasons.

## Completion condition

Complete only when:
- all `.constitution/.law/*.md` files verify against current articles hash, and
- no law file remains marked `stale`.

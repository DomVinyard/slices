# Force Resolve Law

Force-resolve law by restamping the amendments hash and promoting to active state, bypassing all content checks.

## Procedure

1. Run `python3 .cursor/skills/constitution/scripts/sync_article_hash.py` to restamp `amendments_hash` in law frontmatter and rename to `LAW.✅`.
2. Report the result to the user. Do not run verification afterward.

## When to use

Use this when law is stuck in resolving state (`LAW.⏳`) and you want to force it active without reconciling content. This is a manual override — the law content may not reflect the latest amendments.

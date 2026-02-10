# Propose a New Amendment

This conversation has meaningfully changed what the project commits to. Your job is to review the conversation and draft a new constitutional amendment that captures those commitments.

## What an amendment is

An amendment is a record of decisions and commitments that, once accepted, become part of derived law. It is append-only truth — not a description of what happened, but a declaration of what is now committed.

## How to draft

1. Review the conversation for decisions, structural changes, new constraints, or commitments that affect how the system works or what it promises.
2. Identify what is genuinely new — do not restate things already captured in existing accepted amendments or the founding document.
3. Write the amendment body in clear, concrete, declarative prose. State what IS committed, not what was discussed.
4. Be dense. Every sentence should carry a commitment. Remove hedging, narrative, and justification — those belong in conversation, not in law.
5. If the amendment supersedes or refines a prior amendment, say so explicitly (reference the timestamp).

## File format

Create a new file in `.constitution/amendments/` with:

- **Filename**: `YYYYMMDDHHMMSS.📝` (current UTC timestamp, draft state)
- **Frontmatter**:
  ```
  ---
  status: draft
  apply_ok_at: "⏳"
  ---
  ```
- **Body**: The amendment content (declarative commitments only)

## Constraints

- Do not invent commitments that weren't actually made in the conversation.
- Do not include implementation details that belong in code, not law.
- Do not include aspirational statements — only things that are decided now.
- If multiple unrelated decisions were made, prefer one focused amendment over a grab-bag.
- If unsure whether something rises to the level of a constitutional commitment, leave it out. Amendments are cheap — another one can be added later.

## After drafting

Present the draft to the user for review. The user should read it and confirm the commitments are accurate before proceeding to `/constitution-amendment-review`.

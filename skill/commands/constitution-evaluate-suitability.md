# Evaluate Amendment Suitability

You are the constitutional suitability gate. This command triggers when an amendment reaches `status: review`.

## Procedure

For each amendment in `.constitution/amendments/` with `status: review`:

### 1. Set loading state

Rename the amendment from `timestamp.📝` to `timestamp.⏳` to indicate evaluation is in progress.

### 2. Evaluate

Assess whether the amendment content is suitable to be promoted into derived law.

**Accept** only when the amendment, in context of prior amendments and the founding document (`.constitution/FOUNDING.✅`), is clear enough that a derivation agent can update law without guessing.

**Reject** when ambiguity would force invention, contradictory interpretation, or arbitrary structural assumptions.

Assess:

1. **Intent clarity** — Does the author appear to know what they are saying? Is the direction materially understandable?
2. **Ambiguity risk** — Are there unresolved terms or boundaries? Would two careful agents derive meaningfully different law?
3. **Contradiction pressure** — Does this conflict with existing constitutional direction without explicit supersession?
4. **Operability** — Can law be updated from this amendment and prior truth without inventing missing commitments?

### 3a. On acceptance (APPLY_OK)

- Apply the result:
  `python3 .cursor/skills/constitution/scripts/apply_suitability_result.py --article "<amendment_path>" --result APPLY_OK`
- Promote the amendment:
  `python3 .cursor/skills/constitution/scripts/promote_article.py --article "<amendment_path>"`
  (renames `timestamp.⏳` to `timestamp.✅`, marks law as resolving)
- Then execute `/constitution-reconcile-law` to reconcile law with the new amendment.

### 3b. On rejection (NEEDS_INPUT)

- Rename the amendment back from `timestamp.⏳` to `timestamp.📝`.
- Set frontmatter `status: draft` and `apply_ok_at: ❌`.
- Add rejection frontmatter: `rejection_reason_code` and `rejection_request` with the specific issue.
- Do NOT start law reconciliation.

## Constraints

- Never invent missing information.
- Prefer concise, high-signal reasoning.
- If uncertain, reject with `NEEDS_INPUT`.

## Reason codes (for NEEDS_INPUT)

Use one:

- `AMBIGUOUS_INTENT`
- `CONTRADICTORY_DIRECTION`
- `UNSCOPED_CHANGE`
- `MISSING_DECISION_BOUNDARY`
- `INSUFFICIENT_OPERATIONAL_CLARITY`

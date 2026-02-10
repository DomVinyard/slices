# Submit Amendment for Review

A draft amendment is ready for suitability evaluation. Your job is to set its status to `review` so the constitutional ratifier picks it up.

## Procedure

1. Identify the draft amendment. Look for `.📝` files in `.constitution/amendments/` — there should be one that was recently drafted or is currently being discussed.
2. If multiple drafts exist, ask the user which one to submit.
3. Read the draft and confirm with the user that the content accurately captures their intent.
4. Update the amendment's frontmatter `status` from `draft` to `review`:
   ```
   ---
   status: review
   apply_ok_at: "⏳"
   ---
   ```
5. The ratifier will automatically run at the end of this agent loop and evaluate whether the amendment is clear, coherent, and operable enough to become law.

## Constraints

- Do not modify the body of the amendment — only the frontmatter status field.
- Do not submit an amendment the user hasn't reviewed and confirmed.
- If the amendment body needs changes, make them first (it's still a draft), then set status to review.

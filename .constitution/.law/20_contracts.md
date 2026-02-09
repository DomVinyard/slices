---
status: active
articles_hash: "1f61c082a5262df26f18507c3760f3a57c44f0f32b774ba5d48351ac0bde1103"
---

# Contracts

Contracts are the mechanism for requesting missing information without resorting to chat or log spam.

## What contracts are

Files with explicit questions and typed expectations where useful. When the system cannot safely proceed, it produces a contract that requests missing information in a tight, answerable form.

## How humans answer

Humans do not answer by chat. They answer by editing the contract file and submitting it.

## Promotion workflow

A reviewer agent then:
1. **Promotes** the submitted contract into the constitutional log by rewriting only frontmatter (body meaning is preserved), OR
2. **Returns** it with explicit refinement requests

This keeps the constitution as the only authoritative surface while keeping human interaction on a single, reviewable artifact.

## Agent interaction contract (v0)

Agents interacting with the user should produce only one of two top-level outcomes by default:

- **APPLY_OK**: new cursor + snapshot path + snapshot hash (+ minimal changed-path summary)
- **NEEDS_INPUT**: one contract path (+ reason code)

Optional elaboration exists, but is not part of the coordination substrate.

## Ambiguity as first-class state

When the system cannot safely proceed, it produces an inbox artifact (contract) that requests missing information in a tight, answerable form. Downstream compiled artifacts block on missing contracts, failed apply, or unresolved ambiguity.

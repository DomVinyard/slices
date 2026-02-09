---
status: active
articles_hash: "1f61c082a5262df26f18507c3760f3a57c44f0f32b774ba5d48351ac0bde1103"
---

# Intent

opendevshop is a painfully simple, file-first project planner designed for humans and agents to coordinate work without turning planning into a chat log or turning the workspace into mush.

## Core bet

Planning becomes reliable for agents when:
- Intent, decisions, coordination structure, and actionables are separated into distinct layers
- Ambiguity and staleness are explicit states rather than implicit failure modes

## What this is

An experiment in building a small, durable context network for one use case (project planning) that stays usable when agents are overloaded, have conflicting installed knowledge, or are operating near context-window limits.

## Success criteria

The system is successful if it can repeatedly produce a "what's next?" view that is:
- **Deterministic**: the same published snapshot yields the same READY set
- **Safe**: refuses to proceed on ambiguous or stale prerequisites rather than silently guessing
- **Low-maintenance**: humans append decisions / submit contracts; they do not hand-curate task truth
- **Multi-agent coherent**: parallel agents do not create mixed derived states because coordination is anchored to a published snapshot

## Constraints

- Painfully simple: files, minimal moving parts, minimal hidden state
- Diffable and reviewable: authoritative truth is append-only
- No background watchers required; prefer explicit/on-demand apply and publish
- Avoid relying on "agent persuasion" as the primary reliability strategy

## Non-goals

- Not a full Jira/Linear replacement
- Not a general-purpose knowledge graph
- Not an attempt to standardize a global ontology
- Not a guarantee of correct reasoning—this is about reducing ambiguity, drift, and silent contradiction in the planning substrate

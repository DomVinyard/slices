# slices

File-based context for AI agents. A format, not a tool.

## Install

```bash
curl -fsSL slices.info/install | sh
```

## What is this?

Slices is a specification for `.slice` files — YAML frontmatter + body content — that give AI agents persistent, discoverable context. Each slice declares its lifecycle, validity, scope, and mutation rules so agents know what it is, whether to trust it, and how to maintain it.

There is no CLI, no parser library, no validation tooling. An agent that can read and write files can work with slices. The specification teaches the format. The skill teaches the protocol.

- **Specification**: [slices.info/spec](https://slices.info/spec)
- **Skill**: [slices.info/skill](https://slices.info/skill)

## v0.2

This is early. The format will evolve.

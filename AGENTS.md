# AGENTS.md

This project builds **constitution**, a constitutional planning system and tooling for human-agent coordination.

## The meta situation

This project uses the same system it's building to plan and coordinate its own development. That means:

1. **The product**: A file-first planning system where truth lives in an append-only constitution, everything else is derived, and agents coordinate via published snapshots.

2. **The process**: We use that same system (bootstrap version, then progressively the real thing) to plan and build it.

These are distinct:

- When you're **working on the system**, you're modifying code, specs, and tooling that implement the constitutional planning model.
- When you're **working within the system**, you're appending entries to `.constitution/`, answering contracts, or reading compiled views to decide what to do next.

## Runtime environment

We are using **Cursor IDE/Agent** as the execution and runtime environment. All system functionality must currently be usable within Cursor.

This will change later—the goal is a runtime-agnostic system—but for now Cursor is the substrate. Agents operating here should be familiar with Cursor's capabilities and constraints.

Cursor docs: https://docs.cursor.com

## Current state

The `.constitution/` directory contains the authoritative log. The `.constitution/amendments/` directory holds the constitutional entries in append-only order (timestamped filenames). The founding document (`.constitution/amendments/✅ .founding`) is the axiomatic grundnorm, and derived law lives in `.constitution/✅ LAW`. Constitutional files use emoji prefixes to encode state (e.g. `✅ LAW`, `📝 20260209101538`).

Right now this is bootstrap: the tooling doesn't exist yet, so "compilation" and "publishing snapshots" are manual or don't happen. As we build out the system, it will increasingly manage itself.

## Skill installation

The constitution skill installs into the workspace via `skill/scripts/providers/cursor/init.py`. Source files live under `skill/` and get installed into `.cursor/` (skills, hooks, commands, agents).

| Mode                   | Command                                                      | What it does                                      |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Copy install (default) | `python3 skill/scripts/providers/cursor/init.py`             | Copies skill files into `.cursor/`                |
| Dev install (linked)   | `python3 skill/scripts/providers/cursor/init.py --link`      | Creates relative symlinks — source edits are live |
| Freeze                 | `python3 skill/scripts/providers/cursor/init.py --unlink`    | Converts a linked install to copies               |
| Uninstall              | `python3 skill/scripts/providers/cursor/init.py --uninstall` | Removes skill, hooks, commands, agents            |
| Check status           | `python3 skill/scripts/providers/cursor/init.py --status`    | Reports current install state                     |

Use `--link` during development so edits to source files under `skill/` propagate immediately to the installed location. Use `--unlink` to freeze the install into independent copies.

If the user asks to "resync", "relink", or "reinstall" the skill, always force-refresh by piping `r` into the command: `echo "r" | python3 skill/scripts/providers/cursor/init.py --link`.

## Key distinction for agents

If you're asked to "add a feature to the planning system" — that's product work. You're changing how the system behaves.

If you're asked to "record a decision" or "answer this contract" — that's process work. You're using the system to track what we're doing.

Don't confuse them. When in doubt, ask.

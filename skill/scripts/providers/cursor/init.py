#!/usr/bin/env python3
"""
Self-installing skill for the constitutional planning system (Cursor provider).

Usage:
    python3 init.py [--target DIR] [MODE]

Modes:
    (default)     Copy install - copies skill files into .cursor/skills/constitution/
    --link        Dev install  - symlinks skill files (edits to source are live)
    --unlink      Converts a symlinked install to a copy install (freezes current state)
    --uninstall   Removes skill and its hooks entirely
    --status      Shows current install state
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path


SKILL_INSTALL_NAME = "constitution"
HOOK_COMMAND_PREFIX = ".cursor/skills/constitution/scripts/"
SKILL_COMMANDS = {"new-law.md", "review-law.md"}
SKILL_AGENTS = {"ratifier.md", "framer.md", "codifier.md"}
# Old names from previous installs that should be cleaned up
OLD_COMMAND_PREFIX = "constitution-"
OLD_AGENT_PREFIX = "constitutional-"
# Known prefixes from previous install locations that should be cleaned up
OLD_HOOK_PREFIXES = [
    ".constitution/src/scripts/",
    "skill/scripts/",
]


def find_skill_root() -> Path:
    """Walk up from this script to find the skill root (directory containing SKILL.md)."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / "SKILL.md").is_file():
            return current
        current = current.parent
    print("ERROR: Could not find SKILL.md in any parent directory.", file=sys.stderr)
    sys.exit(1)


def get_install_dir(target: Path) -> Path:
    return target / ".cursor" / "skills" / SKILL_INSTALL_NAME


def get_commands_dir(target: Path) -> Path:
    return target / ".cursor" / "commands"


def get_agents_dir(target: Path) -> Path:
    return target / ".cursor" / "agents"


def get_hooks_file(target: Path) -> Path:
    return target / ".cursor" / "hooks.json"


def get_hooks_template(skill_root: Path) -> Path:
    return skill_root / "scripts" / "providers" / "cursor" / "hooks.json"


def get_cursor_provider_dir(skill_root: Path) -> Path:
    return skill_root / "scripts" / "providers" / "cursor"


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def detect_install_state(install_dir: Path) -> str:
    """Return 'not_installed', 'linked', or 'copied'."""
    skill_md = install_dir / "SKILL.md"
    if not skill_md.exists():
        return "not_installed"
    if skill_md.is_symlink():
        return "linked"
    return "copied"


def ask_user(prompt: str, choices: str) -> str:
    """Ask user for a single-character choice."""
    while True:
        response = input(f"{prompt} [{choices}]: ").strip().lower()
        if response and response[0] in choices:
            return response[0]
        print(f"Please enter one of: {', '.join(choices)}")


# ---------------------------------------------------------------------------
# Copy install
# ---------------------------------------------------------------------------

def copy_install(skill_root: Path, install_dir: Path) -> list[str]:
    """Copy skill files into install_dir. Returns list of installed paths."""
    installed: list[str] = []

    # SKILL.md
    shutil.copy2(skill_root / "SKILL.md", install_dir / "SKILL.md")
    installed.append("SKILL.md")

    # scripts/ (exclude providers/)
    scripts_src = skill_root / "scripts"
    scripts_dst = install_dir / "scripts"
    scripts_dst.mkdir(parents=True, exist_ok=True)
    for py_file in sorted(scripts_src.glob("*.py")):
        shutil.copy2(py_file, scripts_dst / py_file.name)
        installed.append(f"scripts/{py_file.name}")

    # resources/
    resources_src = skill_root / "resources"
    resources_dst = install_dir / "resources"
    if resources_src.exists():
        if resources_dst.exists():
            shutil.rmtree(resources_dst)
        shutil.copytree(resources_src, resources_dst)
        for md_file in sorted(resources_dst.glob("*.md")):
            installed.append(f"resources/{md_file.name}")

    return installed


# ---------------------------------------------------------------------------
# Link install
# ---------------------------------------------------------------------------

def relative_symlink(target: Path, link: Path) -> None:
    """Create a relative symlink from link -> target."""
    rel = os.path.relpath(target, link.parent)
    link.symlink_to(rel)


def link_install(skill_root: Path, install_dir: Path) -> list[str]:
    """Symlink skill files into install_dir. Returns list of installed paths."""
    installed: list[str] = []

    # SKILL.md
    skill_md_link = install_dir / "SKILL.md"
    relative_symlink(skill_root / "SKILL.md", skill_md_link)
    installed.append("SKILL.md -> (symlink)")

    # scripts/ directory symlink
    scripts_link = install_dir / "scripts"
    relative_symlink(skill_root / "scripts", scripts_link)
    installed.append("scripts/ -> (symlink)")

    # resources/ directory symlink
    resources_link = install_dir / "resources"
    if (skill_root / "resources").exists():
        relative_symlink(skill_root / "resources", resources_link)
        installed.append("resources/ -> (symlink)")

    return installed


# ---------------------------------------------------------------------------
# Hooks management
# ---------------------------------------------------------------------------

def load_hooks_template(skill_root: Path) -> dict:
    template_path = get_hooks_template(skill_root)
    with open(template_path, encoding="utf-8") as f:
        return json.load(f)


def _is_constitution_hook(command: str) -> bool:
    """Check if a hook command belongs to the constitution skill (current or old locations)."""
    all_prefixes = [HOOK_COMMAND_PREFIX] + OLD_HOOK_PREFIXES
    return any(prefix in command for prefix in all_prefixes)


def _strip_constitution_hooks(hooks: dict) -> dict:
    """Remove all constitution-related hooks from a hooks dict, cleaning empty events."""
    cleaned: dict[str, list] = {}
    for event_type, entries in hooks.items():
        remaining = [
            entry for entry in entries
            if not _is_constitution_hook(entry.get("command", ""))
        ]
        if remaining:
            cleaned[event_type] = remaining
    return cleaned


def install_hooks_copy(target: Path, skill_root: Path) -> None:
    """Remove old constitution hooks, then merge fresh ones from template."""
    hooks_file = get_hooks_file(target)
    template = load_hooks_template(skill_root)

    if hooks_file.exists() and not hooks_file.is_symlink():
        with open(hooks_file, encoding="utf-8") as f:
            existing = json.load(f)
    else:
        # If it's a symlink from a previous --link install, remove it
        if hooks_file.is_symlink():
            hooks_file.unlink()
        hooks_file.parent.mkdir(parents=True, exist_ok=True)
        existing = {"version": 1, "hooks": {}}

    # Strip all old constitution hooks first
    existing["hooks"] = _strip_constitution_hooks(existing.get("hooks", {}))

    # Add fresh hooks from template
    template_hooks = template.get("hooks", {})
    existing_hooks = existing["hooks"]

    for event_type, new_entries in template_hooks.items():
        current = existing_hooks.get(event_type, [])
        current.extend(new_entries)
        existing_hooks[event_type] = current

    existing["hooks"] = existing_hooks
    with open(hooks_file, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)
        f.write("\n")

    print(f"  Hooks: {hooks_file} (merged)")


def install_hooks_link(target: Path, skill_root: Path) -> None:
    """Symlink hooks.json so hook config changes are live in dev mode."""
    hooks_file = get_hooks_file(target)
    template_path = get_hooks_template(skill_root)

    # Check if there are non-constitution hooks we'd lose
    if hooks_file.exists() and not hooks_file.is_symlink():
        with open(hooks_file, encoding="utf-8") as f:
            existing = json.load(f)
        remaining = _strip_constitution_hooks(existing.get("hooks", {}))
        if remaining:
            print(f"  WARNING: {hooks_file} has non-constitution hooks that will be hidden by symlink:")
            for event_type, entries in remaining.items():
                for entry in entries:
                    print(f"    {event_type}: {entry.get('command', '')}")
            choice = ask_user("Proceed with symlink (hides other hooks) or merge instead?", "sm")
            if choice == "m":
                install_hooks_copy(target, skill_root)
                return

    if hooks_file.exists() or hooks_file.is_symlink():
        hooks_file.unlink()

    hooks_file.parent.mkdir(parents=True, exist_ok=True)
    relative_symlink(template_path, hooks_file)
    print(f"  Hooks: {hooks_file} -> (symlink)")


def freeze_hooks(target: Path) -> None:
    """If hooks.json is a symlink, replace it with a copy of the resolved content."""
    hooks_file = get_hooks_file(target)
    if not hooks_file.is_symlink():
        return
    resolved = hooks_file.resolve()
    hooks_file.unlink()
    shutil.copy2(resolved, hooks_file)
    print(f"  Hooks: {hooks_file} (frozen from symlink)")


def remove_hooks(target: Path) -> None:
    """Remove constitution hooks from .cursor/hooks.json."""
    hooks_file = get_hooks_file(target)
    if not hooks_file.exists() and not hooks_file.is_symlink():
        return

    # If symlinked, just remove the symlink
    if hooks_file.is_symlink():
        hooks_file.unlink()
        print(f"  Removed {hooks_file} (was symlink)")
        return

    with open(hooks_file, encoding="utf-8") as f:
        data = json.load(f)

    data["hooks"] = _strip_constitution_hooks(data.get("hooks", {}))

    if not data["hooks"]:
        hooks_file.unlink()
        print(f"  Removed {hooks_file} (no hooks remaining)")
    else:
        with open(hooks_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        print(f"  Updated {hooks_file} (constitution hooks removed)")


# ---------------------------------------------------------------------------
# Slash commands management
# ---------------------------------------------------------------------------

def _is_constitution_command(path: Path) -> bool:
    """Check if a command file belongs to the constitution skill (current or old names)."""
    if path.name in SKILL_COMMANDS:
        return True
    return path.name.startswith(OLD_COMMAND_PREFIX) and path.name.endswith(".md")


def install_commands_copy(target: Path, skill_root: Path) -> list[str]:
    """Copy command .md files into .cursor/commands/. Returns installed names."""
    commands_src = get_cursor_provider_dir(skill_root) / "commands"
    if not commands_src.exists():
        return []
    commands_dir = get_commands_dir(target)
    commands_dir.mkdir(parents=True, exist_ok=True)

    # Remove old constitution commands first
    for existing in commands_dir.iterdir():
        if _is_constitution_command(existing):
            existing.unlink()

    installed: list[str] = []
    for md_file in sorted(commands_src.glob("*.md")):
        shutil.copy2(md_file, commands_dir / md_file.name)
        installed.append(md_file.name)

    if installed:
        print(f"  Commands: {commands_dir} ({len(installed)} copied)")
    return installed


def install_commands_link(target: Path, skill_root: Path) -> list[str]:
    """Symlink command .md files into .cursor/commands/. Returns installed names."""
    commands_src = get_cursor_provider_dir(skill_root) / "commands"
    if not commands_src.exists():
        return []
    commands_dir = get_commands_dir(target)
    commands_dir.mkdir(parents=True, exist_ok=True)

    # Remove old constitution commands first
    for existing in commands_dir.iterdir():
        if _is_constitution_command(existing):
            existing.unlink()

    installed: list[str] = []
    for md_file in sorted(commands_src.glob("*.md")):
        link_path = commands_dir / md_file.name
        relative_symlink(md_file, link_path)
        installed.append(f"{md_file.name} -> (symlink)")

    if installed:
        print(f"  Commands: {commands_dir} ({len(installed)} linked)")
    return installed


def freeze_commands(target: Path) -> None:
    """Replace any symlinked command files with copies."""
    commands_dir = get_commands_dir(target)
    if not commands_dir.exists():
        return
    frozen = 0
    for item in commands_dir.iterdir():
        if _is_constitution_command(item) and item.is_symlink():
            resolved = item.resolve()
            item.unlink()
            shutil.copy2(resolved, item)
            frozen += 1
    if frozen:
        print(f"  Commands: {frozen} frozen from symlink")


def remove_commands(target: Path) -> None:
    """Remove constitution skill command files from .cursor/commands/."""
    commands_dir = get_commands_dir(target)
    if not commands_dir.exists():
        return
    removed = 0
    for item in commands_dir.iterdir():
        if _is_constitution_command(item):
            item.unlink()
            removed += 1
    if removed:
        print(f"  Removed {removed} command(s) from {commands_dir}")
    # Clean up empty commands dir
    if commands_dir.exists() and not any(commands_dir.iterdir()):
        commands_dir.rmdir()


# ---------------------------------------------------------------------------
# Custom agents management
# ---------------------------------------------------------------------------

def _is_constitution_agent(path: Path) -> bool:
    """Check if an agent file belongs to the constitution skill (current or old names)."""
    if path.name in SKILL_AGENTS:
        return True
    return path.name.startswith(OLD_AGENT_PREFIX) and path.name.endswith(".md")


def install_agents_copy(target: Path, skill_root: Path) -> list[str]:
    """Copy agent .md files into .cursor/agents/. Returns installed names."""
    agents_src = get_cursor_provider_dir(skill_root) / "agents"
    if not agents_src.exists():
        return []
    agents_dir = get_agents_dir(target)
    agents_dir.mkdir(parents=True, exist_ok=True)

    # Remove old constitution agents first
    for existing in agents_dir.iterdir():
        if _is_constitution_agent(existing):
            existing.unlink()

    installed: list[str] = []
    for md_file in sorted(agents_src.glob("*.md")):
        shutil.copy2(md_file, agents_dir / md_file.name)
        installed.append(md_file.name)

    if installed:
        print(f"  Agents: {agents_dir} ({len(installed)} copied)")
    return installed


def install_agents_link(target: Path, skill_root: Path) -> list[str]:
    """Symlink agent .md files into .cursor/agents/. Returns installed names."""
    agents_src = get_cursor_provider_dir(skill_root) / "agents"
    if not agents_src.exists():
        return []
    agents_dir = get_agents_dir(target)
    agents_dir.mkdir(parents=True, exist_ok=True)

    # Remove old constitution agents first
    for existing in agents_dir.iterdir():
        if _is_constitution_agent(existing):
            existing.unlink()

    installed: list[str] = []
    for md_file in sorted(agents_src.glob("*.md")):
        link_path = agents_dir / md_file.name
        relative_symlink(md_file, link_path)
        installed.append(f"{md_file.name} -> (symlink)")

    if installed:
        print(f"  Agents: {agents_dir} ({len(installed)} linked)")
    return installed


def freeze_agents(target: Path) -> None:
    """Replace any symlinked agent files with copies."""
    agents_dir = get_agents_dir(target)
    if not agents_dir.exists():
        return
    frozen = 0
    for item in agents_dir.iterdir():
        if _is_constitution_agent(item) and item.is_symlink():
            resolved = item.resolve()
            item.unlink()
            shutil.copy2(resolved, item)
            frozen += 1
    if frozen:
        print(f"  Agents: {frozen} frozen from symlink")


def remove_agents(target: Path) -> None:
    """Remove constitution skill agent files from .cursor/agents/."""
    agents_dir = get_agents_dir(target)
    if not agents_dir.exists():
        return
    removed = 0
    for item in agents_dir.iterdir():
        if _is_constitution_agent(item):
            item.unlink()
            removed += 1
    if removed:
        print(f"  Removed {removed} agent(s) from {agents_dir}")
    # Clean up empty agents dir
    if agents_dir.exists() and not any(agents_dir.iterdir()):
        agents_dir.rmdir()


# ---------------------------------------------------------------------------
# Install/uninstall commands
# ---------------------------------------------------------------------------

def cmd_install_copy(skill_root: Path, target: Path) -> int:
    install_dir = get_install_dir(target)
    state = detect_install_state(install_dir)

    if state == "linked":
        choice = ask_user("Currently linked. Convert to copy or abort?", "ca")
        if choice == "a":
            print("Aborted.")
            return 1
        # Remove symlinks first
        shutil.rmtree(install_dir)
    elif state == "copied":
        choice = ask_user("Already installed. Overwrite or abort?", "oa")
        if choice == "a":
            print("Aborted.")
            return 1
        shutil.rmtree(install_dir)

    install_dir.mkdir(parents=True, exist_ok=True)
    installed = copy_install(skill_root, install_dir)
    install_hooks_copy(target, skill_root)
    cmd_installed = install_commands_copy(target, skill_root)
    agents_installed = install_agents_copy(target, skill_root)

    print(f"\nInstalled (copy) to {install_dir}:")
    for item in installed:
        print(f"  {item}")
    if cmd_installed:
        print(f"\nSlash commands installed to {get_commands_dir(target)}:")
        for item in cmd_installed:
            print(f"  /{item.removesuffix('.md')}")
    if agents_installed:
        print(f"\nCustom agents installed to {get_agents_dir(target)}:")
        for item in agents_installed:
            print(f"  {item}")
    return 0


def cmd_install_link(skill_root: Path, target: Path) -> int:
    install_dir = get_install_dir(target)
    state = detect_install_state(install_dir)

    if state == "copied":
        choice = ask_user("Currently copied. Replace with links or abort?", "ra")
        if choice == "a":
            print("Aborted.")
            return 1
        shutil.rmtree(install_dir)
    elif state == "linked":
        choice = ask_user("Already linked. Refresh or abort?", "ra")
        if choice == "a":
            print("Aborted.")
            return 1
        shutil.rmtree(install_dir)

    install_dir.mkdir(parents=True, exist_ok=True)
    installed = link_install(skill_root, install_dir)
    install_hooks_link(target, skill_root)
    cmd_installed = install_commands_link(target, skill_root)
    agents_installed = install_agents_link(target, skill_root)

    print(f"\nInstalled (linked) to {install_dir}:")
    for item in installed:
        print(f"  {item}")
    if cmd_installed:
        print(f"\nSlash commands installed to {get_commands_dir(target)}:")
        for item in cmd_installed:
            print(f"  {item}")
    if agents_installed:
        print(f"\nCustom agents installed to {get_agents_dir(target)}:")
        for item in agents_installed:
            print(f"  {item}")
    print(f"\nDev mode: edits to {skill_root} are live.")
    return 0


def cmd_unlink(skill_root: Path, target: Path) -> int:
    install_dir = get_install_dir(target)
    state = detect_install_state(install_dir)

    if state != "linked":
        print(f"ERROR: Not currently linked (state: {state}).", file=sys.stderr)
        return 1

    # Resolve symlinks, remove them, copy content in place
    resolved: dict[str, Path] = {}
    for item in install_dir.iterdir():
        if item.is_symlink():
            resolved[item.name] = item.resolve()

    shutil.rmtree(install_dir)
    install_dir.mkdir(parents=True, exist_ok=True)

    installed: list[str] = []
    for name, real_path in sorted(resolved.items()):
        dst = install_dir / name
        if real_path.is_dir():
            shutil.copytree(real_path, dst)
            installed.append(f"{name}/ (frozen from symlink)")
        else:
            shutil.copy2(real_path, dst)
            installed.append(f"{name} (frozen from symlink)")

    freeze_hooks(target)
    freeze_commands(target)
    freeze_agents(target)

    print(f"\nUnlinked and frozen to {install_dir}:")
    for item in installed:
        print(f"  {item}")
    return 0


def cmd_uninstall(skill_root: Path, target: Path) -> int:
    install_dir = get_install_dir(target)
    state = detect_install_state(install_dir)

    if state == "not_installed":
        print("Not installed. Nothing to do.")
        return 0

    shutil.rmtree(install_dir)
    print(f"  Removed {install_dir}")

    # Clean up empty parent dirs
    skills_dir = install_dir.parent
    if skills_dir.exists() and not any(skills_dir.iterdir()):
        skills_dir.rmdir()

    remove_hooks(target)
    remove_commands(target)
    remove_agents(target)
    print("\nUninstalled.")
    return 0


def cmd_status(skill_root: Path, target: Path) -> int:
    install_dir = get_install_dir(target)
    state = detect_install_state(install_dir)

    print(f"Target:      {target}")
    print(f"Install dir: {install_dir}")

    if state == "not_installed":
        print("State:       not installed")
    elif state == "linked":
        skill_md = install_dir / "SKILL.md"
        link_target = skill_md.resolve().parent if skill_md.is_symlink() else None
        print(f"State:       installed (linked -> {link_target})")

        # Check for broken symlinks
        broken = []
        for item in install_dir.iterdir():
            if item.is_symlink() and not item.resolve().exists():
                broken.append(item.name)
        if broken:
            print(f"BROKEN:      {', '.join(broken)}")
    else:
        print("State:       installed (copied)")

    # Hooks state
    hooks_file = get_hooks_file(target)
    if hooks_file.is_symlink():
        link_target = hooks_file.resolve()
        print(f"Hooks:       {hooks_file} -> {link_target} (symlink)")
    elif hooks_file.exists():
        with open(hooks_file, encoding="utf-8") as f:
            data = json.load(f)
        hooks = data.get("hooks", {})
        registered = []
        for event_type, entries in hooks.items():
            for entry in entries:
                cmd = entry.get("command", "")
                if HOOK_COMMAND_PREFIX in cmd:
                    registered.append(f"  {event_type}: {cmd}")
        if registered:
            print("Hooks:       (copied)")
            for line in registered:
                print(line)
        else:
            print("Hooks:       none registered")
    else:
        print("Hooks:       no hooks.json found")

    # Commands state
    commands_dir = get_commands_dir(target)
    if commands_dir.exists():
        cmd_files = [f for f in commands_dir.iterdir() if _is_constitution_command(f)]
        if cmd_files:
            linked = any(f.is_symlink() for f in cmd_files)
            mode = "linked" if linked else "copied"
            print(f"Commands:    ({mode})")
            for f in sorted(cmd_files, key=lambda p: p.name):
                prefix = " -> (symlink)" if f.is_symlink() else ""
                print(f"  /{f.name.removesuffix('.md')}{prefix}")
        else:
            print("Commands:    none installed")
    else:
        print("Commands:    no .cursor/commands/ found")

    # Agents state
    agents_dir = get_agents_dir(target)
    if agents_dir.exists():
        agent_files = [f for f in agents_dir.iterdir() if _is_constitution_agent(f)]
        if agent_files:
            linked = any(f.is_symlink() for f in agent_files)
            mode = "linked" if linked else "copied"
            print(f"Agents:      ({mode})")
            for f in sorted(agent_files, key=lambda p: p.name):
                prefix = " -> (symlink)" if f.is_symlink() else ""
                print(f"  {f.name}{prefix}")
        else:
            print("Agents:      none installed")
    else:
        print("Agents:      no .cursor/agents/ found")

    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install the constitutional planning skill for Cursor.",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=Path.cwd(),
        help="Target project directory (default: current directory)",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--link", action="store_true", help="Dev install with symlinks")
    group.add_argument("--unlink", action="store_true", help="Convert symlinks to copies")
    group.add_argument("--uninstall", action="store_true", help="Remove skill and hooks")
    group.add_argument("--status", action="store_true", help="Show install state")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    skill_root = find_skill_root()
    target = args.target.resolve()

    if args.status:
        return cmd_status(skill_root, target)
    elif args.uninstall:
        return cmd_uninstall(skill_root, target)
    elif args.unlink:
        return cmd_unlink(skill_root, target)
    elif args.link:
        return cmd_install_link(skill_root, target)
    else:
        return cmd_install_copy(skill_root, target)


if __name__ == "__main__":
    sys.exit(main())

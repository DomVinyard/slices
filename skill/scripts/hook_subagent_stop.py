#!/usr/bin/env python3
"""
subagentStop hook for constitutional subagents (codifier, framer, ratifier).

When a constitutional subagent completes, this hook clears the activity
lock timestamp from the relevant file's frontmatter. This is a safety
net — the finalization scripts (sync_article_hash.py, promote_article.py,
promote_founding.py) also strip transient fields when the file transitions
state.

Matcher in hooks.json: "codifier|framer|ratifier".
"""

import json
from pathlib import Path
from typing import Any

from constitutional_paths import make_name, parse_state_emoji, tmp_path

FOUNDING_DRAFT = make_name("📝", ".founding")


def load_payload() -> dict[str, Any]:
    try:
        return json.load(__import__("sys").stdin)
    except Exception:
        return {}


def workspace_root(payload: dict[str, Any]) -> Path:
    roots = payload.get("workspace_roots") or []
    if roots:
        return Path(roots[0])
    return Path.cwd()


def write_frontmatter_field(path: Path, field_name: str, value: str | None) -> None:
    """Update or remove a single frontmatter field. Atomic write via tmp+rename."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return
    second = text.find("\n---\n", 4)
    if second == -1:
        return
    frontmatter = text[4:second]
    rest = text[second:]  # "\n---\n..." (closing delimiter + body)

    lines = frontmatter.splitlines()
    new_lines: list[str] = []
    found = False
    for line in lines:
        if ":" in line:
            key = line.split(":", 1)[0].strip()
            if key == field_name:
                found = True
                if value is not None:
                    new_lines.append(f"{field_name}: {value}")
                continue
        new_lines.append(line)

    if not found and value is not None:
        new_lines.append(f"{field_name}: {value}")

    updated = "---\n" + "\n".join(new_lines) + rest
    tmp = tmp_path(path)
    tmp.write_text(updated, encoding="utf-8")
    tmp.rename(path)


def _find_first_draft(amendments_dir: Path) -> Path | None:
    """Find the first draft amendment (📝) that is not the founding document."""
    if not amendments_dir.exists():
        return None
    for path in sorted(amendments_dir.iterdir()):
        if path.is_file() and parse_state_emoji(path) == "📝" and path.name != FOUNDING_DRAFT:
            return path
    return None


def main() -> int:
    payload = load_payload()
    root = workspace_root(payload)
    subagent_type = payload.get("subagent_type", "")

    if subagent_type == "codifier":
        # Clear resolution lock — file may have already transitioned to ✅ LAW
        law_path = root / ".constitution" / make_name("⏳", "LAW")
        if law_path.exists():
            write_frontmatter_field(law_path, "resolution_started_at", None)

    elif subagent_type == "framer":
        founding_path = root / ".constitution" / "amendments" / FOUNDING_DRAFT
        if founding_path.exists():
            write_frontmatter_field(founding_path, "evaluation_started_at", None)

    elif subagent_type == "ratifier":
        # Clear evaluation lock on any remaining drafts (they may have been promoted)
        amendments_dir = root / ".constitution" / "amendments"
        if amendments_dir.exists():
            for path in amendments_dir.iterdir():
                if path.is_file() and parse_state_emoji(path) == "📝" and path.name != FOUNDING_DRAFT:
                    write_frontmatter_field(path, "evaluation_started_at", None)

    print(json.dumps({}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

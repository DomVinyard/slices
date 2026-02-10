#!/usr/bin/env python3
"""
subagentStart hook for constitutional subagents (codifier, framer, ratifier).

When a constitutional subagent is spawned, this hook refreshes the
activity lock timestamp on the relevant file's frontmatter to confirm
that the subagent actually started (the stop hook sets the initial lock
before delegation).

Matcher in hooks.json: "codifier|framer|ratifier".
"""

import json
from datetime import datetime, timezone
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


def _now_iso() -> str:
    return f'"{datetime.now(timezone.utc).isoformat()}"'


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
        law_path = root / ".constitution" / make_name("⏳", "LAW")
        if law_path.exists():
            write_frontmatter_field(law_path, "resolution_started_at", _now_iso())

    elif subagent_type == "framer":
        founding_path = root / ".constitution" / "amendments" / FOUNDING_DRAFT
        if founding_path.exists():
            write_frontmatter_field(founding_path, "evaluation_started_at", _now_iso())

    elif subagent_type == "ratifier":
        draft = _find_first_draft(root / ".constitution" / "amendments")
        if draft is not None:
            write_frontmatter_field(draft, "evaluation_started_at", _now_iso())

    # Allow the subagent to start
    print(json.dumps({"decision": "allow"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

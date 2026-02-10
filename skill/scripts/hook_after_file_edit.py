#!/usr/bin/env python3

import json
from pathlib import Path
from typing import Any

from constitutional_paths import base_name, make_name, parse_state_emoji, swap_state, tmp_path


def load_payload() -> dict[str, Any]:
    try:
        return json.load(__import__("sys").stdin)
    except Exception:
        return {}


def parse_frontmatter(text: str) -> tuple[str, str, str]:
    if not text.startswith("---\n"):
        return "", "", text
    second = text.find("\n---\n", 4)
    if second == -1:
        return "", "", text
    return "---\n", text[4:second], text[second + 5 :]


def parse_map(frontmatter: str) -> tuple[dict[str, str], list[str]]:
    mapping: dict[str, str] = {}
    order: list[str] = []
    for line in frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if key not in order:
            order.append(key)
        mapping[key] = value
    return mapping, order


def write_map(path: Path, prefix: str, body: str, mapping: dict[str, str], order: list[str]) -> None:
    if "status" not in order:
        order.insert(0, "status")
    if "apply_ok_at" not in order:
        order.append("apply_ok_at")
    lines = [f"{key}: {mapping[key]}" for key in order if key in mapping]
    for key, value in mapping.items():
        if key not in order:
            lines.append(f"{key}: {value}")
    frontmatter_text = "\n".join(lines)
    path.write_text(f"{prefix}{frontmatter_text}\n---\n{body}", encoding="utf-8")


def is_draft_amendment(path: Path, root: Path) -> bool:
    try:
        relative = path.resolve().relative_to(root.resolve()).as_posix()
    except Exception:
        return False
    return relative.startswith(".constitution/amendments/") and parse_state_emoji(path) == "📝"


def main() -> int:
    payload = load_payload()
    roots = payload.get("workspace_roots") or []
    root = Path(roots[0]) if roots else Path.cwd()

    file_path_value = payload.get("file_path", "")
    if not file_path_value:
        return 0
    file_path = Path(file_path_value)
    if not file_path.is_absolute():
        file_path = (root / file_path).resolve()
    if not file_path.exists():
        return 0
    if not is_draft_amendment(file_path, root):
        return 0
    # Guard: if a ✅ sibling exists, this 📝 is a ghost — skip.
    if swap_state(file_path, "✅").exists():
        return 0

    text = file_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        return 0
    mapping, order = parse_map(frontmatter)
    status = mapping.get("status", "").strip('"').strip("'").lower()
    if status in ("draft", "review"):
        mapping["apply_ok_at"] = '"⏳"'
        write_map(file_path, prefix, body, mapping, order)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

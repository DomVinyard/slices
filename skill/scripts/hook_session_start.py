#!/usr/bin/env python3
"""sessionStart hook: injects LAW content into every new agent session."""

import json
import sys
from pathlib import Path
from typing import Any

from constitutional_paths import discover_law


def load_payload() -> dict[str, Any]:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def workspace_root(payload: dict[str, Any]) -> Path:
    roots = payload.get("workspace_roots") or []
    if roots:
        return Path(roots[0])
    return Path.cwd()


def extract_body(text: str) -> str:
    """Strip YAML frontmatter, return trimmed body."""
    if text.startswith("---\n"):
        second = text.find("\n---\n", 4)
        if second != -1:
            text = text[second + 5:]
    return text.strip()


def main() -> int:
    payload = load_payload()
    root = workspace_root(payload)

    result = discover_law(root)
    if result is None:
        # No law file at all — inject nothing
        print(json.dumps({}))
        return 0

    law_path, state = result

    if state == "corrupted":
        # Corrupted law — inject nothing useful
        print(json.dumps({}))
        return 0

    body = extract_body(law_path.read_text(encoding="utf-8"))
    if not body:
        print(json.dumps({}))
        return 0

    message = f'<constitutional_law status="{state}">\n{body}\n</constitutional_law>'

    print(json.dumps({"additional_context": message}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

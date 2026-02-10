#!/usr/bin/env python3
"""
subagentStop hook for the codifier subagent.

When a codifier subagent completes, this hook clears all pending tokens
and authorized conversations from .constitution/.runtime.json.

This is a safety net — sync_article_hash.py also clears runtime state
after successful LAW sync.

Matcher in hooks.json ensures this only fires for subagent_type == "codifier".
"""

import json
from pathlib import Path
from typing import Any


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


def main() -> int:
    payload = load_payload()
    root = workspace_root(payload)
    runtime_path = root / ".constitution" / ".runtime.json"

    if not runtime_path.exists():
        print(json.dumps({}))
        return 0

    # Clear all authorization state
    data = {"pending_tokens": [], "authorized": {}}
    tmp = runtime_path.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        tmp.rename(runtime_path)
    except OSError:
        pass

    print(json.dumps({}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

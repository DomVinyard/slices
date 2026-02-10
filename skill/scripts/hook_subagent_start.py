#!/usr/bin/env python3
"""
subagentStart hook for the constitutional-reconciler subagent.

When a constitutional-reconciler subagent is spawned, this hook generates
a pending authorization token in .constitution/.runtime.json. The token
is later claimed by the subagent's preToolUse hook on first LAW write.

Matcher in hooks.json ensures this only fires for subagent_type == "constitutional-reconciler".
"""

import json
import uuid
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


def load_runtime(runtime_path: Path) -> dict[str, Any]:
    """Load .runtime.json or return empty state."""
    if runtime_path.exists():
        try:
            with open(runtime_path, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {"pending_tokens": [], "authorized": {}}


def save_runtime(runtime_path: Path, data: dict[str, Any]) -> None:
    """Write .runtime.json atomically."""
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = runtime_path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    tmp.rename(runtime_path)


def main() -> int:
    payload = load_payload()
    root = workspace_root(payload)
    runtime_path = root / ".constitution" / ".runtime.json"

    # Generate a pending token for this reconciliation subagent
    token = str(uuid.uuid4())
    runtime = load_runtime(runtime_path)
    runtime.setdefault("pending_tokens", []).append(token)
    save_runtime(runtime_path, runtime)

    # Allow the subagent to start
    print(json.dumps({"decision": "allow"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

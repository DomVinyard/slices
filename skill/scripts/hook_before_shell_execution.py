#!/usr/bin/env python3

import json
import re
import shlex
from pathlib import Path
from typing import Any

from constitutional_paths import base_name, parse_state_emoji


READ_ONLY_BINARIES = {"ls", "rg", "grep", "cat", "head", "tail", "wc", "stat"}
MUTATING_TOKEN_PATTERN = re.compile(
    r"\b(rm|mv|cp|touch|sed|perl|tee|truncate|dd|ln|chmod|chown|git)\b"
)
AMENDMENT_STATUS_PATTERN = re.compile(r"^(?:(?P<state>✅|📝) )?(?P<ts>\d{14})$")


def load_payload() -> dict[str, Any]:
    try:
        return json.load(__import__("sys").stdin)
    except Exception:
        return {}


def mentions_constitutional_files(command: str, root: Path) -> bool:
    """Check if command mentions amendments, .founding, or LAW."""
    amendments_rel = ".constitution/amendments"
    amendments_abs = str((root / ".constitution" / "amendments").resolve())
    if amendments_rel in command or amendments_abs in command:
        return True
    if ".founding" in command:
        return True
    if "LAW" in command:
        return True
    return False


def is_read_only_command(command: str) -> bool:
    if ">" in command or ">>" in command or "|" in command:
        return False

    try:
        tokens = shlex.split(command)
    except Exception:
        return False

    if not tokens:
        return True
    cmd = Path(tokens[0]).name
    return cmd in READ_ONLY_BINARIES


def is_promotion_script_command(command: str) -> bool:
    try:
        tokens = shlex.split(command)
    except Exception:
        return False
    if len(tokens) < 2:
        return False
    cmd = Path(tokens[0]).name
    if cmd not in {"python", "python3", "uv", "uvx"}:
        return False
    allowed_scripts = {
        "promote_article.py",
        "stamp_apply_ok_at.py",
        "apply_suitability_result.py",
        "promote_founding.py",
        "apply_founding_result.py",
        "sync_article_hash.py",
        "verify_kernel_hash.py",
    }
    return any(any(name in token for name in allowed_scripts) for token in tokens[1:])


def normalize_path(root: Path, path_like: str) -> Path:
    path = Path(path_like)
    if path.is_absolute():
        return path.resolve()
    return (root / path).resolve()


def parse_amendment_status(path: Path) -> tuple[str, str] | None:
    match = AMENDMENT_STATUS_PATTERN.match(path.name)
    if not match:
        return None
    ts = match.group("ts")
    state = match.group("state") or ""
    return ts, state


def is_status_only_amendment_rename(command: str, root: Path) -> bool:
    try:
        tokens = shlex.split(command)
    except Exception:
        return False
    if len(tokens) != 3:
        return False
    if Path(tokens[0]).name != "mv":
        return False

    src = normalize_path(root, tokens[1])
    dst = normalize_path(root, tokens[2])
    amendments_dir = (root / ".constitution" / "amendments").resolve()
    try:
        src.relative_to(amendments_dir)
        dst.relative_to(amendments_dir)
    except Exception:
        return False

    src_meta = parse_amendment_status(src)
    dst_meta = parse_amendment_status(dst)
    if src_meta is None or dst_meta is None:
        return False
    src_ts, src_state = src_meta
    dst_ts, dst_state = dst_meta
    if src_ts != dst_ts:
        return False

    # Status transitions allowed via direct shell mv: only unsuffixed->draft.
    # Promotion to accepted must run through the promotion script.
    allowed = src_state == "" and dst_state == "📝"
    return allowed


def main() -> int:
    payload = load_payload()
    command = payload.get("command", "")
    roots = payload.get("workspace_roots") or []
    root = Path(roots[0]) if roots else Path.cwd()

    if not mentions_constitutional_files(command, root):
        print(json.dumps({"permission": "allow"}))
        return 0

    if is_read_only_command(command):
        print(json.dumps({"permission": "allow"}))
        return 0

    if is_promotion_script_command(command):
        print(json.dumps({"permission": "allow"}))
        return 0

    if is_status_only_amendment_rename(command, root):
        print(json.dumps({"permission": "allow"}))
        return 0

    if MUTATING_TOKEN_PATTERN.search(command) or not is_read_only_command(command):
        print(
            json.dumps(
                {
                    "permission": "deny",
                    "user_message": "Constitutional law: accepted amendments and ✅ .founding are immutable. LAW is managed by constitutional scripts. You may append new draft amendments (📝). Promotion to ✅ is reserved for constitutional procedures.",
                    "agent_message": "Apply constitutional policy: append new amendments as drafts, treat ✅ as immutable, LAW and .founding are managed by scripts only.",
                }
            )
        )
        return 0

    print(json.dumps({"permission": "allow"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

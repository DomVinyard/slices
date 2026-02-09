#!/usr/bin/env python3

import json
import re
import shlex
from pathlib import Path
from typing import Any


READ_ONLY_BINARIES = {"ls", "rg", "grep", "cat", "head", "tail", "wc", "stat"}
MUTATING_TOKEN_PATTERN = re.compile(
    r"\b(rm|mv|cp|touch|sed|perl|tee|truncate|dd|ln|chmod|chown|git)\b"
)
ARTICLE_STATUS_PATTERN = re.compile(r"^(?P<ts>\d{14})(?:\.(?P<state>✅|📝))?\.md$")


def load_payload() -> dict[str, Any]:
    try:
        return json.load(__import__("sys").stdin)
    except Exception:
        return {}


def mentions_articles(command: str, root: Path) -> bool:
    articles_rel = ".constitution/.articles"
    articles_abs = str((root / ".constitution" / ".articles").resolve())
    return articles_rel in command or articles_abs in command


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
    }
    return any(any(name in token for name in allowed_scripts) for token in tokens[1:])


def normalize_path(root: Path, path_like: str) -> Path:
    path = Path(path_like)
    if path.is_absolute():
        return path.resolve()
    return (root / path).resolve()


def parse_article_status(path: Path) -> tuple[str, str] | None:
    match = ARTICLE_STATUS_PATTERN.match(path.name)
    if not match:
        return None
    ts = match.group("ts")
    state = match.group("state") or ""
    return ts, state


def is_status_only_article_rename(command: str, root: Path) -> bool:
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
    articles_dir = (root / ".constitution" / ".articles").resolve()
    try:
        src.relative_to(articles_dir)
        dst.relative_to(articles_dir)
    except Exception:
        return False

    src_meta = parse_article_status(src)
    dst_meta = parse_article_status(dst)
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

    if not mentions_articles(command, root):
        print(json.dumps({"permission": "allow"}))
        return 0

    if is_read_only_command(command):
        print(json.dumps({"permission": "allow"}))
        return 0

    if is_promotion_script_command(command):
        print(json.dumps({"permission": "allow"}))
        return 0

    if is_status_only_article_rename(command, root):
        print(json.dumps({"permission": "allow"}))
        return 0

    if MUTATING_TOKEN_PATTERN.search(command) or not is_read_only_command(command):
        print(
            json.dumps(
                {
                    "permission": "deny",
                    "user_message": "Constitutional law: accepted articles are immutable commitments. You may append new articles and apply status-only rename pending -> 📝. Promotion to ✅ is reserved for the constitutional acceptance procedure. Other edits, deletions, or arbitrary renames are denied.",
                    "agent_message": "Apply constitutional policy only: append new articles, allow pending -> 📝 status rename, and treat ✅ as immutable commitments. Do not mutate or arbitrarily rename article records.",
                }
            )
        )
        return 0

    print(json.dumps({"permission": "allow"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

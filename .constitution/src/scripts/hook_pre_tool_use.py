#!/usr/bin/env python3

import json
import re
import hashlib
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


def collect_paths(value: Any) -> list[str]:
    results: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"path", "file_path", "target_notebook"} and isinstance(child, str):
                results.append(child)
            else:
                results.extend(collect_paths(child))
    elif isinstance(value, list):
        for child in value:
            results.extend(collect_paths(child))
    return results


def collect_article_paths_from_text(value: Any) -> list[str]:
    text = json.dumps(value)
    matches = re.findall(r"\.constitution/\.articles/[^\s\"']+\.md", text)
    return matches


def contains_status_accepted_update(value: Any) -> bool:
    text = json.dumps(value)
    return bool(
        re.search(
            r"status\s*:\s*[\"']?accepted[\"']?",
            text,
            flags=re.IGNORECASE,
        )
    )


def contains_valid_draft_frontmatter(value: Any) -> bool:
    text = json.dumps(value)
    return bool(
        re.search(
            r"---\s*\\n(?:.*\\n)*?\s*status\s*:\s*draft\s*\\n(?:.*\\n)*?---\s*\\n",
            text,
            flags=re.IGNORECASE,
        )
    )


def normalize_path(root: Path, path_like: str) -> Path:
    path = Path(path_like)
    if path.is_absolute():
        return path
    return (root / path).resolve()


def is_article_markdown(path: Path, root: Path) -> bool:
    try:
        relative = path.resolve().relative_to(root.resolve()).as_posix()
    except Exception:
        return False
    return relative.startswith(".constitution/.articles/") and relative.endswith(".md")


def article_state(path: Path) -> str:
    name = path.name
    if name.endswith(".✅.md"):
        return "accepted"
    if name.endswith(".📝.md"):
        return "draft"
    return "pending"


def parse_frontmatter(text: str) -> tuple[str, str, str]:
    if not text.startswith("---\n"):
        return "", "", text
    second = text.find("\n---\n", 4)
    if second == -1:
        return "", "", text
    return "---\n", text[4:second], text[second + 5 :]


def list_markdown_files(directory: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in directory.glob("*.md")
            if path.is_file() and path.name != ".gitkeep"
        ]
    )


def list_accepted_article_files(directory: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in list_markdown_files(directory)
            if path.name.endswith(".✅.md")
        ]
    )


def extract_body_without_frontmatter(text: str) -> str:
    if text.startswith("---\n"):
        second_delimiter = text.find("\n---\n", 4)
        if second_delimiter != -1:
            text = text[second_delimiter + 5 :]
    return text.strip()


def compute_articles_hash(root: Path) -> str:
    articles_dir = root / ".constitution" / ".articles"
    digest = hashlib.sha256()
    for path in list_accepted_article_files(articles_dir):
        relative = path.resolve().relative_to(root.resolve()).as_posix()
        digest.update(f"FILE:{relative}\n".encode("utf-8"))
        content = extract_body_without_frontmatter(path.read_text(encoding="utf-8"))
        digest.update(content.encode("utf-8"))
        digest.update(b"\n\x1e\n")
    return digest.hexdigest()


def parse_frontmatter_map(frontmatter: str) -> tuple[dict[str, str], list[str]]:
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


def write_frontmatter(path: Path, prefix: str, body: str, mapping: dict[str, str], order: list[str]) -> None:
    if "status" not in order:
        order.insert(0, "status")
    for key in ["stale_reason", "stale_since_hash", "stale_article_path"]:
        if key in mapping and key not in order:
            order.append(key)

    new_frontmatter_lines = [f"{key}: {mapping[key]}" for key in order if key in mapping]
    for key, value in mapping.items():
        if key not in order:
            new_frontmatter_lines.append(f"{key}: {value}")
    new_frontmatter = "\n".join(new_frontmatter_lines)
    updated = f"{prefix}{new_frontmatter}\n---\n{body}"
    path.write_text(updated, encoding="utf-8")


def update_law_to_stale(root: Path, article_path: Path) -> None:
    law_dir = root / ".constitution" / ".law"
    if not law_dir.exists():
        return
    relative_article = article_path.resolve().relative_to(root.resolve()).as_posix()

    for path in sorted(law_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        prefix, frontmatter, body = parse_frontmatter(text)
        if not prefix:
            continue

        mapping, order = parse_frontmatter_map(frontmatter)

        current_hash = mapping.get("articles_hash", '""').strip('"').strip("'")
        mapping["status"] = "stale"
        mapping["stale_reason"] = "article_added"
        mapping["stale_since_hash"] = f'"{current_hash}"'
        mapping["stale_article_path"] = f'"{relative_article}"'

        write_frontmatter(path, prefix, body, mapping, order)


def mark_law_stale_if_drift(root: Path) -> None:
    law_dir = root / ".constitution" / ".law"
    if not law_dir.exists():
        return

    current_articles_hash = compute_articles_hash(root)
    for path in sorted(law_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        prefix, frontmatter, body = parse_frontmatter(text)
        if not prefix:
            continue
        mapping, order = parse_frontmatter_map(frontmatter)
        law_hash = mapping.get("articles_hash", "").strip('"').strip("'")
        status = mapping.get("status", "").strip('"').strip("'")
        if status == "pending_input":
            # Pending clarification is a hard blocker and must not be overwritten by drift marking.
            continue
        if law_hash == current_articles_hash and status != "stale":
            continue
        if status == "stale" and mapping.get("stale_reason") == "article_added":
            continue
        mapping["status"] = "stale"
        mapping["stale_reason"] = "articles_drift_detected"
        mapping["stale_since_hash"] = f'"{law_hash}"'
        if "stale_article_path" in mapping:
            del mapping["stale_article_path"]
        write_frontmatter(path, prefix, body, mapping, order)


def deny(reason: str) -> None:
    print(json.dumps({"decision": "deny", "reason": reason}))


def allow() -> None:
    print(json.dumps({"decision": "allow"}))


def main() -> int:
    payload = load_payload()
    root = workspace_root(payload)
    mark_law_stale_if_drift(root)
    tool_input = payload.get("tool_input", {})
    path_values = collect_paths(tool_input)
    path_values.extend(collect_article_paths_from_text(tool_input))
    normalized = [normalize_path(root, item) for item in path_values]
    article_paths = [path for path in normalized if is_article_markdown(path, root)]

    if not article_paths:
        allow()
        return 0

    existing = [path for path in article_paths if path.exists()]
    if existing:
        states = {article_state(path) for path in existing}
        if states == {"draft"}:
            if contains_status_accepted_update(tool_input):
                deny(
                    "Constitutional law: draft articles may advance to review, but acceptance (✅) is reserved for the constitutional acceptance procedure."
                )
                return 0
            allow()
            return 0
        deny(
            "Constitutional law: accepted articles (✅) are immutable commitments. Draft articles (📝) are editable. Existing non-draft article records cannot be edited."
        )
        return 0

    # New article files must be draft files and include status:draft frontmatter.
    new_state = article_state(article_paths[0])
    if new_state != "draft":
        deny(
            "Constitutional law: new article records must begin in draft filename state (.📝.md)."
        )
        return 0
    if not contains_valid_draft_frontmatter(tool_input):
        deny(
            "Constitutional law: new draft article records must include frontmatter with status: draft."
        )
        return 0

    allow()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

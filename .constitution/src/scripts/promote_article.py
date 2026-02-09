#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote a draft article from 📝 to ✅ and stale law."
    )
    parser.add_argument("--article", required=True, help="Path to draft article file")
    return parser.parse_args()


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
    frontmatter = "\n".join([f"{k}: {mapping[k]}" for k in order if k in mapping])
    path.write_text(f"{prefix}{frontmatter}\n---\n{body}", encoding="utf-8")


def normalized_body_hash(body: str) -> str:
    normalized = body.strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def mark_law_stale(repo_root: Path, accepted_article_relative: str) -> None:
    law_dir = repo_root / ".constitution" / ".law"
    if not law_dir.exists():
        return
    for law_file in sorted(law_dir.glob("*.md")):
        text = law_file.read_text(encoding="utf-8")
        prefix, frontmatter, body = parse_frontmatter(text)
        if not prefix:
            continue
        mapping, order = parse_map(frontmatter)
        current_hash = mapping.get("articles_hash", '""').strip('"').strip("'")
        mapping["status"] = "stale"
        mapping["stale_reason"] = "article_accepted"
        mapping["stale_since_hash"] = f'"{current_hash}"'
        mapping["stale_article_path"] = f'"{accepted_article_relative}"'
        write_map(law_file, prefix, body, mapping, order)


def normalize_article_path(repo_root: Path, article_arg: str) -> Path:
    path = Path(article_arg)
    if path.is_absolute():
        return path.resolve()
    return (repo_root / path).resolve()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[3]
    article_path = normalize_article_path(repo_root, args.article)

    if not article_path.exists():
        raise FileNotFoundError(f"Article not found: {article_path}")
    if not article_path.name.endswith(".📝.md"):
        raise ValueError("Promotion requires a draft article filename ending with .📝.md")

    text = article_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        raise ValueError("Draft article must include frontmatter with status.")
    mapping, order = parse_map(frontmatter)
    status = mapping.get("status", "").strip('"').strip("'").lower()
    if status != "review":
        raise ValueError("Draft article status must be 'review' before promotion.")
    apply_ok_at = mapping.get("apply_ok_at", "").strip('"').strip("'")
    expected_hash = normalized_body_hash(body)
    if apply_ok_at != expected_hash:
        raise ValueError(
            "Draft article apply_ok_at must match the current trimmed body hash before promotion."
        )

    mapping["status"] = "accepted"
    write_map(article_path, prefix, body, mapping, order)

    accepted_path = article_path.with_name(article_path.name.replace(".📝.md", ".✅.md"))
    article_path.rename(accepted_path)
    relative = accepted_path.relative_to(repo_root).as_posix()
    mark_law_stale(repo_root, relative)
    print(f"promoted_article={relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

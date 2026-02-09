#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Set draft article apply_ok_at marker (pending or current body hash)."
    )
    parser.add_argument("--article", required=True, help="Path to draft article (.📝.md)")
    parser.add_argument(
        "--state",
        required=True,
        choices=["pending", "ok"],
        help="pending => apply_ok_at=⏳, ok => apply_ok_at=<current_body_hash>",
    )
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
    if "apply_ok_at" not in order:
        order.append("apply_ok_at")
    frontmatter = "\n".join([f"{k}: {mapping[k]}" for k in order if k in mapping])
    path.write_text(f"{prefix}{frontmatter}\n---\n{body}", encoding="utf-8")


def normalize_article_path(repo_root: Path, article_arg: str) -> Path:
    path = Path(article_arg)
    if path.is_absolute():
        return path.resolve()
    return (repo_root / path).resolve()


def body_hash(body: str) -> str:
    normalized = body.strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[3]
    article_path = normalize_article_path(repo_root, args.article)

    if not article_path.exists():
        raise FileNotFoundError(f"Article not found: {article_path}")
    if not article_path.name.endswith(".📝.md"):
        raise ValueError("apply_ok_at stamping requires a draft article filename ending with .📝.md")

    text = article_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        raise ValueError("Draft article must include frontmatter.")
    mapping, order = parse_map(frontmatter)

    if args.state == "pending":
        mapping["apply_ok_at"] = '"⏳"'
    else:
        mapping["apply_ok_at"] = f'"{body_hash(body)}"'

    write_map(article_path, prefix, body, mapping, order)
    value = mapping["apply_ok_at"].strip('"')
    print(f"apply_ok_at={value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

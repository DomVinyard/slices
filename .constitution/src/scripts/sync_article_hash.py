#!/usr/bin/env python3

import hashlib
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ARTICLES_DIR = REPO_ROOT / ".constitution" / ".articles"
LAW_DIR_CANDIDATES = [
    REPO_ROOT / ".constitution" / ".law",
    REPO_ROOT / ".constitution" / ".kernel",
    REPO_ROOT / ".constitution" / ".kernal",
]


def discover_law_dir() -> Path:
    for path in LAW_DIR_CANDIDATES:
        if path.exists() and path.is_dir():
            return path
    raise FileNotFoundError("No law directory found (.law, .kernel, or .kernal).")


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


def compute_articles_hash() -> str:
    article_files = list_accepted_article_files(ARTICLES_DIR)
    digest = hashlib.sha256()
    for path in article_files:
        relative = path.relative_to(REPO_ROOT).as_posix()
        content = extract_body_without_frontmatter(path.read_text(encoding="utf-8"))
        digest.update(f"FILE:{relative}\n".encode("utf-8"))
        digest.update(content.encode("utf-8"))
        digest.update(b"\n\x1e\n")
    return digest.hexdigest()


def parse_frontmatter_parts(text: str) -> tuple[str, str, str]:
    if not text.startswith("---\n"):
        raise ValueError("File is missing opening frontmatter delimiter.")
    second_delimiter = text.find("\n---\n", 4)
    if second_delimiter == -1:
        raise ValueError("File is missing closing frontmatter delimiter.")

    frontmatter = text[4:second_delimiter]
    body = text[second_delimiter + 5 :]
    return "---\n", frontmatter, body


def upsert_articles_hash(frontmatter: str, new_hash: str) -> str:
    lines = frontmatter.splitlines()
    key_values: dict[str, str] = {}
    order: list[str] = []

    for line in lines:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if key not in order:
            order.append(key)
        key_values[key] = value

    key_values["articles_hash"] = f'"{new_hash}"'
    key_values["status"] = "active"
    for key in ["stale_reason", "stale_since_hash", "stale_article_path", "pending_reason_code"]:
        if key in key_values:
            del key_values[key]

    if "articles_hash" not in order:
        order.append("articles_hash")
    if "status" not in order:
        order.insert(0, "status")

    updated: list[str] = []
    for key in order:
        if key in key_values:
            updated.append(f"{key}: {key_values[key]}")

    for key, value in key_values.items():
        if key not in order:
            updated.append(f"{key}: {value}")
    return "\n".join(updated)


def main() -> int:
    law_dir = discover_law_dir()
    kernel_files = list_markdown_files(law_dir)
    article_hash = compute_articles_hash()

    for path in kernel_files:
        text = path.read_text(encoding="utf-8")
        prefix, frontmatter, body = parse_frontmatter_parts(text)
        updated_frontmatter = upsert_articles_hash(frontmatter, article_hash)
        updated_text = f"{prefix}{updated_frontmatter}\n---\n{body}"
        path.write_text(updated_text, encoding="utf-8")
        print(f"updated: {path.relative_to(REPO_ROOT).as_posix()}")

    print(f"articles_hash: {article_hash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

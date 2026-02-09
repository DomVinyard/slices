#!/usr/bin/env python3

import hashlib
import json
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


def read_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}
    second_delimiter = text.find("\n---\n", 4)
    if second_delimiter == -1:
        return {}

    frontmatter = text[4:second_delimiter]
    result: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def main() -> int:
    law_dir = discover_law_dir()
    kernel_files = list_markdown_files(law_dir)
    current_hash = compute_articles_hash()
    print(f"current_articles_hash={current_hash}")

    mismatches = 0
    for path in kernel_files:
        data = read_frontmatter(path)
        expected = data.get("articles_hash")
        status = data.get("status")
        relative = path.relative_to(REPO_ROOT).as_posix()

        if status == "stale":
            mismatches += 1
            diagnostic = {
                "code": "LAW_STALE",
                "path": relative,
                "status": status,
                "current_articles_hash": current_hash,
            }
            print(f"DIAGNOSTIC={json.dumps(diagnostic, sort_keys=True)}")
            print(f"FAIL  {relative}  status=stale")
            continue
        if status == "pending_input":
            mismatches += 1
            diagnostic = {
                "code": "LAW_PENDING_INPUT",
                "path": relative,
                "status": status,
                "pending_reason_code": data.get("pending_reason_code"),
                "current_articles_hash": current_hash,
            }
            print(f"DIAGNOSTIC={json.dumps(diagnostic, sort_keys=True)}")
            print(f"FAIL  {relative}  status=pending_input")
            continue

        if expected == current_hash:
            print(f"OK    {relative}  articles_hash={expected} status={status}")
        else:
            mismatches += 1
            diagnostic = {
                "code": "HASH_MISMATCH",
                "path": relative,
                "articles_hash_in_law": expected,
                "current_articles_hash": current_hash,
                "status": status,
            }
            print(f"DIAGNOSTIC={json.dumps(diagnostic, sort_keys=True)}")
            print(
                f"FAIL  {relative}  articles_hash={expected}  expected={current_hash}"
            )

    if mismatches == 0:
        print("RESULT=PASS")
        return 0

    print("RESULT=FAIL")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

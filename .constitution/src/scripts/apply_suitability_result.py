#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply constitutional suitability result to draft article frontmatter."
    )
    parser.add_argument("--article", required=True, help="Path to draft article (.📝.md)")
    parser.add_argument("--result", required=True, choices=["APPLY_OK", "NEEDS_INPUT"])
    parser.add_argument("--reason-code", default="")
    parser.add_argument("--request", default="")
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
    lines = [f"{key}: {mapping[key]}" for key in order if key in mapping]
    for key, value in mapping.items():
        if key not in order:
            lines.append(f"{key}: {value}")
    text = "\n".join(lines)
    path.write_text(f"{prefix}{text}\n---\n{body}", encoding="utf-8")


def body_hash(body: str) -> str:
    return hashlib.sha256(body.strip().encode("utf-8")).hexdigest()


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
        raise ValueError("Suitability result can be applied only to draft (.📝.md) articles.")

    text = article_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        raise ValueError("Draft article must include frontmatter.")
    mapping, order = parse_map(frontmatter)

    if args.result == "APPLY_OK":
        if mapping.get("status", "").strip('"').strip("'").lower() == "needs_input":
            mapping["status"] = "draft"
        mapping["apply_ok_at"] = f'"{body_hash(body)}"'
        for key in ["needs_input_reason_code", "needs_input_request"]:
            if key in mapping:
                del mapping[key]
        print("suitability_applied=APPLY_OK")
    else:
        if not args.reason_code or not args.request:
            raise ValueError("NEEDS_INPUT requires --reason-code and --request.")
        mapping["status"] = "needs_input"
        mapping["apply_ok_at"] = '"❌"'
        mapping["needs_input_reason_code"] = f'"{args.reason_code}"'
        mapping["needs_input_request"] = f'"{args.request}"'
        print("suitability_applied=NEEDS_INPUT")

    write_map(article_path, prefix, body, mapping, order)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

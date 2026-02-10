#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path

from constitutional_paths import discover_founding, make_name


def _find_repo_root() -> Path:
    """Walk up from script location to find repo root (contains .constitution/)."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / ".constitution").is_dir():
            return current
        current = current.parent
    return Path.cwd()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply founding suitability result to founding document."
    )
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


def main() -> int:
    args = parse_args()
    repo_root = _find_repo_root()
    result = discover_founding(repo_root)
    if result is None:
        raise FileNotFoundError("No founding document found.")

    founding_path, founding_state = result

    if founding_state == "founding":
        raise ValueError("Founding document is already accepted (✅ .founding) and is immutable.")

    text = founding_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        raise ValueError("Founding document must include frontmatter.")
    mapping, order = parse_map(frontmatter)

    if args.result == "APPLY_OK":
        mapping["apply_ok_at"] = f'"{body_hash(body)}"'
        for key in ["needs_input_reason_code", "needs_input_request", "status"]:
            if key in mapping:
                del mapping[key]
                if key in order:
                    order.remove(key)
        write_map(founding_path, prefix, body, mapping, order)
        # Deterministic rename: draft -> review
        review_path = repo_root / ".constitution" / "amendments" / make_name("⏳", ".founding")
        if founding_path != review_path:
            founding_path.rename(review_path)
        print("founding_suitability_applied=APPLY_OK")
    else:
        if not args.reason_code or not args.request:
            raise ValueError("NEEDS_INPUT requires --reason-code and --request.")
        mapping["apply_ok_at"] = '"❌"'
        mapping["needs_input_reason_code"] = f'"{args.reason_code}"'
        mapping["needs_input_request"] = f'"{args.request}"'
        if "status" in mapping:
            del mapping["status"]
            if "status" in order:
                order.remove("status")
        write_map(founding_path, prefix, body, mapping, order)
        # If in review, go back to draft
        if founding_state == "review":
            draft_path = repo_root / ".constitution" / "amendments" / make_name("📝", ".founding")
            founding_path.rename(draft_path)
        print("founding_suitability_applied=NEEDS_INPUT")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

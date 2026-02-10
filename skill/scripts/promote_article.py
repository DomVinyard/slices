#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path


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
        description="Promote a draft amendment from 📝 to ✅ and mark law resolving."
    )
    parser.add_argument("--article", required=True, help="Path to draft amendment file")
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
    frontmatter = "\n".join([f"{k}: {mapping[k]}" for k in order if k in mapping])
    path.write_text(f"{prefix}{frontmatter}\n---\n{body}", encoding="utf-8")


def normalized_body_hash(body: str) -> str:
    normalized = body.strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def mark_law_stale(repo_root: Path, accepted_amendment_relative: str) -> None:
    """Rename LAW.✅ to LAW.⏳ and update stale metadata in frontmatter."""
    constitution_dir = repo_root / ".constitution"
    active_law = constitution_dir / "LAW.✅"
    if not active_law.exists():
        return
    text = active_law.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        return
    mapping, order = parse_map(frontmatter)
    mapping["stale_reason"] = "amendment_accepted"
    mapping["stale_amendment_path"] = f'"{accepted_amendment_relative}"'
    # Remove status field (state is in filename)
    if "status" in mapping:
        del mapping["status"]
    if "status" in order:
        order.remove("status")
    write_map(active_law, prefix, body, mapping, order)
    # Deterministic rename: active -> resolving
    resolving_law = constitution_dir / "LAW.⏳"
    active_law.rename(resolving_law)


def normalize_amendment_path(repo_root: Path, article_arg: str) -> Path:
    path = Path(article_arg)
    if path.is_absolute():
        return path.resolve()
    return (repo_root / path).resolve()


def main() -> int:
    args = parse_args()
    repo_root = _find_repo_root()
    amendment_path = normalize_amendment_path(repo_root, args.article)

    # Idempotency: if .✅ already exists, promotion already happened.
    accepted_path = amendment_path.with_suffix(".✅")
    if accepted_path.exists():
        relative = accepted_path.relative_to(repo_root).as_posix()
        print(f"promoted_amendment={relative}")
        return 0

    if not amendment_path.exists():
        raise FileNotFoundError(f"Amendment not found: {amendment_path}")
    if amendment_path.suffix != ".📝":
        raise ValueError("Promotion requires a draft amendment with .📝 suffix")

    text = amendment_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        raise ValueError("Draft amendment must include frontmatter.")
    mapping, order = parse_map(frontmatter)
    status = mapping.get("status", "").strip('"').strip("'").lower()
    if status != "review":
        raise ValueError("Draft amendment status must be 'review' before promotion.")
    apply_ok_at = mapping.get("apply_ok_at", "").strip('"').strip("'")
    expected_hash = normalized_body_hash(body)
    if apply_ok_at != expected_hash:
        raise ValueError(
            "Draft amendment apply_ok_at must match the current trimmed body hash before promotion."
        )

    # Remove transient fields (state is in filename)
    for key in ["status", "evaluation_started_at"]:
        if key in mapping:
            del mapping[key]
        if key in order:
            order.remove(key)
    write_map(amendment_path, prefix, body, mapping, order)

    amendment_path.rename(accepted_path)
    # Post-rename ghost cleanup: if a race recreated .📝, remove it.
    if amendment_path.exists():
        amendment_path.unlink()
    relative = accepted_path.relative_to(repo_root).as_posix()
    mark_law_stale(repo_root, relative)
    print(f"promoted_amendment={relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

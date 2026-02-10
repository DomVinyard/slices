#!/usr/bin/env python3

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


def discover_founding(root: Path) -> tuple[Path, str] | None:
    """Returns (path, state) or None. States: founding, review, draft."""
    amendments_dir = root / ".constitution" / "amendments"
    for state, suffix in [("founding", ".✅"), ("review", ".⏳"), ("draft", ".📝")]:
        p = amendments_dir / f".founding{suffix}"
        if p.exists():
            return p, state
    return None


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
    lines = [f"{key}: {mapping[key]}" for key in order if key in mapping]
    for key, value in mapping.items():
        if key not in order:
            lines.append(f"{key}: {value}")
    text = "\n".join(lines)
    path.write_text(f"{prefix}{text}\n---\n{body}", encoding="utf-8")


def body_hash(body: str) -> str:
    return hashlib.sha256(body.strip().encode("utf-8")).hexdigest()


def main() -> int:
    repo_root = _find_repo_root()
    result = discover_founding(repo_root)
    if result is None:
        raise FileNotFoundError("No founding document found.")

    founding_path, founding_state = result

    if founding_state == "founding":
        raise ValueError("Founding document is already accepted (.founding.✅).")
    if founding_state != "review":
        raise ValueError(
            f"Founding document must be in review state (.founding.⏳), found: {founding_path.name}"
        )

    text = founding_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        raise ValueError("Founding document must include frontmatter.")
    mapping, order = parse_map(frontmatter)

    apply_ok_at = mapping.get("apply_ok_at", "").strip('"').strip("'")
    expected_hash = body_hash(body)
    if apply_ok_at != expected_hash:
        raise ValueError(
            "Founding document apply_ok_at must match the current trimmed body hash before promotion."
        )

    # Clean up transient fields
    for key in ["needs_input_reason_code", "needs_input_request", "status", "apply_ok_at", "evaluation_started_at"]:
        if key in mapping:
            del mapping[key]
            if key in order:
                order.remove(key)

    write_map(founding_path, prefix, body, mapping, order)

    # Deterministic rename: review -> founding
    accepted_path = repo_root / ".constitution" / "amendments" / ".founding.✅"
    founding_path.rename(accepted_path)
    relative = accepted_path.relative_to(repo_root).as_posix()
    print(f"promoted_founding={relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

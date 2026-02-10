#!/usr/bin/env python3

import json
from pathlib import Path

from constitutional_paths import (
    compute_amendments_hash,
    discover_law,
    make_name,
)


def _find_repo_root() -> Path:
    """Walk up from script location to find repo root (contains .constitution/)."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / ".constitution").is_dir():
            return current
        current = current.parent
    return Path.cwd()


REPO_ROOT = _find_repo_root()
CONSTITUTION_DIR = REPO_ROOT / ".constitution"
AMENDMENTS_DIR = CONSTITUTION_DIR / "amendments"


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
    result = discover_law(REPO_ROOT)
    if result is None:
        print("DIAGNOSTIC={\"code\":\"LAW_NOT_FOUND\"}")
        print("FAIL  No LAW file found")
        print("RESULT=FAIL")
        return 1

    law_path, law_state = result
    current_hash = compute_amendments_hash(REPO_ROOT)
    print(f"current_amendments_hash={current_hash}")

    relative = law_path.relative_to(REPO_ROOT).as_posix()

    # Check filename state first
    if law_state == "corrupted":
        diagnostic = {
            "code": "LAW_CORRUPTED",
            "path": relative,
        }
        print(f"DIAGNOSTIC={json.dumps(diagnostic, sort_keys=True)}")
        print(f"FAIL  {relative}  state=corrupted")
        print("RESULT=FAIL")
        return 1

    if law_state == "resolving":
        diagnostic = {
            "code": "LAW_STALE",
            "path": relative,
            "current_amendments_hash": current_hash,
        }
        print(f"DIAGNOSTIC={json.dumps(diagnostic, sort_keys=True)}")
        print(f"FAIL  {relative}  state=resolving")
        print("RESULT=FAIL")
        return 1

    # State is active — verify frontmatter can be parsed
    try:
        data = read_frontmatter(law_path)
    except Exception:
        # Malformed file — rename to corrupted
        corrupted_path = CONSTITUTION_DIR / make_name("❌", "LAW")
        law_path.rename(corrupted_path)
        print(f"DIAGNOSTIC={{\"code\":\"LAW_CORRUPTED\",\"path\":\"{relative}\",\"reason\":\"malformed_frontmatter\"}}")
        print(f"FAIL  {relative}  renamed to ❌ LAW (malformed)")
        print("RESULT=FAIL")
        return 1

    expected = data.get("amendments_hash")

    if expected == current_hash:
        print(f"OK    {relative}  amendments_hash={expected}")
        print("RESULT=PASS")
        return 0

    # Hash mismatch
    diagnostic = {
        "code": "HASH_MISMATCH",
        "path": relative,
        "amendments_hash_in_law": expected,
        "current_amendments_hash": current_hash,
    }
    print(f"DIAGNOSTIC={json.dumps(diagnostic, sort_keys=True)}")
    print(f"FAIL  {relative}  amendments_hash={expected}  expected={current_hash}")
    print("RESULT=FAIL")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3

import hashlib
from pathlib import Path


VALID_SUFFIXES = {".✅", ".⏳", ".📝", ".❌"}


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


def discover_law() -> tuple[Path, str]:
    """Returns (path, state). States: active, resolving, corrupted."""
    for state, suffix in [("active", ".✅"), ("resolving", ".⏳"), ("corrupted", ".❌")]:
        p = CONSTITUTION_DIR / f"LAW{suffix}"
        if p.exists():
            return p, state
    raise FileNotFoundError("No LAW file found.")


def discover_founding() -> tuple[Path, str] | None:
    """Returns (path, state) or None. States: founding, review, draft."""
    for state, suffix in [("founding", ".✅"), ("review", ".⏳"), ("draft", ".📝")]:
        p = AMENDMENTS_DIR / f".founding{suffix}"
        if p.exists():
            return p, state
    return None


def list_constitutional_files(directory: Path) -> list[Path]:
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix in VALID_SUFFIXES
        and not path.name.startswith(".founding")
    )


def list_accepted_amendments(directory: Path) -> list[Path]:
    return sorted(
        path
        for path in list_constitutional_files(directory)
        if path.suffix == ".✅"
    )


def extract_body_without_frontmatter(text: str) -> str:
    if text.startswith("---\n"):
        second_delimiter = text.find("\n---\n", 4)
        if second_delimiter != -1:
            text = text[second_delimiter + 5 :]
    return text.strip()


def compute_amendments_hash() -> str:
    digest = hashlib.sha256()
    # Include founding document first (if accepted)
    founding = discover_founding()
    if founding is not None:
        founding_path, founding_state = founding
        if founding_state == "founding":
            relative = founding_path.relative_to(REPO_ROOT).as_posix()
            content = extract_body_without_frontmatter(founding_path.read_text(encoding="utf-8"))
            digest.update(f"FILE:{relative}\n".encode("utf-8"))
            digest.update(content.encode("utf-8"))
            digest.update(b"\n\x1e\n")
    # Then accepted amendments
    for path in list_accepted_amendments(AMENDMENTS_DIR):
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


def latest_accepted_amendment_stem(directory: Path) -> str | None:
    """Return the stem (timestamp) of the newest accepted amendment, or None."""
    accepted = list_accepted_amendments(directory)
    if not accepted:
        return None
    return accepted[-1].stem


def upsert_amendments_hash(frontmatter: str, new_hash: str, last_amendment: str | None) -> str:
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

    key_values["amendments_hash"] = f'"{new_hash}"'
    if last_amendment is not None:
        key_values["last_reconciled_amendment"] = f'"{last_amendment}"'
    # Remove stale/transient fields
    for key in ["stale_reason", "stale_since_hash", "stale_amendment_path", "pending_reason_code",
                 "status", "articles_hash", "stale_article_path", "resolution_started_at"]:
        if key in key_values:
            del key_values[key]

    if "amendments_hash" not in order:
        order.append("amendments_hash")
    if "last_reconciled_amendment" not in order and last_amendment is not None:
        order.append("last_reconciled_amendment")

    updated: list[str] = []
    for key in order:
        if key in key_values:
            updated.append(f"{key}: {key_values[key]}")

    for key, value in key_values.items():
        if key not in order:
            updated.append(f"{key}: {value}")
    return "\n".join(updated)


def main() -> int:
    law_path, law_state = discover_law()
    amendment_hash = compute_amendments_hash()
    last_amendment = latest_accepted_amendment_stem(AMENDMENTS_DIR)

    text = law_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter_parts(text)
    updated_frontmatter = upsert_amendments_hash(frontmatter, amendment_hash, last_amendment)
    updated_text = f"{prefix}{updated_frontmatter}\n---\n{body}"

    # Always rename to LAW.✅ (active) after successful sync
    active_path = CONSTITUTION_DIR / "LAW.✅"
    law_path.write_text(updated_text, encoding="utf-8")
    if law_path != active_path:
        law_path.rename(active_path)
    print(f"updated: {active_path.relative_to(REPO_ROOT).as_posix()}")

    print(f"amendments_hash: {amendment_hash}")
    if last_amendment:
        print(f"last_reconciled_amendment: {last_amendment}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

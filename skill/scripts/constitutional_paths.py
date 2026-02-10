#!/usr/bin/env python3
"""Shared helpers for constitutional filename convention.

Filenames use emoji prefixes to encode state:
    ✅ LAW          (active law)
    ⏳ LAW          (resolving law)
    ❌ LAW          (corrupted law)
    ✅ .founding     (accepted founding document)
    ⏳ .founding     (founding under review)
    📝 .founding     (founding draft)
    ✅ 20260209101538  (accepted amendment)
    📝 20260209101538  (draft amendment)
"""

import hashlib
from pathlib import Path


VALID_EMOJIS = {"✅", "⏳", "📝", "❌"}
EMOJI_TO_STATE = {
    "✅": "accepted",
    "⏳": "resolving",
    "📝": "draft",
    "❌": "corrupted",
}


def parse_state_emoji(path: Path) -> str | None:
    """Extract leading emoji from filename like '✅ LAW'. Returns emoji or None."""
    for emoji in VALID_EMOJIS:
        if path.name.startswith(emoji + " "):
            return emoji
    return None


def base_name(path: Path) -> str:
    """Strip state prefix: '✅ LAW' -> 'LAW', '📝 .founding' -> '.founding'."""
    for emoji in VALID_EMOJIS:
        prefix = emoji + " "
        if path.name.startswith(prefix):
            return path.name[len(prefix):]
    return path.name


def make_name(emoji: str, base: str) -> str:
    """Construct a constitutional filename: make_name('✅', 'LAW') -> '✅ LAW'."""
    return f"{emoji} {base}"


def swap_state(path: Path, new_emoji: str) -> Path:
    """Return a new Path with the emoji prefix swapped: swap_state('✅ LAW', '⏳') -> '⏳ LAW'."""
    return path.parent / make_name(new_emoji, base_name(path))


def tmp_path(path: Path) -> Path:
    """Return a .tmp sibling path safe for any base name (including '.founding')."""
    return path.parent / (path.name + ".tmp")


def is_constitutional_file(path: Path) -> bool:
    """True if the filename starts with a valid state emoji prefix."""
    return parse_state_emoji(path) is not None


# ---------------------------------------------------------------------------
# Discovery helpers
# ---------------------------------------------------------------------------

def discover_law(root: Path) -> tuple[Path, str] | None:
    """Returns (path, state) or None. States: active, resolving, corrupted."""
    constitution_dir = root / ".constitution"
    for state, emoji in [("active", "✅"), ("resolving", "⏳"), ("corrupted", "❌")]:
        p = constitution_dir / make_name(emoji, "LAW")
        if p.exists():
            return p, state
    return None


def discover_founding(root: Path) -> tuple[Path, str] | None:
    """Returns (path, state) or None. States: founding, review, draft."""
    amendments_dir = root / ".constitution" / "amendments"
    for state, emoji in [("founding", "✅"), ("review", "⏳"), ("draft", "📝")]:
        p = amendments_dir / make_name(emoji, ".founding")
        if p.exists():
            return p, state
    return None


def list_constitutional_files(directory: Path) -> list[Path]:
    """List constitutional files in directory (excludes founding document)."""
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file()
        and is_constitutional_file(path)
        and base_name(path) != ".founding"
    )


def list_accepted_amendments(directory: Path) -> list[Path]:
    """List accepted (✅) amendments in directory (excludes founding)."""
    return sorted(
        path
        for path in list_constitutional_files(directory)
        if parse_state_emoji(path) == "✅"
    )


def extract_body_without_frontmatter(text: str) -> str:
    """Strip YAML frontmatter, return trimmed body."""
    if text.startswith("---\n"):
        second_delimiter = text.find("\n---\n", 4)
        if second_delimiter != -1:
            text = text[second_delimiter + 5:]
    return text.strip()


def compute_amendments_hash(root: Path) -> str:
    """Compute deterministic SHA-256 over founding (if accepted) + accepted amendments."""
    amendments_dir = root / ".constitution" / "amendments"
    digest = hashlib.sha256()
    # Include founding document first (if accepted)
    founding = discover_founding(root)
    if founding is not None:
        founding_path, founding_state = founding
        if founding_state == "founding":
            relative = founding_path.resolve().relative_to(root.resolve()).as_posix()
            content = extract_body_without_frontmatter(founding_path.read_text(encoding="utf-8"))
            digest.update(f"FILE:{relative}\n".encode("utf-8"))
            digest.update(content.encode("utf-8"))
            digest.update(b"\n\x1e\n")
    # Then accepted amendments
    for path in list_accepted_amendments(amendments_dir):
        relative = path.resolve().relative_to(root.resolve()).as_posix()
        content = extract_body_without_frontmatter(path.read_text(encoding="utf-8"))
        digest.update(f"FILE:{relative}\n".encode("utf-8"))
        digest.update(content.encode("utf-8"))
        digest.update(b"\n\x1e\n")
    return digest.hexdigest()

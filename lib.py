"""
Slices - Core library for AI agent memory.
https://slices.info
"""

import os
import re
import random
import time
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None

# =============================================================================
# Constants
# =============================================================================

ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford's Base32
ULID_LEN = 26

BODY_TYPES = ["markdown", "jsonl", "none", "code", "conversation", "text", "yaml"]

RELATIONSHIP_TYPES = [
    "depends_on", "blocks",
    "evidence_for", "evidence_against",
    "supersedes", "superseded_by",
    "parent", "child",
    "part_of", "has_part",
    "is_a", "type_of",
    "derived_from", "source_of",
    "see_also",
]

# =============================================================================
# ULID Generation
# =============================================================================

def generate_ulid(timestamp_ms: int = None) -> str:
    """Generate a ULID (Universally Unique Lexicographically Sortable Identifier)."""
    if timestamp_ms is None:
        timestamp_ms = int(time.time() * 1000)
    
    # Encode timestamp (10 chars)
    result = []
    ts = timestamp_ms
    for _ in range(10):
        result.append(ENCODING[ts % 32])
        ts //= 32
    timestamp_part = "".join(reversed(result))
    
    # Random part (16 chars)
    random_part = "".join(random.choice(ENCODING) for _ in range(16))
    
    return timestamp_part + random_part

def is_valid_ulid(ulid: str) -> bool:
    """Check if a string is a valid ULID."""
    if len(ulid) != ULID_LEN:
        return False
    return all(c.upper() in ENCODING for c in ulid)

# =============================================================================
# Directory & File Operations
# =============================================================================

def get_slices_dir(slices_dir: str = None) -> Path:
    """Get the slices directory path."""
    if slices_dir:
        return Path(slices_dir)
    return Path(os.environ.get("SLICES_DIR", ".slices"))

def init_slices_dir(slices_dir: str = None) -> Path:
    """Initialize the slices directory if it doesn't exist."""
    directory = get_slices_dir(slices_dir)
    directory.mkdir(parents=True, exist_ok=True)
    return directory

def slices_list(slices_dir: str = None) -> list:
    """List all .tt files in the slices directory."""
    directory = get_slices_dir(slices_dir)
    if not directory.exists():
        return []
    return sorted(directory.glob("*.tt"))

def find_by_id(file_id: str, slices_dir: str = None) -> Path:
    """Find a file by its ID."""
    directory = get_slices_dir(slices_dir)
    
    # Try exact match first
    exact_path = directory / f"{file_id}.tt"
    if exact_path.exists():
        return exact_path
    
    # Try partial match
    for path in slices_list(slices_dir):
        if path.stem.startswith(file_id) or file_id in path.stem:
            return path
    
    return None

# =============================================================================
# YAML Frontmatter Parsing
# =============================================================================

def parse_frontmatter(content: str) -> tuple:
    """Parse YAML frontmatter from content. Returns (frontmatter_dict, body)."""
    lines = content.split("\n")
    
    if not lines or lines[0].strip() != "---":
        return {}, content
    
    # Find closing ---
    end_idx = -1
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_idx = i
            break
    
    if end_idx == -1:
        return {}, content
    
    frontmatter_str = "\n".join(lines[1:end_idx])
    body = "\n".join(lines[end_idx + 1:])
    
    if body.startswith("\n"):
        body = body[1:]
    
    if yaml:
        try:
            frontmatter = yaml.safe_load(frontmatter_str) or {}
        except:
            frontmatter = {}
    else:
        # Basic fallback parser
        frontmatter = {}
    
    return frontmatter, body

def serialize_frontmatter(data: dict, body: str = "") -> str:
    """Serialize frontmatter and body to string."""
    if yaml:
        fm_str = yaml.dump(data, default_flow_style=False, allow_unicode=True, sort_keys=False)
    else:
        # Basic fallback
        fm_str = str(data)
    
    return f"---\n{fm_str}---\n{body}"

def parse_file(path: Path) -> dict:
    """Parse a .tt file. Returns dict with frontmatter and body."""
    content = path.read_text(encoding="utf-8")
    frontmatter, body = parse_frontmatter(content)
    return {"frontmatter": frontmatter, "body": body, "path": path}

def serialize_file(frontmatter: dict, body: str) -> str:
    """Serialize frontmatter and body to file content."""
    return serialize_frontmatter(frontmatter, body)

# =============================================================================
# Field Accessors
# =============================================================================

def get_field(data: dict, path: str, default=None):
    """Get a nested field from a dict using dot notation."""
    parts = path.split(".")
    current = data
    for part in parts:
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current

def get_id(fm: dict, fallback: str = "") -> str:
    """Get the ID from frontmatter."""
    return get_field(fm, "tt.id") or fallback

def get_title(fm: dict, fallback: str = "") -> str:
    """Get the title from frontmatter."""
    return get_field(fm, "tt.title") or fallback

def get_summary(fm: dict, fallback: str = "") -> str:
    """Get the summary from frontmatter."""
    return get_field(fm, "tt.summary") or fallback

# =============================================================================
# Link Operations
# =============================================================================

def add_link(fm: dict, target: str, relationship: str, label: str = None) -> dict:
    """Add a link to frontmatter. Returns modified frontmatter."""
    if "tt" not in fm:
        fm["tt"] = {}
    if "links" not in fm["tt"]:
        fm["tt"]["links"] = []
    
    link = {"rel": relationship, "to": target}
    if label:
        link["label"] = label
    
    # Check if link already exists
    for existing in fm["tt"]["links"]:
        if existing.get("to") == target and existing.get("rel") == relationship:
            return fm  # Already exists
    
    fm["tt"]["links"].append(link)
    return fm

def remove_link(fm: dict, target: str, relationship: str = None) -> int:
    """Remove link(s) from frontmatter. Returns count of removed links."""
    if "tt" not in fm or "links" not in fm["tt"]:
        return 0
    
    original_count = len(fm["tt"]["links"])
    
    if relationship:
        fm["tt"]["links"] = [
            l for l in fm["tt"]["links"]
            if not (l.get("to") == target and l.get("rel") == relationship)
        ]
    else:
        fm["tt"]["links"] = [l for l in fm["tt"]["links"] if l.get("to") != target]
    
    return original_count - len(fm["tt"]["links"])

# =============================================================================
# Utilities
# =============================================================================

def timestamp() -> str:
    """Get current ISO timestamp."""
    return datetime.now(timezone.utc).isoformat()

def hash_content(content: str) -> str:
    """Generate SHA256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

# Aliases for compatibility
ulid = generate_ulid
tt_list = slices_list
get_tt_dir = get_slices_dir
init_tt_dir = init_slices_dir

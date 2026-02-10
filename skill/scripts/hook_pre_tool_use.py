#!/usr/bin/env python3

import json
import re
import hashlib
from pathlib import Path
from typing import Any


VALID_SUFFIXES = {".✅", ".⏳", ".📝", ".❌"}


def load_payload() -> dict[str, Any]:
    try:
        return json.load(__import__("sys").stdin)
    except Exception:
        return {}


def workspace_root(payload: dict[str, Any]) -> Path:
    roots = payload.get("workspace_roots") or []
    if roots:
        return Path(roots[0])
    return Path.cwd()


def collect_paths(value: Any) -> list[str]:
    results: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"path", "file_path", "target_notebook"} and isinstance(child, str):
                results.append(child)
            else:
                results.extend(collect_paths(child))
    elif isinstance(value, list):
        for child in value:
            results.extend(collect_paths(child))
    return results


def collect_amendment_paths_from_text(value: Any) -> list[str]:
    text = json.dumps(value)
    matches = re.findall(r"\.constitution/amendments/[^\s\"']+", text)
    return matches


def contains_status_accepted_update(value: Any) -> bool:
    text = json.dumps(value)
    return bool(
        re.search(
            r"status\s*:\s*[\"']?accepted[\"']?",
            text,
            flags=re.IGNORECASE,
        )
    )


def contains_valid_draft_frontmatter(value: Any) -> bool:
    text = json.dumps(value)
    return bool(
        re.search(
            r"---\s*\\n(?:.*\\n)*?\s*status\s*:\s*draft\s*\\n(?:.*\\n)*?---\s*\\n",
            text,
            flags=re.IGNORECASE,
        )
    )


def normalize_path(root: Path, path_like: str) -> Path:
    path = Path(path_like)
    if path.is_absolute():
        return path
    return (root / path).resolve()


def is_amendment_file(path: Path, root: Path) -> bool:
    try:
        relative = path.resolve().relative_to(root.resolve()).as_posix()
    except Exception:
        return False
    return relative.startswith(".constitution/amendments/") and path.suffix in VALID_SUFFIXES


def is_founding_document(path: Path, root: Path) -> bool:
    try:
        relative = path.resolve().relative_to(root.resolve()).as_posix()
    except Exception:
        return False
    return relative.startswith(".constitution/FOUNDING.") and path.suffix in VALID_SUFFIXES


def is_law_file(path: Path, root: Path) -> bool:
    try:
        relative = path.resolve().relative_to(root.resolve()).as_posix()
    except Exception:
        return False
    return relative.startswith(".constitution/LAW.") and path.suffix in VALID_SUFFIXES


def amendment_state(path: Path) -> str:
    if path.suffix == ".✅":
        return "accepted"
    if path.suffix == ".📝":
        return "draft"
    return "pending"


def discover_law(root: Path) -> tuple[Path, str] | None:
    """Returns (path, state) or None. States: active, resolving, corrupted."""
    constitution_dir = root / ".constitution"
    for state, suffix in [("active", ".✅"), ("resolving", ".⏳"), ("corrupted", ".❌")]:
        p = constitution_dir / f"LAW{suffix}"
        if p.exists():
            return p, state
    return None


def discover_founding(root: Path) -> tuple[Path, str] | None:
    """Returns (path, state) or None. States: founding, review, draft."""
    constitution_dir = root / ".constitution"
    for state, suffix in [("founding", ".✅"), ("review", ".⏳"), ("draft", ".📝")]:
        p = constitution_dir / f"FOUNDING{suffix}"
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


def list_constitutional_files(directory: Path) -> list[Path]:
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix in VALID_SUFFIXES
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


def compute_amendments_hash(root: Path) -> str:
    constitution_dir = root / ".constitution"
    amendments_dir = constitution_dir / "amendments"
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
        digest.update(f"FILE:{relative}\n".encode("utf-8"))
        content = extract_body_without_frontmatter(path.read_text(encoding="utf-8"))
        digest.update(content.encode("utf-8"))
        digest.update(b"\n\x1e\n")
    return digest.hexdigest()


def parse_frontmatter_map(frontmatter: str) -> tuple[dict[str, str], list[str]]:
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


def write_frontmatter(path: Path, prefix: str, body: str, mapping: dict[str, str], order: list[str]) -> None:
    for key in ["stale_reason", "stale_since_hash", "stale_amendment_path"]:
        if key in mapping and key not in order:
            order.append(key)

    new_frontmatter_lines = [f"{key}: {mapping[key]}" for key in order if key in mapping]
    for key, value in mapping.items():
        if key not in order:
            new_frontmatter_lines.append(f"{key}: {value}")
    new_frontmatter = "\n".join(new_frontmatter_lines)
    updated = f"{prefix}{new_frontmatter}\n---\n{body}"
    path.write_text(updated, encoding="utf-8")


def mark_law_stale_if_drift(root: Path) -> None:
    """If LAW is active but hash doesn't match, rename LAW.✅ -> LAW.⏳."""
    result = discover_law(root)
    if result is None:
        return
    law_path, law_state = result
    if law_state != "active":
        return

    current_hash = compute_amendments_hash(root)
    text = law_path.read_text(encoding="utf-8")
    prefix, frontmatter, body = parse_frontmatter(text)
    if not prefix:
        return
    mapping, order = parse_frontmatter_map(frontmatter)
    law_hash = mapping.get("amendments_hash", "").strip('"').strip("'")
    if law_hash == current_hash:
        return
    # Hash drift detected — rename to resolving
    mapping["stale_reason"] = "amendments_drift_detected"
    mapping["stale_since_hash"] = f'"{law_hash}"'
    if "stale_amendment_path" in mapping:
        del mapping["stale_amendment_path"]
    if "status" in mapping:
        del mapping["status"]
    if "status" in order:
        order.remove("status")
    write_frontmatter(law_path, prefix, body, mapping, order)
    resolving_path = root / ".constitution" / "LAW.⏳"
    law_path.rename(resolving_path)


def deny(reason: str) -> None:
    print(json.dumps({"decision": "deny", "reason": reason}))


def allow() -> None:
    print(json.dumps({"decision": "allow"}))


def main() -> int:
    payload = load_payload()
    root = workspace_root(payload)
    mark_law_stale_if_drift(root)
    tool_input = payload.get("tool_input", {})
    path_values = collect_paths(tool_input)
    path_values.extend(collect_amendment_paths_from_text(tool_input))
    normalized = [normalize_path(root, item) for item in path_values]

    # --- Founding document guard ---
    founding_targets = [p for p in normalized if is_founding_document(p, root)]
    if founding_targets:
        founding = discover_founding(root)
        if founding is not None:
            _, founding_state = founding
            if founding_state == "founding":
                deny(
                    "Constitutional law: FOUNDING.✅ is the accepted grundnorm and is immutable."
                )
                return 0
            # Draft or review state — allow edits
            allow()
            return 0
        # No founding document exists yet — allow creation
        allow()
        return 0

    # --- LAW file guard (token-based authorization) ---
    law_targets = [p for p in normalized if is_law_file(p, root)]
    if law_targets:
        conversation_id = payload.get("conversation_id", "")
        runtime_path = root / ".constitution" / ".runtime.json"

        # Fail-closed: if no runtime file, deny
        if not runtime_path.exists():
            deny(
                "Constitutional law: LAW files are derived artifacts. No authorization token found (.runtime.json missing)."
            )
            return 0

        try:
            with open(runtime_path, encoding="utf-8") as f:
                runtime = json.load(f)
        except (json.JSONDecodeError, OSError):
            deny(
                "Constitutional law: LAW files are derived artifacts. Authorization state unreadable."
            )
            return 0

        authorized = runtime.get("authorized", {})
        pending_tokens = runtime.get("pending_tokens", [])

        # Already authorized — allow
        if conversation_id and conversation_id in authorized:
            allow()
            return 0

        # Pending token available — claim it and allow
        if pending_tokens and conversation_id:
            token = pending_tokens.pop(0)
            authorized[conversation_id] = token
            runtime["authorized"] = authorized
            runtime["pending_tokens"] = pending_tokens
            try:
                tmp = runtime_path.with_suffix(".tmp")
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(runtime, f, indent=2)
                    f.write("\n")
                tmp.rename(runtime_path)
            except OSError:
                pass
            allow()
            return 0

        # No authorization — deny
        deny(
            "Constitutional law: LAW files are derived artifacts managed by constitutional scripts. Direct edits are not permitted."
        )
        return 0

    # --- Regular amendment guard ---
    amendment_paths = [path for path in normalized if is_amendment_file(path, root)]

    if not amendment_paths:
        allow()
        return 0

    existing = [path for path in amendment_paths if path.exists()]
    if existing:
        states = {amendment_state(path) for path in existing}
        if states == {"draft"}:
            if contains_status_accepted_update(tool_input):
                deny(
                    "Constitutional law: draft amendments may advance to review, but acceptance (✅) is reserved for the constitutional acceptance procedure."
                )
                return 0
            allow()
            return 0
        deny(
            "Constitutional law: accepted amendments (✅) are immutable commitments. Draft amendments (📝) are editable. Existing non-draft amendment records cannot be edited."
        )
        return 0

    # New amendment files must be draft files and include status:draft frontmatter.
    new_state = amendment_state(amendment_paths[0])
    if new_state != "draft":
        deny(
            "Constitutional law: new amendment records must begin in draft filename state (.📝)."
        )
        return 0
    if not contains_valid_draft_frontmatter(tool_input):
        deny(
            "Constitutional law: new draft amendment records must include frontmatter with status: draft."
        )
        return 0

    allow()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

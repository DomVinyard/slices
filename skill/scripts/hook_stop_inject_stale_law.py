#!/usr/bin/env python3

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

FOUNDING_DRAFT = ".founding.📝"
LOCK_TIMEOUT_SECONDS = 300  # 5 minutes


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}, text.strip()
    second = text.find("\n---\n", 4)
    if second == -1:
        return {}, text.strip()
    frontmatter = text[4:second]
    body = text[second + 5 :].strip()
    mapping: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        mapping[key.strip()] = value.strip().strip('"').strip("'")
    return mapping, body


def body_hash(body: str) -> str:
    return hashlib.sha256(body.strip().encode("utf-8")).hexdigest()


def _needs_eval(path: Path) -> bool:
    mapping, body = parse_frontmatter(path)
    status = mapping.get("status", "").lower()
    if status != "review":
        return False
    apply_ok_at = mapping.get("apply_ok_at", "")
    if apply_ok_at in {"", "⏳"}:
        return True
    return apply_ok_at != body_hash(body)


def drafts_needing_suitability(repo_root: Path) -> tuple[set[str], list[Path]]:
    """Return (set of draft types, list of draft paths) needing suitability."""
    # Check founding document
    founding = repo_root / ".constitution" / "amendments" / FOUNDING_DRAFT
    if founding.exists() and _needs_eval(founding):
        return {"founding"}, [founding]

    # Check amendments
    amendments_dir = repo_root / ".constitution" / "amendments"
    if not amendments_dir.exists():
        return set(), []
    types: set[str] = set()
    paths: list[Path] = []
    for draft in sorted(
        p for p in amendments_dir.iterdir()
        if p.is_file() and p.suffix == ".📝"
        and not p.name.startswith(".founding")
    ):
        if _needs_eval(draft):
            types.add("amendment")
            paths.append(draft)
    return types, paths


# ---------------------------------------------------------------------------
# Frontmatter-based activity locks
# ---------------------------------------------------------------------------

def read_frontmatter_field(path: Path, field_name: str) -> str | None:
    """Read a single frontmatter field value (quote-stripped). None if absent."""
    mapping, _ = parse_frontmatter(path)
    return mapping.get(field_name)


def write_frontmatter_field(path: Path, field_name: str, value: str | None) -> None:
    """Update or remove a single frontmatter field. Atomic write via tmp+rename."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return
    second = text.find("\n---\n", 4)
    if second == -1:
        return
    frontmatter = text[4:second]
    rest = text[second:]  # "\n---\n..." (closing delimiter + body)

    lines = frontmatter.splitlines()
    new_lines: list[str] = []
    found = False
    for line in lines:
        if ":" in line:
            key = line.split(":", 1)[0].strip()
            if key == field_name:
                found = True
                if value is not None:
                    new_lines.append(f"{field_name}: {value}")
                continue
        new_lines.append(line)

    if not found and value is not None:
        new_lines.append(f"{field_name}: {value}")

    updated = "---\n" + "\n".join(new_lines) + rest
    tmp = path.with_suffix(".tmp")
    tmp.write_text(updated, encoding="utf-8")
    tmp.rename(path)


def check_lock(path: Path, field_name: str, timeout_seconds: int = LOCK_TIMEOUT_SECONDS) -> str:
    """Check if a frontmatter timestamp field represents an active lock.

    Returns: 'available' (no lock), 'locked' (fresh), or 'stale' (expired).
    """
    if not path.exists():
        return "available"
    value = read_frontmatter_field(path, field_name)
    if not value:
        return "available"
    try:
        started_at = datetime.fromisoformat(value)
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - started_at).total_seconds()
        if age >= timeout_seconds:
            return "stale"
        return "locked"
    except (ValueError, TypeError):
        return "available"


def _now_iso() -> str:
    """Return current UTC time as a quoted ISO string for frontmatter."""
    return f'"{datetime.now(timezone.utc).isoformat()}"'


def _delegation_message(subagent_name: str, prompt: str) -> str:
    """Build a followup message that triggers subagent delegation."""
    return (
        f"<subagent_delegation_context>\n"
        f"The user has indicated they want you to delegate work to the "
        f"following subagent(s): {subagent_name}\n"
        f"\n"
        f"To delegate, call the Task tool with the subagent_type parameter. Example:\n"
        f'Task(subagent_type="{subagent_name}", prompt="{prompt}")\n'
        f"</subagent_delegation_context>"
    )


def main() -> int:
    repo_root = Path.cwd()

    needs, draft_paths = drafts_needing_suitability(repo_root)
    if needs:
        if "founding" in needs:
            name = "framer"
            prompt = "Evaluate the founding document for acceptance as the constitutional grundnorm."
        else:
            name = "ratifier"
            prompt = "Evaluate draft amendments that are in review status for suitability and ratify them."

        lock_path = draft_paths[0]
        lock_field = "evaluation_started_at"
        lock_state = check_lock(lock_path, lock_field)

        if lock_state == "locked":
            # Another session is handling this — back off silently
            print(json.dumps({}))
            return 0
        if lock_state == "stale":
            write_frontmatter_field(lock_path, lock_field, None)

        # Set lock and delegate
        write_frontmatter_field(lock_path, lock_field, _now_iso())
        print(
            json.dumps(
                {
                    "followup_message": _delegation_message(name, prompt),
                }
            )
        )
        return 0

    skill_dir = Path(__file__).resolve().parent.parent  # skill root
    scripts_dir = skill_dir / "scripts"
    verifier = scripts_dir / "verify_kernel_hash.py"
    if not verifier.exists():
        print(json.dumps({}))
        return 0

    run = subprocess.run(
        ["python3", str(verifier)],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )

    if run.returncode == 0:
        print(json.dumps({}))
        return 0

    # LAW needs reconciliation — check for activity lock on LAW.⏳
    law_path = repo_root / ".constitution" / "LAW.⏳"
    lock_field = "resolution_started_at"
    lock_state = check_lock(law_path, lock_field)

    if lock_state == "locked":
        # Another session is handling this — back off silently
        print(json.dumps({}))
        return 0
    if lock_state == "stale":
        write_frontmatter_field(law_path, lock_field, None)

    # Set lock and delegate
    if law_path.exists():
        write_frontmatter_field(law_path, lock_field, _now_iso())

    print(
        json.dumps(
            {
                "followup_message": _delegation_message(
                    "codifier",
                    "LAW is resolving (LAW.⏳ exists). Reconcile law with the current accepted amendments.",
                ),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

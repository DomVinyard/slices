#!/usr/bin/env python3

import hashlib
import json
import subprocess
from pathlib import Path

FOUNDING_DRAFT = "FOUNDING.📝"


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


def drafts_needing_suitability(repo_root: Path) -> set[str]:
    """Return set of draft types needing suitability: 'founding', 'amendment', or both."""
    # Check founding document
    founding = repo_root / ".constitution" / FOUNDING_DRAFT
    if founding.exists() and _needs_eval(founding):
        return {"founding"}

    # Check amendments
    amendments_dir = repo_root / ".constitution" / "amendments"
    if not amendments_dir.exists():
        return set()
    result: set[str] = set()
    for draft in sorted(
        p for p in amendments_dir.iterdir()
        if p.is_file() and p.suffix == ".📝"
    ):
        if _needs_eval(draft):
            result.add("amendment")
    return result


def main() -> int:
    repo_root = Path.cwd()

    needs = drafts_needing_suitability(repo_root)
    if needs:
        if "founding" in needs:
            command = "/framer"
        else:
            command = "/ratifier"
        print(
            json.dumps(
                {
                    "followup_message": command,
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

    print(
        json.dumps(
            {
                "followup_message": "/codifier",
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

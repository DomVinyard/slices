#!/usr/bin/env python3

import hashlib
import json
import subprocess
from pathlib import Path


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


def draft_needs_suitability(repo_root: Path) -> bool:
    articles_dir = repo_root / ".constitution" / ".articles"
    if not articles_dir.exists():
        return False
    for article in sorted(articles_dir.glob("*.📝.md")):
        mapping, body = parse_frontmatter(article)
        status = mapping.get("status", "").lower()
        if status not in {"draft", "review"}:
            continue
        apply_ok_at = mapping.get("apply_ok_at", "")
        if apply_ok_at in {"", "⏳"}:
            return True
        if apply_ok_at != body_hash(body):
            return True
    return False


def main() -> int:
    repo_root = Path.cwd()
    if draft_needs_suitability(repo_root):
        print(
            json.dumps(
                {
                    "followup_message": "Run constitutional suitability evaluation for draft article records and apply the result using .constitution/src/scripts/apply_suitability_result.py.",
                }
            )
        )
        return 0

    verifier = repo_root / ".constitution" / "src" / "scripts" / "verify_kernel_hash.py"
    if not verifier.exists():
        print(
            json.dumps(
                {
                    "followup_message": "Read .constitution/src/prompts/stale_law.md and execute it exactly. Constitutional verifier is unavailable.",
                }
            )
        )
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
                "followup_message": "Read .constitution/src/prompts/stale_law.md and execute it exactly.",
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

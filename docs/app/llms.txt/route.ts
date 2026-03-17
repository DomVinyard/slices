import { NextResponse } from "next/server";

const LLMS_TXT = `# slices.info

Slices is a file-based context format for AI agents.

## Install

curl -fsSL slices.info/install | sh

This installs a skill (SKILL.md) and specification (SPEC.md) to ~/.cursor/skills/slices/.

## Resources

- Skill (teaches agents how to use slices): https://slices.info/skill
- Specification (the format definition): https://slices.info/spec.md
- Web specification: https://slices.info/spec
- GitHub: https://github.com/nicholasdomin/slices

## What is a slice?

A .slice file is YAML frontmatter + body content. Key frontmatter fields:
- id, title, summary, tags, topics (discovery)
- lifecycle: perpetual | snapshot | ephemeral (temporality)
- validity: status, expires_at, stale_after, depends_on (freshness)
- scope: personal | project | team (ownership)
- kind: context | pointer | index (content type)
- write: append | replace | immutable (mutation rules)
- links: typed relationships to other slices

Slices are stored in .slices/ directories and require no special tooling.
Agents read and write them as plain files.
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

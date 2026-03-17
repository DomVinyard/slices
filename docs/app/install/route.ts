import { NextResponse } from "next/server";

const INSTALL_SCRIPT = `#!/bin/sh
set -e

SKILL_DIR="\${HOME}/.cursor/skills/slices"
BASE_URL="https://slices.info"

echo "Installing slices skill..."

mkdir -p "\${SKILL_DIR}"

curl -fsSL "\${BASE_URL}/skill" -o "\${SKILL_DIR}/SKILL.md"
curl -fsSL "\${BASE_URL}/spec.md" -o "\${SKILL_DIR}/SPEC.md"

echo ""
echo "  Installed to \${SKILL_DIR}"
echo ""
echo "  SKILL.md  — teaches your agent how to use slices"
echo "  SPEC.md   — the full format specification"
echo ""
echo "  Your agent will discover the skill automatically."
echo ""
`;

export async function GET() {
  return new NextResponse(INSTALL_SCRIPT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

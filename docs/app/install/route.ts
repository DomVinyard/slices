import { NextResponse } from "next/server";

const INSTALL_SCRIPT = `#!/bin/sh
set -e

BASE_URL="https://slices.info"
INSTALLED=""

install_to() {
  dir="$1"
  name="$2"
  mkdir -p "\${dir}/resources"
  curl -fsSL "\${BASE_URL}/skill" -o "\${dir}/SKILL.md"
  for f in creating discovering maintaining frontmatter; do
    curl -fsSL "\${BASE_URL}/skill/resources/\${f}" -o "\${dir}/resources/\${f}.md"
  done
  INSTALLED="\${INSTALLED}  \${name}: \${dir}\\n"
}

echo "Installing slices skill..."
echo ""

# Cursor
if [ -d "\${HOME}/.cursor" ]; then
  install_to "\${HOME}/.cursor/skills/slices" "Cursor"
fi

# Claude Code
if [ -d "\${HOME}/.claude" ]; then
  install_to "\${HOME}/.claude/skills/slices" "Claude Code"
fi

# Fallback: if neither directory exists, create for Cursor
if [ -z "\${INSTALLED}" ]; then
  install_to "\${HOME}/.cursor/skills/slices" "Cursor"
fi

printf "\${INSTALLED}"
echo ""
echo "  Installed files:"
echo "    SKILL.md                — entry point"
echo "    resources/creating.md   — how to create slices"
echo "    resources/discovering.md — how to find slices"
echo "    resources/maintaining.md — how to update and maintain"
echo "    resources/frontmatter.md — complete field reference"
echo ""
echo "  Spec: slices.info/spec.md"
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

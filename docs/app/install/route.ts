import { NextResponse } from "next/server";

const INSTALL_SCRIPT = `#!/bin/sh
set -e

BASE_URL="https://slices.info"
INSTALLED=""

install_to() {
  dir="$1"
  name="$2"
  mkdir -p "\${dir}"
  curl -fsSL "\${BASE_URL}/skill" -o "\${dir}/SKILL.md"
  INSTALLED="\${INSTALLED}  \${name}: \${dir}\\n"
}

echo "Installing slices skill..."
echo ""

# Cursor (also reads ~/.claude/skills/)
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
echo "  SKILL.md  — teaches your agent how to use slices"
echo "  Spec:       slices.info/spec.md"
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

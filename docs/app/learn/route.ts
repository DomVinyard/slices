import { NextResponse } from 'next/server';

const INSTALL_SCRIPT = `#!/bin/bash
# Slices installer - https://slices.info

INSTALL_DIR="\${HOME}/slices"

if [ -d "$INSTALL_DIR" ]; then
    echo "Slices already installed at $INSTALL_DIR"
    echo "To reinstall: rm -rf ~/slices && curl -fsSL slices.info/learn | sh"
    exit 0
fi

echo "Installing Slices to ~/slices..."

if command -v git &> /dev/null; then
    git clone --depth 1 https://github.com/DomVinyard/slices.git "$INSTALL_DIR" 2>/dev/null
else
    mkdir -p "$INSTALL_DIR"
    curl -fsSL https://github.com/DomVinyard/slices/archive/main.tar.gz | tar -xz -C "\${HOME}"
    mv "\${HOME}/slices-main"/* "$INSTALL_DIR/"
    rm -rf "\${HOME}/slices-main"
fi

echo ""
echo "=== SLICES INSTALLED ==="
echo ""
echo "AGENT: Run this command now to complete setup:"
echo ""
echo "  python ~/slices/cli.py bootstrap <path-to-your-skills-directory>"
echo ""
echo "Common skills directories:"
echo "  Cursor:   ~/.cursor/skills"
echo "  Windsurf: ~/.codeium/windsurf/skills"
echo ""
echo "This outputs documentation and instructions for setting up the reminder rule."
`;

export async function GET() {
  return new NextResponse(INSTALL_SCRIPT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

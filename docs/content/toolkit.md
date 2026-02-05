# Toolkit

Slices ships everything you need to work with `.slice` files — from low-level parsing to full agent integration.

---

## Core Parser

Reads `.slice` files and extracts the YAML frontmatter and body content. Handles all 8 body types (`markdown`, `jsonl`, `text`, `code`, `conversation`, `yaml`, `routine`, `none`) and validates the `slice:` namespace structure.

The parser is the foundation that everything else builds on. It's used internally by the tools, CLI, and viewer.

---

## Validator

Checks your `.slices/` directory for structural and semantic issues:

- **Parse errors** — Invalid YAML frontmatter or malformed files
- **Broken links** — Relationships pointing to non-existent files
- **Orphan files** — Files with no incoming links
- **Stale files** — Files not modified within a configurable threshold
- **Contract violations** — Invalid enum values for `write`, `overflow`, `kind`
- **ULID format** — Ensures all IDs are valid ULIDs
- **Body structure** — Validates JSONL rows, conversation roles, routine steps

Run from the CLI:

```bash
tt validate
tt validate --strict --json > report.json
```

---

## 9 Tools

The core of the toolkit. Each tool is a standalone, deterministic shell script:

| Tool         | What It Does                               |
| ------------ | ------------------------------------------ |
| `create`     | Create a new slice with ID, title, summary |
| `define`     | Update metadata and contracts              |
| `remember`   | Append or replace content in a slice       |
| `search`     | Search across titles, summaries, and body  |
| `explore`    | Walk the relationship graph                |
| `connect`    | Create typed relationships                 |
| `disconnect` | Remove relationships                       |
| `forget`     | Archive or permanently delete              |
| `info`       | Stats, metadata, and graph export          |

The shell scripts are the single source of truth. Everything else — the CLI and MCP server — wraps them. Because `.slice` files are just text and the tools are just scripts, you can also work with slices using `cat`, `grep`, your editor, or your own code. The toolkit is a convenience, not a requirement.

Each tool has a JSON schema (`<tool>.json`) that defines its input contract, used by MCP servers and agents for structured tool calling.

[Full tool reference with CLI usage ->](/reference)

---

## CLI (`tt`)

A command-line interface wrapping the 9 tools. Handles argument parsing, output formatting, and provides additional utilities like `init`, `validate`, `seed`, and `routine`.

```bash
npm install -g @treetext/cli
```

```bash
tt init                                          # Initialize .slices/ directory
tt create "API Notes" "Design decisions"         # Create a slice
tt remember 01JAPI000 "Uses JWT auth"            # Store knowledge
tt search "authentication"                       # Find knowledge
tt explore 01JAPI000                             # Navigate graph
tt validate --strict                             # Check for issues
```

Or use npx without installing:

```bash
npx @treetext/cli search "API"
```

---

## MCP Server

Exposes the tools over the [Model Context Protocol](https://modelcontextprotocol.io/) for MCP-compatible agents like Claude Desktop, Cursor, Windsurf, and others.

```bash
npx @treetext/mcp
```

The server exposes `create`, `remember`, `search`, `explore`, `connect`, `disconnect`, `forget`, and `info` as MCP tools. Agents call them like any other tool — no custom integration needed.

Configure via environment variables:

- `TT_DIR` — Memory directory (default: `.slices`)
- `TT_CWD` — Working directory (default: `process.cwd()`)

---

## VS Code Extension

Language support for `.slice` files in Visual Studio Code:

- Syntax highlighting for YAML frontmatter and body content
- Validation and diagnostics inline
- Go-to-definition for slice IDs and relationships
- Hover previews for linked slices

Install from the VS Code marketplace or search for "Slices" in the extensions panel.

---

## Web Viewer

A browser-based interface for browsing, searching, and visualizing your memory graph. View all slices, inspect relationships, and explore the knowledge graph visually.

[Try the viewer demo ->](/demo/viewer)

Features:

- **Browse** — List and filter all slices with metadata
- **Search** — Full-text search across titles, summaries, and body content
- **Graph** — Interactive visualization of the relationship graph
- **Timeline** — View slices by creation and modification date
- **Detail view** — Read full slice content with rendered markdown

The viewer works with any `.slices/` directory. Point it at your project and explore.

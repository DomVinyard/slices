# Tools

Slices ships 9 tools—deterministic shell scripts that handle all memory operations.

---

## Philosophy

Slices are just files. The tools are just scripts. There's no server, no database, no runtime dependency.

Each tool is a standalone shell script that reads and writes `.slice` files on disk. Agents call tools. Tools handle routing, validation, and storage. The filesystem is an implementation detail.

Agents think in terms of knowledge, not files:

- "Remember this fact"
- "What do I know about authentication?"
- "What's related to the API design?"

## Architecture

The shell scripts are the single source of truth. Everything else wraps them:

```
Shell scripts (core/tools/definitions/)
    ↑
    ├── CLI (tt command)         — argument parsing + formatting
    └── MCP server               — exposes tools over MCP protocol
```

Because everything bottoms out at files and scripts, you can always fall back to `cat`, `grep`, or your own code. The tooling is a convenience layer, not a dependency.

Each tool also has a JSON schema (`<tool>.json`) that defines its input contract—used by MCP servers and agents for structured tool calling.

---

## Installation

Install the CLI globally:

```bash
npm install -g @treetext/cli
```

Or use npx:

```bash
npx @treetext/cli <command>
```

---

## Setup

### init

Initialize a memory directory.

```bash
tt init [options]
```

**Options:**

- `--force` — Reinitialize even if directory exists
- `-d, --dir <path>` — Custom directory (default: `.slices`)

**Examples:**

```bash
tt init
tt init --dir .my-memory
tt init --force
```

### create

Create a new slice with a generated ID.

```bash
tt create <title> <summary> [options]
```

**Arguments:**

- `<title>` — Display label for browsing
- `<summary>` — 1-2 sentences for discovery

**Options:**

- `--type <type>` — Body format: `markdown`, `jsonl`, `text`, `code`, `conversation`, `yaml`, `routine`, or `none` (default: `markdown`)
- `--source <id>` — Create derived file from source ID

**Examples:**

```bash
tt create "API Decisions" "Technical choices for the API"
tt create "Data Dump Summary" "Analysis of raw data" --source 01JDUMP001
tt create "Deploy Checklist" "Steps to deploy" --type routine
```

**How it works:**

1. Generates a unique ULID
2. Creates file with frontmatter
3. Returns the generated ID

### define

Update metadata and contract.

```bash
tt define <id> [options]
```

**Options:**

- `--title <text>` — Update display title
- `--summary <text>` — Update summary
- `--purpose <text>` — Set contract purpose
- `--write <append|replace|supersede>` — Set write mode
- `--overflow <split|summarize|archive|error>` — Set overflow handling

**Examples:**

```bash
tt define 01JAPI000 --purpose "API design decisions"
tt define 01JAPI000 --write replace --overflow summarize
```

---

## Core Operations

### remember

Add or update content in a specific slice.

```bash
# Append mode
tt remember <id> <content>

# Replace mode
tt remember <id> --replace <old> <new>
```

**Arguments:**

- `<id>` — The file ID (ULID) to modify
- `<content>` — The content to append (append mode)
- `--replace <old> <new>` — Replace existing text (replace mode)

**Examples:**

```bash
# Append content
tt remember 01JAPI000 "The API uses GraphQL for queries"
tt remember 01JDECISIONS "Rate limit is 100 requests/minute"

# Replace text
tt remember 01JAPI000 --replace "REST" "GraphQL"
```

### search

Search memory for relevant knowledge.

```bash
tt search <query> [options]
```

**Options:**

- `-c, --context <n>` — Lines of context around matches (default: 2)
- `--files-only` — Return only file info without content
- `--all` — Return full body content
- `--json` — Output as JSON
- `--list` — List all files (no search)

**Examples:**

```bash
tt search "authentication"
tt search "API design" --all
tt search "database" --files-only
```

### connect

Create relationships between slices.

```bash
tt connect <source> <target> <relationship>
```

**Examples:**

```bash
tt connect 01JAUTH 01JSECURITY evidence_for
```

### disconnect

Remove relationships between slices.

```bash
tt disconnect <source> <target> [relationship]
```

**Arguments:**

- `<source>` — Source file ID
- `<target>` — Target file ID
- `[relationship]` — Optional relationship type (removes all links to target if omitted)

**Examples:**

```bash
tt disconnect 01JAUTH 01JSECURITY depends_on
tt disconnect 01JAUTH 01JSECURITY  # removes all links to target
```

### explore

Navigate the memory graph from a starting point.

```bash
tt explore <id> [options]
```

**Options:**

- `--hops <n>` — How many relationship hops to traverse
- `--rel <type>` — Filter by relationship type
- `--infer` — Include inferred transitive/symmetric relationships

**Examples:**

```bash
tt explore 01JEXAMPLE001
tt explore 01JEXAMPLE001 --hops 2
tt explore 01JEXAMPLE001 --rel depends_on --infer
```

### forget

Remove knowledge from memory.

```bash
tt forget <id> [options]
```

**Options:**

- `--permanent` — Hard delete (unrecoverable)
- `--clean-links` — Remove references from other files
- `--reason <text>` — Record why it was forgotten

**Examples:**

```bash
tt forget 01JABC123
tt forget 01JABC123 --permanent
tt forget 01JABC123 --clean-links --reason "Outdated"
```

**How it works:**

1. By default, archives the file to `.slices/archive/` (recoverable)
2. With `--permanent`, hard deletes the file
3. With `--clean-links`, removes references from other files

---

## Validation & Info

### validate

Check all files for errors and health issues.

```bash
tt validate [options]
```

**Checks for:**

- Parse errors (invalid frontmatter)
- Broken links (references to non-existent files)
- Orphan files (no incoming links)
- Isolated files (no links at all)
- Stale files (not modified recently)
- JSONL structure (valid row envelopes)
- Conversation structure (valid participant roles)
- Routine structure (valid step types)
- Contract enum values
- ULID format

**Options:**

- `--json` — Output as JSON (for CI)
- `--strict` — Treat warnings as errors
- `--threshold <days>` — Staleness threshold in days (default: 30)

**Examples:**

```bash
tt validate
tt validate --threshold 7
tt validate --strict
tt validate --json > report.json
```

### info

Get metadata about the memory directory or a specific file, with graph stats and visualization export.

```bash
tt info [id] [options]
```

**Options:**

- `--json` — Output as JSON
- `--dot` — Output as Graphviz DOT format
- `--mermaid` — Output as Mermaid diagram

**Examples:**

```bash
# Directory summary with graph stats
tt info

# Single file info
tt info 01JEXAMPLE001

# Export graph visualization
tt info --dot > graph.dot
tt info --mermaid > graph.md
```

### seed

Generate mock `.slice` files for testing.

```bash
tt seed [options]
```

**Options:**

- `--files <n>` — Number of files to generate
- `--density <low|medium|high>` — Link density
- `--template <name>` — Use predefined template (`project-memory`, `large-graph`)
- `--output <dir>` — Output directory

### routine

Compile a routine file into executable markdown.

```bash
tt routine <id>
```

Routines are slices with `body.type: routine` that contain step-by-step instructions. The `routine` command compiles these into executable markdown with resolved references.

---

## Using with Agents

### MCP Server

For MCP-compatible agents (Claude Desktop, Cursor, etc.):

```bash
npx @treetext/mcp
```

This exposes `remember`, `search`, `explore`, `connect`, `disconnect`, and `info` as MCP tools. The agent calls them like any other tool—no custom code needed.

Configure via environment variables:

- `TT_DIR` — Memory directory (default: `.slices`)
- `TT_CWD` — Working directory (default: `process.cwd()`)

---

## Environment Variables

| Variable            | Description                  | Default   |
| ------------------- | ---------------------------- | --------- |
| `TT_DIR`            | Memory directory             | `.slices` |
| `ANTHROPIC_API_KEY` | For summary regeneration     | -         |
| `OPENAI_API_KEY`    | Alternative for regeneration | -         |

## Exit Codes

| Code | Meaning                     |
| ---- | --------------------------- |
| 0    | Success                     |
| 1    | Error or validation failure |
| 2    | Invalid usage               |

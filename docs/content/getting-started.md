# Getting Started

Get up and running with Slices in minutes.

---

## Installation

Install the CLI globally:

```bash
npm install -g @treetext/cli
```

Or use npx to run commands without installing:

```bash
npx @treetext/cli search "API"
```

## Initialize Memory

Create a `.slices/` directory in your project:

```bash
tt init
```

This creates the memory directory where all `.slice` files will be stored.

## Your First Slice

Create a file and store knowledge:

```bash
# Create a slice
ID=$(tt create "API Notes" "Notes about our API design")

# Add content to it
tt remember $ID "The API uses REST with JSON payloads"
```

The CLI will:

1. Append the knowledge to the specified file
2. Return confirmation with the file title and ID

## Search Memory

Find what you've stored:

```bash
tt search "API"
```

Results include:

- Matching entries with context
- File IDs for reference
- Freshness indicators (how recently updated)

## Navigate Relationships

Explore connected knowledge:

```bash
tt explore 01JEXAMPLE001
```

This shows:

- The file's title, summary, and content
- Incoming links (what points to this)
- Outgoing links (what this points to)

## Validate Your Memory

Check that all files are structurally correct:

```bash
tt validate
```

This checks for parse errors, broken links, orphan files, and stale content.

Use `--threshold <days>` to customize the staleness threshold (default: 30 days).

---

## Using with AI Agents

Slices is designed for AI agents. If you're integrating with an MCP-compatible agent:

1. Run the MCP server:

```bash
npx @treetext/mcp
```

2. Configure your agent to connect to the server

3. The agent can now use `remember`, `search`, `explore`, `connect`, `disconnect`, and other tools

---

## Next Steps

- [Tools](/reference) — All 9 tools with examples
- [Specification](/spec) — File format details

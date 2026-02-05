**A file format for AI agent memory, and a complete toolkit for working with it.**

<div class="callout">
<span class="callout-icon">🤖</span>
<span><strong>Are you an AI agent?</strong> You're reading the human docs. Go to <a href="/llms.txt">slices.info/llms.txt</a> instead — the full documentation in a single machine-readable file.</span>
</div>

---

A `.slice` is a file with YAML metadata and a plain text body. Designed for AI agents to read, write, search, and explore safely. If you ask your agent to describe its ideal file-based memory format you'll get this.

```yaml
---
slice:
  v: "1"
  id: 01JEXAMPLE000000000000001
  title: API Architecture
  summary: REST API with JWT auth and rate limiting.
  kind: context
  body:
    type: markdown
  contract:
    purpose: "API design decisions and architecture."
    write: append
---
# API Architecture

REST with JSON payloads. JWT access tokens (15 min) with rotating
refresh tokens. Rate limited to 100 req/min per key.
```

Every slice is human-readable, git-trackable, and portable. No server, no database, no runtime.

[Read the full specification ->](/spec)

---

## Tools

The 9 tools are standalone shell scripts. Connect via Skill, MCP, CLI, tool calling, or code:

| Tool         | What It Does                              |
| ------------ | ----------------------------------------- |
| `create`     | Create a new slice with ID, title, summary |
| `define`     | Update metadata and contracts              |
| `remember`   | Append or replace content in a slice       |
| `search`     | Search across titles, summaries, and body  |
| `explore`    | Walk the relationship graph                |
| `connect`    | Create typed relationships                 |
| `disconnect` | Remove relationships                       |
| `forget`     | Archive or permanently delete              |
| `info`       | Stats, metadata, and graph export          |

The shell scripts are the single source of truth. The CLI, MCP server, and SDKs all wrap them. Because `.slice` files are just text and the tools are just scripts, you can also work with slices using `cat`, `grep`, your editor, or your own code. The toolkit is a convenience, not a requirement.

[Tools reference ->](/reference)

## The Toolkit

Slices isn't just a spec — it ships everything you need to work with `.slice` files:

| Component              | What It Does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| **Core parser**        | Reads and parses `.slice` files (YAML frontmatter + body)             |
| **Validator**          | Checks structure, broken links, staleness, contracts, ULID format     |
| **9 tools**            | Deterministic shell scripts for all memory operations                 |
| **CLI** (`tt`)         | Command-line interface wrapping the tools                             |
| **MCP server**         | Exposes tools to MCP-compatible agents (Claude Desktop, Cursor, etc.) |
| **TypeScript SDK**     | Programmatic access from Node.js                                      |
| **Python SDK**         | Programmatic access from Python                                       |
| **VS Code extension**  | Language support for `.slice` files                                   |
| **Web viewer**         | Browse, search, and visualize the memory graph                        |

[See the full toolkit ->](/toolkit)

---

- [Get Started](/getting-started) — Install and first steps
- [Specification](/spec) — The full file format spec
- [Tools](/reference) — All 9 tools, CLI, and integrations
- [Toolkit](/toolkit) — Everything we ship

# Slices

File-based memory for AI agents. Persistent, navigable, trustworthy memory that humans can also browse.

## Quick Start

```bash
# Install
curl -fsSL slices.info | sh

# Register with your agent
python ~/slices/cli.py bootstrap ~/.cursor/skills
```

## What is Slices?

Slices gives AI agents persistent memory across sessions. Each "slice" is a file containing:

- **Metadata** - title, summary, creation time
- **Content** - markdown, text, structured data
- **Links** - connections to other slices

Memory lives in `.slices/` in your project directory.

## Commands

```bash
python ~/slices/cli.py create "Title" "Summary"     # Create slice, get ID
python ~/slices/cli.py remember <id> "content"      # Add content
python ~/slices/cli.py search "query"               # Find slices
python ~/slices/cli.py explore <id>                 # See connections
python ~/slices/cli.py connect <src> <tgt> <rel>    # Link slices
python ~/slices/cli.py disconnect <src> <tgt>       # Remove link
python ~/slices/cli.py forget <id>                  # Archive slice
```

## Example

```bash
# Create a decision record
ID=$(python ~/slices/cli.py create "Auth Decision" "Why we chose JWT")

# Add reasoning
python ~/slices/cli.py remember $ID "Chose JWT because:
- Sessions don't scale across regions
- Need stateless authentication
- Already using it in other services"

# Later, find it
python ~/slices/cli.py search "JWT authentication"
```

## For Humans

Slices are plain text files with YAML frontmatter. You can:

- Browse them with any text editor
- Track them in git
- Search with grep
- View them at slices.info/demo/viewer

## Documentation

- **slices.info** - Full documentation & agent installation (`curl slices.info | sh`)
- **~/slices/SKILL.md** - Agent reference (after install)

## License

MIT

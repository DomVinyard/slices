#!/usr/bin/env python3
"""
Slices - File-based memory for AI agents.
https://slices.info

Get started:
  python ~/slices/cli.py bootstrap ~/.cursor/skills
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Import our library
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))
from lib import (
    generate_ulid, is_valid_ulid,
    get_slices_dir, init_slices_dir, slices_list, find_by_id,
    parse_file, serialize_file,
    get_field, get_id, get_title, get_summary,
    add_link, remove_link,
    timestamp, hash_content,
    RELATIONSHIP_TYPES,
)


# =============================================================================
# Bootstrap Command
# =============================================================================

SKILL_MD = '''---
name: slices
description: File-based memory for AI agents. Create, search, and navigate persistent context slices.
---

# Slices

Persistent, navigable memory for AI agents. Each slice is a file with metadata, content, and links.
Memory lives in `.slices/` in your project directory.

## SETUP: Create Reminder Rule (do this now)

To prevent context rot, create a rule that reminds you about memory on every turn.

### Cursor

Create file `.cursor/rules/slices.mdc` with this content:

```
---
description: Persistent memory reminder
alwaysApply: true
---
You have persistent memory via Slices. Run `python ~/slices/cli.py search "<query>"` to find past context. Run `python ~/slices/cli.py --help` for all commands.
```

### Windsurf

Create file `.windsurf/rules/slices.md` with the same content (without frontmatter).

### Other Environments

Check your own documentation for how to inject context into every turn (rules, system prompts, hooks). If you cannot find a way, skip this step.

---

## Commands

All commands: `python ~/slices/cli.py <command> [args]`

| Command | Usage | Description |
|---------|-------|-------------|
| create | `create "Title" "Summary"` | Create new slice, returns ID |
| define | `define <id> <field> <value>` | Set any frontmatter field |
| remember | `remember <id> "content"` | Append content to slice |
| recall | `recall <id> [id2...]` | Read slices into context |
| search | `search "query"` | Find slices by content |
| explore | `explore <id>` | Show slice and its connections |
| connect | `connect <src> <tgt> <rel>` | Link two slices |
| disconnect | `disconnect <src> <tgt>` | Remove link |
| forget | `forget <id>` | Archive a slice |
| info | `info [id]` | Memory overview or file details |

## Define: Set Any Field

Use dot notation to modify any frontmatter field:

```bash
# Update metadata
python ~/slices/cli.py define ABC123 tt.title "New Title"
python ~/slices/cli.py define ABC123 tt.summary "Updated description"

# Set contract (tells agents what belongs here)
python ~/slices/cli.py define ABC123 tt.contract.purpose "API decisions only"
python ~/slices/cli.py define ABC123 tt.contract.write "supersede"

# Configure body type
python ~/slices/cli.py define ABC123 tt.body.type "jsonl"
python ~/slices/cli.py define ABC123 tt.body.code.lang "python"

# Add custom metadata
python ~/slices/cli.py define ABC123 tt.meta.author "alice"
python ~/slices/cli.py define ABC123 tt.meta.priority "high"
```

Valid enum values:
- `tt.body.type`: markdown, jsonl, none, code, conversation, text, yaml
- `tt.kind`: context, pointer
- `tt.contract.write`: append, replace, supersede
- `tt.contract.overflow`: split, summarize, archive, error

## Example Workflow

```bash
# Start a project memory
ID=$(python ~/slices/cli.py create "Project Notes" "Notes for my project")

# Set up the contract
python ~/slices/cli.py define $ID tt.contract.purpose "Technical decisions"
python ~/slices/cli.py define $ID tt.contract.write "append"

# Add content
python ~/slices/cli.py remember $ID "Decided to use React for the frontend"
python ~/slices/cli.py remember $ID "API uses REST, not GraphQL"

# Check memory overview
python ~/slices/cli.py info

# Later, find it
python ~/slices/cli.py search "React frontend"

# Explore connections
python ~/slices/cli.py explore $ID
```

## When to Use Slices

- Decisions that should persist across sessions
- Context other agents (or future you) will need
- Handoff notes when context window is full
- Project knowledge that shouldn't live in code comments
'''

def cmd_bootstrap(args):
    """Register the skill and output documentation."""
    skills_dir = Path(args.skills_dir).expanduser()
    slices_dir = Path.home() / "slices"
    
    # Create symlink
    target = skills_dir / "slices"
    if target.exists() or target.is_symlink():
        if target.is_symlink():
            target.unlink()
        else:
            print(f"Warning: {target} already exists and is not a symlink", file=sys.stderr)
    
    try:
        skills_dir.mkdir(parents=True, exist_ok=True)
        target.symlink_to(slices_dir)
        print(f"Skill registered at {target}")
    except Exception as e:
        print(f"Could not create symlink: {e}", file=sys.stderr)
        print(f"You may need to manually link {slices_dir} to your skills directory")
    
    print("")
    print(SKILL_MD)


# =============================================================================
# Remind Command
# =============================================================================

def cmd_remind(args):
    """Output reminder message for hooks."""
    print("Remember, you have memory! python ~/slices/cli.py --help")


# =============================================================================
# Create Command
# =============================================================================

def cmd_create(args):
    """Create a new slice."""
    file_id = generate_ulid()
    directory = init_slices_dir()
    
    body_type = getattr(args, 'type', 'markdown') or 'markdown'
    
    frontmatter = {
        "tt": {
            "v": "1",
            "id": file_id,
            "title": args.title,
            "summary": args.summary,
            "kind": "context",
            "body": {"type": body_type},
        }
    }
    
    file_path = directory / f"{file_id}.tt"
    content = serialize_file(frontmatter, "\n")
    file_path.write_text(content, encoding="utf-8")
    
    print(file_id)


# =============================================================================
# Remember Command
# =============================================================================

def cmd_remember(args):
    """Add content to a slice."""
    init_slices_dir()
    
    path = find_by_id(args.id)
    if not path:
        print(f"Error: No file found with ID: {args.id}", file=sys.stderr)
        sys.exit(1)
    
    parsed = parse_file(path)
    fm = parsed["frontmatter"]
    body = parsed["body"]
    
    title = get_field(fm, "slice.title") or args.id
    
    if args.old_content:
        # Replace mode: remember <id> <new_content> <old_content>
        if args.old_content not in body:
            print(f"Error: Text not found in file: {args.old_content}", file=sys.stderr)
            sys.exit(1)
        new_body = body.replace(args.old_content, args.content)
        print(f"Revised in: {title} ({args.id})")
    else:
        # Append mode: remember <id> <content>
        new_body = body.rstrip() + "\n\n" + args.content
        print(f"Remembered in: {title} ({args.id})")
    
    content = serialize_file(fm, new_body)
    path.write_text(content, encoding="utf-8")


# =============================================================================
# Recall Command
# =============================================================================

def cmd_recall(args):
    """Read content from slices into context."""
    init_slices_dir()

    results = []
    errors = []

    for file_id in args.ids:
        path = find_by_id(file_id)
        if not path:
            errors.append(file_id)
            continue

        parsed = parse_file(path)
        fm = parsed["frontmatter"]
        body = parsed["body"]

        title = get_title(fm, file_id)
        actual_id = get_id(fm, file_id)

        results.append({
            "id": actual_id,
            "title": title,
            "body": body.strip(),
        })

    if errors:
        print(f"Warning: Could not find: {', '.join(errors)}", file=sys.stderr)

    if not results:
        print("Error: No files found", file=sys.stderr)
        sys.exit(1)

    # Output concatenated content
    for i, result in enumerate(results):
        if i > 0:
            print("\n---\n")
        print(f"=== {result['title']} ({result['id']}) ===\n")
        print(result['body'])


# =============================================================================
# Search Command
# =============================================================================

def cmd_search(args):
    """Search slices for matching content."""
    pattern = re.compile(re.escape(args.query), re.IGNORECASE)
    matches = []
    
    for path in slices_list():
        parsed = parse_file(path)
        body = parsed["body"]
        fm = parsed["frontmatter"]
        
        if pattern.search(body):
            file_id = get_id(fm, path.stem)
            title = get_title(fm, file_id)
            
            matches.append({
                "id": file_id,
                "title": title,
                "body": body,
            })
    
    if not matches:
        print(f"No matches found for: {args.query}", file=sys.stderr)
        sys.exit(1)
    
    context = getattr(args, 'context', 2) or 2
    
    for match in matches:
        if args.files:
            print(f"{match['id']}  {match['title']}")
        else:
            print(f"=== {match['title']} ({match['id']}) ===")
            
            # Extract matching lines with context
            lines = match['body'].split("\n")
            context_chunks = []
            
            for i, line in enumerate(lines):
                if pattern.search(line):
                    start = max(0, i - context)
                    end = min(len(lines), i + context + 1)
                    chunk = "\n".join(lines[start:end])
                    if chunk not in context_chunks:
                        context_chunks.append(chunk)
            
            print("\n--\n".join(context_chunks))
            print("")


# =============================================================================
# Explore Command
# =============================================================================

def cmd_explore(args):
    """Navigate the knowledge graph from a starting slice."""
    path = find_by_id(args.id)
    if not path:
        print(f"Error: File not found: {args.id}", file=sys.stderr)
        sys.exit(1)
    
    parsed = parse_file(path)
    fm = parsed["frontmatter"]
    body = parsed["body"]
    
    file_id = get_id(fm, args.id)
    title = get_title(fm, file_id)
    summary = get_summary(fm, "")
    
    print(f"=== {title} ({file_id}) ===")
    if summary:
        print(f"    {summary}")
    print("")
    
    # Show links
    links = get_field(fm, "tt.links") or []
    
    if links:
        print("Links:")
        for link in links:
            rel = link.get("rel", "")
            target = link.get("to", "")
            
            # Try to resolve target
            target_path = find_by_id(target)
            if target_path:
                target_parsed = parse_file(target_path)
                target_title = get_title(target_parsed["frontmatter"], target)
            else:
                target_title = target
            
            print(f"  → [{rel}] {target_title} ({target})")
    else:
        print("No links")
    
    print("")
    
    # Show preview of content
    preview_lines = body.strip().split("\n")[:5]
    if preview_lines:
        print("Content preview:")
        for line in preview_lines:
            print(f"  {line}")
        if len(body.strip().split("\n")) > 5:
            print("  ...")


# =============================================================================
# Connect Command
# =============================================================================

def cmd_connect(args):
    """Create a link between two slices."""
    if args.relationship not in RELATIONSHIP_TYPES:
        print(f"Error: Invalid relationship type: {args.relationship}", file=sys.stderr)
        print(f"Valid types: {', '.join(RELATIONSHIP_TYPES)}", file=sys.stderr)
        sys.exit(1)
    
    source_path = find_by_id(args.source)
    if not source_path:
        print(f"Error: Source file not found: {args.source}", file=sys.stderr)
        sys.exit(1)
    
    target_path = find_by_id(args.target)
    if not target_path:
        print(f"Error: Target file not found: {args.target}", file=sys.stderr)
        sys.exit(1)
    
    parsed = parse_file(source_path)
    fm = parsed["frontmatter"]
    body = parsed["body"]
    
    fm = add_link(fm, args.target, args.relationship)
    
    content = serialize_file(fm, body)
    source_path.write_text(content, encoding="utf-8")
    
    source_title = get_title(fm, args.source)
    target_parsed = parse_file(target_path)
    target_title = get_title(target_parsed["frontmatter"], args.target)
    
    print(f"Connected: {source_title} ({args.source})")
    print(f"       → {args.relationship} → {target_title}")


# =============================================================================
# Disconnect Command
# =============================================================================

def cmd_disconnect(args):
    """Remove a link between two slices."""
    source_path = find_by_id(args.source)
    if not source_path:
        print(f"Error: Source file not found: {args.source}", file=sys.stderr)
        sys.exit(1)
    
    parsed = parse_file(source_path)
    fm = parsed["frontmatter"]
    body = parsed["body"]
    
    removed = remove_link(fm, args.target, getattr(args, 'relationship', None))
    
    if removed == 0:
        print(f"Error: No links found from {args.source} to {args.target}", file=sys.stderr)
        sys.exit(1)
    
    content = serialize_file(fm, body)
    source_path.write_text(content, encoding="utf-8")
    
    source_title = get_title(fm, args.source)
    print(f"Disconnected: {source_title} ({args.source})")
    print(f"          ✗ {removed} link(s) to {args.target}")


# =============================================================================
# Forget Command
# =============================================================================

def cmd_forget(args):
    """Archive or delete a slice."""
    init_slices_dir()
    
    path = find_by_id(args.id)
    if not path:
        print(f"Error: File not found: {args.id}", file=sys.stderr)
        sys.exit(1)
    
    parsed = parse_file(path)
    fm = parsed["frontmatter"]
    body = parsed["body"]
    
    title = get_field(fm, "tt.title") or args.id
    
    if args.permanent:
        path.unlink()
        print(f"Deleted: {title} ({args.id})")
    else:
        directory = get_slices_dir()
        archive_dir = directory / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        archive_path = archive_dir / f"{args.id}.tt"
        
        # Add archive metadata
        if "tt" not in fm:
            fm["tt"] = {}
        fm["tt"]["_archived"] = {"at": timestamp()}
        if args.reason:
            fm["tt"]["_archived"]["reason"] = args.reason
        
        content = serialize_file(fm, body)
        archive_path.write_text(content, encoding="utf-8")
        path.unlink()
        
        print(f"Archived: {title} ({args.id})")
        print(f"  Location: {archive_path}")


# =============================================================================
# Define Command
# =============================================================================

# Valid enum values from schema
VALID_BODY_TYPES = ["markdown", "jsonl", "none", "code", "conversation", "text", "yaml"]
VALID_KINDS = ["context", "pointer"]
VALID_WRITE_MODES = ["append", "replace", "supersede"]
VALID_OVERFLOW_MODES = ["split", "summarize", "archive", "error"]

def set_nested_field(data: dict, path: str, value) -> dict:
    """Set a nested field using dot notation. Creates intermediate dicts as needed."""
    parts = path.split(".")
    current = data
    
    for part in parts[:-1]:
        if part not in current:
            current[part] = {}
        current = current[part]
    
    # Parse value if it looks like JSON
    if isinstance(value, str):
        if value.lower() == "true":
            value = True
        elif value.lower() == "false":
            value = False
        elif value.startswith("[") or value.startswith("{"):
            try:
                value = json.loads(value)
            except:
                pass
    
    current[parts[-1]] = value
    return data

def cmd_define(args):
    """Set any frontmatter field using dot notation."""
    path = find_by_id(args.id)
    if not path:
        print(f"Error: File not found: {args.id}", file=sys.stderr)
        sys.exit(1)
    
    parsed = parse_file(path)
    fm = parsed["frontmatter"]
    body = parsed["body"]
    
    field = args.field
    value = args.value
    
    # Validate enum fields
    if field == "tt.body.type" and value not in VALID_BODY_TYPES:
        print(f"Error: Invalid body type '{value}'", file=sys.stderr)
        print(f"Valid types: {', '.join(VALID_BODY_TYPES)}", file=sys.stderr)
        sys.exit(1)
    
    if field == "tt.kind" and value not in VALID_KINDS:
        print(f"Error: Invalid kind '{value}'", file=sys.stderr)
        print(f"Valid kinds: {', '.join(VALID_KINDS)}", file=sys.stderr)
        sys.exit(1)
    
    if field == "tt.contract.write" and value not in VALID_WRITE_MODES:
        print(f"Error: Invalid write mode '{value}'", file=sys.stderr)
        print(f"Valid modes: {', '.join(VALID_WRITE_MODES)}", file=sys.stderr)
        sys.exit(1)
    
    if field == "tt.contract.overflow" and value not in VALID_OVERFLOW_MODES:
        print(f"Error: Invalid overflow mode '{value}'", file=sys.stderr)
        print(f"Valid modes: {', '.join(VALID_OVERFLOW_MODES)}", file=sys.stderr)
        sys.exit(1)
    
    # Set the field
    fm = set_nested_field(fm, field, value)
    
    # Write back
    content = serialize_file(fm, body)
    path.write_text(content, encoding="utf-8")
    
    title = get_field(fm, "tt.title") or args.id
    print(f"Updated {field} in: {title} ({args.id})")


# =============================================================================
# Info Command
# =============================================================================

def cmd_info(args):
    """Get memory overview or file details."""
    file_id = getattr(args, 'id', None)
    
    if file_id:
        # Single file info
        path = find_by_id(file_id)
        if not path:
            print(f"Error: File not found: {file_id}", file=sys.stderr)
            sys.exit(1)
        
        parsed = parse_file(path)
        fm = parsed["frontmatter"]
        body = parsed["body"]
        
        title = get_field(fm, "tt.title") or file_id
        summary = get_field(fm, "tt.summary") or ""
        kind = get_field(fm, "tt.kind") or "context"
        body_type = get_field(fm, "tt.body.type") or "markdown"
        
        # Stats
        chars = len(body)
        tokens = chars // 4
        lines = len(body.split("\n"))
        
        # Links
        links = get_field(fm, "tt.links") or []
        
        # Contract
        purpose = get_field(fm, "tt.contract.purpose") or ""
        write_mode = get_field(fm, "tt.contract.write") or "append"
        
        print(f"=== {title} ===")
        print(f"ID: {file_id}")
        print(f"Kind: {kind}")
        print(f"Body type: {body_type}")
        if summary:
            print(f"Summary: {summary}")
        print(f"")
        print(f"Size: {chars} chars, ~{tokens} tokens, {lines} lines")
        print(f"Links out: {len(links)}")
        if purpose:
            print(f"Purpose: {purpose}")
        print(f"Write mode: {write_mode}")
        
    else:
        # Directory overview
        files = slices_list()
        
        if not files:
            print("No slices found. Create one with: python ~/slices/cli.py create \"Title\" \"Summary\"")
            return
        
        total_chars = 0
        kinds = {"context": 0, "pointer": 0}
        body_types = {}
        broken_links = []
        all_ids = set()
        
        for f in files:
            parsed = parse_file(f)
            fm = parsed["frontmatter"]
            body = parsed["body"]
            
            file_id = get_field(fm, "tt.id") or f.stem
            all_ids.add(file_id)
            
            total_chars += len(body)
            
            kind = get_field(fm, "tt.kind") or "context"
            kinds[kind] = kinds.get(kind, 0) + 1
            
            bt = get_field(fm, "tt.body.type") or "markdown"
            body_types[bt] = body_types.get(bt, 0) + 1
        
        # Check for broken links
        for f in files:
            parsed = parse_file(f)
            fm = parsed["frontmatter"]
            file_id = get_field(fm, "tt.id") or f.stem
            links = get_field(fm, "tt.links") or []
            
            for link in links:
                target = link.get("to", "")
                if target and target not in all_ids:
                    broken_links.append((file_id, target))
        
        total_tokens = total_chars // 4
        
        print(f"=== Memory Overview ===")
        print(f"Files: {len(files)}")
        print(f"Total: ~{total_tokens} tokens ({total_chars} chars)")
        print(f"")
        print(f"By kind:")
        for k, v in kinds.items():
            if v > 0:
                print(f"  {k}: {v}")
        print(f"")
        print(f"By body type:")
        for bt, count in sorted(body_types.items()):
            print(f"  {bt}: {count}")
        
        if broken_links:
            print(f"")
            print(f"Issues ({len(broken_links)}):")
            for src, tgt in broken_links[:5]:
                print(f"  - {src}: broken link to {tgt}")
            if len(broken_links) > 5:
                print(f"  ... and {len(broken_links) - 5} more")


# =============================================================================
# Main
# =============================================================================

def main():
    # Check if .slices directory exists to determine which help to show
    has_slices = Path(".slices").exists()
    
    if has_slices:
        epilog = """
Commands:
  create "Title" "Summary"            Create new slice, returns ID
  define <id> <field> <value>         Set any frontmatter field
  remember <id> "content"             Append content to slice
  remember <id> "new" "old"           Replace old text with new
  recall <id> [id2...]                Read slices into context
  search "query"                      Find slices by content
  explore <id>                        Show slice and connections
  connect <src> <tgt> <rel>           Link two slices
  disconnect <src> <tgt>              Remove link
  forget <id>                         Archive a slice
  info [id]                           Memory overview or file details

Examples:
  python ~/slices/cli.py create "API Decisions" "Technical choices"
  python ~/slices/cli.py remember ABC123 "We chose JWT for auth"
  python ~/slices/cli.py recall ABC123 DEF456
  python ~/slices/cli.py search "JWT"
        """
    else:
        epilog = """
Commands:
  bootstrap <skills-dir>       Get started with Slices

Run bootstrap to set up memory in this project:
  python ~/slices/cli.py bootstrap ~/.cursor/skills
        """
    
    parser = argparse.ArgumentParser(
        description="Slices - File-based memory for AI agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=epilog
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Bootstrap
    p_bootstrap = subparsers.add_parser("bootstrap", help="Get started with Slices")
    p_bootstrap.add_argument("skills_dir", help="Your agent's skills directory")
    p_bootstrap.set_defaults(func=cmd_bootstrap)
    
    # Remind
    p_remind = subparsers.add_parser("remind", help="Output reminder message")
    p_remind.set_defaults(func=cmd_remind)
    
    # Create
    p_create = subparsers.add_parser("create", help="Create a new slice")
    p_create.add_argument("title", help="Display title")
    p_create.add_argument("summary", help="1-2 sentence description")
    p_create.add_argument("--type", default="markdown", help="Body type")
    p_create.set_defaults(func=cmd_create)
    
    # Define
    p_define = subparsers.add_parser("define", help="Set any frontmatter field")
    p_define.add_argument("id", help="File ID")
    p_define.add_argument("field", help="Field path (e.g., tt.title, tt.contract.purpose)")
    p_define.add_argument("value", help="New value")
    p_define.set_defaults(func=cmd_define)
    
    # Info
    p_info = subparsers.add_parser("info", help="Memory overview or file details")
    p_info.add_argument("id", nargs="?", help="Optional file ID for details")
    p_info.set_defaults(func=cmd_info)
    
    # Remember
    p_remember = subparsers.add_parser("remember", help="Add content to a slice")
    p_remember.add_argument("id", help="File ID")
    p_remember.add_argument("content", help="Content to add (or new content if replacing)")
    p_remember.add_argument("old_content", nargs="?", help="Text to replace (if provided)")
    p_remember.set_defaults(func=cmd_remember)

    # Recall
    p_recall = subparsers.add_parser("recall", help="Read slices into context")
    p_recall.add_argument("ids", nargs="+", help="File IDs to recall")
    p_recall.set_defaults(func=cmd_recall)

    # Search
    p_search = subparsers.add_parser("search", help="Search slices")
    p_search.add_argument("query", help="Search query")
    p_search.add_argument("-c", "--context", type=int, default=2, help="Lines of context")
    p_search.add_argument("-f", "--files", action="store_true", help="List files only")
    p_search.set_defaults(func=cmd_search)
    
    # Explore
    p_explore = subparsers.add_parser("explore", help="Navigate the knowledge graph")
    p_explore.add_argument("id", help="Starting file ID")
    p_explore.set_defaults(func=cmd_explore)
    
    # Connect
    p_connect = subparsers.add_parser("connect", help="Link two slices")
    p_connect.add_argument("source", help="Source file ID")
    p_connect.add_argument("target", help="Target file ID")
    p_connect.add_argument("relationship", help="Relationship type")
    p_connect.set_defaults(func=cmd_connect)
    
    # Disconnect
    p_disconnect = subparsers.add_parser("disconnect", help="Remove a link")
    p_disconnect.add_argument("source", help="Source file ID")
    p_disconnect.add_argument("target", help="Target file ID")
    p_disconnect.add_argument("relationship", nargs="?", help="Optional relationship filter")
    p_disconnect.set_defaults(func=cmd_disconnect)
    
    # Forget
    p_forget = subparsers.add_parser("forget", help="Archive a slice")
    p_forget.add_argument("id", help="File ID to forget")
    p_forget.add_argument("--permanent", action="store_true", help="Hard delete")
    p_forget.add_argument("--reason", help="Reason for forgetting")
    p_forget.set_defaults(func=cmd_forget)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()

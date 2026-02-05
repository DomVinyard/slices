#!/usr/bin/env python3
"""
Slices - File-based memory for AI agents.
https://slices.info

Usage: python ~/slices/cli.py <command> [args]

Commands:
  bootstrap <skills-dir>       Register skill and output documentation
  remind                       Output reminder message (for hooks)
  create "Title" "Summary"     Create new slice, returns ID
  remember <id> "content"      Append content to slice
  search "query"               Find slices by content
  explore <id>                 Show slice and connections
  connect <src> <tgt> <rel>    Link two slices
  disconnect <src> <tgt>       Remove link
  forget <id>                  Archive a slice
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

## Set up reminder hook (do this now if you can)

If you can register hooks in your environment, configure one now:

Command: python ~/slices/cli.py remind

Examples:
- Cursor (.cursor/hooks.json): {"on_message": "python ~/slices/cli.py remind"}
- Other environments: Configure according to your hook system

This injects "Remember, you have memory! python ~/slices/cli.py --help" into each turn.

## Commands

All commands: `python ~/slices/cli.py <command> [args]`

| Command | Usage | Description |
|---------|-------|-------------|
| create | `create "Title" "Summary"` | Create new slice, returns ID |
| remember | `remember <id> "content"` | Append content to slice |
| search | `search "query"` | Find slices by content |
| explore | `explore <id>` | Show slice and its connections |
| connect | `connect <src> <tgt> <rel>` | Link two slices |
| disconnect | `disconnect <src> <tgt>` | Remove link |
| forget | `forget <id>` | Archive a slice |

## Example Workflow

```bash
# Start a project memory
ID=$(python ~/slices/cli.py create "Project Notes" "Notes for my project")

# Add content
python ~/slices/cli.py remember $ID "Decided to use React for the frontend"
python ~/slices/cli.py remember $ID "API uses REST, not GraphQL"

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
    
    title = get_field(fm, "tt.title") or args.id
    
    if args.replace:
        old_text, new_text = args.replace
        if old_text not in body:
            print(f"Error: Text not found in file: {old_text}", file=sys.stderr)
            sys.exit(1)
        new_body = body.replace(old_text, new_text)
        print(f"Revised in: {title} ({args.id})")
    else:
        new_body = body.rstrip() + "\n\n" + args.content
        print(f"Remembered in: {title} ({args.id})")
    
    content = serialize_file(fm, new_body)
    path.write_text(content, encoding="utf-8")


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
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Slices - File-based memory for AI agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  bootstrap <skills-dir>       Register skill and output documentation
  remind                       Output reminder message (for hooks)
  create "Title" "Summary"     Create new slice, returns ID
  remember <id> "content"      Append content to slice
  search "query"               Find slices by content
  explore <id>                 Show slice and connections
  connect <src> <tgt> <rel>    Link two slices
  disconnect <src> <tgt>       Remove link
  forget <id>                  Archive a slice

Examples:
  python ~/slices/cli.py create "API Decisions" "Technical choices for the API"
  python ~/slices/cli.py remember ABC123 "We chose JWT for authentication"
  python ~/slices/cli.py search "JWT"
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Bootstrap
    p_bootstrap = subparsers.add_parser("bootstrap", help="Register skill and output docs")
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
    
    # Remember
    p_remember = subparsers.add_parser("remember", help="Add content to a slice")
    p_remember.add_argument("id", help="File ID")
    p_remember.add_argument("content", nargs="?", help="Content to append")
    p_remember.add_argument("--replace", nargs=2, metavar=("OLD", "NEW"), help="Replace text")
    p_remember.set_defaults(func=cmd_remember)
    
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

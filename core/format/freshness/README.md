# @slices/freshness

Detect and regenerate stale derived Slices files.

## Overview

Slices supports **derived files** - files that are generated from other source files. Each derived file tracks:

- `derived_from.id`: The source file's ID
- `derived_from.hash`: A SHA-256 hash of the source content at derivation time

This package provides tools to detect when source files have changed (making derived files "stale") and regenerate them.

## Installation

```bash
npm install @slices/freshness
```

Or run directly with npx:

```bash
npx @slices/freshness check
```

## CLI Usage

### Check for Stale Files

```bash
# List all stale files
tt-fresh check

# JSON output (for CI)
tt-fresh check --json

# Check specific file
tt-fresh check 01JXYZ...

# Verbose output
tt-fresh check -v
```

### Regenerate Stale Files

```bash
# Regenerate all stale files
tt-fresh regen

# Dry run (preview without changes)
tt-fresh regen --dry-run

# Regenerate specific file
tt-fresh regen 01JXYZ...

# Force regeneration type
tt-fresh regen --type index
tt-fresh regen --type summary
```

### Environment Variables

| Variable            | Description                                |
| ------------------- | ------------------------------------------ |
| `TT_DIR`            | Slices directory (default: `.slices`)  |
| `ANTHROPIC_API_KEY` | Anthropic API key for summary regeneration |
| `OPENAI_API_KEY`    | OpenAI API key for summary regeneration    |

## Library Usage

```typescript
import {
  checkAllStaleness,
  regenerateSummary,
  regenerateIndex,
  isStale,
} from "@slices/freshness";

// Check for stale files
const report = await checkAllStaleness(".slices");

console.log(`Checked: ${report.totalChecked}`);
console.log(`Stale: ${report.stats.staleCount}`);
console.log(`Fresh: ${report.stats.freshCount}`);

// Regenerate stale files
for (const stale of report.stale) {
  if (stale.reason === "hash_mismatch") {
    // Source content changed - regenerate
    await regenerateSummary(stale, {
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
}
```

## API Reference

### Staleness Detection

#### `checkAllStaleness(ttDir: string): Promise<FreshnessReport>`

Check all derived files in a directory for staleness.

```typescript
const report = await checkAllStaleness(".slices");
// report.stale - Array of stale files
// report.fresh - Array of fresh files
// report.stats - Summary statistics
```

#### `checkStalenessById(ttDir: string, id: string): Promise<StaleFile | FreshFile | null>`

Check a specific derived file by ID.

```typescript
const result = await checkStalenessById(".slices", "01JXYZ...");
if (result && isStale(result)) {
  console.log("File is stale:", result.reason);
}
```

### Regeneration

#### `regenerateSummary(staleFile: StaleFile, options: RegenerateOptions): Promise<RegenerateResult>`

Regenerate a summary-type derived file using an LLM.

```typescript
const result = await regenerateSummary(staleFile, {
  apiKey: "sk-ant-...",
  model: "claude-3-haiku-20240307",
  dryRun: false,
});
```

#### `regenerateIndex(staleFile: StaleFile, options: IndexRegenerateOptions): Promise<IndexRegenerateResult>`

Regenerate an index-type derived file mechanically (no LLM required).

```typescript
const result = await regenerateIndex(staleFile, {
  dryRun: false,
  generator: (source) => `# Custom Index\n${source.body}`,
});
```

### Types

```typescript
interface StaleFile {
  derived: DerivedFile;
  reason: "hash_mismatch" | "source_not_found" | "invalid_hash";
  source?: ParsedFile;
  currentHash?: string;
  description: string;
}

interface FreshFile {
  derived: DerivedFile;
  source: ParsedFile;
  currentHash: string;
}

interface FreshnessReport {
  stale: StaleFile[];
  fresh: FreshFile[];
  totalChecked: number;
  stats: {
    staleCount: number;
    freshCount: number;
    sourceNotFoundCount: number;
    hashMismatchCount: number;
  };
}
```

## How Derivation Works

When you create a derived file (using `tt create --source` or programmatically), the file includes:

```yaml
tt:
  derived_from:
    id: SOURCE_FILE_ID
    hash: sha256:abc123...
  links:
    - rel: derived_from
      to: SOURCE_FILE_ID
```

The hash is computed from the source file's **body content** (not including frontmatter). When the source changes, the hash no longer matches, marking the derived file as stale.

## CI Integration

Use the JSON output mode for CI pipelines:

```bash
# Exit code 1 if stale files exist
tt-fresh check --json > freshness-report.json

# Parse with jq
jq '.staleCount' freshness-report.json
```

Example GitHub Action:

```yaml
- name: Check freshness
  run: |
    npm install -g @slices/freshness
    tt-fresh check --json > report.json
    if [ $(jq '.staleCount' report.json) -gt 0 ]; then
      echo "::warning::Stale derived files detected"
      jq '.stale[].id' report.json
    fi
```

## Exit Codes

| Code | Meaning                                          |
| ---- | ------------------------------------------------ |
| 0    | Success (no stale files, or operation succeeded) |
| 1    | Stale files found, or operation failed           |
| 2    | Invalid usage                                    |

## License

MIT

# @slices/validator

CLI tool and library to validate `.tt` files against the [Slices v1 specification](https://slices.org/spec).

## Installation

```bash
npm install @slices/validator
```

## CLI Usage

```bash
# Validate the default .slices directory
tt-validate

# Validate a specific directory
tt-validate ./my-memory

# Validate a single file
tt-validate path/to/file.tt

# JSON output for parsing
tt-validate --json .slices

# SARIF output for CI integration
tt-validate --sarif > report.sarif

# Run only specific rules
tt-validate -r required-fields -r ulid-format

# Skip specific rules
tt-validate -s link-resolution

# List all available rules
tt-validate --list-rules
```

### Exit Codes

| Code | Meaning                     |
| ---- | --------------------------- |
| 0    | All files valid (no errors) |
| 1    | Errors found                |
| 2    | Warnings only (no errors)   |

### Output Formats

- **terminal** (default) - Human-readable colored output
- **json** - Machine-parseable JSON
- **sarif** - SARIF 2.1.0 for CI/CD integration (GitHub, GitLab, etc.)

## Library Usage

```typescript
import { validate, validateContent, Validator } from "@slices/validator";

// Validate a directory
const results = validate(".slices");
for (const result of results) {
  if (!result.valid) {
    console.log(`${result.file}: ${result.errorCount} errors`);
    for (const issue of result.issues) {
      console.log(`  ${issue.message}`);
    }
  }
}

// Validate content directly
const result = validateContent(`
---
tt:
  v: "1"
  id: 01JTEST0000000000000000000
  title: My File
  summary: A test file
  body:
    type: markdown
---
Content here.
`);

console.log(result.valid); // true

// Custom validator with specific rules
const validator = new Validator({
  rules: ["required-fields", "ulid-format"],
  skipRules: ["link-resolution"],
});
const customResults = validator.validateDirectory(".slices");
```

## Validation Rules

### required-fields

All `.tt` files must have these fields in their frontmatter:

- `tt.v` - Format version (must be `"1"`)
- `tt.id` - Stable identifier
- `tt.title` - Display label for browsing
- `tt.summary` - 1-2 sentences for discovery
- `tt.body.type` - Body content type (`markdown`, `jsonl`, or `none`)

### ulid-format

The `tt.id` field should be a valid ULID (26 Crockford Base32 characters). UUIDs are accepted with a warning since ULIDs are preferred for lexicographic sorting.

### contract-enums

Contract fields must use valid enum values:

- `tt.contract.write`: `append`, `replace`, or `supersede`
- `tt.contract.overflow`: `split`, `summarize`, `archive`, or `error`

### body-type-match

The declared `tt.body.type` must match the actual body content:

- `none` - Body should be empty
- `jsonl` - Body should contain valid JSON lines
- `markdown` - No strict validation (any content allowed)

Also validates `tt.kind` if present (`context` or `pointer`).

### jsonl-structure

For files with `body.type: jsonl`, validates each row:

- Must be valid JSON
- Must have `_meta.id` (unique per file)
- Must have `_meta.created_at` (ISO-8601 format)
- `_meta.supersedes` must be an array if present
- `_meta.links` must be an array if present

### link-resolution

Validates that links resolve to existing targets:

- `tt.links[].rel` must be a valid relationship type
- `tt.links[].to` must be a valid ID or path
- `tt.derived_from.id` is validated

Valid relationship types: `depends_on`, `blocks`, `evidence_for`, `evidence_against`, `supersedes`, `superseded_by`, `parent`, `child`, `part_of`, `has_part`, `is_a`, `type_of`, `derived_from`, `source_of`, `see_also`, `routes_to`, `routed_from`

## API Reference

### `validate(target: string, options?: ValidatorOptions): ValidationResult[]`

Validate a file or directory.

### `validateContent(content: string, filePath?: string, options?: ValidatorOptions): ValidationResult`

Validate content string directly.

### `new Validator(options?: ValidatorOptions)`

Create a validator instance with custom options.

```typescript
interface ValidatorOptions {
  rules?: string[]; // Only run these rules
  skipRules?: string[]; // Skip these rules
  resolveLinks?: boolean; // Check link targets exist
}
```

### `ValidationResult`

```typescript
interface ValidationResult {
  file: string;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}
```

### `ValidationIssue`

```typescript
interface ValidationIssue {
  rule: string;
  severity: "error" | "warning";
  message: string;
  file: string;
  line?: number;
  column?: number;
  context?: Record<string, unknown>;
}
```

### `formatResults(results: ValidationResult[], options: ReporterOptions): string`

Format validation results for output.

```typescript
interface ReporterOptions {
  format: "terminal" | "json" | "sarif";
  color?: boolean;
  relativePaths?: boolean;
  baseDir?: string;
}
```

## Extending with Custom Rules

```typescript
import { Validator, allRules } from "@slices/validator";
import type { ValidationRule } from "@slices/validator";

const myCustomRule: ValidationRule = {
  id: "my-custom-rule",
  name: "My Custom Rule",
  description: "Validates something custom",
  severity: "warning",
  validate(context) {
    const issues = [];
    // Your validation logic here
    return issues;
  },
};

// Use with built-in rules
const validator = new Validator();
// Or create a custom validator with your rules
```

## License

MIT

# @slices/parser

Canonical Slices (.tt) file parser. This is the single source of truth for parsing .tt files.

## Installation

```bash
npm install @slices/parser
```

## Usage

### Basic Parsing

```typescript
import { parseFile, getFileId, getFileTitle } from "@slices/parser";

const content = `---
tt:
  v: "1"
  id: 01JEXAMPLE000000000000001
  title: Example file
  summary: Brief description
---
Body content here.
`;

const parsed = parseFile(content, "example.tt");

console.log(parsed.tt?.id); // "01JEXAMPLE000000000000001"
console.log(parsed.body); // "Body content here.\n"
console.log(getFileId(parsed)); // "01JEXAMPLE000000000000001"
console.log(getFileTitle(parsed)); // "Example file"
```

### Strict Parsing (for SDK operations)

```typescript
import { parseFileStrict, serializeFile } from "@slices/parser";

// Throws if the file is invalid
const file = parseFileStrict(content, "example.tt");

// Modify and serialize back
file.body = "Updated content.";
const output = serializeFile(file);
```

### JSONL Body Parsing

```typescript
import { parseFile, parseJSONLBody } from "@slices/parser";

const parsed = parseFile(jsonlFileContent, "log.tt");
const rows = parseJSONLBody(parsed.body);

for (const row of rows) {
  if (row.error) {
    console.error(`Line ${row.line}: ${row.error}`);
  } else {
    console.log(row.data);
  }
}
```

### Editor Integration (with ranges)

```typescript
import { parseFileWithRanges, findULIDReferences } from "@slices/parser";

const parsed = parseFileWithRanges(content, "example.tt");

if (parsed) {
  console.log(parsed.frontmatterRange); // { start: 0, end: 123 }
  console.log(parsed.bodyRange); // { start: 124, end: 200 }
}

// Find all ULID references for go-to-definition
const refs = findULIDReferences(content);
for (const ref of refs) {
  console.log(`Found ${ref.ulid} at line ${ref.line}, col ${ref.character}`);
}
```

## API Reference

### Parser Functions

- `parseFile(content, path)` - Parse a .tt file into its components
- `parseFileWithRanges(content, path)` - Parse with character range information
- `parseFileStrict(content, path)` - Parse with strict validation (throws on error)
- `serializeFile(file)` - Serialize a TTFile back to string
- `parseJSONLBody(body)` - Parse JSONL body content

### Utility Functions

- `getFileId(parsed)` - Get effective file ID
- `getFileTitle(parsed)` - Get effective file title
- `isValidULID(str)` - Check if string is valid ULID
- `extractLinks(parsed)` - Extract links from parsed file
- `isLinkTargetId(target)` - Check if link target is a ULID
- `findULIDReferences(content)` - Find all ULID references in content
- `findPathReferences(content)` - Find all path references in content
- `getFieldPosition(content, fieldPath)` - Get position of a field

### Constants

- `RELATIONSHIP_TYPES` - Valid relationship types for links
- `RELATIONSHIP_PROPERTIES` - Properties for each relationship (inverse, transitive, symmetric)
- `getInverseRelationship(rel)` - Get the inverse of a relationship type
- `WRITE_MODES` - Valid write modes for contracts
- `OVERFLOW_MODES` - Valid overflow modes for contracts
- `BODY_TYPES` - Valid body types
- `KIND_TYPES` - Valid file kinds

### Inference Functions

- `computeTransitiveClosure(edges, startId, rel, options)` - Compute transitive closure from a node
- `expandSymmetric(edges)` - Add reverse edges for symmetric relationships
- `isTransitive(rel)` - Check if a relationship is transitive
- `isSymmetric(rel)` - Check if a relationship is symmetric
- `getTransitiveRelationships()` - Get all transitive relationship types
- `getSymmetricRelationships()` - Get all symmetric relationship types

## Types

All types are exported from the main entry point:

```typescript
import type {
  TTFrontmatter,
  TTFile,
  ParsedFile,
  TTLink,
  TTContract,
  RelationshipType,
  // ... etc
} from "@slices/parser";
```

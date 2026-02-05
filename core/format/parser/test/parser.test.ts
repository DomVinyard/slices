/**
 * Parser tests - core parsing, serialization, and JSONL functionality.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseFile,
  parseFileStrict,
  parseFileWithRanges,
  serializeFile,
  parseJSONLBody,
} from "../src/parser.js";

const fixturesDir = join(import.meta.dir, "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

// ============================================================================
// parseFile tests
// ============================================================================

describe("parseFile", () => {
  test("parses minimal valid file", () => {
    const content = loadFixture("valid-minimal.tt");
    const result = parseFile(content, "valid-minimal.tt");

    expect(result.hasFrontmatter).toBe(true);
    expect(result.parseError).toBeUndefined();
    expect(result.tt).not.toBeNull();
    expect(result.tt?.v).toBe("1");
    expect(result.tt?.id).toBe("01JTEST0000000000000000001");
    expect(result.tt?.title).toBe("Minimal Valid File");
    expect(result.body).toContain("This is the body content.");
  });

  test("parses full featured file", () => {
    const content = loadFixture("valid-full.tt");
    const result = parseFile(content, "valid-full.tt");

    expect(result.hasFrontmatter).toBe(true);
    expect(result.parseError).toBeUndefined();
    expect(result.tt?.kind).toBe("context");
    expect(result.tt?.contract?.purpose).toBe("Store technical decisions");
    expect(result.tt?.contract?.write).toBe("append");
    expect(result.tt?.links).toHaveLength(2);
    expect(result.tt?.links?.[0].rel).toBe("depends_on");
    expect(result.tt?.created_at).toBe("2026-01-01T00:00:00Z");
  });

  test("parses JSONL file", () => {
    const content = loadFixture("valid-jsonl.tt");
    const result = parseFile(content, "valid-jsonl.tt");

    expect(result.hasFrontmatter).toBe(true);
    expect(result.tt?.body?.type).toBe("jsonl");
    expect(result.body).toContain('{"_meta"');
  });

  test("parses pointer file", () => {
    const content = loadFixture("valid-pointer.tt");
    const result = parseFile(content, "valid-pointer.tt");

    expect(result.tt?.kind).toBe("pointer");
    expect(result.tt?.body?.type).toBe("none");
    expect(result.tt?.payload?.uri).toBe("https://example.com/large-file.pdf");
    expect(result.tt?.payload?.size).toBe(1048576);
  });

  test("handles missing opening delimiter", () => {
    const content = loadFixture("invalid-no-delimiter.tt");
    const result = parseFile(content, "invalid-no-delimiter.tt");

    expect(result.hasFrontmatter).toBe(false);
    expect(result.parseError).toContain("does not start with frontmatter delimiter");
    expect(result.tt).toBeNull();
    // Body should contain the entire content
    expect(result.body).toBe(content);
  });

  test("handles missing closing delimiter", () => {
    const content = loadFixture("invalid-no-closing.tt");
    const result = parseFile(content, "invalid-no-closing.tt");

    expect(result.parseError).toContain("Missing closing frontmatter delimiter");
    expect(result.tt).toBeNull();
  });

  test("handles malformed YAML", () => {
    const content = loadFixture("invalid-yaml.tt");
    const result = parseFile(content, "invalid-yaml.tt");

    expect(result.hasFrontmatter).toBe(true);
    expect(result.parseError).toContain("YAML parse error");
    expect(result.tt).toBeNull();
  });

  test("handles missing tt namespace", () => {
    const content = loadFixture("invalid-no-tt.tt");
    const result = parseFile(content, "invalid-no-tt.tt");

    expect(result.hasFrontmatter).toBe(true);
    expect(result.parseError).toBeUndefined();
    expect(result.tt).toBeNull();
    // Should still have parsed frontmatter
    expect(result.frontmatter).not.toBeNull();
  });

  test("extracts filename from path", () => {
    const content = loadFixture("valid-minimal.tt");
    const result = parseFile(content, "/some/path/to/my-file.tt");

    expect(result.filename).toBe("my-file");
    expect(result.path).toBe("/some/path/to/my-file.tt");
  });

  test("handles empty body", () => {
    const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000099
  title: Empty Body
  summary: File with empty body
  body:
    type: none
---
`;
    const result = parseFile(content, "empty.tt");

    expect(result.hasFrontmatter).toBe(true);
    expect(result.body).toBe("");
  });
});

// ============================================================================
// parseFileStrict tests
// ============================================================================

describe("parseFileStrict", () => {
  test("parses valid file and guarantees required fields", () => {
    const content = loadFixture("valid-minimal.tt");
    const result = parseFileStrict(content, "valid-minimal.tt");

    expect(result.frontmatter.v).toBe("1");
    expect(result.frontmatter.id).toBe("01JTEST0000000000000000001");
    expect(result.frontmatter.title).toBe("Minimal Valid File");
    expect(result.frontmatter.summary).toBe("A minimal valid Slices file");
    expect(result.body).toBe("This is the body content.");
  });

  test("throws on missing opening delimiter", () => {
    const content = loadFixture("invalid-no-delimiter.tt");

    expect(() => parseFileStrict(content, "invalid-no-delimiter.tt")).toThrow(
      "does not start with frontmatter delimiter"
    );
  });

  test("throws on malformed YAML", () => {
    const content = loadFixture("invalid-yaml.tt");

    expect(() => parseFileStrict(content, "invalid-yaml.tt")).toThrow(
      "YAML parse error"
    );
  });

  test("throws on missing tt namespace", () => {
    const content = loadFixture("invalid-no-tt.tt");

    expect(() => parseFileStrict(content, "invalid-no-tt.tt")).toThrow(
      "missing tt namespace"
    );
  });

  test("provides default values when fields are missing", () => {
    const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000099
---
`;
    const result = parseFileStrict(content, "minimal.tt");

    expect(result.frontmatter.title).toBe("Untitled");
    expect(result.frontmatter.summary).toBe("");
  });

  test("falls back to filename for missing id", () => {
    const content = `---
tt:
  v: "1"
  title: No ID
  summary: Test
---
`;
    const result = parseFileStrict(content, "fallback-id.tt");

    expect(result.frontmatter.id).toBe("fallback-id");
  });

  test("trims body content", () => {
    const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000099
  title: Test
  summary: Test
---

  Body with whitespace.

`;
    const result = parseFileStrict(content, "test.tt");

    expect(result.body).toBe("Body with whitespace.");
  });
});

// ============================================================================
// parseFileWithRanges tests
// ============================================================================

describe("parseFileWithRanges", () => {
  test("returns ranges for valid file", () => {
    const content = loadFixture("valid-minimal.tt");
    const result = parseFileWithRanges(content, "valid-minimal.tt");

    expect(result).not.toBeNull();
    expect(result!.frontmatterRange.start).toBe(0);
    expect(result!.frontmatterRange.end).toBeGreaterThan(0);
    expect(result!.bodyRange.start).toBeGreaterThan(result!.frontmatterRange.end);
    expect(result!.bodyRange.end).toBe(content.length);
  });

  test("returns null for invalid file", () => {
    const content = loadFixture("invalid-no-delimiter.tt");
    const result = parseFileWithRanges(content, "invalid-no-delimiter.tt");

    expect(result).toBeNull();
  });

  test("returns null for YAML parse error", () => {
    const content = loadFixture("invalid-yaml.tt");
    const result = parseFileWithRanges(content, "invalid-yaml.tt");

    expect(result).toBeNull();
  });
});

// ============================================================================
// serializeFile tests
// ============================================================================

describe("serializeFile", () => {
  test("serializes minimal file", () => {
    const content = loadFixture("valid-minimal.tt");
    const parsed = parseFileStrict(content, "valid-minimal.tt");
    const serialized = serializeFile(parsed);

    expect(serialized).toContain("---");
    expect(serialized).toContain("tt:");
    // YAML may use single or double quotes
    expect(serialized).toMatch(/v: ['"]1['"]/);
    expect(serialized).toContain("id: 01JTEST0000000000000000001");
    expect(serialized).toContain("This is the body content.");
  });

  test("serializes file with links", () => {
    const content = loadFixture("valid-full.tt");
    const parsed = parseFileStrict(content, "valid-full.tt");
    const serialized = serializeFile(parsed);

    expect(serialized).toContain("links:");
    expect(serialized).toContain("rel: depends_on");
    expect(serialized).toContain("to: 01JTEST0000000000000000001");
    expect(serialized).toContain("label: Builds on minimal example");
  });

  test("serializes contract", () => {
    const content = loadFixture("valid-full.tt");
    const parsed = parseFileStrict(content, "valid-full.tt");
    const serialized = serializeFile(parsed);

    expect(serialized).toContain("contract:");
    expect(serialized).toContain("purpose: Store technical decisions");
    expect(serialized).toContain("write: append");
    expect(serialized).toContain("overflow: archive");
  });

  test("serializes payload for pointer files", () => {
    const content = loadFixture("valid-pointer.tt");
    const parsed = parseFileStrict(content, "valid-pointer.tt");
    const serialized = serializeFile(parsed);

    expect(serialized).toContain("payload:");
    expect(serialized).toContain("uri: https://example.com/large-file.pdf");
    expect(serialized).toContain("hash: sha256:abc123def456");
  });

  test("round-trip: parse -> serialize -> parse produces identical result", () => {
    const content = loadFixture("valid-full.tt");
    const original = parseFileStrict(content, "valid-full.tt");
    const serialized = serializeFile(original);
    const reparsed = parseFileStrict(serialized, "valid-full.tt");

    // Compare frontmatter fields
    expect(reparsed.frontmatter.v).toBe(original.frontmatter.v);
    expect(reparsed.frontmatter.id).toBe(original.frontmatter.id);
    expect(reparsed.frontmatter.title).toBe(original.frontmatter.title);
    expect(reparsed.frontmatter.summary).toBe(original.frontmatter.summary);
    expect(reparsed.frontmatter.kind).toBe(original.frontmatter.kind);
    expect(reparsed.frontmatter.contract?.purpose).toBe(original.frontmatter.contract?.purpose);
    expect(reparsed.frontmatter.contract?.write).toBe(original.frontmatter.contract?.write);
    expect(reparsed.frontmatter.links).toHaveLength(original.frontmatter.links?.length ?? 0);

    // Compare body (trimmed)
    expect(reparsed.body.trim()).toBe(original.body.trim());
  });

  test("round-trip preserves JSONL body", () => {
    const content = loadFixture("valid-jsonl.tt");
    const original = parseFileStrict(content, "valid-jsonl.tt");
    const serialized = serializeFile(original);
    const reparsed = parseFileStrict(serialized, "valid-jsonl.tt");

    // Body should contain all JSONL rows
    const originalRows = parseJSONLBody(original.body);
    const reparsedRows = parseJSONLBody(reparsed.body);

    expect(reparsedRows.length).toBe(originalRows.length);
    for (let i = 0; i < originalRows.length; i++) {
      expect(reparsedRows[i].data).toEqual(originalRows[i].data);
    }
  });
});

// ============================================================================
// parseJSONLBody tests
// ============================================================================

describe("parseJSONLBody", () => {
  test("parses valid JSONL", () => {
    const body = `{"name": "alice", "age": 30}
{"name": "bob", "age": 25}
{"name": "charlie", "age": 35}`;

    const rows = parseJSONLBody(body);

    expect(rows).toHaveLength(3);
    expect(rows[0].data).toEqual({ name: "alice", age: 30 });
    expect(rows[1].data).toEqual({ name: "bob", age: 25 });
    expect(rows[2].data).toEqual({ name: "charlie", age: 35 });
    expect(rows[0].line).toBe(1);
    expect(rows[1].line).toBe(2);
    expect(rows[2].line).toBe(3);
  });

  test("handles empty lines", () => {
    const body = `{"a": 1}

{"b": 2}

`;

    const rows = parseJSONLBody(body);

    expect(rows).toHaveLength(2);
    expect(rows[0].data).toEqual({ a: 1 });
    expect(rows[1].data).toEqual({ b: 2 });
  });

  test("handles invalid JSON line", () => {
    const body = `{"valid": true}
{not valid json}
{"also_valid": true}`;

    const rows = parseJSONLBody(body);

    expect(rows).toHaveLength(3);
    expect(rows[0].data).toEqual({ valid: true });
    expect(rows[0].error).toBeUndefined();

    expect(rows[1].data).toBeNull();
    expect(rows[1].error).toContain("Invalid JSON");

    expect(rows[2].data).toEqual({ also_valid: true });
  });

  test("preserves raw line content", () => {
    const body = `{"key": "value"}`;

    const rows = parseJSONLBody(body);

    expect(rows[0].raw).toBe('{"key": "value"}');
  });

  test("handles empty body", () => {
    const rows = parseJSONLBody("");

    expect(rows).toHaveLength(0);
  });

  test("handles whitespace-only lines", () => {
    const body = `{"a": 1}
   
	
{"b": 2}`;

    const rows = parseJSONLBody(body);

    expect(rows).toHaveLength(2);
  });

  test("parses _meta structure correctly", () => {
    const body = `{"_meta": {"id": "01JROW001", "created_at": "2026-01-01T00:00:00Z"}, "data": "test"}`;

    const rows = parseJSONLBody(body);

    expect(rows).toHaveLength(1);
    const meta = rows[0].data?._meta as Record<string, unknown>;
    expect(meta.id).toBe("01JROW001");
    expect(meta.created_at).toBe("2026-01-01T00:00:00Z");
  });
});

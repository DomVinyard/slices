/**
 * Utils tests - ULID validation, reference finding, and utility functions.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFile } from "../src/parser.js";
import {
  getFileId,
  getFileTitle,
  isValidULID,
  extractLinks,
  isLinkTargetId,
  findULIDReferences,
  findPathReferences,
  getFieldPosition,
  extractIdFromPath,
} from "../src/utils.js";
import {
  ULID_PATTERN,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_PROPERTIES,
  getInverseRelationship,
  WRITE_MODES,
  OVERFLOW_MODES,
  BODY_TYPES,
  KIND_TYPES,
} from "../src/constants.js";

const fixturesDir = join(import.meta.dir, "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

// ============================================================================
// isValidULID tests
// ============================================================================

describe("isValidULID", () => {
  test("accepts valid ULIDs", () => {
    // Standard ULIDs
    expect(isValidULID("01JTEST0000000000000000001")).toBe(true);
    expect(isValidULID("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(true);
    expect(isValidULID("7ZZZZZZZZZZZZZZZZZZZZZZZZZ")).toBe(true);
    expect(isValidULID("00000000000000000000000000")).toBe(true);
  });

  test("rejects invalid ULIDs", () => {
    // Wrong length
    expect(isValidULID("01JTEST0000000000000000")).toBe(false); // 24 chars
    expect(isValidULID("01JTEST00000000000000000001")).toBe(false); // 28 chars
    
    // Invalid characters (I, L, O, U are excluded in Crockford Base32)
    expect(isValidULID("01JTEST00000000000000000I")).toBe(false);
    expect(isValidULID("01JTEST00000000000000000L")).toBe(false);
    expect(isValidULID("01JTEST00000000000000000O")).toBe(false);
    expect(isValidULID("01JTEST00000000000000000U")).toBe(false);
    
    // Lowercase (ULIDs are uppercase)
    expect(isValidULID("01jtest000000000000000001")).toBe(false);
    
    // Special characters
    expect(isValidULID("01JTEST-00000000000000001")).toBe(false);
    expect(isValidULID("01JTEST_00000000000000001")).toBe(false);
  });

  test("rejects empty and non-string inputs", () => {
    expect(isValidULID("")).toBe(false);
    expect(isValidULID("   ")).toBe(false);
  });

  test("rejects UUIDs", () => {
    // UUIDs have dashes and different format
    expect(isValidULID("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    // UUID without dashes still wrong format
    expect(isValidULID("550e8400e29b41d4a716446655440000")).toBe(false);
  });
});

// ============================================================================
// getFileId and getFileTitle tests
// ============================================================================

describe("getFileId", () => {
  test("returns tt.id when present", () => {
    const content = loadFixture("valid-minimal.tt");
    const parsed = parseFile(content, "valid-minimal.tt");

    expect(getFileId(parsed)).toBe("01JTEST0000000000000000001");
  });

  test("falls back to filename when tt.id missing", () => {
    const content = `---
tt:
  v: "1"
  title: No ID
---
`;
    const parsed = parseFile(content, "fallback-name.tt");

    expect(getFileId(parsed)).toBe("fallback-name");
  });

  test("falls back to filename when tt namespace missing", () => {
    const content = loadFixture("invalid-no-tt.tt");
    const parsed = parseFile(content, "no-tt-namespace.tt");

    expect(getFileId(parsed)).toBe("no-tt-namespace");
  });
});

describe("getFileTitle", () => {
  test("returns tt.title when present", () => {
    const content = loadFixture("valid-minimal.tt");
    const parsed = parseFile(content, "valid-minimal.tt");

    expect(getFileTitle(parsed)).toBe("Minimal Valid File");
  });

  test("falls back to filename when tt.title missing", () => {
    const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000099
---
`;
    const parsed = parseFile(content, "fallback-title.tt");

    expect(getFileTitle(parsed)).toBe("fallback-title");
  });
});

// ============================================================================
// extractLinks tests
// ============================================================================

describe("extractLinks", () => {
  test("extracts links from file with links", () => {
    const content = loadFixture("valid-full.tt");
    const parsed = parseFile(content, "valid-full.tt");

    const links = extractLinks(parsed);

    expect(links).toHaveLength(2);
    expect(links[0].rel).toBe("depends_on");
    expect(links[0].to).toBe("01JTEST0000000000000000001");
    expect(links[0].label).toBe("Builds on minimal example");
    expect(links[1].rel).toBe("see_also");
  });

  test("returns empty array when no links", () => {
    const content = loadFixture("valid-minimal.tt");
    const parsed = parseFile(content, "valid-minimal.tt");

    const links = extractLinks(parsed);

    expect(links).toHaveLength(0);
  });

  test("returns empty array when tt namespace missing", () => {
    const content = loadFixture("invalid-no-tt.tt");
    const parsed = parseFile(content, "invalid-no-tt.tt");

    const links = extractLinks(parsed);

    expect(links).toHaveLength(0);
  });
});

// ============================================================================
// isLinkTargetId tests
// ============================================================================

describe("isLinkTargetId", () => {
  test("returns true for ULID targets", () => {
    expect(isLinkTargetId("01JTEST0000000000000000001")).toBe(true);
    expect(isLinkTargetId("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(true);
  });

  test("returns false for path targets", () => {
    expect(isLinkTargetId("./sibling.tt")).toBe(false);
    expect(isLinkTargetId("../parent/file.tt")).toBe(false);
    expect(isLinkTargetId("/absolute/path.tt")).toBe(false);
  });

  test("returns false for invalid strings", () => {
    expect(isLinkTargetId("not-a-ulid")).toBe(false);
    expect(isLinkTargetId("")).toBe(false);
  });
});

// ============================================================================
// findULIDReferences tests
// ============================================================================

describe("findULIDReferences", () => {
  test("finds ULIDs in content", () => {
    // Note: ULID uses Crockford Base32 which excludes I, L, O, U
    const content = `This references 01JTEST0000000000000000001 and 01JABCD0000000000000000002.`;

    const refs = findULIDReferences(content);

    expect(refs).toHaveLength(2);
    expect(refs[0].ulid).toBe("01JTEST0000000000000000001");
    expect(refs[1].ulid).toBe("01JABCD0000000000000000002");
  });

  test("returns correct positions", () => {
    const content = `First: 01JTEST0000000000000000001
Second: 01JABCD0000000000000000002`;

    const refs = findULIDReferences(content);

    // First ULID - starts at position 7 (after "First: ")
    expect(refs[0].line).toBe(0);
    expect(refs[0].character).toBe(7);
    expect(refs[0].start).toBe(7);
    expect(refs[0].end).toBe(33); // 7 + 26 = 33

    // Second ULID - starts at position 8 on line 1 (after "Second: ")
    expect(refs[1].line).toBe(1);
    expect(refs[1].character).toBe(8);
  });

  test("returns empty array when no ULIDs", () => {
    const content = "No ULIDs here, just plain text.";

    const refs = findULIDReferences(content);

    expect(refs).toHaveLength(0);
  });

  test("finds ULIDs in multiline content", () => {
    const content = loadFixture("valid-full.tt");

    const refs = findULIDReferences(content);

    // Should find ULIDs in frontmatter and body
    expect(refs.length).toBeGreaterThan(0);
    // Should find ULIDs in the fixture file
    const foundUlids = refs.map(r => r.ulid);
    expect(foundUlids).toContain("01JTEST0000000000000000002");
    expect(foundUlids).toContain("01JTEST0000000000000000001");
  });

  test("handles multiple ULIDs in text", () => {
    // Two valid ULIDs separated by text
    const content = "See 01JTEST0000000000000000001 and also 01JABCD0000000000000000002 for details.";

    const refs = findULIDReferences(content);

    expect(refs).toHaveLength(2);
    expect(refs[0].ulid).toBe("01JTEST0000000000000000001");
    expect(refs[1].ulid).toBe("01JABCD0000000000000000002");
  });
});

// ============================================================================
// findPathReferences tests
// ============================================================================

describe("findPathReferences", () => {
  test("finds relative paths", () => {
    const content = `See ./sibling.tt and ../parent/file.tt for more info.`;

    const refs = findPathReferences(content);

    expect(refs).toHaveLength(2);
    expect(refs[0].path).toBe("./sibling.tt");
    expect(refs[1].path).toBe("../parent/file.tt");
  });

  test("finds absolute paths", () => {
    const content = `Located at /absolute/path/to/file.tt`;

    const refs = findPathReferences(content);

    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe("/absolute/path/to/file.tt");
  });

  test("returns correct positions", () => {
    const content = `See ./file.tt here.`;

    const refs = findPathReferences(content);

    expect(refs[0].line).toBe(0);
    expect(refs[0].character).toBe(4);
    expect(refs[0].start).toBe(4);
    expect(refs[0].end).toBe(13); // "./file.tt" is 9 chars, so 4 + 9 = 13
  });

  test("returns empty array when no paths", () => {
    const content = "No paths here, just text and a 01JTEST0000000000000000001.";

    const refs = findPathReferences(content);

    expect(refs).toHaveLength(0);
  });

  test("handles deeply nested paths", () => {
    const content = `Deep path: ../../../very/deep/nested/file.tt`;

    const refs = findPathReferences(content);

    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe("../../../very/deep/nested/file.tt");
  });
});

// ============================================================================
// getFieldPosition tests
// ============================================================================

describe("getFieldPosition", () => {
  test("finds top-level field", () => {
    const content = `---
tt:
  v: "1"
  id: test
---
`;
    const pos = getFieldPosition(content, ["tt"]);

    expect(pos).not.toBeNull();
    expect(pos!.line).toBe(1);
    expect(pos!.character).toBe(0);
  });

  test("finds nested field", () => {
    const content = `---
tt:
  v: "1"
  id: test
  contract:
    purpose: Store data
    write: append
---
`;
    const pos = getFieldPosition(content, ["tt", "contract", "write"]);

    expect(pos).not.toBeNull();
    expect(pos!.line).toBe(6);
    expect(pos!.character).toBe(4);
  });

  test("returns null for non-existent field", () => {
    const content = `---
tt:
  v: "1"
  id: test
---
`;
    const pos = getFieldPosition(content, ["tt", "nonexistent"]);

    expect(pos).toBeNull();
  });
});

// ============================================================================
// extractIdFromPath tests
// ============================================================================

describe("extractIdFromPath", () => {
  test("extracts filename without extension", () => {
    expect(extractIdFromPath("/path/to/file.tt")).toBe("file");
    expect(extractIdFromPath("./relative/path.tt")).toBe("path");
    expect(extractIdFromPath("simple.tt")).toBe("simple");
  });

  test("handles ULID filenames", () => {
    expect(extractIdFromPath("/memory/01JTEST0000000000000000001.tt")).toBe(
      "01JTEST0000000000000000001"
    );
  });

  test("handles paths without .tt extension", () => {
    expect(extractIdFromPath("/path/to/file")).toBe("file");
    expect(extractIdFromPath("/path/to/file.txt")).toBe("file.txt");
  });

  test("handles empty path", () => {
    expect(extractIdFromPath("")).toBe("");
  });
});

// ============================================================================
// Constants tests
// ============================================================================

describe("constants", () => {
  test("ULID_PATTERN matches valid ULIDs", () => {
    expect(ULID_PATTERN.test("01JTEST0000000000000000001")).toBe(true);
    expect(ULID_PATTERN.test("invalid")).toBe(false);
  });

  test("RELATIONSHIP_PROPERTIES.inverse are symmetric", () => {
    expect(getInverseRelationship("depends_on")).toBe("blocks");
    expect(getInverseRelationship("blocks")).toBe("depends_on");
    expect(getInverseRelationship("parent")).toBe("child");
    expect(getInverseRelationship("child")).toBe("parent");
    expect(getInverseRelationship("see_also")).toBe("see_also");
    // Taxonomy and composition relationships
    expect(getInverseRelationship("is_a")).toBe("type_of");
    expect(getInverseRelationship("type_of")).toBe("is_a");
    expect(getInverseRelationship("part_of")).toBe("has_part");
    expect(getInverseRelationship("has_part")).toBe("part_of");
    expect(getInverseRelationship("evidence_for")).toBe("evidence_against");
    expect(getInverseRelationship("evidence_against")).toBe("evidence_for");
    expect(getInverseRelationship("derived_from")).toBe("source_of");
    expect(getInverseRelationship("source_of")).toBe("derived_from");
  });

  test("RELATIONSHIP_PROPERTIES has transitive and symmetric flags", () => {
    // Transitive relationships
    expect(RELATIONSHIP_PROPERTIES.depends_on.transitive).toBe(true);
    expect(RELATIONSHIP_PROPERTIES.is_a.transitive).toBe(true);
    expect(RELATIONSHIP_PROPERTIES.part_of.transitive).toBe(true);
    // Non-transitive relationships
    expect(RELATIONSHIP_PROPERTIES.evidence_for.transitive).toBe(false);
    expect(RELATIONSHIP_PROPERTIES.see_also.transitive).toBe(false);
    // Symmetric relationships
    expect(RELATIONSHIP_PROPERTIES.see_also.symmetric).toBe(true);
    // Non-symmetric relationships
    expect(RELATIONSHIP_PROPERTIES.depends_on.symmetric).toBe(false);
  });
});

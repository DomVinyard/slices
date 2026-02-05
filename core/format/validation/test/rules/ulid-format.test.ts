/**
 * Tests for the ulid-format validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { ulidFormatRule } from "../../src/rules/ulid-format.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("ulidFormatRule", () => {
  describe("valid ULIDs", () => {
    test("accepts standard ULID", () => {
      const content = `---
tt:
  v: "1"
  id: 01HQMQG5XQ3JQGZCV9H0RWZFAN
  title: Valid ULID
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts various valid ULIDs", () => {
      const validUlids = [
        "01HQMQG5XQ3JQGZCV9H0RWZFAN",
        "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "7ZZZZZZZZZZZZZZZZZZZZZZZZZ",
        "0000000000000000000000000A",
      ];

      for (const ulid of validUlids) {
        const content = `---
tt:
  v: "1"
  id: ${ulid}
  title: Test
  summary: Test
  body:
    type: markdown
---
`;
        const issues = ulidFormatRule.validate(createContext(content));
        expect(issues).toHaveLength(0);
      }
    });
  });

  describe("valid UUIDs", () => {
    test("accepts UUID with warning", () => {
      const content = `---
tt:
  v: "1"
  id: 550e8400-e29b-41d4-a716-446655440000
  title: UUID ID
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toContain("UUID");
      expect(issues[0].message).toContain("ULID is preferred");
    });

    test("accepts various UUID formats", () => {
      const validUuids = [
        "550e8400-e29b-41d4-a716-446655440000",
        "123e4567-e89b-12d3-a456-426614174000",
        "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        "00000000-0000-0000-0000-000000000000",
      ];

      for (const uuid of validUuids) {
        const content = `---
tt:
  v: "1"
  id: ${uuid}
  title: Test
  summary: Test
  body:
    type: markdown
---
`;
        const issues = ulidFormatRule.validate(createContext(content));
        expect(issues).toHaveLength(1);
        expect(issues[0].severity).toBe("warning");
        expect(issues[0].context?.format).toBe("uuid");
      }
    });
  });

  describe("invalid IDs", () => {
    test("rejects too short ID", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST
  title: Too Short
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("not a valid ULID or UUID");
    });

    test("rejects too long ID", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST000000000000000001EXTRA
  title: Too Long
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    test("rejects ID with invalid characters", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000I000L000001
  title: Invalid Chars
  summary: Test
  body:
    type: markdown
---
`;
      // ULIDs exclude I, L, O, U
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("Crockford Base32");
    });

    test("rejects lowercase ULIDs", () => {
      const content = `---
tt:
  v: "1"
  id: 01jtest00000000000000001
  title: Lowercase ULID
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    test("rejects arbitrary strings", () => {
      const content = `---
tt:
  v: "1"
  id: my-custom-id
  title: Custom ID
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].context?.id).toBe("my-custom-id");
    });

    test("rejects UUID without hyphens", () => {
      const content = `---
tt:
  v: "1"
  id: 550e8400e29b41d4a716446655440000
  title: UUID No Hyphens
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });
  });

  describe("missing ID", () => {
    test("skips validation when ID is missing", () => {
      const content = `---
tt:
  v: "1"
  title: No ID
  summary: Test
  body:
    type: markdown
---
`;
      // Missing ID is caught by required-fields rule
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("context information", () => {
    test("includes ID in context for errors", () => {
      const content = `---
tt:
  v: "1"
  id: invalid-id
  title: Test
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues[0].context?.id).toBe("invalid-id");
    });

    test("includes ID and format in context for UUID warnings", () => {
      const content = `---
tt:
  v: "1"
  id: 550e8400-e29b-41d4-a716-446655440000
  title: Test
  summary: Test
  body:
    type: markdown
---
`;
      const issues = ulidFormatRule.validate(createContext(content));
      expect(issues[0].context?.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(issues[0].context?.format).toBe("uuid");
    });
  });
});

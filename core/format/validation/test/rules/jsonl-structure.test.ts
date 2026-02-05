/**
 * Tests for the jsonl-structure validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { jsonlStructureRule } from "../../src/rules/jsonl-structure.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("jsonlStructureRule", () => {
  describe("basic validation", () => {
    test("skips non-jsonl files", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
---

Regular markdown content.
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("passes valid jsonl with proper _meta", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "row1", "created_at": "2026-01-01T00:00:00Z"}, "data": "test"}
{"_meta": {"id": "row2", "created_at": "2026-01-02T00:00:00Z"}, "data": "test2"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("allows empty body for jsonl files", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("_meta validation", () => {
    test("detects missing _meta object", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"data": "no meta object"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Missing required "_meta"');
      expect(issues[0].severity).toBe("error");
    });

    test("detects missing _meta.id", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"created_at": "2026-01-01T00:00:00Z"}, "data": "missing id"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Missing required "_meta.id"');
    });

    test("detects missing _meta.created_at", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "row1"}, "data": "missing timestamp"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Missing required "_meta.created_at"');
    });

    test("detects both missing _meta.id and _meta.created_at", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {}, "data": "empty meta"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(2);
      expect(issues.some(i => i.message.includes("_meta.id"))).toBe(true);
      expect(issues.some(i => i.message.includes("_meta.created_at"))).toBe(true);
    });
  });

  describe("duplicate id detection", () => {
    test("detects duplicate _meta.id values", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "dup-id", "created_at": "2026-01-01T00:00:00Z"}, "data": "first"}
{"_meta": {"id": "dup-id", "created_at": "2026-01-02T00:00:00Z"}, "data": "duplicate!"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Duplicate "_meta.id"');
      expect(issues[0].message).toContain("dup-id");
      expect(issues[0].line).toBe(2); // Second row has the duplicate
    });
  });

  describe("timestamp validation", () => {
    test("accepts various ISO-8601 formats", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01"}, "data": "date only"}
{"_meta": {"id": "r2", "created_at": "2026-01-01T12:30:00Z"}, "data": "with time and Z"}
{"_meta": {"id": "r3", "created_at": "2026-01-01T12:30:00+05:00"}, "data": "with timezone"}
{"_meta": {"id": "r4", "created_at": "2026-01-01T12:30:00.123Z"}, "data": "with milliseconds"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns on invalid timestamp format", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "not-a-date"}, "data": "invalid"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("ISO-8601");
      expect(issues[0].severity).toBe("warning");
    });
  });

  describe("json parsing errors", () => {
    test("reports invalid JSON", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01"}, "data": "valid"}
{not valid json}
{"_meta": {"id": "r2", "created_at": "2026-01-01"}, "data": "also valid"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("Invalid JSON"))).toBe(true);
      expect(issues.some(i => i.line === 2)).toBe(true);
    });
  });

  describe("optional _meta fields", () => {
    test("accepts _meta.supersedes as array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01", "supersedes": ["old1", "old2"]}, "data": "valid"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when _meta.supersedes is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01", "supersedes": "not-array"}, "data": "invalid"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("supersedes") && i.message.includes("array"))).toBe(true);
    });

    test("accepts _meta.links as array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01", "links": [{"to": "01JTEST0000000000000000002", "rel": "see_also"}]}, "data": "valid"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when _meta.links is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01", "links": "not-array"}, "data": "invalid"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("links") && i.message.includes("array"))).toBe(true);
    });
  });

  describe("line numbers", () => {
    test("reports correct line numbers for issues", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: jsonl
---
{"_meta": {"id": "r1", "created_at": "2026-01-01"}, "data": "row 1"}
{"_meta": {"created_at": "2026-01-01"}, "data": "row 2 missing id"}
{"_meta": {"id": "r3", "created_at": "2026-01-01"}, "data": "row 3"}
`;
      const issues = jsonlStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].line).toBe(2); // Second JSONL row (body line 2)
    });
  });
});

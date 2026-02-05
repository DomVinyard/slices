/**
 * Tests for the link-resolution validation rule.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseFile, type ParsedFile } from "@slices/parser";
import { linkResolutionRule } from "../../src/rules/link-resolution.js";

const TEST_DIR = "/tmp/treetext-validation-test";

function createContext(
  content: string,
  path = "test.tt",
  allFiles?: Map<string, ParsedFile>,
  directory?: string
) {
  const parsed = parseFile(content, path);
  return { parsed, allFiles, directory };
}

describe("linkResolutionRule", () => {
  describe("relationship type validation", () => {
    test("accepts valid relationship types", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: depends_on
      to: 01JTEST0000000000000000002
    - rel: see_also
      to: 01JTEST0000000000000000003
    - rel: parent
      to: 01JTEST0000000000000000004
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      // Should only have "ID not found" warnings, no relationship type errors
      const relIssues = issues.filter(i => i.message.includes("relationship type"));
      expect(relIssues).toHaveLength(0);
    });

    test("warns on unknown relationship types", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: custom_relation
      to: 01JTEST0000000000000000002
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.some(i => i.message.includes("Unknown relationship type"))).toBe(true);
      expect(issues.some(i => i.message.includes("custom_relation"))).toBe(true);
    });

    test("errors on missing rel field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - to: 01JTEST0000000000000000002
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.some(i => i.message.includes('Missing required "rel"'))).toBe(true);
      expect(issues.some(i => i.severity === "error")).toBe(true);
    });

    test("errors on missing to field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: depends_on
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.some(i => i.message.includes('Missing required "to"'))).toBe(true);
      expect(issues.some(i => i.severity === "error")).toBe(true);
    });
  });

  describe("ID target validation", () => {
    test("accepts valid ULID targets", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: depends_on
      to: 01JABCD0000000000000000001
---
`;
      // Without allFiles, it can't verify if ID exists, so it just validates format
      const issues = linkResolutionRule.validate(createContext(content));
      // Should not have format errors (may have "ID not found" if no allFiles)
      expect(issues.every(i => !i.message.includes("doesn't look like a valid ID"))).toBe(true);
    });

    test("accepts valid UUID targets", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: depends_on
      to: 550e8400-e29b-41d4-a716-446655440000
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.every(i => !i.message.includes("doesn't look like a valid ID"))).toBe(true);
    });

    test("warns on invalid ID format", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: depends_on
      to: not-a-valid-id
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.some(i => i.message.includes("doesn't look like a valid ID"))).toBe(true);
    });
  });

  describe("ID resolution with allFiles", () => {
    test("passes when linked ID exists in allFiles", () => {
      const content1 = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Source
  summary: Source file
  body:
    type: markdown
  links:
    - rel: depends_on
      to: 01JTEST0000000000000000002
---
`;
      const content2 = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000002
  title: Target
  summary: Target file
  body:
    type: markdown
---
`;
      const parsed1 = parseFile(content1, "source.tt");
      const parsed2 = parseFile(content2, "target.tt");

      const allFiles = new Map<string, ParsedFile>();
      allFiles.set("source.tt", parsed1);
      allFiles.set("target.tt", parsed2);

      const issues = linkResolutionRule.validate({
        parsed: parsed1,
        allFiles,
      });

      // Should not have "No file found with ID" warning
      expect(issues.every(i => !i.message.includes("No file found with ID"))).toBe(true);
    });

    test("warns when linked ID does not exist in allFiles", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Source
  summary: Source file
  body:
    type: markdown
  links:
    - rel: depends_on
      to: 01JMSNGG000000000000000001
---
`;
      const parsed = parseFile(content, "source.tt");
      const allFiles = new Map<string, ParsedFile>();
      allFiles.set("source.tt", parsed);

      const issues = linkResolutionRule.validate({
        parsed,
        allFiles,
      });

      expect(issues.some(i => i.message.includes("No file found with ID"))).toBe(true);
      expect(issues.some(i => i.message.includes("01JMSNGG000000000000000001"))).toBe(true);
    });
  });

  describe("path target validation", () => {
    beforeEach(() => {
      mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
      rmSync(TEST_DIR, { recursive: true, force: true });
    });

    test("passes when path target exists", () => {
      // Create a target file
      const targetPath = join(TEST_DIR, "target.tt");
      writeFileSync(
        targetPath,
        `---
tt:
  v: "1"
  id: 01JTARGET000000000000000001
  title: Target
  summary: Target file
  body:
    type: markdown
---
`
      );

      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Source
  summary: Source file
  body:
    type: markdown
  links:
    - rel: depends_on
      to: ./target.tt
---
`;
      const sourcePath = join(TEST_DIR, "source.tt");
      const issues = linkResolutionRule.validate(
        createContext(content, sourcePath, undefined, TEST_DIR)
      );

      expect(issues.every(i => !i.message.includes("Path does not exist"))).toBe(true);
    });

    test("warns when path target does not exist", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Source
  summary: Source file
  body:
    type: markdown
  links:
    - rel: depends_on
      to: ./nonexistent.tt
---
`;
      const sourcePath = join(TEST_DIR, "source.tt");
      const issues = linkResolutionRule.validate(
        createContext(content, sourcePath, undefined, TEST_DIR)
      );

      expect(issues.some(i => i.message.includes("Path does not exist"))).toBe(true);
      expect(issues.some(i => i.message.includes("nonexistent.tt"))).toBe(true);
    });
  });

  describe("routes_to relationship validation", () => {
    test("accepts valid routes_to links", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  contract:
    purpose: Store things
    exclude:
      - authentication
  links:
    - rel: routes_to
      to: 01JDATAA000000000000000001
      label: Authentication docs
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      // routes_to should be a valid relationship type - no warnings about unknown type
      expect(issues.every(i => !i.message.includes("Unknown relationship type"))).toBe(true);
    });

    test("accepts valid routed_from links", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  links:
    - rel: routed_from
      to: 01JDATAA000000000000000001
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      // routed_from should be a valid relationship type - no warnings about unknown type
      expect(issues.every(i => !i.message.includes("Unknown relationship type"))).toBe(true);
    });
  });

  describe("derived_from validation", () => {
    test("validates derived_from.id reference", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Summary
  summary: A derived summary
  body:
    type: markdown
  derived_from:
    id: invalid-id
    hash: abc123
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.some(i => i.message.includes("derived_from.id"))).toBe(true);
      expect(issues.some(i => i.message.includes("doesn't look like a valid ID"))).toBe(true);
    });

    test("accepts valid derived_from.id reference", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Summary
  summary: A derived summary
  body:
    type: markdown
  derived_from:
    id: 01JSRCF0000000000000000001
    hash: abc123
---
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues.every(i => !i.message.includes("doesn't look like a valid ID"))).toBe(true);
    });
  });

  describe("no links", () => {
    test("returns empty issues for files without links", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
---

Content without links.
`;
      const issues = linkResolutionRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });
});

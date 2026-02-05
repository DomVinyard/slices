/**
 * Tests for the contract-enums validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { contractEnumsRule } from "../../src/rules/contract-enums.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("contractEnumsRule", () => {
  describe("no contract", () => {
    test("skips validation when no contract section", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: No Contract
  summary: Test
  body:
    type: markdown
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("valid write modes", () => {
    test("accepts append write mode", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Append Mode
  summary: Test
  body:
    type: markdown
  contract:
    write: append
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts replace write mode", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Replace Mode
  summary: Test
  body:
    type: markdown
  contract:
    write: replace
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts supersede write mode", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Supersede Mode
  summary: Test
  body:
    type: jsonl
  contract:
    write: supersede
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("invalid write modes", () => {
    test("rejects invalid write mode", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Invalid Write
  summary: Test
  body:
    type: markdown
  contract:
    write: overwrite
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("overwrite");
      expect(issues[0].message).toContain("append, replace, supersede");
    });

    test("rejects misspelled write mode", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Typo
  summary: Test
  body:
    type: markdown
  contract:
    write: apend
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].context?.value).toBe("apend");
      expect(issues[0].context?.field).toBe("write");
    });
  });

  describe("valid overflow strategies", () => {
    test("accepts split overflow strategy", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Split Overflow
  summary: Test
  body:
    type: markdown
  contract:
    overflow: split
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts summarize overflow strategy", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Summarize Overflow
  summary: Test
  body:
    type: markdown
  contract:
    overflow: summarize
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts archive overflow strategy", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Archive Overflow
  summary: Test
  body:
    type: markdown
  contract:
    overflow: archive
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts error overflow strategy", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Error Overflow
  summary: Test
  body:
    type: markdown
  contract:
    overflow: error
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("invalid overflow strategies", () => {
    test("rejects invalid overflow strategy", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Invalid Overflow
  summary: Test
  body:
    type: markdown
  contract:
    overflow: truncate
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("truncate");
      expect(issues[0].message).toContain("split, summarize, archive, error");
    });
  });

  describe("multiple fields", () => {
    test("validates both write and overflow", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Both Valid
  summary: Test
  body:
    type: markdown
  contract:
    write: append
    overflow: split
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("reports both invalid write and overflow", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Both Invalid
  summary: Test
  body:
    type: markdown
  contract:
    write: invalid-write
    overflow: invalid-overflow
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(2);
      expect(issues.some((i) => i.message.includes("write"))).toBe(true);
      expect(issues.some((i) => i.message.includes("overflow"))).toBe(true);
    });
  });

  describe("contract with other fields", () => {
    test("allows other contract fields without validation", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Full Contract
  summary: Test
  body:
    type: markdown
  contract:
    purpose: Store notes
    write: append
    max_tokens: 4000
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("context information", () => {
    test("includes valid values in context", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: markdown
  contract:
    write: bad
---
`;
      const issues = contractEnumsRule.validate(createContext(content));
      expect(issues[0].context?.valid).toContain("append");
      expect(issues[0].context?.valid).toContain("replace");
      expect(issues[0].context?.valid).toContain("supersede");
    });
  });
});

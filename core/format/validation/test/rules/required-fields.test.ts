/**
 * Tests for the required-fields validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { requiredFieldsRule } from "../../src/rules/required-fields.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("requiredFieldsRule", () => {
  describe("valid files", () => {
    test("passes when all required fields present", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test File
  summary: A test summary
  body:
    type: markdown
---

Content here.
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("passes with minimal required fields", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Minimal
  summary: Just enough
  body:
    type: none
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("missing frontmatter", () => {
    test("detects missing frontmatter", () => {
      const content = `Just some content without frontmatter.`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("YAML frontmatter");
      expect(issues[0].severity).toBe("error");
    });
  });

  describe("missing tt namespace", () => {
    test("detects missing tt namespace", () => {
      const content = `---
other:
  key: value
---

Content.
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt:");
      expect(issues[0].severity).toBe("error");
    });
  });

  describe("missing required fields", () => {
    test("detects missing v field", () => {
      const content = `---
tt:
  id: 01JTEST0000000000000000001
  title: Missing Version
  summary: No version field
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.v");
      expect(issues[0].message).toContain("format version");
    });

    test("detects missing id field", () => {
      const content = `---
tt:
  v: "1"
  title: Missing ID
  summary: No id field
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.id");
      expect(issues[0].message).toContain("stable identifier");
    });

    test("detects missing title field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  summary: No title field
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.title");
      expect(issues[0].message).toContain("display label");
    });

    test("detects missing summary field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Missing Summary
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.summary");
      expect(issues[0].message).toContain("discovery");
    });

    test("detects missing body.type field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Missing Body Type
  summary: No body type
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.body.type");
      expect(issues[0].message).toContain("body content type");
    });

    test("detects missing body.type when body exists without type", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Body Without Type
  summary: Has body but no type
  body:
    code:
      lang: typescript
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.body.type");
    });
  });

  describe("empty fields", () => {
    test("detects empty title", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: ""
  summary: Summary here
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.title");
    });

    test("detects empty summary", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Title
  summary: ""
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("tt.summary");
    });
  });

  describe("multiple missing fields", () => {
    test("reports all missing fields", () => {
      const content = `---
tt:
  v: "1"
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues.length).toBeGreaterThanOrEqual(3);
      expect(issues.some((i) => i.message.includes("tt.id"))).toBe(true);
      expect(issues.some((i) => i.message.includes("tt.title"))).toBe(true);
      expect(issues.some((i) => i.message.includes("tt.summary"))).toBe(true);
      expect(issues.some((i) => i.message.includes("tt.body.type"))).toBe(true);
    });
  });

  describe("context", () => {
    test("includes field name in context", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  summary: Missing title
  body:
    type: markdown
---
`;
      const issues = requiredFieldsRule.validate(createContext(content));
      expect(issues[0].context?.field).toBe("tt.title");
    });
  });
});

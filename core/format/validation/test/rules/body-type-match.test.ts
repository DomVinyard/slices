/**
 * Tests for the body-type-match validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { bodyTypeMatchRule } from "../../src/rules/body-type-match.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("bodyTypeMatchRule", () => {
  describe("valid body types", () => {
    test("accepts all valid body type values", () => {
      const validTypes = ["markdown", "jsonl", "none", "code", "conversation", "text", "yaml", "routine"];

      for (const type of validTypes) {
        const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  body:
    type: ${type}
${type === "routine" ? "    routine:\n      steps:\n        - instruction: Do something" : ""}
---
`;
        const issues = bodyTypeMatchRule.validate(createContext(content));
        const bodyTypeErrors = issues.filter((i) => i.message.includes("Invalid tt.body.type"));
        expect(bodyTypeErrors).toHaveLength(0);
      }
    });
  });

  describe("invalid body type", () => {
    test("rejects unknown body type", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Invalid Type
  summary: Test
  body:
    type: html
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("html");
      expect(issues[0].message).toContain("Must be one of");
    });
  });

  describe("kind validation", () => {
    test("accepts valid kind values", () => {
      for (const kind of ["context", "pointer"]) {
        const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Test
  summary: Test
  kind: ${kind}
  body:
    type: ${kind === "pointer" ? "none" : "markdown"}
---
`;
        const issues = bodyTypeMatchRule.validate(createContext(content));
        const kindErrors = issues.filter((i) => i.message.includes("Invalid tt.kind"));
        expect(kindErrors).toHaveLength(0);
      }
    });

    test("rejects invalid kind value", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Invalid Kind
  summary: Test
  kind: reference
  body:
    type: markdown
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("Invalid tt.kind"))).toBe(true);
    });

    test("warns when pointer has non-none body type", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Pointer With Content
  summary: Test
  kind: pointer
  body:
    type: markdown
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("Pointer files should have"))).toBe(true);
      expect(issues.find((i) => i.message.includes("Pointer"))?.severity).toBe("warning");
    });
  });

  describe("type: none", () => {
    test("accepts none type with empty body", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty None
  summary: Test
  body:
    type: none
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when none type has body content", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: None With Content
  summary: Test
  body:
    type: none
---

This is body content that shouldn't be here.
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toContain("has body content");
    });
  });

  describe("type: jsonl", () => {
    test("accepts valid jsonl body", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Valid JSONL
  summary: Test
  body:
    type: jsonl
---
{"key": "value1"}
{"key": "value2"}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when jsonl body has non-JSON lines", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Invalid JSONL
  summary: Test
  body:
    type: jsonl
---
{"key": "value1"}
This is not JSON
{"key": "value2"}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("don't appear to be JSON"))).toBe(true);
    });

    test("accepts empty jsonl body", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty JSONL
  summary: Test
  body:
    type: jsonl
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("type: markdown", () => {
    test("accepts markdown content", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Markdown
  summary: Test
  body:
    type: markdown
---

# Heading

Some **bold** text and *italic* text.
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when all lines look like JSON", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: JSON in Markdown
  summary: Test
  body:
    type: markdown
---
{"line": 1}
{"line": 2}
{"line": 3}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("Consider using"))).toBe(true);
    });
  });

  describe("type: code", () => {
    test("warns when code type missing lang", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Code Without Lang
  summary: Test
  body:
    type: code
---
function test() {
  return true;
}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("tt.body.code.lang"))).toBe(true);
    });

    test("accepts code type with lang specified", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: TypeScript Code
  summary: Test
  body:
    type: code
    code:
      lang: typescript
---
function test(): boolean {
  return true;
}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("type: conversation", () => {
    test("accepts valid conversation body", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Conversation
  summary: Test
  body:
    type: conversation
---
{"role": "user", "content": "Hello"}
{"role": "assistant", "content": "Hi!"}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when conversation has non-JSON lines", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Conversation
  summary: Test
  body:
    type: conversation
---
{"role": "user", "content": "Hello"}
Not a JSON line
{"role": "assistant", "content": "Hi!"}
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("JSONL format"))).toBe(true);
    });
  });

  describe("type: yaml", () => {
    test("accepts valid YAML body", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: YAML Data
  summary: Test
  body:
    type: yaml
---
name: Test
values:
  - one
  - two
# comment
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when yaml body doesn't look like YAML", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Not YAML
  summary: Test
  body:
    type: yaml
---
This is just plain text
without any YAML syntax
no colons or lists
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("doesn't appear to be YAML"))).toBe(true);
    });
  });

  describe("type: routine", () => {
    test("accepts routine with config", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Routine
  summary: Test
  body:
    type: routine
    routine:
      requirements: Must have X
      steps:
        - instruction: Do something
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("errors when routine type missing routine config", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Routine Without Config
  summary: Test
  body:
    type: routine
---
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("tt.body.routine configuration is missing"))).toBe(true);
      expect(issues.find((i) => i.message.includes("routine"))?.severity).toBe("error");
    });
  });

  describe("type: text", () => {
    test("accepts any text content", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Plain Text
  summary: Test
  body:
    type: text
---
This is plain text content.
It can be anything at all.
No validation needed.
`;
      const issues = bodyTypeMatchRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });
});

/**
 * Tests for the activation-structure validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { activationStructureRule } from "../../src/rules/activation-structure.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("activationStructureRule", () => {
  describe("non-activation files", () => {
    test("skips files without activation", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: No Activation
  summary: Test
  body:
    type: markdown
---

Regular content.
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("valid activation", () => {
    test("accepts minimal activation with triggers", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Valid Skill
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - When user asks about X
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts full activation config", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Full Skill
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - When user asks about X
      - When debugging is needed
    overview: This skill helps with X
    limitations: Does not work with Y
    connections:
      - API service
      - Database
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("triggers validation", () => {
    test("warns when triggers is missing", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: No Triggers
  summary: Test
  body:
    type: markdown
  activation:
    overview: This skill does X
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("no triggers defined"))).toBe(true);
      expect(issues.find((i) => i.message.includes("triggers"))?.severity).toBe("warning");
    });

    test("errors when triggers is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Triggers
  summary: Test
  body:
    type: markdown
  activation:
    triggers: not-an-array
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("triggers must be an array"))).toBe(true);
      expect(issues.find((i) => i.message.includes("triggers must"))?.severity).toBe("error");
    });

    test("errors when triggers contains non-strings", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Non-String Triggers
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Valid trigger
      - 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("triggers[1] must be a string"))).toBe(true);
    });

    test("warns when triggers array is empty", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Triggers
  summary: Test
  body:
    type: markdown
  activation:
    triggers: []
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("triggers is empty"))).toBe(true);
      expect(issues.find((i) => i.message.includes("empty"))?.severity).toBe("warning");
    });
  });

  describe("overview validation", () => {
    test("warns when overview is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Overview
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
    overview: 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("overview should be a string"))).toBe(true);
    });
  });

  describe("limitations validation", () => {
    test("warns when limitations is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Limitations
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
    limitations: 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("limitations should be a string"))).toBe(true);
    });
  });

  describe("connections validation", () => {
    test("errors when connections is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Connections
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
    connections: not-an-array
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("connections must be an array"))).toBe(true);
    });

    test("errors when connections contains non-strings", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Non-String Connections
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
    connections:
      - Valid
      - 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("connections[1] must be a string"))).toBe(true);
    });
  });

  describe("routines array validation", () => {
    test("accepts valid routines array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: With Routines
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  routines:
    - run: 01JROUTINE0000000000001
    - run: 01JROUTINE0000000000002
      when: User asks for help
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("errors when routines is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Routines
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  routines: not-an-array
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("routines must be an array"))).toBe(true);
    });

    test("errors when routine missing run field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Routine No Run
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  routines:
    - when: Always
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('must have a "run" field'))).toBe(true);
    });

    test("errors when routine run is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Run
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  routines:
    - run: 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("run must be a string"))).toBe(true);
    });

    test("warns when routine when is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad When
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  routines:
    - run: 01JROUTINE0000000000001
      when: 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("when should be a string"))).toBe(true);
    });
  });

  describe("knowledge array validation", () => {
    test("accepts valid knowledge array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: With Knowledge
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  knowledge:
    - read: 01JDOCS0000000000000001
    - read: 01JDOCS0000000000000002
      when: Detailed info needed
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("errors when knowledge is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Knowledge
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  knowledge: not-an-array
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("knowledge must be an array"))).toBe(true);
    });

    test("errors when knowledge missing read field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Knowledge No Read
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  knowledge:
    - when: Always
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('must have a "read" field'))).toBe(true);
    });

    test("errors when knowledge read is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Read
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  knowledge:
    - read: 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("read must be a string"))).toBe(true);
    });

    test("warns when knowledge when is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad When
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Trigger
  knowledge:
    - read: 01JDOCS0000000000000001
      when: 123
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("when should be a string"))).toBe(true);
    });
  });

  describe("index tracking", () => {
    test("reports correct indices in error messages", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Index Test
  summary: Test
  body:
    type: markdown
  activation:
    triggers:
      - Valid
      - 123
      - Also Valid
---
`;
      const issues = activationStructureRule.validate(createContext(content));
      expect(issues[0].message).toContain("triggers[1]");
      expect(issues[0].context?.index).toBe(1);
    });
  });
});

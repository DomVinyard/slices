/**
 * Tests for the routine-structure validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { routineStructureRule } from "../../src/rules/routine-structure.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("routineStructureRule", () => {
  describe("non-routine files", () => {
    test("skips non-routine body types", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Not Routine
  summary: Test
  body:
    type: markdown
---

Regular content.
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("valid routines", () => {
    test("accepts valid routine with instruction steps", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Valid Routine
  summary: Test
  body:
    type: routine
    routine:
      requirements: Need access to API
      steps:
        - instruction: First, do this
        - instruction: Then, do that
        - instruction: Finally, check results
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts routine with read steps", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Read Routine
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - read: 01JOTHER0000000000000001
        - instruction: Process the content
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts routine with run steps", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Run Routine
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - run: 01JSCRIPT00000000000001
          args:
            - "--verbose"
            - "--output=result.txt"
        - instruction: Check the output
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts steps with notes", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Routine With Notes
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - instruction: Do something
          note: This is important because...
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("missing routine config", () => {
    test("errors when routine type but no routine config", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Missing Config
  summary: Test
  body:
    type: routine
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("configuration is missing");
    });
  });

  describe("missing steps", () => {
    test("errors when steps array missing", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: No Steps
  summary: Test
  body:
    type: routine
    routine:
      requirements: Have X
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain('"steps" array');
    });

    test("errors when steps array is empty", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Steps
  summary: Test
  body:
    type: routine
    routine:
      steps: []
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("at least one step");
    });
  });

  describe("step type validation", () => {
    test("errors when step has no type field", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Step
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - note: Just a note, no type
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("Must have one of"))).toBe(true);
    });

    test("errors when step has multiple type fields", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Multiple Types
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - instruction: Do this
          read: 01JOTHER0000000000000001
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("multiple type fields"))).toBe(true);
    });
  });

  describe("instruction validation", () => {
    test("errors when instruction is empty", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Instruction
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - instruction: ""
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("instruction must be a non-empty string"))).toBe(true);
    });
  });

  describe("read validation", () => {
    test("errors when read is empty", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Read
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - read: ""
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("read must be a non-empty string"))).toBe(true);
    });
  });

  describe("run validation", () => {
    test("errors when run is empty", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Run
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - run: ""
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("run must be a non-empty string"))).toBe(true);
    });

    test("errors when args is not an array", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Args
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - run: 01JSCRIPT00000000000001
          args: not-an-array
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("args must be an array"))).toBe(true);
    });

    test("errors when args contains non-strings", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Non-String Args
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - run: 01JSCRIPT00000000000001
          args:
            - valid
            - 123
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("args[1] must be a string"))).toBe(true);
    });
  });

  describe("note validation", () => {
    test("warns when note is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Note
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - instruction: Do this
          note: 123
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("note should be a string"))).toBe(true);
      expect(issues.find((i) => i.message.includes("note"))?.severity).toBe("warning");
    });
  });

  describe("requirements validation", () => {
    test("warns when requirements is not a string", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Requirements
  summary: Test
  body:
    type: routine
    routine:
      requirements: 123
      steps:
        - instruction: Do this
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("requirements should be a string"))).toBe(true);
    });
  });

  describe("step numbers", () => {
    test("reports correct step numbers in errors", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Multiple Errors
  summary: Test
  body:
    type: routine
    routine:
      steps:
        - instruction: Valid first step
        - instruction: ""
        - instruction: Valid third step
---
`;
      const issues = routineStructureRule.validate(createContext(content));
      expect(issues[0].message).toContain("Step 2");
      expect(issues[0].context?.step).toBe(2);
    });
  });
});

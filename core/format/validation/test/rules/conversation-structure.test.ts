/**
 * Tests for the conversation-structure validation rule.
 */

import { describe, test, expect } from "bun:test";
import { parseFile } from "@slices/parser";
import { conversationStructureRule } from "../../src/rules/conversation-structure.js";

function createContext(content: string, path = "test.tt") {
  const parsed = parseFile(content, path);
  return { parsed };
}

describe("conversationStructureRule", () => {
  describe("non-conversation files", () => {
    test("skips non-conversation body types", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Not Conversation
  summary: Test
  body:
    type: markdown
---

Regular content.
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("valid conversations", () => {
    test("accepts valid conversation messages", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Valid Conversation
  summary: Test
  body:
    type: conversation
---
{"role": "user", "content": "Hello"}
{"role": "assistant", "content": "Hi there!"}
{"role": "system", "content": "You are helpful"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts empty conversation body", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Empty Conversation
  summary: Test
  body:
    type: conversation
---
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });
  });

  describe("OTEL trace/span IDs", () => {
    test("accepts valid trace_id", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: With Trace
  summary: Test
  body:
    type: conversation
    conversation:
      trace_id: 0123456789abcdef0123456789abcdef
---
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("accepts valid span_id", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: With Span
  summary: Test
  body:
    type: conversation
    conversation:
      span_id: 0123456789abcdef
---
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("rejects invalid trace_id format", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Trace
  summary: Test
  body:
    type: conversation
    conversation:
      trace_id: invalid
---
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("trace_id");
      expect(issues[0].message).toContain("32 hexadecimal");
    });

    test("rejects invalid span_id format", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad Span
  summary: Test
  body:
    type: conversation
    conversation:
      span_id: too-short
---
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain("span_id");
      expect(issues[0].message).toContain("16 hexadecimal");
    });
  });

  describe("message roles", () => {
    test("accepts all valid roles", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: All Roles
  summary: Test
  body:
    type: conversation
    conversation:
      includes_tool_calls: true
---
{"role": "user", "content": "Hello"}
{"role": "assistant", "content": "Hi"}
{"role": "system", "content": "Context"}
{"role": "tool_call", "name": "search", "call_id": "call_123"}
{"role": "tool_result", "call_id": "call_123", "content": "Results"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns on unknown role", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Unknown Role
  summary: Test
  body:
    type: conversation
---
{"role": "unknown", "content": "Test"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toContain("Unknown role");
    });

    test("errors when message missing role and type", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: No Role
  summary: Test
  body:
    type: conversation
---
{"content": "No role field"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].message).toContain('must have either "role" or "type"');
    });
  });

  describe("tool messages", () => {
    test("warns when tool_call missing name", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Tool Call Missing Name
  summary: Test
  body:
    type: conversation
---
{"role": "tool_call", "call_id": "call_123"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('tool_call should have "name"'))).toBe(true);
    });

    test("warns when tool_call missing call_id", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Tool Call Missing ID
  summary: Test
  body:
    type: conversation
---
{"role": "tool_call", "name": "search"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('tool_call should have "call_id"'))).toBe(true);
    });

    test("warns when tool_result missing call_id", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Tool Result Missing ID
  summary: Test
  body:
    type: conversation
---
{"role": "tool_result", "content": "Results"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('tool_result should have "call_id"'))).toBe(true);
    });
  });

  describe("content messages", () => {
    test("warns when user message missing content", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: User No Content
  summary: Test
  body:
    type: conversation
---
{"role": "user"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('user message should have "content"'))).toBe(true);
    });

    test("warns when assistant message missing content", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Assistant No Content
  summary: Test
  body:
    type: conversation
---
{"role": "assistant"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('assistant message should have "content"'))).toBe(true);
    });
  });

  describe("compaction notes", () => {
    test("accepts compaction_note type", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: With Compaction
  summary: Test
  body:
    type: conversation
    conversation:
      includes_compaction: true
---
{"role": "user", "content": "Hello"}
{"type": "compaction_note", "summary": "Previous discussion summarized"}
{"role": "assistant", "content": "Continuing..."}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues).toHaveLength(0);
    });

    test("warns when compaction_note missing summary", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Compaction No Summary
  summary: Test
  body:
    type: conversation
---
{"type": "compaction_note"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes('compaction_note should have "summary"'))).toBe(true);
    });

    test("warns on unknown type", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Unknown Type
  summary: Test
  body:
    type: conversation
---
{"type": "unknown_type"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("Unknown type"))).toBe(true);
    });
  });

  describe("flag validation", () => {
    test("warns when includes_tool_calls true but no tool messages", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Flag Mismatch
  summary: Test
  body:
    type: conversation
    conversation:
      includes_tool_calls: true
---
{"role": "user", "content": "Hello"}
{"role": "assistant", "content": "Hi"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("includes_tool_calls is true but no tool"))).toBe(true);
    });

    test("warns when includes_compaction true but no compaction notes", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Compaction Flag Mismatch
  summary: Test
  body:
    type: conversation
    conversation:
      includes_compaction: true
---
{"role": "user", "content": "Hello"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("includes_compaction is true but no"))).toBe(true);
    });
  });

  describe("JSON parsing errors", () => {
    test("reports invalid JSON lines", () => {
      const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000001
  title: Bad JSON
  summary: Test
  body:
    type: conversation
---
{"role": "user", "content": "Hello"}
{invalid json}
{"role": "assistant", "content": "Hi"}
`;
      const issues = conversationStructureRule.validate(createContext(content));
      expect(issues.some((i) => i.message.includes("Line 2"))).toBe(true);
    });
  });
});

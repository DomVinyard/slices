/**
 * Rule: conversation-structure
 * Validates conversation body structure including message format and OTEL IDs
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";
import { parseJSONLBody } from "@slices/parser";

/** Valid message roles in conversations */
const VALID_ROLES = ["user", "assistant", "system", "tool_call", "tool_result"] as const;

/** Valid conversation message types (for non-role messages like compaction notes) */
const VALID_TYPES = ["compaction_note"] as const;

/** OpenTelemetry trace ID pattern (32 hex characters) */
const OTEL_TRACE_ID_PATTERN = /^[0-9a-f]{32}$/i;

/** OpenTelemetry span ID pattern (16 hex characters) */
const OTEL_SPAN_ID_PATTERN = /^[0-9a-f]{16}$/i;

export const conversationStructureRule: ValidationRule = {
  id: "conversation-structure",
  name: "Conversation Structure",
  description: "Validates conversation body has proper JSONL message format and valid OTEL IDs",
  severity: "error",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    // Only validate if body.type is conversation
    if (parsed.tt?.body?.type !== "conversation") {
      return issues;
    }

    const conversationConfig = parsed.tt.body.conversation;

    // Validate OTEL trace_id format if present
    if (conversationConfig?.trace_id) {
      const traceId = String(conversationConfig.trace_id);
      if (!OTEL_TRACE_ID_PATTERN.test(traceId)) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Invalid trace_id format: "${traceId}". Must be 32 hexadecimal characters.`,
          file: parsed.path,
          context: { trace_id: traceId },
        });
      }
    }

    // Validate OTEL span_id format if present
    if (conversationConfig?.span_id) {
      const spanId = String(conversationConfig.span_id);
      if (!OTEL_SPAN_ID_PATTERN.test(spanId)) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Invalid span_id format: "${spanId}". Must be 16 hexadecimal characters.`,
          file: parsed.path,
          context: { span_id: spanId },
        });
      }
    }

    const body = parsed.body.trim();
    if (!body) {
      return issues; // Empty body is fine
    }

    const rows = parseJSONLBody(body);
    let hasToolCall = false;
    let hasCompaction = false;

    for (const row of rows) {
      // Check for JSON parse errors
      if (row.error) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Line ${row.line}: ${row.error}`,
          file: parsed.path,
          line: row.line,
          context: { raw: row.raw.substring(0, 100) },
        });
        continue;
      }

      if (!row.data) continue;

      const role = row.data.role as string | undefined;
      const type = row.data.type as string | undefined;

      // Each message must have either 'role' or 'type'
      if (!role && !type) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Line ${row.line}: Message must have either "role" or "type" field`,
          file: parsed.path,
          line: row.line,
        });
        continue;
      }

      // Validate role if present
      if (role) {
        if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `Line ${row.line}: Unknown role "${role}". Valid roles: ${VALID_ROLES.join(", ")}`,
            file: parsed.path,
            line: row.line,
            context: { role },
          });
        }

        // Track tool calls
        if (role === "tool_call" || role === "tool_result") {
          hasToolCall = true;
        }

        // Validate tool_call specific fields
        if (role === "tool_call") {
          if (!row.data.name) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `Line ${row.line}: tool_call should have "name" field`,
              file: parsed.path,
              line: row.line,
            });
          }
          if (!row.data.call_id) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `Line ${row.line}: tool_call should have "call_id" field`,
              file: parsed.path,
              line: row.line,
            });
          }
        }

        // Validate tool_result specific fields
        if (role === "tool_result") {
          if (!row.data.call_id) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `Line ${row.line}: tool_result should have "call_id" field`,
              file: parsed.path,
              line: row.line,
            });
          }
        }

        // Validate user/assistant/system have content
        if ((role === "user" || role === "assistant" || role === "system") && !row.data.content) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `Line ${row.line}: ${role} message should have "content" field`,
            file: parsed.path,
            line: row.line,
          });
        }
      }

      // Validate type if present
      if (type) {
        if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `Line ${row.line}: Unknown type "${type}". Valid types: ${VALID_TYPES.join(", ")}`,
            file: parsed.path,
            line: row.line,
            context: { type },
          });
        }

        // Track compaction notes
        if (type === "compaction_note") {
          hasCompaction = true;

          // Validate compaction_note specific fields
          if (!row.data.summary) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `Line ${row.line}: compaction_note should have "summary" field`,
              file: parsed.path,
              line: row.line,
            });
          }
        }
      }
    }

    // Validate includes_tool_calls flag matches content
    if (conversationConfig?.includes_tool_calls === true && !hasToolCall) {
      issues.push({
        rule: this.id,
        severity: "warning",
        message: `conversation.includes_tool_calls is true but no tool_call/tool_result messages found`,
        file: parsed.path,
      });
    }

    // Validate includes_compaction flag matches content
    if (conversationConfig?.includes_compaction === true && !hasCompaction) {
      issues.push({
        rule: this.id,
        severity: "warning",
        message: `conversation.includes_compaction is true but no compaction_note messages found`,
        file: parsed.path,
      });
    }

    return issues;
  },
};

export default conversationStructureRule;

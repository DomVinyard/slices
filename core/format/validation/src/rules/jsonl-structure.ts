/**
 * Rule: jsonl-structure
 * Validates JSONL body structure including _meta.id and _meta.created_at
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";
import { parseJSONLBody } from "@slices/parser";

// ISO 8601 datetime regex (simplified)
const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export const jsonlStructureRule: ValidationRule = {
  id: "jsonl-structure",
  name: "JSONL Structure",
  description: "JSONL rows must have _meta.id and _meta.created_at fields",
  severity: "error",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    // Only validate if body.type is jsonl
    if (parsed.tt?.body?.type !== "jsonl") {
      return issues;
    }

    const body = parsed.body.trim();
    if (!body) {
      return issues; // Empty body is fine
    }

    const rows = parseJSONLBody(body);
    const seenIds = new Set<string>();

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

      // Check for _meta object
      const meta = row.data._meta as Record<string, unknown> | undefined;
      if (!meta || typeof meta !== "object") {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Line ${row.line}: Missing required "_meta" object`,
          file: parsed.path,
          line: row.line,
        });
        continue;
      }

      // Check _meta.id
      if (!meta.id) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Line ${row.line}: Missing required "_meta.id"`,
          file: parsed.path,
          line: row.line,
        });
      } else {
        const id = String(meta.id);
        if (seenIds.has(id)) {
          issues.push({
            rule: this.id,
            severity: "error",
            message: `Line ${row.line}: Duplicate "_meta.id": "${id}"`,
            file: parsed.path,
            line: row.line,
            context: { id },
          });
        }
        seenIds.add(id);
      }

      // Check _meta.created_at
      if (!meta.created_at) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Line ${row.line}: Missing required "_meta.created_at"`,
          file: parsed.path,
          line: row.line,
        });
      } else {
        const createdAt = String(meta.created_at);
        if (!ISO8601_REGEX.test(createdAt)) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `Line ${row.line}: "_meta.created_at" should be ISO-8601 format: "${createdAt}"`,
            file: parsed.path,
            line: row.line,
            context: { created_at: createdAt },
          });
        }
      }

      // Validate optional _meta.supersedes if present
      if (meta.supersedes !== undefined) {
        if (!Array.isArray(meta.supersedes)) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `Line ${row.line}: "_meta.supersedes" should be an array`,
            file: parsed.path,
            line: row.line,
          });
        }
      }

      // Validate optional _meta.links if present
      if (meta.links !== undefined) {
        if (!Array.isArray(meta.links)) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `Line ${row.line}: "_meta.links" should be an array`,
            file: parsed.path,
            line: row.line,
          });
        }
      }
    }

    return issues;
  },
};

export default jsonlStructureRule;

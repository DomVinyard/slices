/**
 * Rule: body-type-match
 * Validates that the declared body.type matches the actual content
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";
import { VALID_BODY_TYPES, VALID_KINDS } from "../lib/types.js";

export const bodyTypeMatchRule: ValidationRule = {
  id: "body-type-match",
  name: "Body Type Match",
  description: "The declared tt.body.type must match the actual body content",
  severity: "error",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    if (!parsed.tt?.body?.type) {
      // Missing body.type is caught by required-fields
      return issues;
    }

    const bodyType = String(parsed.tt.body.type);
    const body = parsed.body.trim();

    // Validate body.type is a known value
    if (!VALID_BODY_TYPES.includes(bodyType as typeof VALID_BODY_TYPES[number])) {
      issues.push({
        rule: this.id,
        severity: "error",
        message: `Invalid tt.body.type value: "${bodyType}". Must be one of: ${VALID_BODY_TYPES.join(", ")}`,
        file: parsed.path,
        context: { bodyType, valid: VALID_BODY_TYPES },
      });
      return issues;
    }

    // Validate kind if present
    if (parsed.tt.kind !== undefined) {
      const kind = String(parsed.tt.kind);
      if (!VALID_KINDS.includes(kind as typeof VALID_KINDS[number])) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Invalid tt.kind value: "${kind}". Must be one of: ${VALID_KINDS.join(", ")}`,
          file: parsed.path,
          context: { kind, valid: VALID_KINDS },
        });
      }

      // Pointer files should have body.type = none
      if (kind === "pointer" && bodyType !== "none") {
        issues.push({
          rule: this.id,
          severity: "warning",
          message: `Pointer files should have tt.body.type: "none", found: "${bodyType}"`,
          file: parsed.path,
          context: { kind, bodyType },
        });
      }
    }

    // Validate body content matches declared type
    switch (bodyType) {
      case "none":
        if (body.length > 0) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `tt.body.type is "none" but file has body content (${body.length} characters)`,
            file: parsed.path,
            context: { bodyType, bodyLength: body.length },
          });
        }
        break;

      case "jsonl":
        if (body.length > 0) {
          // Check if body looks like JSONL (lines starting with { or [)
          const lines = body.split("\n").filter((l) => l.trim());
          const nonJsonLines = lines.filter((l) => {
            const trimmed = l.trim();
            return trimmed && !trimmed.startsWith("{") && !trimmed.startsWith("[");
          });
          if (nonJsonLines.length > 0) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `tt.body.type is "jsonl" but ${nonJsonLines.length} line(s) don't appear to be JSON`,
              file: parsed.path,
              context: { bodyType, invalidLines: nonJsonLines.length },
            });
          }
        }
        break;

      case "markdown":
        // Markdown can contain anything, so no strict validation
        // But we could warn if it looks like JSONL
        if (body.length > 0) {
          const lines = body.split("\n").filter((l) => l.trim());
          const jsonLines = lines.filter((l) => {
            const trimmed = l.trim();
            return trimmed.startsWith("{") && trimmed.endsWith("}");
          });
          // If majority of lines look like JSON, might be mislabeled
          if (jsonLines.length > 0 && jsonLines.length === lines.length && lines.length > 2) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `tt.body.type is "markdown" but all ${lines.length} lines look like JSON. Consider using "jsonl".`,
              file: parsed.path,
              context: { bodyType, jsonLineCount: jsonLines.length },
            });
          }
        }
        break;

      case "code":
        // Code can contain anything - validation is about metadata consistency
        // Warn if code config is missing lang when there's content
        if (body.length > 0 && !parsed.tt.body.code?.lang) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `tt.body.type is "code" but tt.body.code.lang is not specified`,
            file: parsed.path,
            context: { bodyType },
          });
        }
        break;

      case "conversation":
        // Conversation bodies should be JSONL format
        // Detailed validation is in conversation-structure rule
        if (body.length > 0) {
          const lines = body.split("\n").filter((l) => l.trim());
          const nonJsonLines = lines.filter((l) => {
            const trimmed = l.trim();
            return trimmed && !trimmed.startsWith("{");
          });
          if (nonJsonLines.length > 0) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `tt.body.type is "conversation" but ${nonJsonLines.length} line(s) don't appear to be JSON. Conversation bodies should use JSONL format.`,
              file: parsed.path,
              context: { bodyType, invalidLines: nonJsonLines.length },
            });
          }
        }
        break;

      case "text":
        // Plain text - no validation needed, accepts anything
        break;

      case "yaml":
        // YAML validation - try to detect if it's valid YAML structure
        // Full YAML parsing would require a dependency, so just do basic checks
        if (body.length > 0) {
          // Check for common YAML syntax issues
          const lines = body.split("\n");
          const hasYamlIndicators = lines.some((l) => 
            l.includes(": ") || l.trim().startsWith("- ") || l.trim().startsWith("#")
          );
          // Warn if it doesn't look like YAML at all
          if (!hasYamlIndicators && lines.length > 2) {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `tt.body.type is "yaml" but content doesn't appear to be YAML format`,
              file: parsed.path,
              context: { bodyType },
            });
          }
        }
        break;

      case "routine":
        // Routine validation is handled by routine-structure rule
        // Here we just check that routine config exists
        if (!(parsed.tt.body as any).routine) {
          issues.push({
            rule: this.id,
            severity: "error",
            message: `tt.body.type is "routine" but tt.body.routine configuration is missing`,
            file: parsed.path,
            context: { bodyType },
          });
        }
        break;
    }

    return issues;
  },
};

export default bodyTypeMatchRule;

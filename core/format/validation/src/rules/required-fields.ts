/**
 * Rule: required-fields
 * Validates that all required fields are present in the frontmatter
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";

const REQUIRED_FIELDS = [
  { path: "v", description: "format version" },
  { path: "id", description: "stable identifier" },
  { path: "title", description: "display label" },
  { path: "summary", description: "1-2 sentences for discovery" },
  { path: "body.type", description: "body content type" },
] as const;

export const requiredFieldsRule: ValidationRule = {
  id: "required-fields",
  name: "Required Fields",
  description: "All .tt files must have tt.v, tt.id, tt.title, tt.summary, and tt.body.type",
  severity: "error",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    // If no frontmatter at all, that's already caught by parser
    if (!parsed.hasFrontmatter) {
      issues.push({
        rule: this.id,
        severity: "error",
        message: "File must have YAML frontmatter",
        file: parsed.path,
      });
      return issues;
    }

    // If no tt namespace
    if (!parsed.tt) {
      issues.push({
        rule: this.id,
        severity: "error",
        message: "Frontmatter must contain a 'tt:' namespace",
        file: parsed.path,
      });
      return issues;
    }

    const tt = parsed.tt;

    for (const field of REQUIRED_FIELDS) {
      const value = getNestedValue(tt, field.path);

      if (value === undefined || value === null || value === "") {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Missing required field: tt.${field.path} (${field.description})`,
          file: parsed.path,
          context: { field: `tt.${field.path}` },
        });
      }
    }

    return issues;
  },
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export default requiredFieldsRule;

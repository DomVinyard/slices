/**
 * Rule: ulid-format
 * Validates that tt.id is a valid ULID (or UUID)
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";

// ULID: 26 characters, Crockford Base32 (excludes I, L, O, U)
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

// UUID: 8-4-4-4-12 hexadecimal with hyphens
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const ulidFormatRule: ValidationRule = {
  id: "ulid-format",
  name: "ULID Format",
  description: "tt.id should be a valid ULID (preferred) or UUID",
  severity: "warning",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    if (!parsed.tt?.id) {
      // Missing id is caught by required-fields rule
      return issues;
    }

    const id = String(parsed.tt.id);

    // Check if valid ULID
    if (ULID_REGEX.test(id)) {
      return issues; // Valid ULID
    }

    // Check if valid UUID
    if (UUID_REGEX.test(id)) {
      // UUID is acceptable but ULID is preferred
      issues.push({
        rule: this.id,
        severity: "warning",
        message: `tt.id is a UUID. ULID is preferred for lexicographic sorting: ${id}`,
        file: parsed.path,
        context: { id, format: "uuid" },
      });
      return issues;
    }

    // Invalid format
    issues.push({
      rule: this.id,
      severity: "error",
      message: `tt.id is not a valid ULID or UUID: "${id}". ULIDs are 26 Crockford Base32 characters.`,
      file: parsed.path,
      context: { id },
    });

    return issues;
  },
};

export default ulidFormatRule;

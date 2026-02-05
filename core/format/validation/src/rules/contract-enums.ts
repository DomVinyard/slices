/**
 * Rule: contract-enums
 * Validates that contract.write and contract.overflow use valid enum values
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";
import { VALID_WRITE_MODES, VALID_OVERFLOW_STRATEGIES } from "../lib/types.js";

export const contractEnumsRule: ValidationRule = {
  id: "contract-enums",
  name: "Contract Enums",
  description: "Contract write and overflow fields must use valid enum values",
  severity: "error",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    if (!parsed.tt?.contract) {
      // No contract section, nothing to validate
      return issues;
    }

    const contract = parsed.tt.contract;

    // Validate write mode
    if (contract.write !== undefined) {
      const write = String(contract.write);
      if (!VALID_WRITE_MODES.includes(write as typeof VALID_WRITE_MODES[number])) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Invalid tt.contract.write value: "${write}". Must be one of: ${VALID_WRITE_MODES.join(", ")}`,
          file: parsed.path,
          context: { field: "write", value: write, valid: VALID_WRITE_MODES },
        });
      }
    }

    // Validate overflow strategy
    if (contract.overflow !== undefined) {
      const overflow = String(contract.overflow);
      if (!VALID_OVERFLOW_STRATEGIES.includes(overflow as typeof VALID_OVERFLOW_STRATEGIES[number])) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Invalid tt.contract.overflow value: "${overflow}". Must be one of: ${VALID_OVERFLOW_STRATEGIES.join(", ")}`,
          file: parsed.path,
          context: { field: "overflow", value: overflow, valid: VALID_OVERFLOW_STRATEGIES },
        });
      }
    }

    return issues;
  },
};

export default contractEnumsRule;

/**
 * Validation rules registry
 */

import type { ValidationRule } from "../lib/types.js";

import requiredFieldsRule from "./required-fields.js";
import ulidFormatRule from "./ulid-format.js";
import contractEnumsRule from "./contract-enums.js";
import bodyTypeMatchRule from "./body-type-match.js";
import jsonlStructureRule from "./jsonl-structure.js";
import conversationStructureRule from "./conversation-structure.js";
import linkResolutionRule from "./link-resolution.js";
import routineStructureRule from "./routine-structure.js";
import activationStructureRule from "./activation-structure.js";

/** All available validation rules */
export const allRules: ValidationRule[] = [
  requiredFieldsRule,
  ulidFormatRule,
  contractEnumsRule,
  bodyTypeMatchRule,
  jsonlStructureRule,
  conversationStructureRule,
  linkResolutionRule,
  routineStructureRule,
  activationStructureRule,
];

/** Get a rule by ID */
export function getRule(id: string): ValidationRule | undefined {
  return allRules.find((r) => r.id === id);
}

/** Get rules by severity */
export function getRulesBySeverity(severity: "error" | "warning"): ValidationRule[] {
  return allRules.filter((r) => r.severity === severity);
}

// Re-export individual rules
export {
  requiredFieldsRule,
  ulidFormatRule,
  contractEnumsRule,
  bodyTypeMatchRule,
  jsonlStructureRule,
  conversationStructureRule,
  linkResolutionRule,
  routineStructureRule,
  activationStructureRule,
};

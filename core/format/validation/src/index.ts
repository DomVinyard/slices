/**
 * @treetext/validator - Library exports
 *
 * CLI tool and library to validate .tt files against the Slices v1 spec.
 *
 * @example
 * ```typescript
 * import { validate, validateContent, Validator } from '@treetext/validator';
 *
 * // Validate a directory
 * const results = validate('.treetext');
 *
 * // Validate content directly
 * const result = validateContent(`
 * ---
 * tt:
 *   v: "1"
 *   id: 01JEXAMPLE000000000000001
 *   title: My File
 *   summary: A test file
 *   body:
 *     type: markdown
 * ---
 * Content here.
 * `);
 *
 * // Custom validator with specific rules
 * const validator = new Validator({
 *   rules: ['required-fields', 'ulid-format'],
 *   skipRules: ['link-resolution'],
 * });
 * const customResults = validator.validateDirectory('.treetext');
 * ```
 */

// Main validator
export { Validator, validate, validateContent, type ValidatorOptions } from "./validator.js";

// Parser (re-exported from @slices/parser for backwards compatibility)
export { parseFile, parseJSONLBody } from "@slices/parser";
export type { ParsedFile, JSONLRow, TTFrontmatter, TTLink, TTContract, TTBody } from "@slices/parser";

// Types
export type {
  ValidationResult,
  ValidationIssue,
  ValidationRule,
  ValidationContext,
  Severity,
} from "./lib/types.js";

export {
  VALID_WRITE_MODES,
  VALID_OVERFLOW_STRATEGIES,
  VALID_BODY_TYPES,
  VALID_KINDS,
  VALID_RELATIONSHIPS,
} from "./lib/types.js";

// Reporter
export { formatResults, type OutputFormat, type ReporterOptions } from "./lib/reporter.js";

// Rules (for extensibility)
export { allRules, getRule, getRulesBySeverity } from "./rules/index.js";
export {
  requiredFieldsRule,
  ulidFormatRule,
  contractEnumsRule,
  bodyTypeMatchRule,
  jsonlStructureRule,
  linkResolutionRule,
} from "./rules/index.js";

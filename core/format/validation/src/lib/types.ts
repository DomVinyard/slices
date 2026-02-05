/**
 * Validation types and interfaces
 */

import type { ParsedFile } from "@slices/parser";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  /** Unique rule identifier */
  rule: string;
  /** Error or warning */
  severity: Severity;
  /** Human-readable message */
  message: string;
  /** File path */
  file: string;
  /** Line number (1-indexed, if applicable) */
  line?: number;
  /** Column number (1-indexed, if applicable) */
  column?: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  /** The file that was validated */
  file: string;
  /** Whether the file is valid (no errors) */
  valid: boolean;
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** All issues found */
  issues: ValidationIssue[];
}

export interface ValidationContext {
  /** The parsed file being validated */
  parsed: ParsedFile;
  /** All files in the directory (for link resolution) */
  allFiles?: Map<string, ParsedFile>;
  /** Directory containing the files */
  directory?: string;
}

export interface ValidationRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Default severity */
  severity: Severity;
  /** Validate a file and return issues */
  validate(context: ValidationContext): ValidationIssue[];
}

/** All valid write modes for contracts */
export const VALID_WRITE_MODES = ["append", "replace", "supersede"] as const;
export type WriteMode = (typeof VALID_WRITE_MODES)[number];

/** All valid overflow strategies */
export const VALID_OVERFLOW_STRATEGIES = ["split", "summarize", "archive", "error"] as const;
export type OverflowStrategy = (typeof VALID_OVERFLOW_STRATEGIES)[number];

/** All valid body types */
export const VALID_BODY_TYPES = ["markdown", "jsonl", "none", "code", "conversation", "text", "yaml", "routine"] as const;
export type BodyType = (typeof VALID_BODY_TYPES)[number];

/** All valid file kinds */
export const VALID_KINDS = ["context", "pointer"] as const;
export type FileKind = (typeof VALID_KINDS)[number];

/** All valid relationship types */
export const VALID_RELATIONSHIPS = [
  // Dependency graph
  "depends_on",
  "blocks",
  // Argumentation
  "evidence_for",
  "evidence_against",
  // Evolution
  "supersedes",
  "superseded_by",
  // Hierarchy
  "parent",
  "child",
  // Composition
  "part_of",
  "has_part",
  // Taxonomy
  "is_a",
  "type_of",
  // Derivation
  "derived_from",
  "source_of",
  // Loose association
  "see_also",
  // Routing (for agent content routing)
  "routes_to",
  "routed_from",
] as const;
export type Relationship = (typeof VALID_RELATIONSHIPS)[number];

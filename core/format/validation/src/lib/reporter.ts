/**
 * Reporter - Format validation results for different outputs
 */

import type { ValidationResult, ValidationIssue } from "./types.js";

export type OutputFormat = "terminal" | "json" | "sarif";

export interface ReporterOptions {
  /** Output format */
  format: OutputFormat;
  /** Whether to use colors (terminal only) */
  color?: boolean;
  /** Whether to show file paths as relative */
  relativePaths?: boolean;
  /** Base directory for relative paths */
  baseDir?: string;
}

// ANSI color codes
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Format validation results for output
 */
export function formatResults(results: ValidationResult[], options: ReporterOptions): string {
  switch (options.format) {
    case "json":
      return formatJSON(results);
    case "sarif":
      return formatSARIF(results);
    case "terminal":
    default:
      return formatTerminal(results, options);
  }
}

/**
 * Terminal output with colors and human-readable format
 */
function formatTerminal(results: ValidationResult[], options: ReporterOptions): string {
  const lines: string[] = [];
  const useColor = options.color !== false;

  const c = (code: string, text: string) => (useColor ? `${code}${text}${COLORS.reset}` : text);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    totalErrors += result.errorCount;
    totalWarnings += result.warningCount;

    if (result.issues.length === 0) continue;

    // File header
    const filePath = options.relativePaths && options.baseDir
      ? result.file.replace(options.baseDir, ".").replace(/^\.\//, "")
      : result.file;
    lines.push("");
    lines.push(c(COLORS.bold, filePath));

    // Issues
    for (const issue of result.issues) {
      const location = issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ""}` : "";
      const severity = issue.severity === "error"
        ? c(COLORS.red, "error")
        : c(COLORS.yellow, "warning");
      const rule = c(COLORS.gray, `(${issue.rule})`);

      lines.push(`  ${location ? c(COLORS.cyan, location) + " " : ""}${severity}: ${issue.message} ${rule}`);
    }
  }

  // Summary
  lines.push("");
  if (totalErrors === 0 && totalWarnings === 0) {
    lines.push(c(COLORS.green, "✓ All files valid"));
  } else {
    const errorText = totalErrors > 0 ? c(COLORS.red, `${totalErrors} error${totalErrors !== 1 ? "s" : ""}`) : "";
    const warningText = totalWarnings > 0
      ? c(COLORS.yellow, `${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}`)
      : "";
    const separator = errorText && warningText ? ", " : "";
    lines.push(`✗ ${errorText}${separator}${warningText}`);
  }

  return lines.join("\n");
}

/**
 * JSON output for programmatic consumption
 */
function formatJSON(results: ValidationResult[]): string {
  const output = {
    valid: results.every((r) => r.valid),
    totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warningCount, 0),
    files: results.map((r) => ({
      file: r.file,
      valid: r.valid,
      errorCount: r.errorCount,
      warningCount: r.warningCount,
      issues: r.issues,
    })),
  };
  return JSON.stringify(output, null, 2);
}

/**
 * SARIF output for CI/CD integration
 * Static Analysis Results Interchange Format (SARIF) 2.1.0
 */
function formatSARIF(results: ValidationResult[]): string {
  const allIssues = results.flatMap((r) => r.issues);

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "@treetext/validator",
            version: "1.0.0",
            informationUri: "https://treetext.org/spec",
            rules: getDistinctRules(allIssues).map((rule) => ({
              id: rule,
              shortDescription: {
                text: getRuleDescription(rule),
              },
            })),
          },
        },
        results: allIssues.map((issue) => ({
          ruleId: issue.rule,
          level: issue.severity === "error" ? "error" : "warning",
          message: {
            text: issue.message,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: issue.file,
                },
                region: issue.line
                  ? {
                      startLine: issue.line,
                      startColumn: issue.column ?? 1,
                    }
                  : undefined,
              },
            },
          ],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

function getDistinctRules(issues: ValidationIssue[]): string[] {
  return [...new Set(issues.map((i) => i.rule))];
}

function getRuleDescription(ruleId: string): string {
  const descriptions: Record<string, string> = {
    "required-fields": "All .tt files must have tt.v, tt.id, tt.title, tt.summary, and tt.body.type",
    "ulid-format": "tt.id should be a valid ULID or UUID",
    "contract-enums": "Contract write and overflow fields must use valid enum values",
    "body-type-match": "The declared tt.body.type must match the actual body content",
    "jsonl-structure": "JSONL rows must have _meta.id and _meta.created_at fields",
    "link-resolution": "Links must resolve to existing files or valid IDs",
  };
  return descriptions[ruleId] || ruleId;
}

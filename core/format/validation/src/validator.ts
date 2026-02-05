/**
 * Slices Validator - Main validation module
 */

import * as fs from "fs";
import * as path from "path";
import { parseFile, type ParsedFile } from "@slices/parser";
import type { ValidationResult, ValidationRule, ValidationContext, ValidationIssue } from "./lib/types.js";
import { allRules } from "./rules/index.js";

export interface ValidatorOptions {
  /** Rules to run (default: all) */
  rules?: string[];
  /** Rules to skip */
  skipRules?: string[];
  /** Whether to resolve links (requires scanning directory) */
  resolveLinks?: boolean;
}

export class Validator {
  private rules: ValidationRule[];
  private options: ValidatorOptions;

  constructor(options: ValidatorOptions = {}) {
    this.options = options;
    this.rules = this.selectRules(options);
  }

  private selectRules(options: ValidatorOptions): ValidationRule[] {
    let rules = [...allRules];

    // Filter to specific rules if requested
    if (options.rules && options.rules.length > 0) {
      rules = rules.filter((r) => options.rules!.includes(r.id));
    }

    // Remove skipped rules
    if (options.skipRules && options.skipRules.length > 0) {
      rules = rules.filter((r) => !options.skipRules!.includes(r.id));
    }

    return rules;
  }

  /**
   * Validate a single file by path
   */
  validateFile(filePath: string, allFiles?: Map<string, ParsedFile>): ValidationResult {
    const content = fs.readFileSync(filePath, "utf-8");
    return this.validateContent(content, filePath, allFiles, path.dirname(filePath));
  }

  /**
   * Validate file content directly
   */
  validateContent(
    content: string,
    filePath: string,
    allFiles?: Map<string, ParsedFile>,
    directory?: string
  ): ValidationResult {
    const parsed = parseFile(content, filePath);
    return this.validateParsed(parsed, allFiles, directory);
  }

  /**
   * Validate a parsed file
   */
  validateParsed(
    parsed: ParsedFile,
    allFiles?: Map<string, ParsedFile>,
    directory?: string
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Add parse error if any
    if (parsed.parseError) {
      issues.push({
        rule: "parse",
        severity: "error",
        message: parsed.parseError,
        file: parsed.path,
      });
    }

    // Run all rules
    const context: ValidationContext = {
      parsed,
      allFiles,
      directory,
    };

    for (const rule of this.rules) {
      try {
        const ruleIssues = rule.validate(context);
        issues.push(...ruleIssues);
      } catch (e) {
        issues.push({
          rule: rule.id,
          severity: "error",
          message: `Rule threw error: ${e instanceof Error ? e.message : String(e)}`,
          file: parsed.path,
        });
      }
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    return {
      file: parsed.path,
      valid: errorCount === 0,
      errorCount,
      warningCount,
      issues,
    };
  }

  /**
   * Validate all .tt files in a directory
   */
  validateDirectory(dirPath: string): ValidationResult[] {
    const results: ValidationResult[] = [];
    const allFiles = new Map<string, ParsedFile>();

    // First pass: parse all files
    const files = this.findTTFiles(dirPath);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const parsed = parseFile(content, file);
        allFiles.set(file, parsed);
      } catch (e) {
        // File read error - still add to results
        results.push({
          file,
          valid: false,
          errorCount: 1,
          warningCount: 0,
          issues: [
            {
              rule: "read",
              severity: "error",
              message: `Could not read file: ${e instanceof Error ? e.message : String(e)}`,
              file,
            },
          ],
        });
      }
    }

    // Second pass: validate with full context
    for (const [file, parsed] of allFiles) {
      const result = this.validateParsed(parsed, allFiles, dirPath);
      results.push(result);
    }

    return results;
  }

  /**
   * Find all .tt files in a directory recursively
   */
  private findTTFiles(dirPath: string): string[] {
    const files: string[] = [];

    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip hidden directories and node_modules
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            scan(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith(".tt")) {
          files.push(fullPath);
        }
      }
    };

    scan(dirPath);
    return files.sort();
  }
}

/**
 * Quick validate function for simple use cases
 */
export function validate(target: string, options?: ValidatorOptions): ValidationResult[] {
  const validator = new Validator(options);

  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    return validator.validateDirectory(target);
  } else {
    return [validator.validateFile(target)];
  }
}

/**
 * Validate content string directly
 */
export function validateContent(
  content: string,
  filePath: string = "unknown.tt",
  options?: ValidatorOptions
): ValidationResult {
  const validator = new Validator(options);
  return validator.validateContent(content, filePath);
}

/**
 * Rule: link-resolution
 * Validates that links resolve to real files or IDs
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";
import { VALID_RELATIONSHIPS } from "../lib/types.js";
import * as path from "path";
import * as fs from "fs";

// ULID or UUID pattern for ID detection
const ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const linkResolutionRule: ValidationRule = {
  id: "link-resolution",
  name: "Link Resolution",
  description: "Links must resolve to existing files or valid IDs",
  severity: "warning",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed, allFiles, directory } = context;

    // Validate top-level links
    if (parsed.tt?.links && Array.isArray(parsed.tt.links)) {
      for (let i = 0; i < parsed.tt.links.length; i++) {
        const link = parsed.tt.links[i];
        issues.push(...validateLink(link, `tt.links[${i}]`, parsed.path, allFiles, directory));
      }
    }

    // Validate derived_from reference
    if (parsed.tt?.derived_from?.id) {
      issues.push(
        ...validateLinkTarget(parsed.tt.derived_from.id, "tt.derived_from.id", parsed.path, allFiles, directory)
      );
    }

    return issues;
  },
};

function validateLink(
  link: { rel?: string; to?: string },
  fieldPath: string,
  filePath: string,
  allFiles?: Map<string, unknown>,
  directory?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check relationship type
  if (!link.rel) {
    issues.push({
      rule: "link-resolution",
      severity: "error",
      message: `${fieldPath}: Missing required "rel" field`,
      file: filePath,
      context: { field: fieldPath },
    });
  } else {
    const rel = String(link.rel);
    if (!VALID_RELATIONSHIPS.includes(rel as typeof VALID_RELATIONSHIPS[number])) {
      issues.push({
        rule: "link-resolution",
        severity: "warning",
        message: `${fieldPath}: Unknown relationship type "${rel}". Standard types: ${VALID_RELATIONSHIPS.join(", ")}`,
        file: filePath,
        context: { field: fieldPath, rel, valid: VALID_RELATIONSHIPS },
      });
    }
  }

  // Check target
  if (!link.to) {
    issues.push({
      rule: "link-resolution",
      severity: "error",
      message: `${fieldPath}: Missing required "to" field`,
      file: filePath,
      context: { field: fieldPath },
    });
  } else {
    issues.push(...validateLinkTarget(link.to, `${fieldPath}.to`, filePath, allFiles, directory));
  }

  return issues;
}

function validateLinkTarget(
  target: string,
  fieldPath: string,
  filePath: string,
  allFiles?: Map<string, unknown>,
  directory?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const targetStr = String(target);

  // Check if it's a path (starts with ./ or ../ or /)
  if (targetStr.startsWith("./") || targetStr.startsWith("../") || targetStr.startsWith("/")) {
    // It's a path reference
    if (directory) {
      const fileDir = path.dirname(filePath);
      const resolvedPath = path.resolve(fileDir, targetStr);

      // Check if path exists (file or directory)
      try {
        const stat = fs.statSync(resolvedPath);
        // Path exists - that's good
        if (stat.isDirectory() && !targetStr.endsWith("/")) {
          // Optionally warn about directory references without trailing slash
          // (This is more of a style suggestion)
        }
      } catch {
        issues.push({
          rule: "link-resolution",
          severity: "warning",
          message: `${fieldPath}: Path does not exist: "${targetStr}"`,
          file: filePath,
          context: { field: fieldPath, target: targetStr, resolvedPath },
        });
      }
    }
  } else {
    // Assume it's an ID reference
    if (!ID_PATTERN.test(targetStr)) {
      issues.push({
        rule: "link-resolution",
        severity: "warning",
        message: `${fieldPath}: "${targetStr}" doesn't look like a valid ID (ULID/UUID) or path`,
        file: filePath,
        context: { field: fieldPath, target: targetStr },
      });
    } else if (allFiles) {
      // Check if ID exists in known files
      let found = false;
      for (const [, parsed] of allFiles) {
        const p = parsed as { tt?: { id?: string } };
        if (p.tt?.id === targetStr) {
          found = true;
          break;
        }
      }
      if (!found) {
        issues.push({
          rule: "link-resolution",
          severity: "warning",
          message: `${fieldPath}: No file found with ID "${targetStr}"`,
          file: filePath,
          context: { field: fieldPath, target: targetStr },
        });
      }
    }
  }

  return issues;
}

export default linkResolutionRule;

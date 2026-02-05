/**
 * Rule: activation-structure
 * Validates skill activation configuration and resource references
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";

interface Activation {
  triggers?: string[];
  overview?: string;
  limitations?: string;
  connections?: string[];
}

interface ResourceRef {
  run?: string;
  read?: string;
  when?: string;
}

export const activationStructureRule: ValidationRule = {
  id: "activation-structure",
  name: "Activation Structure",
  description: "Validates skill activation configuration and resource references",
  severity: "warning",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    // Only validate files with activation
    const activation = (parsed.tt as any)?.activation as Activation | undefined;
    if (!activation) {
      return issues;
    }

    // Validate triggers
    if (activation.triggers !== undefined) {
      if (!Array.isArray(activation.triggers)) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `activation.triggers must be an array`,
          file: parsed.path,
          context: {},
        });
      } else {
        for (let i = 0; i < activation.triggers.length; i++) {
          if (typeof activation.triggers[i] !== "string") {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `activation.triggers[${i}] must be a string`,
              file: parsed.path,
              context: { index: i },
            });
          }
        }

        if (activation.triggers.length === 0) {
          issues.push({
            rule: this.id,
            severity: "warning",
            message: `activation.triggers is empty. Skills should have at least one trigger.`,
            file: parsed.path,
            context: {},
          });
        }
      }
    } else {
      // Skills should have triggers
      issues.push({
        rule: this.id,
        severity: "warning",
        message: `Skill has activation but no triggers defined`,
        file: parsed.path,
        context: {},
      });
    }

    // Validate overview
    if (activation.overview !== undefined && typeof activation.overview !== "string") {
      issues.push({
        rule: this.id,
        severity: "warning",
        message: `activation.overview should be a string`,
        file: parsed.path,
        context: {},
      });
    }

    // Validate limitations
    if (activation.limitations !== undefined && typeof activation.limitations !== "string") {
      issues.push({
        rule: this.id,
        severity: "warning",
        message: `activation.limitations should be a string`,
        file: parsed.path,
        context: {},
      });
    }

    // Validate connections
    if (activation.connections !== undefined) {
      if (!Array.isArray(activation.connections)) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `activation.connections must be an array`,
          file: parsed.path,
          context: {},
        });
      } else {
        for (let i = 0; i < activation.connections.length; i++) {
          if (typeof activation.connections[i] !== "string") {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `activation.connections[${i}] must be a string`,
              file: parsed.path,
              context: { index: i },
            });
          }
        }
      }
    }

    // Validate routines array if present
    const routines = (parsed.tt as any)?.routines as ResourceRef[] | undefined;
    if (routines !== undefined) {
      if (!Array.isArray(routines)) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `routines must be an array`,
          file: parsed.path,
          context: {},
        });
      } else {
        for (let i = 0; i < routines.length; i++) {
          const ref = routines[i];
          if (!ref.run) {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `routines[${i}]: must have a "run" field with routine ID or path`,
              file: parsed.path,
              context: { index: i },
            });
          }
          if (ref.run !== undefined && typeof ref.run !== "string") {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `routines[${i}].run must be a string`,
              file: parsed.path,
              context: { index: i },
            });
          }
          if (ref.when !== undefined && typeof ref.when !== "string") {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `routines[${i}].when should be a string`,
              file: parsed.path,
              context: { index: i },
            });
          }
        }
      }
    }

    // Validate knowledge array if present
    const knowledge = (parsed.tt as any)?.knowledge as ResourceRef[] | undefined;
    if (knowledge !== undefined) {
      if (!Array.isArray(knowledge)) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `knowledge must be an array`,
          file: parsed.path,
          context: {},
        });
      } else {
        for (let i = 0; i < knowledge.length; i++) {
          const ref = knowledge[i];
          if (!ref.read) {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `knowledge[${i}]: must have a "read" field with file ID or path`,
              file: parsed.path,
              context: { index: i },
            });
          }
          if (ref.read !== undefined && typeof ref.read !== "string") {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `knowledge[${i}].read must be a string`,
              file: parsed.path,
              context: { index: i },
            });
          }
          if (ref.when !== undefined && typeof ref.when !== "string") {
            issues.push({
              rule: this.id,
              severity: "warning",
              message: `knowledge[${i}].when should be a string`,
              file: parsed.path,
              context: { index: i },
            });
          }
        }
      }
    }

    return issues;
  },
};

export default activationStructureRule;

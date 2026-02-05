/**
 * Rule: routine-structure
 * Validates routine body structure and step definitions
 */

import type { ValidationRule, ValidationContext, ValidationIssue } from "../lib/types.js";

interface RoutineStep {
  instruction?: string;
  read?: string;
  run?: string;
  args?: string[];
  note?: string;
}

interface RoutineBody {
  requirements?: string;
  steps?: RoutineStep[];
}

export const routineStructureRule: ValidationRule = {
  id: "routine-structure",
  name: "Routine Structure",
  description: "Validates routine body structure, steps, and references",
  severity: "error",

  validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { parsed } = context;

    // Only validate routine body types
    if (parsed.tt?.body?.type !== "routine") {
      return issues;
    }

    const routineConfig = (parsed.tt.body as any).routine as RoutineBody | undefined;

    // Check routine config exists
    if (!routineConfig) {
      issues.push({
        rule: this.id,
        severity: "error",
        message: `Body type is "routine" but tt.body.routine configuration is missing`,
        file: parsed.path,
        context: {},
      });
      return issues;
    }

    // Check steps array exists and is not empty
    if (!routineConfig.steps || !Array.isArray(routineConfig.steps)) {
      issues.push({
        rule: this.id,
        severity: "error",
        message: `Routine must have a "steps" array`,
        file: parsed.path,
        context: {},
      });
      return issues;
    }

    if (routineConfig.steps.length === 0) {
      issues.push({
        rule: this.id,
        severity: "error",
        message: `Routine must have at least one step`,
        file: parsed.path,
        context: { stepCount: 0 },
      });
      return issues;
    }

    // Validate each step
    for (let i = 0; i < routineConfig.steps.length; i++) {
      const step = routineConfig.steps[i];
      const stepNum = i + 1;

      // Count how many step type fields are present
      const typeFields = ["instruction", "read", "run"].filter(
        (f) => step[f as keyof RoutineStep] !== undefined
      );

      if (typeFields.length === 0) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Step ${stepNum}: Must have one of "instruction", "read", or "run"`,
          file: parsed.path,
          context: { step: stepNum },
        });
      } else if (typeFields.length > 1) {
        issues.push({
          rule: this.id,
          severity: "error",
          message: `Step ${stepNum}: Has multiple type fields (${typeFields.join(", ")}). Each step should have exactly one.`,
          file: parsed.path,
          context: { step: stepNum, fields: typeFields },
        });
      }

      // Validate instruction steps
      if (step.instruction !== undefined) {
        if (typeof step.instruction !== "string" || step.instruction.trim().length === 0) {
          issues.push({
            rule: this.id,
            severity: "error",
            message: `Step ${stepNum}: instruction must be a non-empty string`,
            file: parsed.path,
            context: { step: stepNum },
          });
        }
      }

      // Validate read steps
      if (step.read !== undefined) {
        if (typeof step.read !== "string" || step.read.trim().length === 0) {
          issues.push({
            rule: this.id,
            severity: "error",
            message: `Step ${stepNum}: read must be a non-empty string (ID or path)`,
            file: parsed.path,
            context: { step: stepNum },
          });
        }
      }

      // Validate run steps
      if (step.run !== undefined) {
        if (typeof step.run !== "string" || step.run.trim().length === 0) {
          issues.push({
            rule: this.id,
            severity: "error",
            message: `Step ${stepNum}: run must be a non-empty string (ID or path)`,
            file: parsed.path,
            context: { step: stepNum },
          });
        }

        // Validate args if present
        if (step.args !== undefined) {
          if (!Array.isArray(step.args)) {
            issues.push({
              rule: this.id,
              severity: "error",
              message: `Step ${stepNum}: args must be an array`,
              file: parsed.path,
              context: { step: stepNum },
            });
          } else {
            for (let j = 0; j < step.args.length; j++) {
              if (typeof step.args[j] !== "string") {
                issues.push({
                  rule: this.id,
                  severity: "error",
                  message: `Step ${stepNum}: args[${j}] must be a string`,
                  file: parsed.path,
                  context: { step: stepNum, argIndex: j },
                });
              }
            }
          }
        }
      }

      // Validate note if present
      if (step.note !== undefined && typeof step.note !== "string") {
        issues.push({
          rule: this.id,
          severity: "warning",
          message: `Step ${stepNum}: note should be a string`,
          file: parsed.path,
          context: { step: stepNum },
        });
      }
    }

    // Validate requirements if present
    if (routineConfig.requirements !== undefined) {
      if (typeof routineConfig.requirements !== "string") {
        issues.push({
          rule: this.id,
          severity: "warning",
          message: `Routine requirements should be a string`,
          file: parsed.path,
          context: {},
        });
      }
    }

    return issues;
  },
};

export default routineStructureRule;

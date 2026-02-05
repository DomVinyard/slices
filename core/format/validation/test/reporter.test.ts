/**
 * Reporter tests
 */

import { describe, test, expect } from "bun:test";
import { formatResults } from "../src/lib/reporter.js";
import type { ValidationResult } from "../src/lib/types.js";

describe("formatResults", () => {
  const sampleResults: ValidationResult[] = [
    {
      file: "/path/to/valid.tt",
      valid: true,
      errorCount: 0,
      warningCount: 0,
      issues: [],
    },
    {
      file: "/path/to/invalid.tt",
      valid: false,
      errorCount: 2,
      warningCount: 1,
      issues: [
        {
          rule: "required-fields",
          severity: "error",
          message: "Missing required field: tt.id",
          file: "/path/to/invalid.tt",
        },
        {
          rule: "required-fields",
          severity: "error",
          message: "Missing required field: tt.summary",
          file: "/path/to/invalid.tt",
        },
        {
          rule: "ulid-format",
          severity: "warning",
          message: "tt.id is a UUID. ULID is preferred.",
          file: "/path/to/invalid.tt",
          line: 3,
        },
      ],
    },
  ];

  describe("terminal format", () => {
    test("outputs human-readable format", () => {
      const output = formatResults(sampleResults, { format: "terminal", color: false });

      expect(output).toContain("invalid.tt");
      expect(output).toContain("Missing required field: tt.id");
      expect(output).toContain("error");
      expect(output).toContain("warning");
      expect(output).toContain("2 errors");
      expect(output).toContain("1 warning");
    });

    test("shows success message for valid files", () => {
      const output = formatResults(
        [{ file: "test.tt", valid: true, errorCount: 0, warningCount: 0, issues: [] }],
        { format: "terminal", color: false }
      );

      expect(output).toContain("All files valid");
    });

    test("includes line numbers when available", () => {
      const output = formatResults(sampleResults, { format: "terminal", color: false });

      expect(output).toContain(":3");
    });
  });

  describe("JSON format", () => {
    test("outputs valid JSON", () => {
      const output = formatResults(sampleResults, { format: "json" });
      const parsed = JSON.parse(output);

      expect(parsed).toBeDefined();
      expect(parsed.valid).toBe(false);
      expect(parsed.totalErrors).toBe(2);
      expect(parsed.totalWarnings).toBe(1);
      expect(parsed.files).toHaveLength(2);
    });

    test("includes all issues", () => {
      const output = formatResults(sampleResults, { format: "json" });
      const parsed = JSON.parse(output);

      const invalidFile = parsed.files.find((f: { file: string }) => f.file.includes("invalid"));
      expect(invalidFile.issues).toHaveLength(3);
    });
  });

  describe("SARIF format", () => {
    test("outputs valid SARIF", () => {
      const output = formatResults(sampleResults, { format: "sarif" });
      const parsed = JSON.parse(output);

      expect(parsed.$schema).toContain("sarif");
      expect(parsed.version).toBe("2.1.0");
      expect(parsed.runs).toHaveLength(1);
    });

    test("includes tool information", () => {
      const output = formatResults(sampleResults, { format: "sarif" });
      const parsed = JSON.parse(output);

      expect(parsed.runs[0].tool.driver.name).toBe("@treetext/validator");
    });

    test("includes all results", () => {
      const output = formatResults(sampleResults, { format: "sarif" });
      const parsed = JSON.parse(output);

      expect(parsed.runs[0].results).toHaveLength(3);
    });

    test("maps severity correctly", () => {
      const output = formatResults(sampleResults, { format: "sarif" });
      const parsed = JSON.parse(output);

      const errors = parsed.runs[0].results.filter((r: { level: string }) => r.level === "error");
      const warnings = parsed.runs[0].results.filter((r: { level: string }) => r.level === "warning");

      expect(errors).toHaveLength(2);
      expect(warnings).toHaveLength(1);
    });
  });
});

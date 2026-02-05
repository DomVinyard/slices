/**
 * Validator integration tests
 */

import { describe, test, expect } from "bun:test";
import * as path from "path";
import { Validator, validate, validateContent } from "../src/validator.js";

const fixturesDir = path.join(import.meta.dir, "fixtures");

describe("validateContent", () => {
  test("validates minimal valid file", () => {
    const content = `---
tt:
  v: "1"
  id: 01JTEST0000000000000000000
  title: "Test"
  summary: "A test file"
  body:
    type: markdown
---

Content.
`;

    const result = validateContent(content, "test.tt");

    expect(result.valid).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });
});

describe("Validator with options", () => {
  test("runs only specified rules", () => {
    const content = `---
tt:
  v: "1"
  title: "Test"
---
`;

    const validator = new Validator({ rules: ["ulid-format"] });
    const result = validator.validateContent(content, "test.tt");

    // Should not have required-fields errors because we only run ulid-format
    const requiredFieldsIssues = result.issues.filter((i) => i.rule === "required-fields");
    expect(requiredFieldsIssues).toHaveLength(0);
  });

  test("skips specified rules", () => {
    const content = `---
tt:
  v: "1"
  id: invalid-id
  title: "Test"
  summary: "Test"
  body:
    type: markdown
---
`;

    const validator = new Validator({ skipRules: ["ulid-format"] });
    const result = validator.validateContent(content, "test.tt");

    const ulidIssues = result.issues.filter((i) => i.rule === "ulid-format");
    expect(ulidIssues).toHaveLength(0);
  });
});

describe("validate function", () => {
  test("validates directory", () => {
    const results = validate(fixturesDir);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Check that both valid and invalid files are processed
    const validMinimal = results.find((r) => r.file.includes("valid-minimal"));
    const invalidMissing = results.find((r) => r.file.includes("invalid-missing"));

    expect(validMinimal).toBeDefined();
    expect(validMinimal?.valid).toBe(true);

    expect(invalidMissing).toBeDefined();
    expect(invalidMissing?.valid).toBe(false);
  });

  test("validates single file", () => {
    const results = validate(path.join(fixturesDir, "valid-minimal.tt"));

    expect(results).toHaveLength(1);
    expect(results[0].valid).toBe(true);
  });
});

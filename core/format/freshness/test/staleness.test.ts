/**
 * Tests for hash-based staleness detection.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  checkStaleness,
  checkAllStaleness,
  checkStalenessById,
  isStale,
  isFresh,
} from "../src/lib/staleness";
import { computeHash } from "../src/lib/hash";
import { findDerivedFiles, findFileById } from "../src/lib/derived-finder";

describe("staleness detection", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "staleness-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createSourceFile(id: string, body: string): string {
    const filePath = path.join(tempDir, `${id}.tt`);
    fs.writeFileSync(filePath, `---
tt:
  v: "1"
  id: ${id}
  title: "Source File"
  summary: "Test source"
  kind: context
  body:
    type: markdown
---

${body}
`);
    return filePath;
  }

  function createDerivedFile(id: string, sourceId: string, sourceHash: string): string {
    const filePath = path.join(tempDir, `${id}.tt`);
    fs.writeFileSync(filePath, `---
tt:
  v: "1"
  id: ${id}
  title: "Derived File"
  summary: "Test derived"
  kind: context
  body:
    type: markdown
  derived_from:
    id: ${sourceId}
    hash: ${sourceHash}
  links:
    - rel: derived_from
      to: ${sourceId}
---

Derived content.
`);
    return filePath;
  }

  describe("findDerivedFiles", () => {
    it("finds files with derived_from metadata", async () => {
      createSourceFile("SOURCE1", "Source content");
      createDerivedFile("DERIVED1", "SOURCE1", "sha256:abc123");

      const derivedFiles = await findDerivedFiles(tempDir);

      expect(derivedFiles.length).toBe(1);
      expect(derivedFiles[0].sourceId).toBe("SOURCE1");
      expect(derivedFiles[0].storedHash).toBe("sha256:abc123");
    });

    it("excludes files without derived_from", async () => {
      createSourceFile("SOURCE1", "Source content");
      createSourceFile("SOURCE2", "Another source");

      const derivedFiles = await findDerivedFiles(tempDir);

      expect(derivedFiles.length).toBe(0);
    });

    it("handles empty directory", async () => {
      const derivedFiles = await findDerivedFiles(tempDir);

      expect(derivedFiles).toEqual([]);
    });
  });

  describe("findFileById", () => {
    it("finds file by ID", async () => {
      createSourceFile("SOURCE1", "Content here");

      const file = await findFileById(tempDir, "SOURCE1");

      expect(file).not.toBeNull();
      expect(file?.tt?.id).toBe("SOURCE1");
    });

    it("returns null for non-existent ID", async () => {
      const file = await findFileById(tempDir, "NONEXISTENT");

      expect(file).toBeNull();
    });
  });

  describe("checkStaleness", () => {
    it("returns fresh when hashes match", async () => {
      const sourceBody = "This is the source content.";
      createSourceFile("SOURCE1", sourceBody);

      // Get the file and compute hash from its actual body
      const sourceFile = await findFileById(tempDir, "SOURCE1");
      const bodyHash = computeHash(sourceFile!.body);
      createDerivedFile("DERIVED1", "SOURCE1", bodyHash.formatted);

      const derivedFiles = await findDerivedFiles(tempDir);
      const result = await checkStaleness(derivedFiles[0], tempDir);

      expect(isFresh(result)).toBe(true);
      expect(isStale(result)).toBe(false);
    });

    it("returns stale with hash_mismatch when source changed", async () => {
      createSourceFile("SOURCE1", "Original content");
      // Use a properly formatted but wrong hash
      createDerivedFile("DERIVED1", "SOURCE1", "sha256:0000000000000000000000000000000000000000000000000000000000000000");

      const derivedFiles = await findDerivedFiles(tempDir);
      const result = await checkStaleness(derivedFiles[0], tempDir);

      expect(isStale(result)).toBe(true);
      if (isStale(result)) {
        expect(result.reason).toBe("hash_mismatch");
        expect(result.source).toBeDefined();
        expect(result.currentHash).toBeDefined();
        expect(result.description).toContain("Source content changed");
      }
    });

    it("returns stale with source_not_found when source missing", async () => {
      createDerivedFile("DERIVED1", "MISSING_SOURCE", "sha256:abc123def456000000000000000000000000000000000000000000000000");

      const derivedFiles = await findDerivedFiles(tempDir);
      const result = await checkStaleness(derivedFiles[0], tempDir);

      expect(isStale(result)).toBe(true);
      if (isStale(result)) {
        expect(result.reason).toBe("source_not_found");
        expect(result.description).toContain("Source file not found");
      }
    });

    it("returns stale with invalid_hash for malformed hash", async () => {
      createSourceFile("SOURCE1", "Content");
      createDerivedFile("DERIVED1", "SOURCE1", "not-a-valid-hash");

      const derivedFiles = await findDerivedFiles(tempDir);
      const result = await checkStaleness(derivedFiles[0], tempDir);

      expect(isStale(result)).toBe(true);
      if (isStale(result)) {
        expect(result.reason).toBe("invalid_hash");
        expect(result.description).toContain("Invalid hash format");
      }
    });
  });

  describe("checkAllStaleness", () => {
    it("returns report for all derived files", async () => {
      const body1 = "Source one content";
      const body2 = "Source two content";

      createSourceFile("SOURCE1", body1);
      createSourceFile("SOURCE2", body2);

      // Get actual file bodies and compute hashes
      const source1 = await findFileById(tempDir, "SOURCE1");
      const source2 = await findFileById(tempDir, "SOURCE2");
      const hash1 = computeHash(source1!.body);
      const hash2 = computeHash(source2!.body);

      createDerivedFile("DERIVED1", "SOURCE1", hash1.formatted);
      createDerivedFile("DERIVED2", "SOURCE2", hash2.formatted);

      const report = await checkAllStaleness(tempDir);

      expect(report.totalChecked).toBe(2);
      expect(report.fresh.length).toBe(2);
      expect(report.stale.length).toBe(0);
      expect(report.stats.freshCount).toBe(2);
      expect(report.stats.staleCount).toBe(0);
    });

    it("categorizes mixed fresh and stale files", async () => {
      const body = "Fresh source content";
      createSourceFile("SOURCE1", body);
      createSourceFile("SOURCE2", "Different content");

      const source1 = await findFileById(tempDir, "SOURCE1");
      const hash = computeHash(source1!.body);
      createDerivedFile("DERIVED1", "SOURCE1", hash.formatted);
      createDerivedFile("DERIVED2", "SOURCE2", "sha256:0000000000000000000000000000000000000000000000000000000000000000");

      const report = await checkAllStaleness(tempDir);

      expect(report.totalChecked).toBe(2);
      expect(report.fresh.length).toBe(1);
      expect(report.stale.length).toBe(1);
      expect(report.stats.hashMismatchCount).toBe(1);
    });

    it("counts source_not_found separately", async () => {
      createDerivedFile("DERIVED1", "MISSING1", "sha256:abc1230000000000000000000000000000000000000000000000000000000000");
      createDerivedFile("DERIVED2", "MISSING2", "sha256:def4560000000000000000000000000000000000000000000000000000000000");

      const report = await checkAllStaleness(tempDir);

      expect(report.stats.sourceNotFoundCount).toBe(2);
      expect(report.stats.hashMismatchCount).toBe(0);
    });

    it("handles directory with no derived files", async () => {
      createSourceFile("SOURCE1", "Just a source");
      createSourceFile("SOURCE2", "Another source");

      const report = await checkAllStaleness(tempDir);

      expect(report.totalChecked).toBe(0);
      expect(report.fresh.length).toBe(0);
      expect(report.stale.length).toBe(0);
    });
  });

  describe("checkStalenessById", () => {
    it("finds and checks specific derived file", async () => {
      const body = "Source content";
      createSourceFile("SOURCE1", body);

      const source = await findFileById(tempDir, "SOURCE1");
      const hash = computeHash(source!.body);
      createDerivedFile("DERIVED1", "SOURCE1", hash.formatted);

      const result = await checkStalenessById(tempDir, "DERIVED1");

      expect(result).not.toBeNull();
      expect(isFresh(result!)).toBe(true);
    });

    it("returns null for non-existent derived file", async () => {
      const result = await checkStalenessById(tempDir, "NONEXISTENT");

      expect(result).toBeNull();
    });

    it("returns null for non-derived file", async () => {
      createSourceFile("SOURCE1", "Just a source");

      const result = await checkStalenessById(tempDir, "SOURCE1");

      expect(result).toBeNull();
    });
  });

  // Note: type guard tests (isStale/isFresh) removed - they're already exercised in checkStaleness tests above
});

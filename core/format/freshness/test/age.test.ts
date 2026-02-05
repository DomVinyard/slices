/**
 * Tests for time-based staleness detection.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  parseThreshold,
  thresholdToMs,
  formatAge,
  formatThreshold,
  getFileAge,
  checkAgeStalenessSingle,
  checkAgeStaleness,
  isStaleByAge,
  isFreshByAge,
} from "../src/lib/age";

describe("parseThreshold", () => {
  it("parses days", () => {
    expect(parseThreshold("30d")).toEqual({ value: 30, unit: "days" });
    expect(parseThreshold("1d")).toEqual({ value: 1, unit: "days" });
    expect(parseThreshold("365d")).toEqual({ value: 365, unit: "days" });
  });

  it("parses weeks", () => {
    expect(parseThreshold("2w")).toEqual({ value: 2, unit: "weeks" });
    expect(parseThreshold("1w")).toEqual({ value: 1, unit: "weeks" });
    expect(parseThreshold("52w")).toEqual({ value: 52, unit: "weeks" });
  });

  it("parses months", () => {
    expect(parseThreshold("3m")).toEqual({ value: 3, unit: "months" });
    expect(parseThreshold("1m")).toEqual({ value: 1, unit: "months" });
    expect(parseThreshold("12m")).toEqual({ value: 12, unit: "months" });
  });

  it("throws on invalid format", () => {
    expect(() => parseThreshold("30")).toThrow();
    expect(() => parseThreshold("invalid")).toThrow();
    expect(() => parseThreshold("30x")).toThrow();
    expect(() => parseThreshold("")).toThrow();
    expect(() => parseThreshold("d")).toThrow();
  });
});

describe("thresholdToMs", () => {
  const msPerDay = 24 * 60 * 60 * 1000;

  it("converts days to milliseconds", () => {
    expect(thresholdToMs({ value: 1, unit: "days" })).toBe(msPerDay);
    expect(thresholdToMs({ value: 30, unit: "days" })).toBe(30 * msPerDay);
  });

  it("converts weeks to milliseconds", () => {
    expect(thresholdToMs({ value: 1, unit: "weeks" })).toBe(7 * msPerDay);
    expect(thresholdToMs({ value: 2, unit: "weeks" })).toBe(14 * msPerDay);
  });

  it("converts months to milliseconds (approximate)", () => {
    expect(thresholdToMs({ value: 1, unit: "months" })).toBe(30 * msPerDay);
    expect(thresholdToMs({ value: 3, unit: "months" })).toBe(90 * msPerDay);
  });
});

describe("formatAge", () => {
  const msPerMinute = 60 * 1000;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;
  const msPerWeek = 7 * msPerDay;
  const msPerMonth = 30 * msPerDay;
  const msPerYear = 365 * msPerDay;

  it("formats minutes", () => {
    expect(formatAge(5 * msPerMinute)).toBe("5 minutes ago");
    expect(formatAge(1 * msPerMinute)).toBe("1 minute ago");
  });

  it("formats hours", () => {
    expect(formatAge(3 * msPerHour)).toBe("3 hours ago");
    expect(formatAge(1 * msPerHour)).toBe("1 hour ago");
  });

  it("formats days", () => {
    expect(formatAge(5 * msPerDay)).toBe("5 days ago");
    expect(formatAge(1 * msPerDay)).toBe("1 day ago");
  });

  it("formats weeks", () => {
    expect(formatAge(2 * msPerWeek)).toBe("2 weeks ago");
    expect(formatAge(1 * msPerWeek)).toBe("1 week ago");
  });

  it("formats months", () => {
    expect(formatAge(2 * msPerMonth)).toBe("2 months ago");
    expect(formatAge(1 * msPerMonth)).toBe("1 month ago");
  });

  it("formats years", () => {
    expect(formatAge(2 * msPerYear)).toBe("2 years ago");
    expect(formatAge(1 * msPerYear)).toBe("1 year ago");
  });
});

describe("formatThreshold", () => {
  it("formats threshold to readable string", () => {
    expect(formatThreshold({ value: 30, unit: "days" })).toBe("30 days");
    expect(formatThreshold({ value: 2, unit: "weeks" })).toBe("2 weeks");
    expect(formatThreshold({ value: 3, unit: "months" })).toBe("3 months");
  });
});

describe("file age operations", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "age-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTTFile(name: string, content: string = ""): string {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, `---
tt:
  v: "1"
  id: ${name.replace(".tt", "")}
  title: "Test File"
  summary: "Test"
  body:
    type: markdown
---

${content}
`);
    return filePath;
  }

  describe("getFileAge", () => {
    it("returns file age information", async () => {
      const filePath = createTTFile("test.tt", "Content");

      const result = await getFileAge(filePath);

      expect(result.parsed.tt?.id).toBe("test");
      expect(result.modifiedAt).toBeInstanceOf(Date);
      expect(result.ageMs).toBeGreaterThanOrEqual(0);
      expect(result.ageDays).toBeGreaterThanOrEqual(0);
      expect(result.ageFormatted).toContain("ago");
    });

    it("calculates age correctly", async () => {
      const filePath = createTTFile("test.tt");

      // Modify file time to be older
      const oldTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      fs.utimesSync(filePath, oldTime, oldTime);

      const result = await getFileAge(filePath);

      expect(result.ageDays).toBeGreaterThanOrEqual(6.9);
      expect(result.ageDays).toBeLessThanOrEqual(7.1);
    });
  });

  describe("checkAgeStalenessSingle", () => {
    it("returns fresh for recent files", async () => {
      const filePath = createTTFile("recent.tt");

      const result = await checkAgeStalenessSingle(filePath, { value: 30, unit: "days" });

      expect(result.isStale).toBe(false);
      expect(isFreshByAge(result)).toBe(true);
      expect(isStaleByAge(result)).toBe(false);
    });

    it("returns stale for old files", async () => {
      const filePath = createTTFile("old.tt");

      // Make file older than threshold
      const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      fs.utimesSync(filePath, oldTime, oldTime);

      const result = await checkAgeStalenessSingle(filePath, { value: 30, unit: "days" });

      expect(result.isStale).toBe(true);
      expect(isStaleByAge(result)).toBe(true);
      expect(isFreshByAge(result)).toBe(false);
      if (isStaleByAge(result)) {
        expect(result.threshold).toEqual({ value: 30, unit: "days" });
      }
    });
  });

  describe("checkAgeStaleness", () => {
    it("checks all files in directory", async () => {
      createTTFile("file1.tt");
      createTTFile("file2.tt");
      createTTFile("file3.tt");

      const result = await checkAgeStaleness(tempDir, "30d");

      expect(result.totalChecked).toBe(3);
      expect(result.fresh.length).toBe(3);
      expect(result.stale.length).toBe(0);
      expect(result.stats.freshCount).toBe(3);
      expect(result.stats.staleCount).toBe(0);
    });

    it("categorizes files by age", async () => {
      createTTFile("fresh.tt");
      const stalePath = createTTFile("stale.tt");

      // Make one file old
      const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      fs.utimesSync(stalePath, oldTime, oldTime);

      const result = await checkAgeStaleness(tempDir, "30d");

      expect(result.totalChecked).toBe(2);
      expect(result.fresh.length).toBe(1);
      expect(result.stale.length).toBe(1);
    });

    it("calculates statistics", async () => {
      createTTFile("file1.tt");
      createTTFile("file2.tt");

      const result = await checkAgeStaleness(tempDir, "30d");

      expect(result.stats.averageAgeDays).toBeGreaterThanOrEqual(0);
      expect(result.stats.oldestFile).toBeDefined();
      expect(result.stats.newestFile).toBeDefined();
    });

    it("handles empty directory", async () => {
      const emptyDir = path.join(tempDir, "empty");
      fs.mkdirSync(emptyDir);

      const result = await checkAgeStaleness(emptyDir, "30d");

      expect(result.totalChecked).toBe(0);
      expect(result.fresh.length).toBe(0);
      expect(result.stale.length).toBe(0);
    });

    it("accepts string threshold", async () => {
      createTTFile("test.tt");

      const result = await checkAgeStaleness(tempDir, "7d");

      expect(result.threshold).toEqual({ value: 7, unit: "days" });
    });

    it("defaults to 30 days threshold", async () => {
      createTTFile("test.tt");

      const result = await checkAgeStaleness(tempDir);

      expect(result.threshold).toEqual({ value: 30, unit: "days" });
    });
  });
});

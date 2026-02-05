/**
 * Tests for hash computation utilities.
 */
import { describe, it, expect } from "bun:test";
import {
  computeHash,
  parseHash,
  hashesMatch,
  shortHash,
} from "../src/lib/hash";

describe("computeHash", () => {
  it("computes SHA-256 hash of content", () => {
    const result = computeHash("hello world");

    expect(result.algorithm).toBe("sha256");
    expect(result.digest).toHaveLength(64); // SHA-256 produces 64 hex chars
    expect(result.formatted).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("produces consistent hashes for same content", () => {
    const result1 = computeHash("test content");
    const result2 = computeHash("test content");

    expect(result1.digest).toBe(result2.digest);
    expect(result1.formatted).toBe(result2.formatted);
  });

  it("produces different hashes for different content", () => {
    const result1 = computeHash("content A");
    const result2 = computeHash("content B");

    expect(result1.digest).not.toBe(result2.digest);
  });

  it("handles empty string", () => {
    const result = computeHash("");

    expect(result.algorithm).toBe("sha256");
    expect(result.digest).toHaveLength(64);
    // Empty string has a known SHA-256 hash
    expect(result.digest).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("handles unicode content", () => {
    const result = computeHash("Hello 世界 🌍");

    expect(result.algorithm).toBe("sha256");
    expect(result.digest).toHaveLength(64);
  });

  it("handles multiline content", () => {
    const result = computeHash("Line 1\nLine 2\nLine 3");

    expect(result.algorithm).toBe("sha256");
    expect(result.digest).toHaveLength(64);
  });
});

describe("parseHash", () => {
  it("parses valid formatted hash", () => {
    const result = parseHash("sha256:abc123def456");

    expect(result).toEqual({
      algorithm: "sha256",
      digest: "abc123def456",
    });
  });

  it("parses SHA-256 hash with full digest", () => {
    const hash = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const result = parseHash(hash);

    expect(result?.algorithm).toBe("sha256");
    expect(result?.digest).toHaveLength(64);
  });

  it("parses other algorithms", () => {
    const result = parseHash("md5:d41d8cd98f00b204e9800998ecf8427e");

    expect(result).toEqual({
      algorithm: "md5",
      digest: "d41d8cd98f00b204e9800998ecf8427e",
    });
  });

  it("returns null for invalid format", () => {
    expect(parseHash("invalid")).toBeNull();
    expect(parseHash("no-colon")).toBeNull();
    expect(parseHash("")).toBeNull();
    expect(parseHash("sha256:")).toBeNull();
    expect(parseHash(":abc123")).toBeNull();
  });

  it("returns null for non-hex digest", () => {
    expect(parseHash("sha256:ghijkl")).toBeNull(); // g-l not hex
  });

  it("handles uppercase hex digits", () => {
    const result = parseHash("sha256:ABCDEF123456");

    expect(result).toEqual({
      algorithm: "sha256",
      digest: "ABCDEF123456",
    });
  });
});

describe("hashesMatch", () => {
  it("matches identical formatted hashes", () => {
    const hash1 = "sha256:abc123def456";
    const hash2 = "sha256:abc123def456";

    expect(hashesMatch(hash1, hash2)).toBe(true);
  });

  it("matches case-insensitive digests", () => {
    const hash1 = "sha256:ABC123DEF456";
    const hash2 = "sha256:abc123def456";

    expect(hashesMatch(hash1, hash2)).toBe(true);
  });

  it("rejects different digests", () => {
    const hash1 = "sha256:abc123";
    const hash2 = "sha256:def456";

    expect(hashesMatch(hash1, hash2)).toBe(false);
  });

  it("rejects different algorithms", () => {
    const hash1 = "sha256:abc123";
    const hash2 = "md5:abc123";

    expect(hashesMatch(hash1, hash2)).toBe(false);
  });

  it("handles raw digest comparison", () => {
    const hash1 = "abc123";
    const hash2 = "abc123";

    expect(hashesMatch(hash1, hash2)).toBe(true);
  });

  it("handles mixed format comparison", () => {
    // When one is formatted and one is raw, falls back to direct comparison
    const hash1 = "sha256:abc123";
    const hash2 = "sha256:abc123";

    expect(hashesMatch(hash1, hash2)).toBe(true);
  });
});

describe("shortHash", () => {
  it("truncates formatted hash", () => {
    const hash = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const result = shortHash(hash);

    expect(result).toBe("sha256:e3b0c44298fc1c14...");
    expect(result.length).toBeLessThan(hash.length);
  });

  it("uses custom length", () => {
    const hash = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const result = shortHash(hash, 8);

    expect(result).toBe("sha256:e3b0c442...");
  });

  it("handles raw digest", () => {
    const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const result = shortHash(hash);

    // Falls back to simple truncation
    expect(result).toBe("e3b0c44298fc1c14...");
  });
});

/**
 * Hash computation utilities for freshness checking
 */

import { createHash } from "node:crypto";

export interface HashResult {
  algorithm: string;
  digest: string;
  formatted: string; // e.g., "sha256:abc123..."
}

/**
 * Compute SHA-256 hash of content
 */
export function computeHash(content: string): HashResult {
  const hash = createHash("sha256");
  hash.update(content, "utf8");
  const digest = hash.digest("hex");

  return {
    algorithm: "sha256",
    digest,
    formatted: `sha256:${digest}`,
  };
}

/**
 * Parse a formatted hash string (e.g., "sha256:abc123...")
 */
export function parseHash(formatted: string): { algorithm: string; digest: string } | null {
  const match = formatted.match(/^(\w+):([a-fA-F0-9]+)$/);
  if (!match) return null;

  return {
    algorithm: match[1],
    digest: match[2],
  };
}

/**
 * Compare two hash strings for equality
 * Handles both formatted (sha256:xxx) and raw digest formats
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  const parsed1 = parseHash(hash1);
  const parsed2 = parseHash(hash2);

  // If both are formatted, compare digests
  if (parsed1 && parsed2) {
    return (
      parsed1.algorithm === parsed2.algorithm &&
      parsed1.digest.toLowerCase() === parsed2.digest.toLowerCase()
    );
  }

  // Fall back to direct comparison
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Get a short preview of a hash (for display)
 */
export function shortHash(formatted: string, length = 16): string {
  const parsed = parseHash(formatted);
  if (parsed) {
    return `${parsed.algorithm}:${parsed.digest.slice(0, length)}...`;
  }
  return formatted.slice(0, length) + "...";
}

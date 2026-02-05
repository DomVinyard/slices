/**
 * Staleness detection for derived files
 */

import { computeHash, hashesMatch, shortHash, parseHash } from "./hash.js";
import {
  findDerivedFiles,
  findFileById,
  type DerivedFile,
} from "./derived-finder.js";
import type { ParsedFile } from "@slices/parser";

export type StalenessReason =
  | "hash_mismatch" // Source content has changed
  | "source_not_found" // Source file no longer exists
  | "invalid_hash"; // Stored hash is malformed

export interface StaleFile {
  /** The derived file */
  derived: DerivedFile;
  /** Why the file is stale */
  reason: StalenessReason;
  /** The source file (if found) */
  source?: ParsedFile;
  /** Current hash of source (if computed) */
  currentHash?: string;
  /** Human-readable description */
  description: string;
}

export interface FreshFile {
  /** The derived file */
  derived: DerivedFile;
  /** The source file */
  source: ParsedFile;
  /** Current hash of source */
  currentHash: string;
}

export interface FreshnessReport {
  /** Files that are stale and need regeneration */
  stale: StaleFile[];
  /** Files that are fresh (up to date) */
  fresh: FreshFile[];
  /** Total derived files checked */
  totalChecked: number;
  /** Summary stats */
  stats: {
    staleCount: number;
    freshCount: number;
    sourceNotFoundCount: number;
    hashMismatchCount: number;
  };
}

/**
 * Check a single derived file for staleness
 */
export async function checkStaleness(
  derived: DerivedFile,
  ttDir: string
): Promise<StaleFile | FreshFile> {
  // Validate stored hash format
  const parsedStoredHash = parseHash(derived.storedHash);
  if (!parsedStoredHash) {
    return {
      derived,
      reason: "invalid_hash",
      description: `Invalid hash format: ${derived.storedHash}`,
    };
  }

  // Find the source file
  const source = await findFileById(ttDir, derived.sourceId);

  if (!source) {
    return {
      derived,
      reason: "source_not_found",
      description: `Source file not found: ${derived.sourceId}`,
    };
  }

  // Compute current hash of source body
  const currentHashResult = computeHash(source.body);

  // Compare hashes
  if (!hashesMatch(derived.storedHash, currentHashResult.formatted)) {
    return {
      derived,
      source,
      reason: "hash_mismatch",
      currentHash: currentHashResult.formatted,
      description: `Source content changed. Stored: ${shortHash(derived.storedHash)}, Current: ${shortHash(currentHashResult.formatted)}`,
    };
  }

  // File is fresh
  return {
    derived,
    source,
    currentHash: currentHashResult.formatted,
  };
}

/**
 * Check all derived files in a directory for staleness
 */
export async function checkAllStaleness(ttDir: string): Promise<FreshnessReport> {
  const derivedFiles = await findDerivedFiles(ttDir);

  const stale: StaleFile[] = [];
  const fresh: FreshFile[] = [];

  for (const derived of derivedFiles) {
    const result = await checkStaleness(derived, ttDir);

    if ("reason" in result) {
      stale.push(result);
    } else {
      fresh.push(result);
    }
  }

  return {
    stale,
    fresh,
    totalChecked: derivedFiles.length,
    stats: {
      staleCount: stale.length,
      freshCount: fresh.length,
      sourceNotFoundCount: stale.filter((s) => s.reason === "source_not_found")
        .length,
      hashMismatchCount: stale.filter((s) => s.reason === "hash_mismatch")
        .length,
    },
  };
}

/**
 * Check staleness for a specific derived file by ID
 */
export async function checkStalenessById(
  ttDir: string,
  derivedId: string
): Promise<StaleFile | FreshFile | null> {
  const derivedFiles = await findDerivedFiles(ttDir);
  const derived = derivedFiles.find((d) => d.parsed.tt?.id === derivedId);

  if (!derived) {
    return null;
  }

  return checkStaleness(derived, ttDir);
}

/**
 * Type guard to check if a result is stale
 */
export function isStale(
  result: StaleFile | FreshFile
): result is StaleFile {
  return "reason" in result;
}

/**
 * Type guard to check if a result is fresh
 */
export function isFresh(
  result: StaleFile | FreshFile
): result is FreshFile {
  return !("reason" in result);
}

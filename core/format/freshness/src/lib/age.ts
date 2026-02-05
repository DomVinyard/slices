/**
 * Time-based staleness detection for Slices files
 *
 * Complements hash-based staleness by detecting files that haven't been
 * updated in a while, regardless of whether source content has changed.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { parseFile, type ParsedFile } from "@slices/parser";

export interface AgeThreshold {
  /** Number of units */
  value: number;
  /** Unit of time */
  unit: "days" | "weeks" | "months";
}

export interface FileAge {
  /** Parsed file data */
  parsed: ParsedFile;
  /** File modification time */
  modifiedAt: Date;
  /** Age in milliseconds */
  ageMs: number;
  /** Age in days */
  ageDays: number;
  /** Human-readable age string */
  ageFormatted: string;
}

export interface StaleByAge extends FileAge {
  /** The threshold that was exceeded */
  threshold: AgeThreshold;
  /** Whether file is considered stale by age */
  isStale: true;
}

export interface FreshByAge extends FileAge {
  /** Whether file is considered stale by age */
  isStale: false;
}

export interface AgeReport {
  /** Files that are stale by age */
  stale: StaleByAge[];
  /** Files that are fresh by age */
  fresh: FreshByAge[];
  /** Total files checked */
  totalChecked: number;
  /** Threshold used */
  threshold: AgeThreshold;
  /** Summary stats */
  stats: {
    staleCount: number;
    freshCount: number;
    oldestFile?: FileAge;
    newestFile?: FileAge;
    averageAgeDays: number;
  };
}

/**
 * Parse a threshold string like "30d", "7d", "2w", "3m"
 */
export function parseThreshold(input: string): AgeThreshold {
  const match = input.match(/^(\d+)([dwm])$/);
  if (!match) {
    throw new Error(
      `Invalid threshold format: ${input}. Use formats like "30d" (days), "2w" (weeks), "3m" (months)`
    );
  }

  const value = parseInt(match[1], 10);
  const unitChar = match[2];

  const unitMap: Record<string, AgeThreshold["unit"]> = {
    d: "days",
    w: "weeks",
    m: "months",
  };

  return { value, unit: unitMap[unitChar] };
}

/**
 * Convert threshold to milliseconds
 */
export function thresholdToMs(threshold: AgeThreshold): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  switch (threshold.unit) {
    case "days":
      return threshold.value * msPerDay;
    case "weeks":
      return threshold.value * 7 * msPerDay;
    case "months":
      return threshold.value * 30 * msPerDay; // Approximate
  }
}

/**
 * Format an age in milliseconds to a human-readable string
 */
export function formatAge(ageMs: number): string {
  const msPerMinute = 60 * 1000;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;
  const msPerWeek = 7 * msPerDay;
  const msPerMonth = 30 * msPerDay;
  const msPerYear = 365 * msPerDay;

  if (ageMs < msPerHour) {
    const minutes = Math.floor(ageMs / msPerMinute);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  if (ageMs < msPerDay) {
    const hours = Math.floor(ageMs / msPerHour);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  if (ageMs < msPerWeek) {
    const days = Math.floor(ageMs / msPerDay);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  if (ageMs < msPerMonth) {
    const weeks = Math.floor(ageMs / msPerWeek);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  }

  if (ageMs < msPerYear) {
    const months = Math.floor(ageMs / msPerMonth);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }

  const years = Math.floor(ageMs / msPerYear);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/**
 * Format threshold to human-readable string
 */
export function formatThreshold(threshold: AgeThreshold): string {
  return `${threshold.value} ${threshold.unit}`;
}

/**
 * Recursively find all .tt files in a directory
 */
async function findTTFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and common non-content dirs
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          const subFiles = await findTTFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && extname(entry.name) === ".tt") {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return files;
}

/**
 * Get the age info for a single file
 */
export async function getFileAge(filePath: string): Promise<FileAge> {
  const content = await readFile(filePath, "utf-8");
  const parsed = parseFile(content, filePath);
  const stats = await stat(filePath);

  const now = Date.now();
  const modifiedAt = stats.mtime;
  const ageMs = now - modifiedAt.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  return {
    parsed,
    modifiedAt,
    ageMs,
    ageDays,
    ageFormatted: formatAge(ageMs),
  };
}

/**
 * Check if a file is stale by age
 */
export async function checkAgeStalenessSingle(
  filePath: string,
  threshold: AgeThreshold
): Promise<StaleByAge | FreshByAge> {
  const fileAge = await getFileAge(filePath);
  const thresholdMs = thresholdToMs(threshold);

  if (fileAge.ageMs > thresholdMs) {
    return {
      ...fileAge,
      threshold,
      isStale: true,
    };
  }

  return {
    ...fileAge,
    isStale: false,
  };
}

/**
 * Check all files in a directory for age-based staleness
 *
 * Default threshold: 30 days
 */
export async function checkAgeStaleness(
  ttDir: string,
  thresholdInput: string | AgeThreshold = "30d"
): Promise<AgeReport> {
  const threshold =
    typeof thresholdInput === "string"
      ? parseThreshold(thresholdInput)
      : thresholdInput;

  const thresholdMs = thresholdToMs(threshold);
  const files = await findTTFiles(ttDir);

  const stale: StaleByAge[] = [];
  const fresh: FreshByAge[] = [];
  const allAges: FileAge[] = [];

  for (const filePath of files) {
    try {
      const fileAge = await getFileAge(filePath);
      allAges.push(fileAge);

      if (fileAge.ageMs > thresholdMs) {
        stale.push({
          ...fileAge,
          threshold,
          isStale: true,
        });
      } else {
        fresh.push({
          ...fileAge,
          isStale: false,
        });
      }
    } catch (error) {
      // Skip files that can't be read
      console.error(`Warning: Could not read ${filePath}: ${error}`);
    }
  }

  // Sort stale files by age (oldest first)
  stale.sort((a, b) => b.ageMs - a.ageMs);

  // Calculate stats
  const averageAgeDays =
    allAges.length > 0
      ? allAges.reduce((sum, f) => sum + f.ageDays, 0) / allAges.length
      : 0;

  const oldestFile =
    allAges.length > 0
      ? allAges.reduce((oldest, f) => (f.ageMs > oldest.ageMs ? f : oldest))
      : undefined;

  const newestFile =
    allAges.length > 0
      ? allAges.reduce((newest, f) => (f.ageMs < newest.ageMs ? f : newest))
      : undefined;

  return {
    stale,
    fresh,
    totalChecked: files.length,
    threshold,
    stats: {
      staleCount: stale.length,
      freshCount: fresh.length,
      oldestFile,
      newestFile,
      averageAgeDays: Math.round(averageAgeDays * 10) / 10,
    },
  };
}

/**
 * Get age info for a specific file by ID
 */
export async function getAgeById(
  ttDir: string,
  id: string
): Promise<FileAge | null> {
  // Try direct path first
  const directPath = join(ttDir, `${id}.tt`);

  try {
    return await getFileAge(directPath);
  } catch {
    // File doesn't exist at direct path
  }

  // Fall back to searching
  const files = await findTTFiles(ttDir);

  for (const filePath of files) {
    try {
      const fileAge = await getFileAge(filePath);
      if (fileAge.parsed.tt?.id === id) {
        return fileAge;
      }
    } catch {
      // Skip unreadable files
    }
  }

  return null;
}

/**
 * Type guard for stale by age
 */
export function isStaleByAge(
  result: StaleByAge | FreshByAge
): result is StaleByAge {
  return result.isStale === true;
}

/**
 * Type guard for fresh by age
 */
export function isFreshByAge(
  result: StaleByAge | FreshByAge
): result is FreshByAge {
  return result.isStale === false;
}

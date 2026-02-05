/**
 * Knowledge decay scoring for Slices files
 *
 * Provides a decay score between 0.0 (completely fresh) and 1.0 (fully decayed)
 * based on time since last modification.
 *
 * Uses an exponential decay model with configurable half-life.
 */

import { getFileAge, getAgeById, type FileAge } from "./age.js";

export interface DecayConfig {
  /**
   * Time in days for the staleness score to reach 0.5
   * Default: 30 days
   */
  halfLifeDays: number;

  /**
   * Decay curve steepness multiplier
   * Higher = faster initial decay, slower later
   * Default: 1.0 (standard exponential)
   */
  steepness: number;
}

export interface DecayScore {
  /** Staleness score from 0.0 (fresh) to 1.0 (decayed) */
  score: number;

  /** Score as a label */
  label: "fresh" | "aging" | "stale" | "decayed";

  /** Human-readable description */
  description: string;

  /** The file's age info */
  fileAge: FileAge;

  /** Config used for calculation */
  config: DecayConfig;
}

export interface DecayReport {
  /** All files with their decay scores */
  files: DecayScore[];

  /** Files grouped by label */
  byLabel: {
    fresh: DecayScore[];
    aging: DecayScore[];
    stale: DecayScore[];
    decayed: DecayScore[];
  };

  /** Summary stats */
  stats: {
    averageScore: number;
    medianScore: number;
    freshCount: number;
    agingCount: number;
    staleCount: number;
    decayedCount: number;
  };

  /** Config used */
  config: DecayConfig;
}

/**
 * Default decay configuration
 */
export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeDays: 30,
  steepness: 1.0,
};

/**
 * Calculate decay score using exponential decay formula
 *
 * score = 1 - e^(-λt)
 * where λ = ln(2) / halfLife * steepness
 *
 * This gives:
 * - 0.0 at t=0 (just modified)
 * - 0.5 at t=halfLife
 * - ~0.95 at t=4*halfLife
 * - Approaches 1.0 asymptotically
 */
export function calculateDecayScore(ageDays: number, config: DecayConfig = DEFAULT_DECAY_CONFIG): number {
  const lambda = (Math.LN2 / config.halfLifeDays) * config.steepness;
  const score = 1 - Math.exp(-lambda * ageDays);
  return Math.round(score * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Get label for a decay score
 */
export function getDecayLabel(score: number): DecayScore["label"] {
  if (score < 0.25) return "fresh";
  if (score < 0.5) return "aging";
  if (score < 0.75) return "stale";
  return "decayed";
}

/**
 * Get human-readable description for a decay score
 */
export function getDecayDescription(score: number, ageDays: number): string {
  const label = getDecayLabel(score);
  const daysRounded = Math.round(ageDays);

  switch (label) {
    case "fresh":
      return `Fresh (score: ${score}, ${daysRounded} days ago)`;
    case "aging":
      return `Aging (score: ${score}, ${daysRounded} days ago)`;
    case "stale":
      return `Stale (score: ${score}, ${daysRounded} days ago)`;
    case "decayed":
      return `Decayed (score: ${score}, ${daysRounded} days ago)`;
  }
}

/**
 * Get decay score for a single file
 */
export async function getDecayScore(
  filePath: string,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): Promise<DecayScore> {
  const fileAge = await getFileAge(filePath);
  const score = calculateDecayScore(fileAge.ageDays, config);
  const label = getDecayLabel(score);
  const description = getDecayDescription(score, fileAge.ageDays);

  return {
    score,
    label,
    description,
    fileAge,
    config,
  };
}

/**
 * Get decay score for a file by ID
 */
export async function getDecayScoreById(
  ttDir: string,
  id: string,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): Promise<DecayScore | null> {
  const fileAge = await getAgeById(ttDir, id);
  if (!fileAge) return null;

  const score = calculateDecayScore(fileAge.ageDays, config);
  const label = getDecayLabel(score);
  const description = getDecayDescription(score, fileAge.ageDays);

  return {
    score,
    label,
    description,
    fileAge,
    config,
  };
}

/**
 * Calculate median of an array of numbers
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Generate a decay report for all files in a directory
 */
export async function generateDecayReport(
  ttDir: string,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): Promise<DecayReport> {
  // Import here to avoid circular dependency
  const { readdir, readFile, stat } = await import("node:fs/promises");
  const { join, extname } = await import("node:path");
  const { parseFile } = await import("@slices/parser");

  // Find all .tt files recursively
  async function findTTFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            files.push(...(await findTTFiles(fullPath)));
          }
        } else if (entry.isFile() && extname(entry.name) === ".tt") {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }
    return files;
  }

  const filePaths = await findTTFiles(ttDir);
  const files: DecayScore[] = [];

  for (const filePath of filePaths) {
    try {
      const decayScore = await getDecayScore(filePath, config);
      files.push(decayScore);
    } catch (error) {
      console.error(`Warning: Could not process ${filePath}: ${error}`);
    }
  }

  // Sort by score (most decayed first)
  files.sort((a, b) => b.score - a.score);

  // Group by label
  const byLabel = {
    fresh: files.filter((f) => f.label === "fresh"),
    aging: files.filter((f) => f.label === "aging"),
    stale: files.filter((f) => f.label === "stale"),
    decayed: files.filter((f) => f.label === "decayed"),
  };

  // Calculate stats
  const scores = files.map((f) => f.score);
  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000
      : 0;
  const medianScore = Math.round(median(scores) * 1000) / 1000;

  return {
    files,
    byLabel,
    stats: {
      averageScore,
      medianScore,
      freshCount: byLabel.fresh.length,
      agingCount: byLabel.aging.length,
      staleCount: byLabel.stale.length,
      decayedCount: byLabel.decayed.length,
    },
    config,
  };
}

/**
 * Format a decay score for display
 */
export function formatDecayScore(score: DecayScore): string {
  const id = score.fileAge.parsed.tt?.id || "unknown";
  const title = score.fileAge.parsed.tt?.title;

  let line = `${id}`;
  if (title && title !== id) {
    line += ` (${title})`;
  }
  line += `\n  Staleness: ${score.score} [${score.label.toUpperCase()}] - ${score.fileAge.ageFormatted}`;

  return line;
}

/**
 * Format a decay report for display
 */
export function formatDecayReport(report: DecayReport): string {
  const lines: string[] = [];

  lines.push(`Decay Report (half-life: ${report.config.halfLifeDays} days)`);
  lines.push("");
  lines.push(`Total files: ${report.files.length}`);
  lines.push(`Average staleness: ${report.stats.averageScore}`);
  lines.push(`Median staleness: ${report.stats.medianScore}`);
  lines.push("");
  lines.push(
    `Distribution: ${report.stats.freshCount} fresh, ${report.stats.agingCount} aging, ${report.stats.staleCount} stale, ${report.stats.decayedCount} decayed`
  );

  if (report.byLabel.decayed.length > 0) {
    lines.push("");
    lines.push("Most decayed files:");
    for (const file of report.byLabel.decayed.slice(0, 5)) {
      lines.push(`  • ${formatDecayScore(file)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Enrich search results with staleness indicators
 */
export interface SearchResultWithStaleness {
  id: string;
  title?: string;
  staleness: {
    score: number;
    label: DecayScore["label"];
    ageFormatted: string;
  };
}

/**
 * Add staleness info to search results
 */
export async function enrichWithStaleness(
  ttDir: string,
  ids: string[],
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): Promise<SearchResultWithStaleness[]> {
  const results: SearchResultWithStaleness[] = [];

  for (const id of ids) {
    const decayScore = await getDecayScoreById(ttDir, id, config);
    if (decayScore) {
      results.push({
        id,
        title: decayScore.fileAge.parsed.tt?.title,
        staleness: {
          score: decayScore.score,
          label: decayScore.label,
          ageFormatted: decayScore.fileAge.ageFormatted,
        },
      });
    }
  }

  return results;
}

/**
 * Format search result with staleness for display
 * Example: "01JABC (auth-design)     [FRESH - 2 days ago]"
 */
export function formatSearchWithStaleness(result: SearchResultWithStaleness): string {
  const label = result.staleness.label.toUpperCase();
  let line = `${result.id}`;
  if (result.title) {
    line += ` (${result.title})`;
  }
  line = line.padEnd(35);
  line += `[${label} - ${result.staleness.ageFormatted}]`;
  return line;
}

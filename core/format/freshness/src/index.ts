/**
 * @treetext/freshness - Detect and regenerate stale derived files
 *
 * This library provides tools to:
 * - Find files with derived_from metadata
 * - Check if derived files are stale (source has changed)
 * - Check if files are stale by age (time-based)
 * - Calculate knowledge decay scores
 * - Regenerate stale files using LLM or mechanical transformations
 *
 * @example
 * ```typescript
 * import {
 *   checkAllStaleness,
 *   checkAgeStaleness,
 *   getDecayScoreById,
 *   regenerateSummary,
 *   isStale,
 * } from '@treetext/freshness';
 *
 * // Check for stale files (hash-based)
 * const report = await checkAllStaleness('.treetext');
 * console.log(`${report.stats.staleCount} stale files found`);
 *
 * // Check for stale files by age
 * const ageReport = await checkAgeStaleness('.treetext', '7d');
 * console.log(`${ageReport.stats.staleCount} files not updated in 7 days`);
 *
 * // Get decay score for a file
 * const score = await getDecayScoreById('.treetext', '01JXYZ');
 * console.log(`Staleness: ${score?.score} [${score?.label}]`);
 *
 * // Regenerate stale summaries
 * for (const stale of report.stale) {
 *   if (isStale(stale)) {
 *     await regenerateSummary(stale, {
 *       apiKey: process.env.ANTHROPIC_API_KEY,
 *     });
 *   }
 * }
 * ```
 */

// Core staleness detection (hash-based)
export {
  checkAllStaleness,
  checkStaleness,
  checkStalenessById,
  isStale,
  isFresh,
  type StaleFile,
  type FreshFile,
  type FreshnessReport,
  type StalenessReason,
} from "./lib/staleness.js";

// Age-based staleness detection
export {
  checkAgeStaleness,
  checkAgeStalenessSingle,
  getFileAge,
  getAgeById,
  parseThreshold,
  thresholdToMs,
  formatAge,
  formatThreshold,
  isStaleByAge,
  isFreshByAge,
  type AgeThreshold,
  type FileAge,
  type StaleByAge,
  type FreshByAge,
  type AgeReport,
} from "./lib/age.js";

// Knowledge decay scoring
export {
  calculateDecayScore,
  getDecayScore,
  getDecayScoreById,
  getDecayLabel,
  getDecayDescription,
  generateDecayReport,
  formatDecayScore,
  formatDecayReport,
  enrichWithStaleness,
  formatSearchWithStaleness,
  DEFAULT_DECAY_CONFIG,
  type DecayConfig,
  type DecayScore,
  type DecayReport,
  type SearchResultWithStaleness,
} from "./lib/decay-model.js";

// File discovery
export {
  findDerivedFiles,
  findFileById,
  type DerivedFile,
} from "./lib/derived-finder.js";

// Hash utilities
export {
  computeHash,
  parseHash,
  hashesMatch,
  shortHash,
  type HashResult,
} from "./lib/hash.js";

// Parser (re-exported from @slices/parser)
export {
  parseFile,
  type ParsedFile,
  type TTFrontmatter,
  type TTDerivedFrom,
} from "@slices/parser";

// Regenerators
export {
  regenerateSummary,
  type RegenerateOptions,
  type RegenerateResult,
} from "./regenerators/summary.js";

export {
  regenerateIndex,
  type IndexRegenerateOptions,
  type IndexRegenerateResult,
} from "./regenerators/index-file.js";

// CLI command runners (for programmatic use)
export { runCheck, type CheckOptions, type CheckResult } from "./commands/check.js";
export { runRegen, type RegenOptions, type RegenResult } from "./commands/regen.js";

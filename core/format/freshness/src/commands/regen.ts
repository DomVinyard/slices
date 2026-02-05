/**
 * Regen command - regenerate stale derived files
 */

import {
  checkAllStaleness,
  checkStalenessById,
  isStale,
  type StaleFile,
} from "../lib/staleness.js";
import { regenerateSummary, type RegenerateOptions } from "../regenerators/summary.js";
import { regenerateIndex } from "../regenerators/index-file.js";

export interface RegenOptions {
  /** Output format: text (default), json */
  format?: "text" | "json";
  /** Show verbose output */
  verbose?: boolean;
  /** Specific file ID to regenerate */
  id?: string;
  /** Dry run - show what would be regenerated */
  dryRun?: boolean;
  /** LLM API key for summary regeneration */
  apiKey?: string;
  /** LLM model to use */
  model?: string;
  /** Force regeneration type: summary, index, auto (default) */
  type?: "summary" | "index" | "auto";
}

export interface RegenResult {
  exitCode: number;
  output: string;
}

/**
 * Run the regen command
 */
export async function runRegen(
  ttDir: string,
  options: RegenOptions = {}
): Promise<RegenResult> {
  const format = options.format || "text";
  const dryRun = options.dryRun || false;

  // Regenerate specific file
  if (options.id) {
    const result = await checkStalenessById(ttDir, options.id);

    if (!result) {
      const msg = `No derived file found with ID: ${options.id}`;
      return {
        exitCode: 1,
        output: format === "json" ? JSON.stringify({ error: msg }) : msg,
      };
    }

    if (!isStale(result)) {
      const msg = `File ${options.id} is already fresh, nothing to regenerate`;
      return {
        exitCode: 0,
        output: format === "json" ? JSON.stringify({ status: "fresh", id: options.id }) : msg,
      };
    }

    const regenResult = await regenerateFile(result, options);

    if (format === "json") {
      return {
        exitCode: regenResult.success ? 0 : 1,
        output: JSON.stringify(regenResult, null, 2),
      };
    }

    if (regenResult.success) {
      const prefix = dryRun ? "[dry-run] Would regenerate" : "✓ Regenerated";
      return {
        exitCode: 0,
        output: `${prefix} ${options.id}`,
      };
    }

    return {
      exitCode: 1,
      output: `✗ Failed to regenerate ${options.id}: ${regenResult.error}`,
    };
  }

  // Regenerate all stale files
  const report = await checkAllStaleness(ttDir);

  if (report.stats.staleCount === 0) {
    const msg = "No stale files to regenerate";
    return {
      exitCode: 0,
      output: format === "json" ? JSON.stringify({ regenerated: 0, message: msg }) : msg,
    };
  }

  const results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const stale of report.stale) {
    const regenResult = await regenerateFile(stale, options);
    results.push({
      id: stale.derived.parsed.tt?.id || "unknown",
      success: regenResult.success,
      error: regenResult.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  if (format === "json") {
    return {
      exitCode: failCount > 0 ? 1 : 0,
      output: JSON.stringify(
        {
          total: results.length,
          success: successCount,
          failed: failCount,
          dryRun,
          results,
        },
        null,
        2
      ),
    };
  }

  // Text format
  const lines: string[] = [];
  const prefix = dryRun ? "[dry-run] " : "";

  if (successCount > 0) {
    lines.push(
      `${prefix}✓ ${successCount} file${successCount === 1 ? "" : "s"} regenerated`
    );
  }

  if (failCount > 0) {
    lines.push(`✗ ${failCount} file${failCount === 1 ? "" : "s"} failed:`);
    for (const result of results.filter((r) => !r.success)) {
      lines.push(`  • ${result.id}: ${result.error}`);
    }
  }

  return {
    exitCode: failCount > 0 ? 1 : 0,
    output: lines.join("\n"),
  };
}

/**
 * Regenerate a single stale file
 */
async function regenerateFile(
  stale: StaleFile,
  options: RegenOptions
): Promise<{ success: boolean; error?: string }> {
  // Determine regeneration type
  const regenType = options.type || detectRegenType(stale);

  const regenOptions: RegenerateOptions = {
    apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    model: options.model,
    dryRun: options.dryRun,
  };

  if (regenType === "index") {
    const result = await regenerateIndex(stale, {
      dryRun: options.dryRun,
    });
    return { success: result.success, error: result.error };
  }

  // Default to summary regeneration
  const result = await regenerateSummary(stale, regenOptions);
  return { success: result.success, error: result.error };
}

/**
 * Detect the best regeneration type based on file metadata
 */
function detectRegenType(stale: StaleFile): "summary" | "index" {
  const title = stale.derived.parsed.tt?.title?.toLowerCase() || "";
  const kind = stale.derived.parsed.tt?.kind?.toLowerCase() || "";

  // Check if it looks like an index file
  if (
    title.includes("index") ||
    title.includes("listing") ||
    title.includes("catalog") ||
    kind === "index"
  ) {
    return "index";
  }

  // Default to summary
  return "summary";
}

/**
 * Check command - list stale derived files
 */

import { checkAllStaleness, checkStalenessById, isStale } from "../lib/staleness.js";
import { shortHash } from "../lib/hash.js";

export interface CheckOptions {
  /** Output format: text (default), json */
  format?: "text" | "json";
  /** Show verbose output */
  verbose?: boolean;
  /** Specific file ID to check */
  id?: string;
}

export interface CheckResult {
  exitCode: number;
  output: string;
}

/**
 * Run the check command
 */
export async function runCheck(
  ttDir: string,
  options: CheckOptions = {}
): Promise<CheckResult> {
  const format = options.format || "text";

  // Check specific file
  if (options.id) {
    const result = await checkStalenessById(ttDir, options.id);

    if (!result) {
      const msg = `No derived file found with ID: ${options.id}`;
      return {
        exitCode: 1,
        output: format === "json" ? JSON.stringify({ error: msg }) : msg,
      };
    }

    if (isStale(result)) {
      const output =
        format === "json"
          ? JSON.stringify(formatStaleFileJson(result), null, 2)
          : formatStaleFileText(result, options.verbose);
      return { exitCode: 1, output };
    }

    const output =
      format === "json"
        ? JSON.stringify({ status: "fresh", id: options.id })
        : `✓ ${options.id} is fresh`;
    return { exitCode: 0, output };
  }

  // Check all files
  const report = await checkAllStaleness(ttDir);

  if (format === "json") {
    const jsonOutput = {
      totalChecked: report.totalChecked,
      staleCount: report.stats.staleCount,
      freshCount: report.stats.freshCount,
      stale: report.stale.map(formatStaleFileJson),
    };
    return {
      exitCode: report.stats.staleCount > 0 ? 1 : 0,
      output: JSON.stringify(jsonOutput, null, 2),
    };
  }

  // Text format
  const lines: string[] = [];

  if (report.totalChecked === 0) {
    lines.push("No derived files found.");
    return { exitCode: 0, output: lines.join("\n") };
  }

  lines.push(
    `Checked ${report.totalChecked} derived file${report.totalChecked === 1 ? "" : "s"}`
  );
  lines.push("");

  if (report.stats.staleCount === 0) {
    lines.push("✓ All derived files are fresh");
  } else {
    lines.push(`⚠ ${report.stats.staleCount} stale file${report.stats.staleCount === 1 ? "" : "s"}:`);
    lines.push("");

    for (const stale of report.stale) {
      lines.push(formatStaleFileText(stale, options.verbose));
    }
  }

  if (options.verbose && report.stats.freshCount > 0) {
    lines.push("");
    lines.push(`✓ ${report.stats.freshCount} fresh file${report.stats.freshCount === 1 ? "" : "s"}`);
  }

  return {
    exitCode: report.stats.staleCount > 0 ? 1 : 0,
    output: lines.join("\n"),
  };
}

/**
 * Format a stale file for text output
 */
function formatStaleFileText(
  stale: ReturnType<typeof isStale extends (r: infer R) => boolean ? () => R : never>,
  verbose?: boolean
): string {
  // Type assertion since we know this is a StaleFile
  const staleFile = stale as {
    derived: { parsed: { tt?: { id?: string; title?: string } }; sourceId: string; storedHash: string };
    reason: string;
    description: string;
    currentHash?: string;
  };

  const id = staleFile.derived.parsed.tt?.id || "unknown";
  const title = staleFile.derived.parsed.tt?.title || "Untitled";

  let line = `  • ${id}`;
  if (title !== id) {
    line += ` (${title})`;
  }
  line += `\n    ${staleFile.description}`;

  if (verbose) {
    line += `\n    Source: ${staleFile.derived.sourceId}`;
    line += `\n    Stored hash: ${shortHash(staleFile.derived.storedHash)}`;
    if (staleFile.currentHash) {
      line += `\n    Current hash: ${shortHash(staleFile.currentHash)}`;
    }
  }

  return line;
}

/**
 * Format a stale file for JSON output
 */
function formatStaleFileJson(
  stale: ReturnType<typeof isStale extends (r: infer R) => boolean ? () => R : never>
): Record<string, unknown> {
  // Type assertion since we know this is a StaleFile
  const staleFile = stale as {
    derived: { parsed: { tt?: { id?: string; title?: string }; path: string }; sourceId: string; storedHash: string };
    reason: string;
    description: string;
    currentHash?: string;
  };

  return {
    id: staleFile.derived.parsed.tt?.id,
    title: staleFile.derived.parsed.tt?.title,
    path: staleFile.derived.parsed.path,
    sourceId: staleFile.derived.sourceId,
    reason: staleFile.reason,
    storedHash: staleFile.derived.storedHash,
    currentHash: staleFile.currentHash,
    description: staleFile.description,
  };
}

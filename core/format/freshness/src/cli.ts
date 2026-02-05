#!/usr/bin/env node
/**
 * tt-fresh CLI - Detect and regenerate stale derived Slices files
 *
 * Usage:
 *   tt-fresh check              # List stale files (hash-based)
 *   tt-fresh check --json       # JSON output for CI
 *   tt-fresh check ID           # Check specific file
 *   tt-fresh check --age        # List files not updated in 30+ days
 *   tt-fresh check --age --threshold 7d  # Custom time threshold
 *   tt-fresh score ID           # Show decay score for a file
 *   tt-fresh score              # Show decay report for all files
 *   tt-fresh regen              # Regenerate all stale
 *   tt-fresh regen ID           # Regenerate specific file
 *   tt-fresh regen --dry-run    # Show what would be regenerated
 */

import { runCheck, type CheckOptions } from "./commands/check.js";
import { runRegen, type RegenOptions } from "./commands/regen.js";
import {
  checkAgeStaleness,
  getAgeById,
  formatThreshold,
  parseThreshold,
  type AgeReport,
} from "./lib/age.js";
import {
  getDecayScoreById,
  generateDecayReport,
  formatDecayScore,
  formatDecayReport,
  DEFAULT_DECAY_CONFIG,
  type DecayConfig,
} from "./lib/decay-model.js";

const VERSION = "1.1.0";

function printHelp(): void {
  console.log(`tt-fresh v${VERSION} - Slices Freshness Checker

USAGE:
  tt-fresh <command> [options] [id]

COMMANDS:
  check     List stale files (hash-based or age-based)
  score     Show staleness decay score for files
  regen     Regenerate stale derived files

CHECK OPTIONS:
  --json            Output as JSON (for CI integration)
  --verbose, -v     Show detailed information
  --age             Check age-based staleness (default: 30 days)
  --threshold T     Set age threshold (e.g., "7d", "2w", "3m")
  ID                Check specific file by ID

SCORE OPTIONS:
  --json            Output as JSON
  --half-life D     Set decay half-life in days (default: 30)
  ID                Score specific file by ID

REGEN OPTIONS:
  --json            Output as JSON
  --verbose, -v     Show detailed information
  --dry-run         Show what would be regenerated without making changes
  --api-key KEY     LLM API key (or set ANTHROPIC_API_KEY/OPENAI_API_KEY env var)
  --model MODEL     LLM model to use (default: claude-3-haiku-20240307)
  --type TYPE       Force regeneration type: summary, index, auto (default: auto)
  ID                Regenerate specific file by ID

ENVIRONMENT:
  TT_DIR               Slices directory (default: .treetext)
  ANTHROPIC_API_KEY    Anthropic API key for summary regeneration
  OPENAI_API_KEY       OpenAI API key for summary regeneration

EXAMPLES:
  tt-fresh check                    # List all stale files (hash-based)
  tt-fresh check --json             # JSON output for CI
  tt-fresh check 01JXYZ...          # Check specific derived file
  tt-fresh check --age              # List files not updated in 30+ days
  tt-fresh check --age --threshold 7d    # Files not updated in 7 days
  tt-fresh check --age --threshold 2w    # Files not updated in 2 weeks
  tt-fresh check --age --threshold 3m    # Files not updated in 3 months
  tt-fresh score 01JXYZ...          # "Staleness: 0.7 (45 days ago)"
  tt-fresh score                    # Full decay report
  tt-fresh score --half-life 14     # Faster decay (14-day half-life)
  tt-fresh regen                    # Regenerate all stale files
  tt-fresh regen --dry-run          # Preview regeneration
  tt-fresh regen 01JXYZ... --type index  # Regenerate as index file

EXIT CODES:
  0    Success (no stale files, or regeneration succeeded)
  1    Stale files found, or regeneration failed
  2    Invalid usage
`);
}

function printVersion(): void {
  console.log(`tt-fresh v${VERSION}`);
}

interface ParsedArgs {
  command?: string;
  id?: string;
  format?: "text" | "json";
  verbose?: boolean;
  dryRun?: boolean;
  apiKey?: string;
  model?: string;
  type?: "summary" | "index" | "auto";
  help?: boolean;
  version?: boolean;
  // Age-based staleness options
  age?: boolean;
  threshold?: string;
  // Decay score options
  halfLife?: number;
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-h":
      case "--help":
        parsed.help = true;
        break;

      case "-V":
      case "--version":
        parsed.version = true;
        break;

      case "--json":
        parsed.format = "json";
        break;

      case "-v":
      case "--verbose":
        parsed.verbose = true;
        break;

      case "--dry-run":
        parsed.dryRun = true;
        break;

      case "--api-key":
        parsed.apiKey = args[++i];
        break;

      case "--model":
        parsed.model = args[++i];
        break;

      case "--type":
        const typeArg = args[++i];
        if (typeArg === "summary" || typeArg === "index" || typeArg === "auto") {
          parsed.type = typeArg;
        } else {
          console.error(`Invalid type: ${typeArg}. Use: summary, index, auto`);
          process.exit(2);
        }
        break;

      case "--age":
        parsed.age = true;
        break;

      case "--threshold":
        parsed.threshold = args[++i];
        break;

      case "--half-life":
        const halfLifeArg = args[++i];
        const halfLifeNum = parseInt(halfLifeArg, 10);
        if (isNaN(halfLifeNum) || halfLifeNum <= 0) {
          console.error(`Invalid half-life: ${halfLifeArg}. Use a positive number of days.`);
          process.exit(2);
        }
        parsed.halfLife = halfLifeNum;
        break;

      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(2);
        }

        // First positional arg is command, second is ID
        if (!parsed.command) {
          parsed.command = arg;
        } else if (!parsed.id) {
          parsed.id = arg;
        }
        break;
    }
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    printVersion();
    process.exit(0);
  }

  const ttDir = process.env.TT_DIR || ".treetext";

  switch (args.command) {
    case "check": {
      // Age-based staleness check
      if (args.age) {
        const threshold = args.threshold || "30d";
        const result = await runAgeCheck(ttDir, threshold, args);
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // Hash-based staleness check (default)
      const options: CheckOptions = {
        format: args.format,
        verbose: args.verbose,
        id: args.id,
      };
      const result = await runCheck(ttDir, options);
      console.log(result.output);
      process.exit(result.exitCode);
      break;
    }

    case "score": {
      const result = await runScore(ttDir, args);
      console.log(result.output);
      process.exit(result.exitCode);
      break;
    }

    case "regen": {
      const options: RegenOptions = {
        format: args.format,
        verbose: args.verbose,
        id: args.id,
        dryRun: args.dryRun,
        apiKey: args.apiKey,
        model: args.model,
        type: args.type,
      };
      const result = await runRegen(ttDir, options);
      console.log(result.output);
      process.exit(result.exitCode);
      break;
    }

    case undefined:
      // No command - show help
      printHelp();
      process.exit(0);
      break;

    default:
      console.error(`Unknown command: ${args.command}`);
      console.error("Run 'tt-fresh --help' for usage");
      process.exit(2);
  }
}

/**
 * Run age-based staleness check
 */
async function runAgeCheck(
  ttDir: string,
  threshold: string,
  args: ParsedArgs
): Promise<{ output: string; exitCode: number }> {
  const format = args.format || "text";

  try {
    // Check specific file by ID
    if (args.id) {
      const fileAge = await getAgeById(ttDir, args.id);

      if (!fileAge) {
        const msg = `File not found: ${args.id}`;
        return {
          exitCode: 1,
          output: format === "json" ? JSON.stringify({ error: msg }) : msg,
        };
      }

      const parsedThreshold = parseThreshold(threshold);
      const thresholdMs =
        parsedThreshold.value *
        (parsedThreshold.unit === "days"
          ? 24 * 60 * 60 * 1000
          : parsedThreshold.unit === "weeks"
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000);

      const isStale = fileAge.ageMs > thresholdMs;

      if (format === "json") {
        return {
          exitCode: isStale ? 1 : 0,
          output: JSON.stringify(
            {
              id: args.id,
              isStale,
              ageDays: Math.round(fileAge.ageDays * 10) / 10,
              ageFormatted: fileAge.ageFormatted,
              threshold: formatThreshold(parsedThreshold),
            },
            null,
            2
          ),
        };
      }

      if (isStale) {
        return {
          exitCode: 1,
          output: `⚠ ${args.id} is stale by age (${fileAge.ageFormatted}, threshold: ${formatThreshold(parsedThreshold)})`,
        };
      }

      return {
        exitCode: 0,
        output: `✓ ${args.id} is fresh by age (${fileAge.ageFormatted})`,
      };
    }

    // Check all files
    const report = await checkAgeStaleness(ttDir, threshold);

    if (format === "json") {
      return {
        exitCode: report.stats.staleCount > 0 ? 1 : 0,
        output: JSON.stringify(
          {
            totalChecked: report.totalChecked,
            threshold: formatThreshold(report.threshold),
            staleCount: report.stats.staleCount,
            freshCount: report.stats.freshCount,
            averageAgeDays: report.stats.averageAgeDays,
            stale: report.stale.map((f) => ({
              id: f.parsed.tt?.id,
              title: f.parsed.tt?.title,
              path: f.parsed.path,
              ageDays: Math.round(f.ageDays * 10) / 10,
              ageFormatted: f.ageFormatted,
            })),
          },
          null,
          2
        ),
      };
    }

    // Text format
    const lines: string[] = [];

    if (report.totalChecked === 0) {
      lines.push("No .tt files found.");
      return { exitCode: 0, output: lines.join("\n") };
    }

    lines.push(`Checked ${report.totalChecked} file${report.totalChecked === 1 ? "" : "s"} (threshold: ${formatThreshold(report.threshold)})`);
    lines.push("");

    if (report.stats.staleCount === 0) {
      lines.push("✓ All files are fresh by age");
    } else {
      lines.push(`⚠ ${report.stats.staleCount} file${report.stats.staleCount === 1 ? "" : "s"} not updated recently:`);
      lines.push("");

      for (const stale of report.stale) {
        const id = stale.parsed.tt?.id || "unknown";
        const title = stale.parsed.tt?.title;
        let line = `  • ${id}`;
        if (title && title !== id) {
          line += ` (${title})`;
        }
        line += `\n    Last modified: ${stale.ageFormatted}`;
        lines.push(line);
      }
    }

    if (args.verbose) {
      lines.push("");
      lines.push(`Average age: ${report.stats.averageAgeDays} days`);
      if (report.stats.oldestFile) {
        const oldest = report.stats.oldestFile;
        lines.push(`Oldest: ${oldest.parsed.tt?.id || oldest.parsed.path} (${oldest.ageFormatted})`);
      }
      if (report.stats.newestFile) {
        const newest = report.stats.newestFile;
        lines.push(`Newest: ${newest.parsed.tt?.id || newest.parsed.path} (${newest.ageFormatted})`);
      }
    }

    return {
      exitCode: report.stats.staleCount > 0 ? 1 : 0,
      output: lines.join("\n"),
    };
  } catch (error) {
    const msg = `Error: ${error instanceof Error ? error.message : String(error)}`;
    return {
      exitCode: 2,
      output: format === "json" ? JSON.stringify({ error: msg }) : msg,
    };
  }
}

/**
 * Run decay score command
 */
async function runScore(
  ttDir: string,
  args: ParsedArgs
): Promise<{ output: string; exitCode: number }> {
  const format = args.format || "text";
  const config: DecayConfig = {
    ...DEFAULT_DECAY_CONFIG,
    halfLifeDays: args.halfLife || DEFAULT_DECAY_CONFIG.halfLifeDays,
  };

  try {
    // Score specific file
    if (args.id) {
      const decayScore = await getDecayScoreById(ttDir, args.id, config);

      if (!decayScore) {
        const msg = `File not found: ${args.id}`;
        return {
          exitCode: 1,
          output: format === "json" ? JSON.stringify({ error: msg }) : msg,
        };
      }

      if (format === "json") {
        return {
          exitCode: 0,
          output: JSON.stringify(
            {
              id: args.id,
              title: decayScore.fileAge.parsed.tt?.title,
              score: decayScore.score,
              label: decayScore.label,
              ageDays: Math.round(decayScore.fileAge.ageDays * 10) / 10,
              ageFormatted: decayScore.fileAge.ageFormatted,
              halfLifeDays: config.halfLifeDays,
            },
            null,
            2
          ),
        };
      }

      return {
        exitCode: 0,
        output: `Staleness: ${decayScore.score} [${decayScore.label.toUpperCase()}] (${decayScore.fileAge.ageFormatted})`,
      };
    }

    // Full decay report
    const report = await generateDecayReport(ttDir, config);

    if (format === "json") {
      return {
        exitCode: 0,
        output: JSON.stringify(
          {
            totalFiles: report.files.length,
            halfLifeDays: config.halfLifeDays,
            stats: report.stats,
            files: report.files.map((f) => ({
              id: f.fileAge.parsed.tt?.id,
              title: f.fileAge.parsed.tt?.title,
              path: f.fileAge.parsed.path,
              score: f.score,
              label: f.label,
              ageDays: Math.round(f.fileAge.ageDays * 10) / 10,
              ageFormatted: f.fileAge.ageFormatted,
            })),
          },
          null,
          2
        ),
      };
    }

    return {
      exitCode: 0,
      output: formatDecayReport(report),
    };
  } catch (error) {
    const msg = `Error: ${error instanceof Error ? error.message : String(error)}`;
    return {
      exitCode: 2,
      output: format === "json" ? JSON.stringify({ error: msg }) : msg,
    };
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});

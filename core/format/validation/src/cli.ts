#!/usr/bin/env node
/**
 * Slices Validator CLI
 *
 * Usage:
 *   tt-validate [options] <path>
 *
 * Exit codes:
 *   0 - All files valid
 *   1 - Errors found
 *   2 - Warnings only (no errors)
 */

import * as fs from "fs";
import * as path from "path";
import { Validator } from "./validator.js";
import { formatResults, type OutputFormat } from "./lib/reporter.js";
import { allRules } from "./rules/index.js";

interface CLIOptions {
  format: OutputFormat;
  color: boolean;
  rules?: string[];
  skipRules?: string[];
  quiet: boolean;
  help: boolean;
  version: boolean;
  listRules: boolean;
}

function parseArgs(args: string[]): { options: CLIOptions; paths: string[] } {
  const options: CLIOptions = {
    format: "terminal",
    color: process.stdout.isTTY ?? false,
    quiet: false,
    help: false,
    version: false,
    listRules: false,
  };
  const paths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-v" || arg === "--version") {
      options.version = true;
    } else if (arg === "--list-rules") {
      options.listRules = true;
    } else if (arg === "-f" || arg === "--format") {
      const format = args[++i];
      if (format === "terminal" || format === "json" || format === "sarif") {
        options.format = format;
      } else {
        console.error(`Unknown format: ${format}. Use: terminal, json, sarif`);
        process.exit(1);
      }
    } else if (arg === "--json") {
      options.format = "json";
    } else if (arg === "--sarif") {
      options.format = "sarif";
    } else if (arg === "--no-color") {
      options.color = false;
    } else if (arg === "--color") {
      options.color = true;
    } else if (arg === "-q" || arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "--rule" || arg === "-r") {
      const rule = args[++i];
      if (rule) {
        options.rules = options.rules || [];
        options.rules.push(rule);
      }
    } else if (arg === "--skip-rule" || arg === "-s") {
      const rule = args[++i];
      if (rule) {
        options.skipRules = options.skipRules || [];
        options.skipRules.push(rule);
      }
    } else if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else {
      paths.push(arg);
    }
  }

  return { options, paths };
}

function printHelp(): void {
  console.log(`
Slices Validator - Validate .tt files against the v1 spec

USAGE:
  tt-validate [options] <path>

ARGUMENTS:
  <path>            File or directory to validate (default: .treetext)

OPTIONS:
  -h, --help        Show this help message
  -v, --version     Show version
  -f, --format FMT  Output format: terminal (default), json, sarif
  --json            Shorthand for --format json
  --sarif           Shorthand for --format sarif
  --color           Force color output
  --no-color        Disable color output
  -q, --quiet       Only output errors (no summary)
  -r, --rule ID     Only run specific rule (can be repeated)
  -s, --skip-rule ID  Skip specific rule (can be repeated)
  --list-rules      List all available rules

EXIT CODES:
  0  All files valid (no errors)
  1  Errors found
  2  Warnings only (no errors)

EXAMPLES:
  tt-validate                      # Validate .treetext directory
  tt-validate ./my-memory          # Validate specific directory
  tt-validate file.tt              # Validate single file
  tt-validate --json .treetext     # JSON output for parsing
  tt-validate --sarif > report.sarif  # SARIF for CI integration
  tt-validate -r required-fields   # Run only specific rule
  tt-validate -s ulid-format       # Skip a rule
`);
}

function printVersion(): void {
  // Read version from package.json
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    console.log(`@treetext/validator v${pkg.version}`);
  } catch {
    console.log("@treetext/validator v1.0.0");
  }
}

function printRules(): void {
  console.log("\nAvailable validation rules:\n");
  for (const rule of allRules) {
    console.log(`  ${rule.id}`);
    console.log(`    ${rule.description}`);
    console.log(`    Default severity: ${rule.severity}`);
    console.log("");
  }
}

function main(): void {
  const { options, paths } = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    printVersion();
    process.exit(0);
  }

  if (options.listRules) {
    printRules();
    process.exit(0);
  }

  // Default to .treetext if no path provided
  const targetPaths = paths.length > 0 ? paths : [".treetext"];

  // Validate rules exist
  if (options.rules) {
    for (const ruleId of options.rules) {
      if (!allRules.find((r) => r.id === ruleId)) {
        console.error(`Unknown rule: ${ruleId}`);
        console.error(`Use --list-rules to see available rules`);
        process.exit(1);
      }
    }
  }

  if (options.skipRules) {
    for (const ruleId of options.skipRules) {
      if (!allRules.find((r) => r.id === ruleId)) {
        console.error(`Unknown rule: ${ruleId}`);
        console.error(`Use --list-rules to see available rules`);
        process.exit(1);
      }
    }
  }

  const validator = new Validator({
    rules: options.rules,
    skipRules: options.skipRules,
  });

  const allResults = [];

  for (const targetPath of targetPaths) {
    // Check if path exists
    if (!fs.existsSync(targetPath)) {
      console.error(`Path not found: ${targetPath}`);
      process.exit(1);
    }

    const stat = fs.statSync(targetPath);

    if (stat.isDirectory()) {
      const results = validator.validateDirectory(targetPath);
      allResults.push(...results);
    } else if (stat.isFile()) {
      const result = validator.validateFile(targetPath);
      allResults.push(result);
    } else {
      console.error(`Not a file or directory: ${targetPath}`);
      process.exit(1);
    }
  }

  // Format and output results
  if (!options.quiet || allResults.some((r) => r.issues.length > 0)) {
    const output = formatResults(allResults, {
      format: options.format,
      color: options.color,
      relativePaths: options.format === "terminal",
      baseDir: process.cwd(),
    });
    console.log(output);
  }

  // Determine exit code
  const totalErrors = allResults.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = allResults.reduce((sum, r) => sum + r.warningCount, 0);

  if (totalErrors > 0) {
    process.exit(1);
  } else if (totalWarnings > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

main();

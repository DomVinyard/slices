/**
 * Regenerate index-type derived files
 *
 * Index files are typically generated from source files that contain
 * structured data (like JSONL). They aggregate or summarize multiple entries.
 */

import { writeFile } from "node:fs/promises";
import { computeHash } from "../lib/hash.js";
import type { StaleFile } from "../lib/staleness.js";
import type { ParsedFile } from "@slices/parser";

export interface IndexRegenerateOptions {
  /** Dry run - don't write changes */
  dryRun?: boolean;
  /** Custom index generation function */
  generator?: (source: ParsedFile) => string;
}

export interface IndexRegenerateResult {
  success: boolean;
  derivedId: string;
  newHash?: string;
  newContent?: string;
  error?: string;
}

/**
 * Default index generator - creates a simple listing from JSONL entries
 */
function defaultIndexGenerator(source: ParsedFile): string {
  const lines = source.body.split("\n").filter((line) => line.trim());
  const entries: Array<{ title?: string; summary?: string; id?: string }> = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const meta = entry._meta as Record<string, unknown> | undefined;
      entries.push({
        title: entry.title as string | undefined,
        summary: entry.summary as string | undefined,
        id: meta?.id as string | undefined,
      });
    } catch {
      // Skip invalid JSON lines
    }
  }

  if (entries.length === 0) {
    return `# Index\n\nNo entries found in source file.\n`;
  }

  let content = `# Index\n\n`;
  content += `Total entries: ${entries.length}\n\n`;
  content += `## Entries\n\n`;

  for (const entry of entries) {
    if (entry.title) {
      content += `- **${entry.title}**`;
      if (entry.summary) {
        content += `: ${entry.summary}`;
      }
      content += "\n";
    }
  }

  return content;
}

/**
 * Regenerate an index-type derived file
 *
 * Unlike summaries, index files can often be regenerated mechanically
 * without an LLM, based on the structure of the source file.
 */
export async function regenerateIndex(
  staleFile: StaleFile,
  options: IndexRegenerateOptions = {}
): Promise<IndexRegenerateResult> {
  const derivedId = staleFile.derived.parsed.tt?.id || "unknown";

  // Check for required source file
  if (!staleFile.source) {
    return {
      success: false,
      derivedId,
      error: `Source file not found: ${staleFile.derived.sourceId}`,
    };
  }

  try {
    // Generate new content
    const generator = options.generator || defaultIndexGenerator;
    const newBody = generator(staleFile.source);

    if (options.dryRun) {
      return {
        success: true,
        derivedId,
        newContent: newBody,
        newHash: computeHash(staleFile.source.body).formatted,
      };
    }

    // Update the derived file
    const updatedContent = updateDerivedFile(
      staleFile.derived.parsed,
      staleFile.source,
      newBody
    );

    await writeFile(staleFile.derived.parsed.path, updatedContent, "utf-8");

    return {
      success: true,
      derivedId,
      newHash: computeHash(staleFile.source.body).formatted,
      newContent: newBody,
    };
  } catch (error) {
    return {
      success: false,
      derivedId,
      error: `Index regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update the derived file content with new body and hash
 */
function updateDerivedFile(
  derived: ParsedFile,
  source: ParsedFile,
  newBody: string
): string {
  const newHash = computeHash(source.body);

  // Reconstruct frontmatter with updated hash
  let content = derived.raw;

  // Update the hash in derived_from
  const hashRegex = /(\s+hash:\s*)(sha256:[a-fA-F0-9]+|[a-fA-F0-9]+)/;
  content = content.replace(hashRegex, `$1${newHash.formatted}`);

  // Replace body (everything after the second ---)
  const parts = content.split(/^---$/m);
  if (parts.length >= 3) {
    content = parts[0] + "---" + parts[1] + "---\n" + newBody;
  }

  return content;
}

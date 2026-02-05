/**
 * Find files with derived_from metadata
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { parseFile, type ParsedFile, type TTDerivedFrom } from "@slices/parser";

export interface DerivedFile {
  /** Parsed file data */
  parsed: ParsedFile;
  /** The derived_from metadata */
  derivedFrom: TTDerivedFrom;
  /** Source file ID */
  sourceId: string;
  /** Stored hash of source content at derivation time */
  storedHash: string;
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
 * Find all files that have derived_from metadata
 */
export async function findDerivedFiles(ttDir: string): Promise<DerivedFile[]> {
  const derivedFiles: DerivedFile[] = [];

  const files = await findTTFiles(ttDir);

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = parseFile(content, filePath);

      // Check if this file has derived_from metadata
      if (parsed.tt?.derived_from?.id && parsed.tt?.derived_from?.hash) {
        derivedFiles.push({
          parsed,
          derivedFrom: parsed.tt.derived_from,
          sourceId: parsed.tt.derived_from.id,
          storedHash: parsed.tt.derived_from.hash,
        });
      }
    } catch (error) {
      // Skip files that can't be read
      console.error(`Warning: Could not read ${filePath}: ${error}`);
    }
  }

  return derivedFiles;
}

/**
 * Find a file by its ID in the tt directory
 */
export async function findFileById(
  ttDir: string,
  id: string
): Promise<ParsedFile | null> {
  // Try direct path first (most common case)
  const directPath = join(ttDir, `${id}.tt`);

  try {
    const stats = await stat(directPath);
    if (stats.isFile()) {
      const content = await readFile(directPath, "utf-8");
      return parseFile(content, directPath);
    }
  } catch {
    // File doesn't exist at direct path
  }

  // Fall back to searching all files
  const files = await findTTFiles(ttDir);

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = parseFile(content, filePath);

      if (parsed.tt?.id === id) {
        return parsed;
      }
    } catch {
      // Skip unreadable files
    }
  }

  return null;
}

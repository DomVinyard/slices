/**
 * Utility functions for Slices parsing.
 */

import type { ParsedFile, TTLink, ULIDReference, PathReference, Position } from './types.js';
import { ULID_PATTERN, ULID_REFERENCE_PATTERN, PATH_REFERENCE_PATTERN } from './constants.js';

/**
 * Get the effective ID for a file (from tt.id or filename).
 */
export function getFileId(parsed: ParsedFile): string {
  return parsed.tt?.id ?? parsed.filename;
}

/**
 * Get the effective title for a file.
 */
export function getFileTitle(parsed: ParsedFile): string {
  return parsed.tt?.title ?? parsed.filename;
}

/**
 * Check if a string is a valid ULID.
 * ULID format: 26 characters, Crockford Base32 (excludes I, L, O, U).
 */
export function isValidULID(str: string): boolean {
  return ULID_PATTERN.test(str);
}

/**
 * Extract links from a parsed file.
 */
export function extractLinks(parsed: ParsedFile): TTLink[] {
  return parsed.tt?.links ?? [];
}

/**
 * Check if a link target is an ID (ULID) or a path.
 */
export function isLinkTargetId(target: string): boolean {
  return isValidULID(target);
}

/**
 * Find all ULID references in content.
 */
export function findULIDReferences(content: string): ULIDReference[] {
  const pattern = new RegExp(ULID_REFERENCE_PATTERN.source, 'g');
  const results: ULIDReference[] = [];
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    
    // Calculate line and character
    const textBefore = content.slice(0, start);
    const lines = textBefore.split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    
    results.push({
      ulid: match[0],
      start,
      end,
      line,
      character,
    });
  }
  
  return results;
}

/**
 * Find path references in content (e.g., ./file.tt, ../sibling/file.tt).
 */
export function findPathReferences(content: string): PathReference[] {
  const pattern = new RegExp(PATH_REFERENCE_PATTERN.source, 'g');
  const results: PathReference[] = [];
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    
    // Calculate line and character
    const textBefore = content.slice(0, start);
    const lines = textBefore.split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    
    results.push({
      path: match[0],
      start,
      end,
      line,
      character,
    });
  }
  
  return results;
}

/**
 * Get position information for a field in the frontmatter.
 */
export function getFieldPosition(
  content: string,
  fieldPath: string[]
): Position | null {
  const lines = content.split('\n');
  let indent = 0;
  const currentPath: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip frontmatter delimiters
    if (line.trim() === '---') {
      continue;
    }
    
    // Match key: value pattern
    const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):/);
    if (match) {
      const lineIndent = match[1].length;
      const key = match[2];
      
      // Adjust current path based on indentation
      while (currentPath.length > 0 && lineIndent <= indent) {
        currentPath.pop();
        indent -= 2;
      }
      
      currentPath.push(key);
      indent = lineIndent;
      
      // Check if this matches our target path
      if (arraysEqual(currentPath, fieldPath)) {
        return { line: i, character: lineIndent };
      }
    }
  }
  
  return null;
}

/**
 * Helper to compare two string arrays.
 */
function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Extract ID from file path (filename without .tt extension).
 */
export function extractIdFromPath(path: string): string {
  const filename = path.split('/').pop() || '';
  return filename.replace(/\.tt$/, '');
}

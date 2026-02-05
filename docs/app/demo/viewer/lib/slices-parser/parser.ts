/**
 * Canonical Slices (.tt) file parser.
 * 
 * Handles parsing and serialization of .tt files with YAML frontmatter
 * delimited by --- markers.
 */

import * as yaml from 'js-yaml';
import type {
  TTFrontmatter,
  StrictTTFrontmatter,
  ParsedFile,
  ParsedFileWithRanges,
  TTFile,
  JSONLRow,
} from './types.js';

/**
 * Extract filename from a path (without .tt extension).
 */
function extractFilename(path: string): string {
  return path.split('/').pop()?.replace(/\.tt$/, '') ?? path;
}

/**
 * Parse a .tt file into its components.
 * 
 * @param content - Raw file content
 * @param path - File path for reference
 * @returns Parsed file structure
 */
export function parseFile(content: string, path: string): ParsedFile {
  const filename = extractFilename(path);

  const result: ParsedFile = {
    path,
    filename,
    raw: content,
    tt: null,
    frontmatter: null,
    body: '',
    hasFrontmatter: false,
  };

  // Check for frontmatter delimiters
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    result.parseError = 'File does not start with frontmatter delimiter (---)';
    result.body = content;
    return result;
  }

  // Find the closing delimiter
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    result.parseError = 'Missing closing frontmatter delimiter (---)';
    result.body = content;
    return result;
  }

  result.hasFrontmatter = true;

  // Extract frontmatter YAML
  const frontmatterYaml = lines.slice(1, closingIndex).join('\n');

  // Extract body (everything after closing delimiter)
  result.body = lines.slice(closingIndex + 1).join('\n');

  // Parse YAML
  try {
    const parsed = yaml.load(frontmatterYaml) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object') {
      result.frontmatter = parsed;
      if ('tt' in parsed && parsed.tt && typeof parsed.tt === 'object') {
        result.tt = parsed.tt as TTFrontmatter;
      }
    }
  } catch (e) {
    result.parseError = `YAML parse error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return result;
}

/**
 * Parse a .tt file with range information for editor integration.
 * 
 * @param content - Raw file content
 * @param path - File path for reference
 * @returns Parsed file with character ranges
 */
export function parseFileWithRanges(content: string, path: string): ParsedFileWithRanges | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatterEnd = frontmatterMatch[0].length;
  const parsed = parseFile(content, path);
  
  if (!parsed.hasFrontmatter || parsed.parseError) {
    return null;
  }

  return {
    ...parsed,
    frontmatterRange: {
      start: 0,
      end: frontmatterEnd - 1,
    },
    bodyRange: {
      start: frontmatterEnd,
      end: content.length,
    },
  };
}

/**
 * Parse a .tt file for SDK operations with guaranteed required fields.
 * 
 * @param content - Raw file content
 * @param path - File path for reference
 * @returns TTFile structure with required fields guaranteed
 * @throws Error if the file is invalid or missing tt namespace
 */
export function parseFileStrict(content: string, path: string): TTFile {
  const parsed = parseFile(content, path);
  
  if (parsed.parseError) {
    throw new Error(`Invalid .tt file: ${parsed.parseError} in ${path}`);
  }
  
  if (!parsed.tt) {
    throw new Error(`Invalid .tt file: missing tt namespace in ${path}`);
  }

  // Build a properly typed frontmatter with defaults and required fields
  const frontmatter: StrictTTFrontmatter = {
    v: String(parsed.tt.v || '1'),
    id: String(parsed.tt.id || parsed.filename),
    title: String(parsed.tt.title || 'Untitled'),
    summary: parsed.tt.summary ? String(parsed.tt.summary) : '',
    kind: parsed.tt.kind,
    body: parsed.tt.body,
    contract: parsed.tt.contract,
    links: parsed.tt.links,
    payload: parsed.tt.payload,
    derived_from: parsed.tt.derived_from,
    created_at: parsed.tt.created_at,
    updated_at: parsed.tt.updated_at,
    source_hash: parsed.tt.source_hash,
    extensions: parsed.tt.extensions,
    meta: parsed.tt.meta,
  };

  return {
    frontmatter,
    body: parsed.body.trim(),
    path,
  };
}

/**
 * Serialize a TTFile back to string content.
 * 
 * @param file - TTFile to serialize
 * @returns Serialized file content
 */
export function serializeFile(file: TTFile): string {
  const tt: Record<string, unknown> = {};
  
  // Required fields
  tt.v = file.frontmatter.v;
  tt.id = file.frontmatter.id;
  tt.title = file.frontmatter.title;
  tt.summary = file.frontmatter.summary;
  
  // Optional fields
  if (file.frontmatter.kind) tt.kind = file.frontmatter.kind;
  if (file.frontmatter.created_at) tt.created_at = file.frontmatter.created_at;
  if (file.frontmatter.updated_at) tt.updated_at = file.frontmatter.updated_at;
  if (file.frontmatter.derived_from) tt.derived_from = file.frontmatter.derived_from;
  if (file.frontmatter.source_hash) tt.source_hash = file.frontmatter.source_hash;
  
  if (file.frontmatter.body) {
    const body: Record<string, unknown> = { type: file.frontmatter.body.type };
    // Include nested type-specific configs
    if (file.frontmatter.body.code) body.code = file.frontmatter.body.code;
    if (file.frontmatter.body.conversation) body.conversation = file.frontmatter.body.conversation;
    tt.body = body;
  }
  
  if (file.frontmatter.contract) {
    const contract: Record<string, unknown> = {};
    if (file.frontmatter.contract.purpose) contract.purpose = file.frontmatter.contract.purpose;
    if (file.frontmatter.contract.exclude && file.frontmatter.contract.exclude.length > 0) {
      contract.exclude = file.frontmatter.contract.exclude;
    }
    if (file.frontmatter.contract.format) contract.format = file.frontmatter.contract.format;
    if (file.frontmatter.contract.cleanup) contract.cleanup = file.frontmatter.contract.cleanup;
    if (file.frontmatter.contract.write) contract.write = file.frontmatter.contract.write;
    if (file.frontmatter.contract.overflow) contract.overflow = file.frontmatter.contract.overflow;
    tt.contract = contract;
  }
  
  if (file.frontmatter.links && file.frontmatter.links.length > 0) {
    tt.links = file.frontmatter.links.map(link => {
      const l: Record<string, unknown> = {
        rel: link.rel,
        to: link.to,
      };
      if (link.label) l.label = link.label;
      return l;
    });
  }

  if (file.frontmatter.payload) {
    tt.payload = file.frontmatter.payload;
  }

  // Preserve extension data from tools/applications
  if (file.frontmatter.extensions) {
    tt.extensions = file.frontmatter.extensions;
  }

  // Preserve user-defined metadata
  if (file.frontmatter.meta) {
    tt.meta = file.frontmatter.meta;
  }

  const frontmatter = { tt };
  const yamlContent = yaml.dump(frontmatter, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  // Ensure body starts with newline
  const body = file.body.startsWith('\n') ? file.body : '\n' + file.body;
  return `---\n${yamlContent}---${body}`;
}

/**
 * Parse a JSONL body into individual rows.
 * 
 * @param body - Body content (expected to be JSONL format)
 * @returns Array of parsed rows
 */
export function parseJSONLBody(body: string): JSONLRow[] {
  const rows: JSONLRow[] = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue; // Skip empty lines

    const row: JSONLRow = {
      line: i + 1, // 1-indexed for user-friendly output
      raw,
      data: null,
    };

    try {
      row.data = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      row.error = `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`;
    }

    rows.push(row);
  }

  return rows;
}

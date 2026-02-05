/**
 * Parser adapter for reference viewer.
 * Re-exports from @slices/parser with viewer-compatible interface.
 */

import { parseFileStrict } from './slices-parser';
import type { TTFile, TTFrontmatter, TTLink, TTContract } from './models';

/**
 * Parse a single .tt file content with viewer-compatible structure.
 */
export function parseTTFile(content: string, path: string): TTFile {
  const parsed = parseFileStrict(content, path);
  const fm = parsed.frontmatter;

  // Normalize links
  const links: TTLink[] = (fm.links || []).map((link: { rel?: string; to?: string }) => ({
    rel: String(link.rel || 'related'),
    to: String(link.to || ''),
  }));

  // Build viewer-compatible frontmatter
  const frontmatter: TTFrontmatter = {
    v: String(fm.v || '1'),
    id: fm.id,
    title: String(fm.title || 'Untitled'),
    summary: fm.summary ? String(fm.summary) : undefined,
    kind: fm.kind as 'context' | 'pointer' | undefined,
    body: fm.body ? {
      type: (fm.body.type || 'markdown') as 'markdown' | 'jsonl' | 'none' | 'code' | 'conversation' | 'text' | 'yaml' | 'routine' | 'csv',
      code: fm.body.code,
      conversation: fm.body.conversation,
      routine: (fm.body as any).routine,
    } : undefined,
    meta: fm.meta,
    contract: fm.contract ? {
      purpose: fm.contract.purpose ? String(fm.contract.purpose) : undefined,
      write: fm.contract.write as TTContract['write'] | undefined,
      overflow: fm.contract.overflow as TTContract['overflow'] | undefined,
    } : undefined,
    links: links.length > 0 ? links : undefined,
    created_at: fm.created_at ? String(fm.created_at) : undefined,
    updated_at: fm.updated_at ? String(fm.updated_at) : undefined,
  };

  return {
    id: frontmatter.id,
    path,
    frontmatter,
    body: parsed.body.trim(),
    raw: content,
  };
}

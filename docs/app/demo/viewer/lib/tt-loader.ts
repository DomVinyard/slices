/**
 * Load Slices files from the filesystem
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { TTFile } from './models';
import { parseTTFile } from './parser';

// Default Slices directory - relative to docs root
const DEFAULT_TT_DIR = process.env.SLICES_DIR || path.resolve(process.cwd(), 'docs/.slices');

/**
 * Get the Slices directory path
 */
export function getTTDir(): string {
  // In development, cwd is repo root; in production (Vercel), check both locations
  const candidates = [
    process.env.SLICES_DIR,
    path.resolve(process.cwd(), '.slices'),
    path.resolve(process.cwd(), 'docs/.slices'),
  ].filter(Boolean) as string[];
  
  for (const dir of candidates) {
    try {
      require('fs').accessSync(dir);
      return dir;
    } catch {}
  }
  
  return candidates[0] || '.slices';
}

/**
 * List all .tt files in the directory
 */
export async function listTTFiles(ttDir?: string): Promise<string[]> {
  const dir = ttDir || getTTDir();
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
    const files: string[] = [];
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.tt')) {
        // Handle both old and new Node.js versions
        const parentPath = (entry as any).parentPath || (entry as any).path || dir;
        files.push(path.join(parentPath, entry.name));
      }
    }
    
    return files.sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Load a single .tt file by path
 */
export async function loadTTFile(filePath: string): Promise<TTFile> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseTTFile(content, filePath);
}

/**
 * Load a .tt file by ID
 */
export async function loadTTFileById(id: string, ttDir?: string): Promise<TTFile | null> {
  const dir = ttDir || getTTDir();
  const filePath = path.join(dir, `${id}.tt`);
  
  try {
    return await loadTTFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Try to find in subdirectories
      const files = await listTTFiles(dir);
      for (const file of files) {
        if (file.endsWith(`${id}.tt`)) {
          return await loadTTFile(file);
        }
      }
      return null;
    }
    throw error;
  }
}

/**
 * Load all .tt files
 */
export async function loadAllTTFiles(ttDir?: string): Promise<TTFile[]> {
  const files = await listTTFiles(ttDir);
  const ttFiles: TTFile[] = [];
  
  for (const filePath of files) {
    try {
      const ttFile = await loadTTFile(filePath);
      ttFiles.push(ttFile);
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
    }
  }
  
  return ttFiles;
}

/**
 * Search files by content
 */
export async function searchTTFiles(
  query: string,
  ttDir?: string
): Promise<TTFile[]> {
  const files = await loadAllTTFiles(ttDir);
  const queryLower = query.toLowerCase();
  
  return files.filter((file) => {
    const titleMatch = file.frontmatter.title.toLowerCase().includes(queryLower);
    const summaryMatch = file.frontmatter.summary?.toLowerCase().includes(queryLower);
    const bodyMatch = file.body.toLowerCase().includes(queryLower);
    const purposeMatch = file.frontmatter.contract?.purpose?.toLowerCase().includes(queryLower);
    
    return titleMatch || summaryMatch || bodyMatch || purposeMatch;
  });
}

/**
 * Type definitions for TreeText (.tt) files.
 * This is the canonical source for all TreeText types.
 */

// ============================================================================
// Core Enums and Constants
// ============================================================================

/**
 * Relationship types for links between files.
 */
export type RelationshipType =
  // Dependency graph
  | 'depends_on'       // A depends on B
  | 'blocks'           // A blocks B (inverse of depends_on)
  
  // Argumentation
  | 'evidence_for'     // A supports B
  | 'evidence_against' // A contradicts B
  
  // Evolution
  | 'supersedes'       // A replaces B
  | 'superseded_by'    // A was replaced by B
  
  // Hierarchy (containment)
  | 'parent'           // A contains B (up)
  | 'child'            // A is contained by B (down)
  
  // Composition
  | 'part_of'          // A is part of B
  | 'has_part'         // A has part B (inverse of part_of)
  
  // Taxonomy
  | 'is_a'             // A is a type of B (transitive)
  | 'type_of'          // A is a type that includes B (inverse of is_a)
  
  // Derivation
  | 'derived_from'     // A was derived from B
  | 'source_of'        // A is source of B (inverse of derived_from)
  
  // Loose association
  | 'see_also'         // A is related to B (symmetric)
  
  // Routing (for agent content routing)
  | 'routes_to'        // A routes content to B (for reading/writing)
  | 'routed_from';     // A receives routed content from B

/**
 * Write modes for modifying file content.
 */
export type WriteMode = 'append' | 'replace' | 'supersede';

/**
 * Overflow strategies when a file reaches capacity.
 */
export type OverflowMode = 'split' | 'summarize' | 'archive' | 'error';

/**
 * Body content types.
 */
export type BodyType = 
  | 'markdown'      // Rich text with markdown formatting
  | 'jsonl'         // Newline-delimited JSON
  | 'none'          // No body (pointer files)
  | 'code'          // Source code
  | 'conversation'  // Agent conversations with tool calls
  | 'text'          // Plain text without markdown
  | 'yaml';         // Structured YAML data

/**
 * File kind: context (content is here) or pointer (content is elsewhere).
 */
export type KindType = 'context' | 'pointer';

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * A link from one file to another with a typed relationship.
 */
export interface TTLink {
  /** The relationship type */
  rel: RelationshipType | string;
  /** Target file ID or relative path */
  to: string;
  /** Optional label or description for the link */
  label?: string;
}

/**
 * Contract defining what belongs in a file and how to modify it.
 * Contracts are purely instructional - they tell agents how to handle content.
 * Use links with rel: routes_to for routing content elsewhere.
 */
export interface TTContract {
  /** Description of what content belongs in this file */
  purpose?: string;
  /** Topics that don't belong in this file (use links with routes_to for where to put them) */
  exclude?: string[];
  /** Guidelines for content structure (e.g., "One decision per section") */
  format?: string;
  /** Rules for maintenance and archival (e.g., "Archive entries older than 1 year") */
  cleanup?: string;
  /** How to modify: append, replace, or supersede */
  write?: WriteMode | string;
  /** Overflow strategy: split, summarize, archive, or error */
  overflow?: OverflowMode | string;
}

/**
 * Code body type configuration.
 */
export interface TTBodyCode {
  /** Language identifier (typescript, python, rust, etc.) */
  lang?: string;
  /** File extension (ts, py, rs, etc.) */
  extension?: string;
  /** Optional arguments or flags */
  args?: string[];
}

/**
 * Conversation format types.
 */
export type ConversationFormat = 'messages' | 'transcript' | 'compacted';

/**
 * Conversation body type configuration.
 * Supports agent conversations with tool calls, compaction, and OTEL tracing.
 */
export interface TTBodyConversation {
  /** Participant roles: user, assistant, system, tool */
  participants?: string[];
  /** Agent/model identifier */
  agent_id?: string;
  /** Conversation session ID */
  session_id?: string;
  /** Parent session for continuations */
  parent_session?: string;
  /** OpenTelemetry trace ID (32 hex chars) */
  trace_id?: string;
  /** OpenTelemetry span ID (16 hex chars) */
  span_id?: string;
  /** Conversation format */
  format?: ConversationFormat | string;
  /** Whether conversation includes tool calls */
  includes_tool_calls?: boolean;
  /** Whether conversation includes compaction notes */
  includes_compaction?: boolean;
}

/**
 * Body configuration.
 */
export interface TTBody {
  /** Content type: markdown, jsonl, none, code, conversation, text, yaml */
  type?: BodyType | string;
  /** Code-specific configuration (when type is 'code') */
  code?: TTBodyCode;
  /** Conversation-specific configuration (when type is 'conversation') */
  conversation?: TTBodyConversation;
}

/**
 * Arbitrary key-value metadata for user-defined fields.
 */
export interface TTMeta {
  [key: string]: unknown;
}

/**
 * External payload reference for pointer files.
 */
export interface TTPayload {
  /** URI to the external content */
  uri?: string;
  /** Hash for integrity checking */
  hash?: string;
  /** Size in bytes */
  size?: number;
}

/**
 * Derived content source reference.
 */
export interface TTDerivedFrom {
  /** Source file ID */
  id?: string;
  /** Hash of source content for freshness checking */
  hash?: string;
}

// ============================================================================
// Frontmatter and File Interfaces
// ============================================================================

/**
 * Frontmatter metadata for a TreeText file (all fields optional for parsing).
 */
export interface TTFrontmatter {
  /** TreeText spec version */
  v?: string;
  /** Unique identifier (ULID format) */
  id?: string;
  /** Display title for browsing */
  title?: string;
  /** 1-2 sentence description for discovery */
  summary?: string;
  /** File kind: context or pointer */
  kind?: KindType | string;
  /** Body content configuration */
  body?: TTBody;
  /** Contract defining what belongs and how to modify */
  contract?: TTContract;
  /** Links to other files */
  links?: TTLink[];
  /** External payload reference for pointer files */
  payload?: TTPayload;
  /** Source file reference for derived content */
  derived_from?: TTDerivedFrom;
  /** ISO timestamp when file was created */
  created_at?: string;
  /** ISO timestamp when file was last modified */
  updated_at?: string;
  /** Hash of source content (alternative to derived_from.hash) */
  source_hash?: string;
  /** 
   * Extension data from tools and applications.
   * Each tool registers under its own namespace key (e.g., extensions.memory_agent).
   * Extensions are preserved through parse/serialize round-trips.
   */
  extensions?: Record<string, unknown>;
  /** 
   * Arbitrary user-defined metadata.
   * Use for custom key-value pairs like author, tags, priority, etc.
   */
  meta?: TTMeta;
  /** Allow additional fields */
  [key: string]: unknown;
}

/**
 * Strict frontmatter with required fields guaranteed (after parseFileStrict).
 */
export interface StrictTTFrontmatter extends TTFrontmatter {
  /** TreeText spec version (guaranteed present) */
  v: string;
  /** Unique identifier (guaranteed present) */
  id: string;
  /** Display title (guaranteed present) */
  title: string;
  /** Summary (guaranteed present, may be empty) */
  summary: string;
}

/**
 * Result of parsing a .tt file.
 */
export interface ParsedFile {
  /** The file path */
  path: string;
  /** Filename without extension */
  filename: string;
  /** Raw file content */
  raw: string;
  /** Parsed frontmatter under tt: namespace */
  tt: TTFrontmatter | null;
  /** Full parsed frontmatter (including any non-tt fields) */
  frontmatter: Record<string, unknown> | null;
  /** Body content after frontmatter */
  body: string;
  /** Whether the file has valid frontmatter delimiters */
  hasFrontmatter: boolean;
  /** Parse error if any */
  parseError?: string;
}

/**
 * ParsedFile with range information for editor integration.
 */
export interface ParsedFileWithRanges extends ParsedFile {
  /** Character range of the frontmatter section */
  frontmatterRange: { start: number; end: number };
  /** Character range of the body section */
  bodyRange: { start: number; end: number };
}

/**
 * A complete TreeText file for SDK operations.
 * This interface uses StrictTTFrontmatter because parseFileStrict guarantees
 * required fields are present.
 */
export interface TTFile {
  /** Full frontmatter metadata with required fields guaranteed */
  frontmatter: StrictTTFrontmatter;
  /** Body content (markdown, JSONL, or empty) */
  body: string;
  /** File path relative to memory directory */
  path: string;
}

/**
 * Minimal file representation for search results and listings.
 */
export interface TTFilePreview {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Brief summary */
  summary: string;
  /** File path */
  path: string;
}

/**
 * Search result with matching content.
 */
export interface TTSearchResult extends TTFilePreview {
  /** Matching content excerpts */
  matches: string[];
}

// ============================================================================
// JSONL Types
// ============================================================================

/**
 * A single row from a JSONL body.
 */
export interface JSONLRow {
  /** 1-indexed line number */
  line: number;
  /** Raw JSON string */
  raw: string;
  /** Parsed JSON data, or null if invalid */
  data: Record<string, unknown> | null;
  /** Parse error if any */
  error?: string;
}

// ============================================================================
// Reference Types (for editor features)
// ============================================================================

/**
 * A ULID reference found in content.
 */
export interface ULIDReference {
  /** The ULID string */
  ulid: string;
  /** Start character position */
  start: number;
  /** End character position */
  end: number;
  /** 0-indexed line number */
  line: number;
  /** 0-indexed character position on line */
  character: number;
}

/**
 * A path reference found in content.
 */
export interface PathReference {
  /** The path string */
  path: string;
  /** Start character position */
  start: number;
  /** End character position */
  end: number;
  /** 0-indexed line number */
  line: number;
  /** 0-indexed character position on line */
  character: number;
}

/**
 * Position in a document.
 */
export interface Position {
  /** 0-indexed line number */
  line: number;
  /** 0-indexed character position */
  character: number;
}

/**
 * Constants for Slices file format.
 */

import type { RelationshipType } from './types.js';

/**
 * All valid relationship types.
 */
export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  // Dependency graph
  'depends_on',
  'blocks',
  // Argumentation
  'evidence_for',
  'evidence_against',
  // Evolution
  'supersedes',
  'superseded_by',
  // Hierarchy
  'parent',
  'child',
  // Composition
  'part_of',
  'has_part',
  // Taxonomy
  'is_a',
  'type_of',
  // Derivation
  'derived_from',
  'source_of',
  // Loose association
  'see_also',
  // Routing (for agent content routing)
  'routes_to',
  'routed_from',
] as const;

/**
 * Properties that define how relationships behave for inference.
 */
export interface RelationshipProperties {
  /** The inverse relationship type */
  inverse: RelationshipType;
  /** Whether the relationship is transitive (A→B→C implies A→C) */
  transitive: boolean;
  /** Whether the relationship is symmetric (A→B implies B→A) */
  symmetric: boolean;
}

/**
 * Relationship properties for inference computation.
 * 
 * Transitive relationships allow inference through chains:
 *   A depends_on B, B depends_on C → A depends_on C (inferred)
 * 
 * Symmetric relationships are bidirectional:
 *   A see_also B → B see_also A (inferred)
 * 
 * Use RELATIONSHIP_PROPERTIES[rel].inverse to get the inverse of a relationship.
 */
export const RELATIONSHIP_PROPERTIES: Record<RelationshipType, RelationshipProperties> = {
  // Dependency graph (transitive: A depends on B depends on C → A depends on C)
  depends_on:       { inverse: 'blocks',           transitive: true,  symmetric: false },
  blocks:           { inverse: 'depends_on',       transitive: true,  symmetric: false },
  
  // Argumentation (NOT transitive: evidence chains don't automatically compose)
  evidence_for:     { inverse: 'evidence_against', transitive: false, symmetric: false },
  evidence_against: { inverse: 'evidence_for',     transitive: false, symmetric: false },
  
  // Evolution (transitive: A supersedes B supersedes C → A supersedes C)
  supersedes:       { inverse: 'superseded_by',    transitive: true,  symmetric: false },
  superseded_by:    { inverse: 'supersedes',       transitive: true,  symmetric: false },
  
  // Hierarchy (transitive for ancestry queries)
  parent:           { inverse: 'child',            transitive: true,  symmetric: false },
  child:            { inverse: 'parent',           transitive: true,  symmetric: false },
  
  // Composition (transitive: part of part of → part of)
  part_of:          { inverse: 'has_part',         transitive: true,  symmetric: false },
  has_part:         { inverse: 'part_of',          transitive: true,  symmetric: false },
  
  // Taxonomy (is_a is transitive, type_of is NOT - instances aren't transitive)
  is_a:             { inverse: 'type_of',          transitive: true,  symmetric: false },
  type_of:          { inverse: 'is_a',             transitive: false, symmetric: false },
  
  // Derivation (transitive: derived from derived from → derived from)
  derived_from:     { inverse: 'source_of',        transitive: true,  symmetric: false },
  source_of:        { inverse: 'derived_from',     transitive: false, symmetric: false },
  
  // Loose association (symmetric but NOT transitive - friends of friends aren't friends)
  see_also:         { inverse: 'see_also',         transitive: false, symmetric: true  },
  
  // Routing (for agent content routing - NOT transitive)
  routes_to:        { inverse: 'routed_from',      transitive: false, symmetric: false },
  routed_from:      { inverse: 'routes_to',        transitive: false, symmetric: false },
};

/**
 * Get the inverse of a relationship type.
 * @param rel - The relationship type
 * @returns The inverse relationship type
 */
export function getInverseRelationship(rel: RelationshipType): RelationshipType {
  return RELATIONSHIP_PROPERTIES[rel].inverse;
}

/**
 * Valid write modes for contracts.
 */
export const WRITE_MODES = ['append', 'replace', 'supersede'] as const;

/**
 * Valid overflow modes for contracts.
 */
export const OVERFLOW_MODES = ['split', 'summarize', 'archive', 'error'] as const;

/**
 * Valid body types.
 */
export const BODY_TYPES = ['markdown', 'jsonl', 'none', 'code', 'conversation', 'text', 'yaml'] as const;

/**
 * Common programming language identifiers for code body type.
 */
export const CODE_LANGUAGES = [
  'typescript', 'javascript', 'python', 'rust', 'go',
  'java', 'c', 'cpp', 'csharp', 'ruby', 'php', 'swift',
  'kotlin', 'scala', 'bash', 'shell', 'sql', 'html', 'css',
] as const;

/**
 * Valid conversation formats.
 */
export const CONVERSATION_FORMATS = ['messages', 'transcript', 'compacted'] as const;

/**
 * Valid conversation message roles.
 */
export const CONVERSATION_ROLES = ['user', 'assistant', 'system', 'tool_call', 'tool_result'] as const;

/**
 * OpenTelemetry trace ID pattern (32 hex characters).
 */
export const OTEL_TRACE_ID_PATTERN = /^[0-9a-f]{32}$/i;

/**
 * OpenTelemetry span ID pattern (16 hex characters).
 */
export const OTEL_SPAN_ID_PATTERN = /^[0-9a-f]{16}$/i;

/**
 * Valid file kinds.
 */
export const KIND_TYPES = ['context', 'pointer'] as const;

/**
 * ULID regex pattern (Crockford Base32, excludes I, L, O, U).
 */
export const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * ULID regex for finding references in content.
 */
export const ULID_REFERENCE_PATTERN = /\b[0-9A-HJKMNP-TV-Z]{26}\b/g;

/**
 * Path reference pattern for .tt files.
 */
export const PATH_REFERENCE_PATTERN = /(?:\.\.?\/[^\s"'\]]+\.tt|\/[^\s"'\]]+\.tt)/g;

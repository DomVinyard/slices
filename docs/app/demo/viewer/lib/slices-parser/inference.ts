/**
 * Inference engine for Slices relationships.
 * 
 * Provides BFS-based transitive closure computation and symmetric expansion
 * for relationship inference. All inference is lazy (computed on-demand)
 * and depth-limited to prevent runaway queries.
 * 
 * Based on best practices from:
 * - OWL/RDF property characteristics (W3C standards)
 * - Neo4j production patterns (bounded traversal)
 * - W3C PROV (provenance tracking via 'via' field)
 */

import type { RelationshipType } from './types.js';
import { RELATIONSHIP_PROPERTIES } from './constants.js';

// ============================================================================
// Types
// ============================================================================

/**
 * An edge in the graph (explicit relationship).
 */
export interface GraphEdge {
  /** Source file ID */
  from: string;
  /** Target file ID */
  to: string;
  /** Relationship type */
  rel: RelationshipType;
}

/**
 * An inferred edge derived from transitive or symmetric relationships.
 */
export interface InferredEdge {
  /** Source file ID */
  from: string;
  /** Target file ID */
  to: string;
  /** Relationship type */
  rel: RelationshipType;
  /** Marker that this edge was inferred, not explicit */
  inferred: true;
  /** 
   * Intermediate nodes that produced this inference.
   * For transitive: A→B→C produces via: ['B']
   * For symmetric: A→B produces via: [] (no intermediates)
   */
  via: string[];
}

/**
 * Options for inference operations.
 */
export interface InferenceOptions {
  /** 
   * Maximum depth for transitive closure traversal.
   * Default: 10 (based on Neo4j best practices for bounded queries)
   */
  maxDepth?: number;
}

/**
 * Result of computing transitive closure from a starting node.
 */
export interface TransitiveClosureResult {
  /** The starting node ID */
  startId: string;
  /** The relationship type traversed */
  rel: RelationshipType;
  /** All reachable nodes (including direct neighbors) */
  reachable: string[];
  /** Inferred edges (excludes direct edges) */
  inferred: InferredEdge[];
  /** Whether traversal was limited by maxDepth */
  truncated: boolean;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Compute transitive closure from a starting node using BFS.
 * 
 * This is a lazy algorithm: it only computes reachability from one node,
 * not the full graph closure. It's bounded by maxDepth to prevent
 * runaway queries on graphs with cycles.
 * 
 * @param edges - All edges in the graph
 * @param startId - The node to start from
 * @param rel - The relationship type to traverse
 * @param options - Inference options (maxDepth)
 * @returns Transitive closure result with inferred edges
 * 
 * @example
 * ```typescript
 * const edges = [
 *   { from: 'A', to: 'B', rel: 'is_a' },
 *   { from: 'B', to: 'C', rel: 'is_a' },
 * ];
 * const result = computeTransitiveClosure(edges, 'A', 'is_a');
 * // result.inferred = [{ from: 'A', to: 'C', rel: 'is_a', inferred: true, via: ['B'] }]
 * ```
 */
export function computeTransitiveClosure(
  edges: GraphEdge[],
  startId: string,
  rel: RelationshipType,
  options: InferenceOptions = {}
): TransitiveClosureResult {
  const props = RELATIONSHIP_PROPERTIES[rel];
  
  // Non-transitive relationships don't produce inferences
  if (!props || !props.transitive) {
    return {
      startId,
      rel,
      reachable: [],
      inferred: [],
      truncated: false,
    };
  }
  
  const maxDepth = options.maxDepth ?? 10;
  const visited = new Set<string>();
  const inferred: InferredEdge[] = [];
  const reachable: string[] = [];
  let truncated = false;
  
  // Build adjacency list for this relationship type
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.rel === rel) {
      if (!adj.has(edge.from)) adj.set(edge.from, []);
      adj.get(edge.from)!.push(edge.to);
    }
  }
  
  // BFS with path tracking
  interface QueueItem {
    id: string;
    depth: number;
    path: string[];  // Nodes visited to reach this node
  }
  
  const queue: QueueItem[] = [{ id: startId, depth: 0, path: [] }];
  
  while (queue.length > 0) {
    const { id, depth, path } = queue.shift()!;
    
    // Check depth limit
    if (depth >= maxDepth) {
      truncated = true;
      continue;
    }
    
    // Skip if already visited
    if (visited.has(id)) continue;
    visited.add(id);
    
    const neighbors = adj.get(id) || [];
    for (const neighbor of neighbors) {
      const newPath = [...path, id];
      
      // Track all reachable nodes
      if (!reachable.includes(neighbor)) {
        reachable.push(neighbor);
      }
      
      // If path length > 1, this is an inferred (not direct) relationship
      // path = [] means we're at startId, path = [startId] means direct neighbor
      if (newPath.length > 1) {
        // Check if we already have this inferred edge
        const existing = inferred.find(e => e.to === neighbor);
        if (!existing) {
          inferred.push({
            from: startId,
            to: neighbor,
            rel,
            inferred: true,
            via: newPath.slice(1),  // Exclude startId from via
          });
        }
      }
      
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, depth: depth + 1, path: newPath });
      }
    }
  }
  
  return {
    startId,
    rel,
    reachable,
    inferred,
    truncated,
  };
}

/**
 * Expand symmetric relationships by adding reverse edges where missing.
 * 
 * For symmetric relationships like `see_also`, if A→B exists but B→A
 * doesn't, this function returns the missing B→A as an inferred edge.
 * 
 * @param edges - All edges in the graph
 * @returns Inferred reverse edges for symmetric relationships
 * 
 * @example
 * ```typescript
 * const edges = [{ from: 'A', to: 'B', rel: 'see_also' }];
 * const inferred = expandSymmetric(edges);
 * // inferred = [{ from: 'B', to: 'A', rel: 'see_also', inferred: true, via: [] }]
 * ```
 */
export function expandSymmetric(edges: GraphEdge[]): InferredEdge[] {
  const inferred: InferredEdge[] = [];
  const existing = new Set(edges.map(e => `${e.from}→${e.to}:${e.rel}`));
  
  for (const edge of edges) {
    const props = RELATIONSHIP_PROPERTIES[edge.rel];
    if (!props || !props.symmetric) continue;
    
    const reverseKey = `${edge.to}→${edge.from}:${edge.rel}`;
    if (!existing.has(reverseKey)) {
      inferred.push({
        from: edge.to,
        to: edge.from,
        rel: edge.rel,
        inferred: true,
        via: [],  // Symmetric inference has no intermediate nodes
      });
      existing.add(reverseKey);
    }
  }
  
  return inferred;
}

/**
 * Check if a relationship type supports transitive inference.
 * 
 * @param rel - The relationship type to check
 * @returns true if the relationship is transitive
 */
export function isTransitive(rel: RelationshipType): boolean {
  const props = RELATIONSHIP_PROPERTIES[rel];
  return props?.transitive ?? false;
}

/**
 * Check if a relationship type is symmetric.
 * 
 * @param rel - The relationship type to check
 * @returns true if the relationship is symmetric
 */
export function isSymmetric(rel: RelationshipType): boolean {
  const props = RELATIONSHIP_PROPERTIES[rel];
  return props?.symmetric ?? false;
}

/**
 * Get all transitive relationship types.
 * 
 * @returns Array of relationship types that support transitive inference
 */
export function getTransitiveRelationships(): RelationshipType[] {
  return (Object.keys(RELATIONSHIP_PROPERTIES) as RelationshipType[])
    .filter(rel => RELATIONSHIP_PROPERTIES[rel].transitive);
}

/**
 * Get all symmetric relationship types.
 * 
 * @returns Array of relationship types that are symmetric
 */
export function getSymmetricRelationships(): RelationshipType[] {
  return (Object.keys(RELATIONSHIP_PROPERTIES) as RelationshipType[])
    .filter(rel => RELATIONSHIP_PROPERTIES[rel].symmetric);
}

/**
 * Compute all inferences for a graph (both transitive and symmetric).
 * 
 * This is a convenience function that computes transitive closure from
 * every node for every transitive relationship, plus symmetric expansion.
 * Use with caution on large graphs.
 * 
 * @param edges - All edges in the graph
 * @param nodeIds - All node IDs in the graph
 * @param options - Inference options
 * @returns All inferred edges
 */
export function computeAllInferences(
  edges: GraphEdge[],
  nodeIds: string[],
  options: InferenceOptions = {}
): InferredEdge[] {
  const allInferred: InferredEdge[] = [];
  const seen = new Set<string>();
  
  // Symmetric expansion first
  const symmetricInferred = expandSymmetric(edges);
  for (const edge of symmetricInferred) {
    const key = `${edge.from}→${edge.to}:${edge.rel}`;
    if (!seen.has(key)) {
      seen.add(key);
      allInferred.push(edge);
    }
  }
  
  // Transitive closure from each node for each transitive relationship
  const transitiveRels = getTransitiveRelationships();
  for (const rel of transitiveRels) {
    for (const nodeId of nodeIds) {
      const result = computeTransitiveClosure(edges, nodeId, rel, options);
      for (const edge of result.inferred) {
        const key = `${edge.from}→${edge.to}:${edge.rel}`;
        if (!seen.has(key)) {
          seen.add(key);
          allInferred.push(edge);
        }
      }
    }
  }
  
  return allInferred;
}

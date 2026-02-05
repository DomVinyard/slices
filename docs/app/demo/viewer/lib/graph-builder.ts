/**
 * Build a graph from TreeText files
 */

import type { TTFile, Graph, GraphNode, GraphEdge } from './models';

/**
 * Build a graph from an array of TTFiles
 */
export function buildGraph(files: TTFile[]): Graph {
  // Create a map for quick ID lookup
  const fileMap = new Map<string, TTFile>();
  files.forEach((file) => fileMap.set(file.id, file));

  // Build nodes
  const nodes: GraphNode[] = files.map((file) => ({
    id: file.id,
    title: file.frontmatter.title,
    summary: file.frontmatter.summary,
    kind: file.frontmatter.kind,
  }));

  // Build edges from links
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const file of files) {
    const links = file.frontmatter.links || [];
    
    for (const link of links) {
      // Only create edges to files that exist
      if (fileMap.has(link.to)) {
        const edgeKey = `${file.id}->${link.to}:${link.rel}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edges.push({
            source: file.id,
            target: link.to,
            rel: link.rel,
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: Graph): {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  orphanCount: number;
  centralNodes: Array<{ id: string; title: string; inDegree: number }>;
} {
  const { nodes, edges } = graph;
  
  // Calculate in-degree for each node
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  });
  
  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    
    inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    outDegree.set(sourceId, (outDegree.get(sourceId) || 0) + 1);
  });
  
  // Find orphans (no incoming links)
  const orphans = nodes.filter((node) => inDegree.get(node.id) === 0);
  
  // Find most central nodes (highest in-degree)
  const centralNodes = [...nodes]
    .map((node) => ({
      id: node.id,
      title: node.title,
      inDegree: inDegree.get(node.id) || 0,
    }))
    .sort((a, b) => b.inDegree - a.inDegree)
    .slice(0, 10);
  
  // Average degree
  const totalDegree = edges.length * 2;
  const avgDegree = nodes.length > 0 ? totalDegree / nodes.length : 0;
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    avgDegree: Math.round(avgDegree * 100) / 100,
    orphanCount: orphans.length,
    centralNodes,
  };
}

/**
 * Get the local neighborhood of a node
 */
export function getNeighborhood(
  graph: Graph,
  nodeId: string,
  depth: number = 1
): Graph {
  const visited = new Set<string>([nodeId]);
  const queue: Array<{ id: string; currentDepth: number }> = [
    { id: nodeId, currentDepth: 0 },
  ];

  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;
    
    if (currentDepth >= depth) continue;
    
    // Find connected nodes
    for (const edge of graph.edges) {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      
      if (sourceId === id && !visited.has(targetId)) {
        visited.add(targetId);
        queue.push({ id: targetId, currentDepth: currentDepth + 1 });
      }
      if (targetId === id && !visited.has(sourceId)) {
        visited.add(sourceId);
        queue.push({ id: sourceId, currentDepth: currentDepth + 1 });
      }
    }
  }

  // Filter nodes and edges to only include visited
  const filteredNodes = graph.nodes.filter((node) => visited.has(node.id));
  const filteredEdges = graph.edges.filter((edge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    return visited.has(sourceId) && visited.has(targetId);
  });

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Get incoming and outgoing links for a file
 */
export function getFileLinks(
  files: TTFile[],
  fileId: string
): { incoming: Array<{ file: TTFile; rel: string }>; outgoing: Array<{ file: TTFile; rel: string }> } {
  const fileMap = new Map<string, TTFile>();
  files.forEach((file) => fileMap.set(file.id, file));
  
  const incoming: Array<{ file: TTFile; rel: string }> = [];
  const outgoing: Array<{ file: TTFile; rel: string }> = [];
  
  const targetFile = fileMap.get(fileId);
  
  // Find outgoing links from this file
  if (targetFile?.frontmatter.links) {
    for (const link of targetFile.frontmatter.links) {
      const linkedFile = fileMap.get(link.to);
      if (linkedFile) {
        outgoing.push({ file: linkedFile, rel: link.rel });
      }
    }
  }
  
  // Find incoming links to this file
  for (const file of files) {
    if (file.id === fileId) continue;
    
    const links = file.frontmatter.links || [];
    for (const link of links) {
      if (link.to === fileId) {
        incoming.push({ file, rel: link.rel });
      }
    }
  }
  
  return { incoming, outgoing };
}

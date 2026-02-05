import { NextRequest, NextResponse } from 'next/server';
import { loadAllTTFiles } from '@/app/demo/viewer/lib/tt-loader';
import { buildGraph, getGraphStats, getNeighborhood } from '@/app/demo/viewer/lib/graph-builder';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nodeId = searchParams.get('node');
  const depth = parseInt(searchParams.get('depth') || '2', 10);
  const statsOnly = searchParams.get('stats') === 'true';

  try {
    const files = await loadAllTTFiles();
    let graph = buildGraph(files);

    // If a specific node is requested, get its neighborhood
    if (nodeId) {
      graph = getNeighborhood(graph, nodeId, depth);
    }

    const stats = getGraphStats(graph);

    if (statsOnly) {
      return NextResponse.json({ stats });
    }

    return NextResponse.json({
      nodes: graph.nodes,
      edges: graph.edges.map((e) => ({
        source: typeof e.source === 'string' ? e.source : e.source.id,
        target: typeof e.target === 'string' ? e.target : e.target.id,
        rel: e.rel,
      })),
      stats,
    });
  } catch (error) {
    console.error('Error building graph:', error);
    return NextResponse.json(
      { error: 'Failed to build graph' },
      { status: 500 }
    );
  }
}

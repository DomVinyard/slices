'use client';

import { GraphView } from './graph-view';
import type { Graph } from '@/app/demo/viewer/lib/models';

interface MiniGraphProps {
  graph: Graph;
  selectedNodeId?: string;
}

export function MiniGraph({ graph, selectedNodeId }: MiniGraphProps) {
  return <GraphView graph={graph} selectedNodeId={selectedNodeId} />;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { clsx } from 'clsx';
import type { Graph, GraphNode, GraphEdge } from '@/app/demo/viewer/lib/models';

interface GraphViewProps {
  graph: Graph;
  selectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

const REL_COLORS: Record<string, string> = {
  depends_on: '#f97316',
  implements: '#22c55e',
  extends: '#3b82f6',
  related: '#a855f7',
  references: '#06b6d4',
  supersedes: '#ef4444',
  derived_from: '#eab308',
};

export function GraphView({
  graph,
  selectedNodeId,
  onNodeClick,
  className,
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // D3 force simulation
  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create copy of data for D3
    const nodes: GraphNode[] = graph.nodes.map((n) => ({ ...n }));
    const edges: GraphEdge[] = graph.edges.map((e) => ({
      source: typeof e.source === 'string' ? e.source : e.source.id,
      target: typeof e.target === 'string' ? e.target : e.target.id,
      rel: e.rel,
    }));

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Add zoom behavior
    const g = svg.append('g');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#8b949e');

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', (d) => REL_COLORS[d.rel] || '#8b949e')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Link labels
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(edges)
      .join('text')
      .attr('font-size', 9)
      .attr('fill', (d) => REL_COLORS[d.rel] || '#8b949e')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .text((d) => d.rel);

    // Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer');

    // Add drag behavior with proper typing
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node.call(dragBehavior as any);

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => (d.id === selectedNodeId ? 12 : 8))
      .attr('fill', (d) =>
        d.id === selectedNodeId ? '#58a6ff' : d.kind === 'pointer' ? '#d29922' : '#3fb950'
      )
      .attr('stroke', (d) => (d.id === selectedNodeId ? '#58a6ff' : '#30363d'))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 1.5));

    // Node labels
    node
      .append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('font-size', 11)
      .attr('fill', '#c9d1d9')
      .text((d) => d.title.length > 25 ? d.title.slice(0, 25) + '...' : d.title);

    // Click handler
    node.on('click', (event, d) => {
      onNodeClick?.(d.id);
    });

    // Tooltip
    node
      .append('title')
      .text((d) => `${d.title}\n${d.summary || ''}`);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, dimensions, selectedNodeId, onNodeClick]);

  return (
    <div ref={containerRef} className={clsx('w-full h-full min-h-[400px]', className)}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-tt-bg rounded-lg border border-tt-border"
      />
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraphView } from "@/app/demo/viewer/components/graph-view";
import { Breadcrumb } from "@/app/demo/viewer/components/breadcrumb";
import type { GraphNode, GraphEdge } from "@/app/demo/viewer/lib/models";

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    orphanCount: number;
    centralNodes: Array<{ id: string; title: string; inDegree: number }>;
  };
}

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeId = searchParams.get("node");
  const depth = parseInt(searchParams.get("depth") || "2", 10);

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (nodeId) params.set("node", nodeId);
        params.set("depth", depth.toString());

        const response = await fetch(`/demo/viewer/api/graph?${params}`);
        if (!response.ok) throw new Error("Failed to fetch graph");

        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchGraph();
  }, [nodeId, depth]);

  const handleNodeClick = (id: string) => {
    router.push(`/demo/viewer/${id}`);
  };

  const handleFocusNode = (id: string) => {
    router.push(`/demo/viewer/graph?node=${id}&depth=${depth}`);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Shelf", href: "/demo/viewer" },
          { label: "Graph" },
          ...(nodeId ? [{ label: `Node: ${nodeId.slice(0, 8)}...` }] : []),
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tt-text">Knowledge Graph</h1>

        <div className="flex items-center gap-4">
          {/* Depth selector */}
          <label className="flex items-center gap-2 text-sm text-tt-muted">
            Depth:
            <select
              value={depth}
              onChange={(e) => {
                const newDepth = e.target.value;
                const params = new URLSearchParams();
                if (nodeId) params.set("node", nodeId);
                params.set("depth", newDepth);
                router.push(`/demo/viewer/graph?${params}`);
              }}
              className="px-2 py-1 rounded border border-tt-border bg-tt-surface text-tt-text"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>

          {/* Reset button */}
          {nodeId && (
            <button
              onClick={() => router.push("/demo/viewer/graph")}
              className="px-3 py-1.5 text-sm rounded border border-tt-border bg-tt-surface text-tt-muted hover:text-tt-text hover:border-tt-accent/50 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-tt-muted">Loading graph...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-tt-danger">{error}</div>
        </div>
      )}

      {graphData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Graph */}
          <div className="lg:col-span-3 h-[600px]">
            <GraphView
              graph={graphData}
              selectedNodeId={nodeId || undefined}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Stats */}
            <div className="p-4 rounded-lg bg-tt-surface border border-tt-border">
              <h3 className="text-sm font-medium text-tt-text mb-3">
                Statistics
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-tt-muted">Nodes</dt>
                  <dd className="text-tt-text">{graphData.stats.nodeCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-tt-muted">Edges</dt>
                  <dd className="text-tt-text">{graphData.stats.edgeCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-tt-muted">Avg Degree</dt>
                  <dd className="text-tt-text">{graphData.stats.avgDegree}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-tt-muted">Orphans</dt>
                  <dd className="text-tt-text">
                    {graphData.stats.orphanCount}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Central nodes */}
            {graphData.stats.centralNodes.length > 0 && (
              <div className="p-4 rounded-lg bg-tt-surface border border-tt-border">
                <h3 className="text-sm font-medium text-tt-text mb-3">
                  Most Connected
                </h3>
                <ul className="space-y-2">
                  {graphData.stats.centralNodes.slice(0, 5).map((node) => (
                    <li key={node.id}>
                      <button
                        onClick={() => handleFocusNode(node.id)}
                        className="w-full text-left text-sm hover:text-tt-accent transition-colors"
                      >
                        <span className="truncate block">{node.title}</span>
                        <span className="text-tt-muted text-xs">
                          {node.inDegree} incoming
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legend */}
            <div className="p-4 rounded-lg bg-tt-surface border border-tt-border">
              <h3 className="text-sm font-medium text-tt-text mb-3">Legend</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-tt-muted">Context</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-tt-muted">Pointer</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-tt-accent" />
                  <span className="text-tt-muted">Selected</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-tt-muted">Loading graph...</div>
        </div>
      }
    >
      <GraphPageContent />
    </Suspense>
  );
}

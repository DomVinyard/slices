import { notFound } from "next/navigation";
import {
  loadTTFileById,
  loadAllTTFiles,
} from "@/app/demo/viewer/lib/tt-loader";
import {
  getFileLinks,
  buildGraph,
  getNeighborhood,
} from "@/app/demo/viewer/lib/graph-builder";
import { FileDetail } from "@/app/demo/viewer/components/file-detail";
import { Breadcrumb } from "@/app/demo/viewer/components/breadcrumb";
import { MiniGraph } from "@/app/demo/viewer/components/mini-graph";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function FilePage({ params }: PageProps) {
  const file = await loadTTFileById(params.id);

  if (!file) {
    notFound();
  }

  const allFiles = await loadAllTTFiles();
  const { incoming, outgoing } = getFileLinks(allFiles, params.id);

  // Build neighborhood graph for mini visualization
  const graph = buildGraph(allFiles);
  const neighborhood = getNeighborhood(graph, params.id, 1);

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Shelf", href: "/demo/viewer" },
          { label: file.frontmatter.title },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <FileDetail
            file={file}
            incomingLinks={incoming}
            outgoingLinks={outgoing}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Mini Graph */}
          {neighborhood.edges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-tt-text">
                  Neighborhood
                </h3>
                <Link
                  href={`/demo/viewer/graph?node=${params.id}`}
                  className="text-xs text-tt-accent hover:underline"
                >
                  Expand →
                </Link>
              </div>
              <div className="h-[400px] rounded-lg">
                <MiniGraph graph={neighborhood} selectedNodeId={params.id} />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4 rounded-lg bg-tt-surface border border-tt-border space-y-3">
            <h3 className="text-sm font-medium text-tt-text">Actions</h3>
            <div className="flex flex-col gap-2">
              <Link
                href={`/demo/viewer/graph?node=${params.id}`}
                className="px-3 py-2 text-sm rounded-md bg-tt-bg border border-tt-border hover:border-tt-accent/50 transition-colors"
              >
                View in Graph
              </Link>
              <Link
                href="/demo/viewer/timeline"
                className="px-3 py-2 text-sm rounded-md bg-tt-bg border border-tt-border hover:border-tt-accent/50 transition-colors"
              >
                View in Timeline
              </Link>
            </div>
          </div>

          {/* File Info */}
          <div className="p-4 rounded-lg bg-tt-surface border border-tt-border">
            <h3 className="text-sm font-medium text-tt-text mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-tt-muted">ID</dt>
                <dd className="font-mono text-tt-text truncate max-w-[150px]">
                  {file.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tt-muted">Version</dt>
                <dd className="text-tt-text">v{file.frontmatter.v}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tt-muted">Kind</dt>
                <dd className="text-tt-text">
                  {file.frontmatter.kind || "context"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tt-muted">Body Type</dt>
                <dd className="text-tt-text">
                  {file.frontmatter.body?.type || "markdown"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tt-muted">Outgoing Links</dt>
                <dd className="text-tt-text">{outgoing.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tt-muted">Incoming Links</dt>
                <dd className="text-tt-text">{incoming.length}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

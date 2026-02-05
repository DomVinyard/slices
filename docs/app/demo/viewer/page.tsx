import { loadAllTTFiles } from '@/app/demo/viewer/lib/tt-loader';
import { buildGraph, getGraphStats } from '@/app/demo/viewer/lib/graph-builder';
import { Shelf } from '@/app/demo/viewer/components/shelf';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const files = await loadAllTTFiles();
  const graph = buildGraph(files);
  const stats = getGraphStats(graph);

  // Sort files by title
  const sortedFiles = [...files].sort((a, b) =>
    a.frontmatter.title.localeCompare(b.frontmatter.title)
  );

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Files" value={stats.nodeCount} href="/demo/viewer" />
        <StatCard label="Links" value={stats.edgeCount} href="/demo/viewer/graph" />
        <StatCard label="Orphans" value={stats.orphanCount} />
        <StatCard label="Avg Connections" value={stats.avgDegree.toFixed(1)} />
      </div>

      {/* Quick Links */}
      {stats.centralNodes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-tt-text mb-4">
            Most Connected
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.centralNodes.slice(0, 5).map((node) => (
              <Link
                key={node.id}
                href={`/demo/viewer/${node.id}`}
                className="px-3 py-1.5 rounded-full text-sm bg-tt-surface border border-tt-border hover:border-tt-accent/50 transition-colors"
              >
                {node.title}
                <span className="ml-2 text-tt-muted">({node.inDegree})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Files */}
      <Shelf
        files={sortedFiles}
        title={`All Files (${files.length})`}
        emptyMessage="No TreeText files found. Create a .treetext directory with .tt files to get started."
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const content = (
    <div className="p-4 rounded-lg bg-tt-surface border border-tt-border">
      <div className="text-2xl font-bold text-tt-text">{value}</div>
      <div className="text-sm text-tt-muted">{label}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

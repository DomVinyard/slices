import { searchTTFiles, loadAllTTFiles } from "@/app/demo/viewer/lib/tt-loader";
import { Shelf } from "@/app/demo/viewer/components/shelf";
import { SearchBox } from "@/app/demo/viewer/components/search-box";
import { Breadcrumb } from "@/app/demo/viewer/components/breadcrumb";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: { q?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || "";

  const files = query ? await searchTTFiles(query) : await loadAllTTFiles();

  // Group results by match type
  const titleMatches = files.filter((f) =>
    f.frontmatter.title.toLowerCase().includes(query.toLowerCase())
  );
  const summaryMatches = files.filter(
    (f) =>
      !titleMatches.includes(f) &&
      f.frontmatter.summary?.toLowerCase().includes(query.toLowerCase())
  );
  const bodyMatches = files.filter(
    (f) => !titleMatches.includes(f) && !summaryMatches.includes(f)
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Shelf", href: "/demo/viewer" },
          { label: "Search" },
          ...(query ? [{ label: `"${query}"` }] : []),
        ]}
      />

      <div className="max-w-xl mx-auto">
        <SearchBox initialQuery={query} className="w-full" />
      </div>

      {query && (
        <div className="text-center text-tt-muted">
          Found {files.length} {files.length === 1 ? "result" : "results"} for "
          {query}"
        </div>
      )}

      {query && files.length > 0 && (
        <div className="space-y-8">
          {titleMatches.length > 0 && (
            <Shelf
              files={titleMatches}
              title={`Title Matches (${titleMatches.length})`}
            />
          )}

          {summaryMatches.length > 0 && (
            <Shelf
              files={summaryMatches}
              title={`Summary Matches (${summaryMatches.length})`}
            />
          )}

          {bodyMatches.length > 0 && (
            <Shelf
              files={bodyMatches}
              title={`Content Matches (${bodyMatches.length})`}
            />
          )}
        </div>
      )}

      {query && files.length === 0 && (
        <div className="text-center py-12">
          <p className="text-tt-muted mb-4">No results found for "{query}"</p>
          <p className="text-sm text-tt-muted">
            Try a different search term or{" "}
            <a href="/demo/viewer" className="text-tt-accent hover:underline">
              browse all files
            </a>
          </p>
        </div>
      )}

      {!query && (
        <Shelf
          files={files}
          title="All Files"
          emptyMessage="No TreeText files found."
        />
      )}
    </div>
  );
}

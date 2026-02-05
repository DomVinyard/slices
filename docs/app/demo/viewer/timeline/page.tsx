import { loadAllTTFiles } from "@/app/demo/viewer/lib/tt-loader";
import { TimelineView } from "@/app/demo/viewer/components/timeline-view";
import { Breadcrumb } from "@/app/demo/viewer/components/breadcrumb";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const files = await loadAllTTFiles();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Shelf", href: "/demo/viewer" },
          { label: "Timeline" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tt-text">Timeline</h1>
        <span className="text-sm text-tt-muted">{files.length} files</span>
      </div>

      <TimelineView files={files} />
    </div>
  );
}

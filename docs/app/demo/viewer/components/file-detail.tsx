import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinkChip } from "./link-chip";
import { TableView } from "./table-view";
import type { TTFile } from "@/app/demo/viewer/lib/models";

interface FileDetailProps {
  file: TTFile;
  incomingLinks?: Array<{ file: TTFile; rel: string }>;
  outgoingLinks?: Array<{ file: TTFile; rel: string }>;
  className?: string;
}

export function FileDetail({
  file,
  incomingLinks = [],
  outgoingLinks = [],
  className,
}: FileDetailProps) {
  const { frontmatter, body, id } = file;

  const kind = frontmatter.kind || "context";
  const kindBadgeColor =
    kind === "pointer"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  const isCSV = frontmatter.body?.type === "csv";
  const isMarkdown =
    !frontmatter.body?.type || frontmatter.body?.type === "markdown";

  return (
    <article className={clsx("space-y-6", className)}>
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-tt-text">
            {frontmatter.title}
          </h1>
          <span
            className={clsx(
              "text-xs px-2 py-1 rounded border font-medium shrink-0",
              kindBadgeColor
            )}
          >
            {kind}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-tt-muted">
          <span className="font-mono">{id}</span>
          {frontmatter.body?.type && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">Type:</span>
              <span>{frontmatter.body.type}</span>
            </span>
          )}
          {frontmatter.created_at && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">Created:</span>
              <span>
                {new Date(frontmatter.created_at).toLocaleDateString()}
              </span>
            </span>
          )}
        </div>

        {/* Summary */}
        {frontmatter.summary && (
          <p className="text-tt-text/80 text-lg leading-relaxed">
            {frontmatter.summary}
          </p>
        )}

        {/* Contract */}
        {frontmatter.contract?.purpose && (
          <div className="p-3 rounded-lg bg-tt-bg border border-tt-border">
            <div className="text-xs text-tt-muted mb-1 uppercase tracking-wide">
              Contract
            </div>
            <p className="text-sm text-tt-text/80 italic">
              {frontmatter.contract.purpose}
            </p>
            {(frontmatter.contract.write || frontmatter.contract.overflow) && (
              <div className="flex gap-3 mt-2 text-xs text-tt-muted">
                {frontmatter.contract.write && (
                  <span>
                    Write:{" "}
                    <span className="text-tt-accent">
                      {frontmatter.contract.write}
                    </span>
                  </span>
                )}
                {frontmatter.contract.overflow && (
                  <span>
                    Overflow:{" "}
                    <span className="text-tt-accent">
                      {frontmatter.contract.overflow}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Body Content */}
      {body && (
        <div className="p-4 rounded-lg bg-tt-bg border border-tt-border">
          {isCSV ? (
            <TableView content={body} />
          ) : isMarkdown ? (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-tt-text prose-p:text-tt-text/90 prose-li:text-tt-text/90 prose-strong:text-tt-text prose-code:text-tt-accent prose-code:bg-tt-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-tt-surface prose-pre:border prose-pre:border-tt-border prose-table:text-tt-text/90 prose-th:text-tt-text prose-td:border-tt-border prose-th:border-tt-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-tt-text/90 font-mono">
              {body}
            </pre>
          )}
        </div>
      )}

      {/* Links */}
      {(outgoingLinks.length > 0 || incomingLinks.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-tt-text">Links</h2>

          {outgoingLinks.length > 0 && (
            <div>
              <h3 className="text-sm text-tt-muted mb-2">
                Outgoing ({outgoingLinks.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {outgoingLinks.map(({ file: linkedFile, rel }, i) => (
                  <LinkChip
                    key={`out-${i}`}
                    rel={rel}
                    targetId={linkedFile.id}
                    targetTitle={linkedFile.frontmatter.title}
                    direction="outgoing"
                  />
                ))}
              </div>
            </div>
          )}

          {incomingLinks.length > 0 && (
            <div>
              <h3 className="text-sm text-tt-muted mb-2">
                Incoming ({incomingLinks.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {incomingLinks.map(({ file: linkedFile, rel }, i) => (
                  <LinkChip
                    key={`in-${i}`}
                    rel={rel}
                    targetId={linkedFile.id}
                    targetTitle={linkedFile.frontmatter.title}
                    direction="incoming"
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </article>
  );
}

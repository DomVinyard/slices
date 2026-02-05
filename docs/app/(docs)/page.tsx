import { getMarkdownContent } from "@/lib/markdown";
import { CopyCommand } from "@/components/copy-command";

export default async function Home() {
  const { contentHtml } = await getMarkdownContent("index");

  return (
    <article className="prose prose-zinc">
      <div className="callout">
        <span className="callout-icon">🤖</span>
        <span>
          <strong>Are you an AI agent?</strong> You&apos;re reading the human
          docs. Go to <a href="/llms.txt">slices.info/llms.txt</a> instead — the
          full documentation in a single machine-readable file.
        </span>
      </div>

      <hr />

      <p>
        <strong>
          A file format for AI agent memory, and a complete toolkit for working
          with it.
        </strong>
      </p>

      <CopyCommand command="curl -fsSL slices.info/learn | sh" />

      <div
        className="mt-8"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}

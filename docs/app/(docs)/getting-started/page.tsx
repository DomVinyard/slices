import { getMarkdownContent } from "@/lib/markdown";

export default async function GettingStarted() {
  const { contentHtml } = await getMarkdownContent("getting-started");

  return (
    <article
      className="prose prose-zinc"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

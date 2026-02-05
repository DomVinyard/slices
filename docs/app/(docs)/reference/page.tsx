import { getMarkdownContent } from "@/lib/markdown";

export default async function Reference() {
  const { contentHtml } = await getMarkdownContent("reference");

  return (
    <article
      className="prose prose-zinc"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

import { getMarkdownContent } from "@/lib/markdown";

export default async function Toolkit() {
  const { contentHtml } = await getMarkdownContent("toolkit");

  return (
    <article
      className="prose prose-zinc"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

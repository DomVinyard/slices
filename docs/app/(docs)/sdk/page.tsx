import { getMarkdownContent } from "@/lib/markdown";

export default async function SDK() {
  const { contentHtml } = await getMarkdownContent("sdk");

  return (
    <article
      className="prose prose-zinc"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

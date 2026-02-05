import { getMarkdownContent } from "@/lib/markdown";

export default async function Spec() {
  const { contentHtml } = await getMarkdownContent("spec");

  return (
    <article
      className="prose prose-zinc"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

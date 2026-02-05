import { getMarkdownContent } from "@/lib/markdown";

export default async function Home() {
  const { contentHtml } = await getMarkdownContent("index");

  return (
    <article
      className="prose prose-zinc"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

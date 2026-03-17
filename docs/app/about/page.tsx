import fs from "fs";
import path from "path";
import { renderMarkdown } from "@/lib/markdown";
import { Nav } from "@/components/nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — slices",
  description: "Motivation and thinking behind slices",
};

export default async function AboutPage() {
  const filePath = path.join(process.cwd(), "content", "about.md");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const html = await renderMarkdown(fileContents);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <article
          className="prose prose-invert prose-zinc max-w-none
            prose-headings:scroll-mt-20
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-8
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-16 prose-h2:mb-4 prose-h2:pt-8 prose-h2:border-t prose-h2:border-zinc-800
            prose-h3:text-lg prose-h3:font-medium prose-h3:mt-10 prose-h3:mb-3
            prose-p:text-zinc-300 prose-p:leading-relaxed
            prose-li:text-zinc-300
            prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
            prose-code:text-indigo-300 prose-code:font-normal
            prose-strong:text-zinc-200
          "
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </>
  );
}

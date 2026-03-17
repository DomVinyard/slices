import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { renderMarkdown } from "@/lib/markdown";
import { Nav } from "@/components/nav";
import { CopyCommand } from "@/components/copy-command";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specification — slices",
  description: "Slices v0.2 format specification",
};

export default async function SpecPage() {
  const filePath = path.join(process.cwd(), "content", "spec.md");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { content } = matter(fileContents);
  const html = await renderMarkdown(content);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 text-center">
          <p className="text-sm text-zinc-400 mb-3">
            Copy and paste into your agent to install the skill:
          </p>
          <CopyCommand command="curl -fsSL slices.info/install | sh" />
        </div>
        <article
          className="prose prose-invert prose-zinc max-w-none
            prose-headings:scroll-mt-20
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-8
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-16 prose-h2:mb-4 prose-h2:pt-8 prose-h2:border-t prose-h2:border-zinc-800
            prose-h3:text-lg prose-h3:font-medium prose-h3:mt-10 prose-h3:mb-3
            prose-h4:text-base prose-h4:font-medium prose-h4:mt-8 prose-h4:mb-2
            prose-p:text-zinc-300 prose-p:leading-relaxed
            prose-li:text-zinc-300
            prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
            prose-code:text-indigo-300 prose-code:font-normal
            prose-table:text-sm
          "
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </>
  );
}

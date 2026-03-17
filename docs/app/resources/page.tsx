import fs from "fs";
import path from "path";
import { Nav } from "@/components/nav";
import { FileViewer } from "@/components/file-viewer";
import { CopyCommand } from "@/components/copy-command";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skill — slices",
  description: "The slices agent skill",
};

function loadFile(relativePath: string) {
  const filePath = path.join(process.cwd(), "content", relativePath);
  return fs.readFileSync(filePath, "utf8");
}

export default function ResourcesPage() {
  const files = [
    { name: "SKILL.md", tab: "SKILL.md", content: loadFile("skill.md"), rawHref: "/skill" },
    { name: "resources/creating.md", tab: "creating.md", content: loadFile("resources/creating.md"), rawHref: "/skill/resources/creating" },
    { name: "resources/discovering.md", tab: "discovering.md", content: loadFile("resources/discovering.md"), rawHref: "/skill/resources/discovering" },
    { name: "resources/maintaining.md", tab: "maintaining.md", content: loadFile("resources/maintaining.md"), rawHref: "/skill/resources/maintaining" },
    { name: "resources/frontmatter.md", tab: "frontmatter.md", content: loadFile("resources/frontmatter.md"), rawHref: "/skill/resources/frontmatter" },
  ];

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 text-center">
          <p className="text-sm text-zinc-400 mb-3">
            Copy and paste into your agent to install:
          </p>
          <CopyCommand command="curl -fsSL slices.info/install | sh" />
        </div>
        <FileViewer files={files} />
      </main>
    </>
  );
}
